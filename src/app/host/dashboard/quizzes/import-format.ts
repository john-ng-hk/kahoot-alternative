import { DraftQuestion, validateDraft } from './quiz-draft'

export const MAX_IMPORT_BYTES = 1_000_000
export const MAX_IMPORT_QUIZZES = 50

export type ImportQuiz = {
  name: string
  description: string | null
  questions: DraftQuestion[]
}

export type ParseResult =
  | { ok: true; quizzes: ImportQuiz[] }
  | { ok: false; error: string }

const fail = (error: string): ParseResult => ({ ok: false, error })

/** Postgres text cannot hold NUL, so reject it here instead of failing during the save */
const hasNul = (value: string) => value.includes('\u0000')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Reads the import file: { "quizzes": [ { "name", "description"?, "questions": [ { "body", "choices": string[], "correct": index } ] } ] }.
 * Validates every quiz with the editor's rules and returns the first error.
 */
export function parseImportFile(text: string): ParseResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) {
    return fail(`The file is too large. The limit is ${MAX_IMPORT_BYTES / 1_000_000} MB.`)
  }
  const content = text.replace(/^\uFEFF/, '')
  if (content.trim() === '') return fail('The file is empty.')

  let data: unknown
  try {
    data = JSON.parse(content)
  } catch {
    return fail('The file is not valid JSON.')
  }

  if (!isObject(data) || !Array.isArray(data.quizzes) || data.quizzes.length === 0) {
    return fail('The file must contain a non-empty "quizzes" list.')
  }
  if (data.quizzes.length > MAX_IMPORT_QUIZZES) {
    return fail(`The file has too many quizzes. The limit is ${MAX_IMPORT_QUIZZES}.`)
  }

  const quizzes: ImportQuiz[] = []
  for (let i = 0; i < data.quizzes.length; i++) {
    const n = i + 1
    const raw = data.quizzes[i]
    if (!isObject(raw)) return fail(`Quiz ${n}: must be an object.`)
    if (typeof raw.name !== 'string') return fail(`Quiz ${n}: "name" must be text.`)
    if (raw.description != null && typeof raw.description !== 'string') {
      return fail(`Quiz ${n}: "description" must be text.`)
    }
    if (hasNul(raw.name) || (raw.description != null && hasNul(raw.description as string))) {
      return fail(`Quiz ${n}: text cannot contain a NUL character.`)
    }
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
      return fail(`Quiz ${n}: "questions" must be a list with at least one question.`)
    }

    const questions: DraftQuestion[] = []
    for (let j = 0; j < raw.questions.length; j++) {
      const where = `Quiz ${n}, question ${j + 1}`
      const q = raw.questions[j]
      if (!isObject(q) || typeof q.body !== 'string') {
        return fail(`${where}: "body" must be text.`)
      }
      if (!Array.isArray(q.choices) || q.choices.some((c) => typeof c !== 'string')) {
        return fail(`${where}: "choices" must be a list of text.`)
      }
      if (hasNul(q.body) || (q.choices as string[]).some(hasNul)) {
        return fail(`${where}: text cannot contain a NUL character.`)
      }
      const correct = q.correct
      if (
        typeof correct !== 'number' ||
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct >= q.choices.length
      ) {
        return fail(
          `${where}: "correct" must be a whole number from 0 to ${Math.max(q.choices.length - 1, 0)}.`
        )
      }
      questions.push({
        body: q.body.trim(),
        choices: (q.choices as string[]).map((body, index) => ({
          body: body.trim(),
          is_correct: index === correct,
        })),
      })
    }

    const name = raw.name.trim()
    const invalid = validateDraft(name, questions)
    if (invalid) return fail(`Quiz ${n}: ${invalid}`)
    quizzes.push({
      name,
      description: typeof raw.description === 'string' ? raw.description : null,
      questions,
    })
  }
  return { ok: true, quizzes }
}

export const MAX_QUESTION_LENGTH = 200
export const MAX_CHOICE_LENGTH = 100
export const MIN_CHOICES = 2
export const MAX_CHOICES = 4

export type DraftChoice = { body: string; is_correct: boolean }
export type DraftQuestion = { body: string; choices: DraftChoice[] }

type StoredChoice = { body: string; is_correct: boolean; created_at: string }
type StoredQuestion = { body: string; choices: StoredChoice[] }

/** Questions arrive ordered by `order`. Choices are sorted by created_at, which save_quiz_set stamps in entry order. */
export function draftQuestions(questions: StoredQuestion[]): DraftQuestion[] {
  return questions.map((q) => ({
    body: q.body,
    choices: [...q.choices]
      .sort((a, b) =>
        a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
      )
      .map((c) => ({ body: c.body, is_correct: c.is_correct })),
  }))
}

/** Mirrors the checks in save_quiz_set. The database still enforces them. */
export function validateDraft(
  name: string,
  questions: DraftQuestion[]
): string | null {
  if (name.trim() === '') return 'Enter a quiz name.'
  for (let i = 0; i < questions.length; i++) {
    const n = i + 1
    const q = questions[i]
    const body = q.body.trim()
    if (body === '' || body.length > MAX_QUESTION_LENGTH) {
      return `Question ${n}: enter 1 to ${MAX_QUESTION_LENGTH} characters.`
    }
    if (q.choices.length < MIN_CHOICES || q.choices.length > MAX_CHOICES) {
      return `Question ${n}: use ${MIN_CHOICES} to ${MAX_CHOICES} choices.`
    }
    if (
      q.choices.some(
        (c) =>
          c.body.trim() === '' || c.body.trim().length > MAX_CHOICE_LENGTH
      )
    ) {
      return `Question ${n}: each choice needs 1 to ${MAX_CHOICE_LENGTH} characters.`
    }
    if (q.choices.filter((c) => c.is_correct).length !== 1) {
      return `Question ${n}: mark exactly one correct choice.`
    }
  }
  return null
}

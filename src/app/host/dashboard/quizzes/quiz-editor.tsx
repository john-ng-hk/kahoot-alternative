'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { Json } from '@/types/supabase'
import { supabase } from '@/types/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  DraftChoice,
  DraftQuestion,
  MAX_CHOICES,
  MAX_QUESTION_LENGTH,
  MIN_CHOICES,
  draftQuestions,
  validateDraft,
} from './quiz-draft'

const newQuestion = (): DraftQuestion => ({
  body: '',
  choices: [
    { body: '', is_correct: false },
    { body: '', is_correct: false },
  ],
})

export default function QuizEditor({ quizSetId }: { quizSetId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(Boolean(quizSetId))
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [hasGames, setHasGames] = useState(false)
  const [notOwner, setNotOwner] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const readOnly = hasGames || notOwner

  useEffect(() => {
    if (!quizSetId) return
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('quiz_sets')
        .select('*, questions(*, choices(*))')
        .eq('id', quizSetId)
        .order('order', { ascending: true, referencedTable: 'questions' })
        .single()
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const { count, error: gamesError } = await supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_set_id', quizSetId)
      if (gamesError) {
        setError(gamesError.message)
        setLoading(false)
        return
      }

      setName(data.name)
      setDescription(data.description ?? '')
      setQuestions(draftQuestions(data.questions))
      setHasGames((count ?? 0) > 0)
      setNotOwner(data.owner_user_id !== user?.id)
      setLoading(false)
    }
    load()
  }, [quizSetId])

  const addQuestion = () => setQuestions((qs) => [...qs, newQuestion()])

  const removeQuestion = (qi: number) =>
    setQuestions((qs) => qs.filter((_, i) => i !== qi))

  const moveQuestion = (qi: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = qi + dir
      if (j < 0 || j >= qs.length) return qs
      const next = [...qs]
      next[qi] = qs[j]
      next[j] = qs[qi]
      return next
    })

  const setQuestionBody = (qi: number, body: string) =>
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, body } : q))
    )

  const updateChoices = (
    qi: number,
    change: (choices: DraftChoice[]) => DraftChoice[]
  ) =>
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, choices: change(q.choices) } : q))
    )

  const setChoiceBody = (qi: number, ci: number, body: string) =>
    updateChoices(qi, (choices) =>
      choices.map((c, j) => (j === ci ? { ...c, body } : c))
    )

  const markCorrect = (qi: number, ci: number) =>
    updateChoices(qi, (choices) =>
      choices.map((c, j) => ({ ...c, is_correct: j === ci }))
    )

  const addChoice = (qi: number) =>
    updateChoices(qi, (choices) =>
      choices.length < MAX_CHOICES
        ? [...choices, { body: '', is_correct: false }]
        : choices
    )

  const removeChoice = (qi: number, ci: number) =>
    updateChoices(qi, (choices) =>
      choices.length > MIN_CHOICES
        ? choices.filter((_, j) => j !== ci)
        : choices
    )

  const save = async () => {
    setError(null)
    setSaved(false)
    const problem = validateDraft(name, questions)
    if (problem) {
      setError(problem)
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('save_quiz_set', {
      p_id: quizSetId ?? null,
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_questions: questions.map((q) => ({
        body: q.body.trim(),
        choices: q.choices.map((c) => ({
          body: c.body.trim(),
          is_correct: c.is_correct,
        })),
      })) as Json,
    })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
    if (quizSetId) {
      setSaved(true)
    } else {
      router.replace(`/host/dashboard/quizzes/${data}`)
    }
  }

  if (loading) {
    return <p className="text-gray-700">Loading...</p>
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink">
          {quizSetId ? 'Edit quiz' : 'New quiz'}
        </h2>
        <Link
          href="/host/dashboard/quizzes"
          className="inline-flex min-h-[44px] items-center text-accent underline"
        >
          Back to my quizzes
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {hasGames && (
        <p className="mb-4 rounded-lg bg-gray-100 px-4 py-2 text-ink">
          This quiz has games, so it cannot be changed. Duplicate it from My
          quizzes to make changes.
        </p>
      )}
      {notOwner && !hasGames && (
        <p className="mb-4 rounded-lg bg-gray-100 px-4 py-2 text-ink">
          You can view this quiz, but only its owner can change it.
        </p>
      )}

      <fieldset disabled={readOnly} className="flex flex-col gap-6">
        <div className="card flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-ink">
            <span className="font-bold">Quiz name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-ink">
            <span className="font-bold">Description (optional)</span>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-ink">Question {qi + 1}</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => moveQuestion(qi, -1)}
                  disabled={qi === 0}
                >
                  Up
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => moveQuestion(qi, 1)}
                  disabled={qi === questions.length - 1}
                >
                  Down
                </Button>
                <Button variant="secondary" onClick={() => removeQuestion(qi)}>
                  Remove
                </Button>
              </div>
            </div>

            <label className="flex flex-col gap-1 text-ink">
              <textarea
                className="input"
                rows={2}
                aria-label={`Question ${qi + 1} text`}
                value={q.body}
                onChange={(e) => setQuestionBody(qi, e.target.value)}
              />
              <span className="text-sm text-gray-700">
                {q.body.length}/{MAX_QUESTION_LENGTH}
              </span>
            </label>

            <div className="flex flex-col gap-2">
              {q.choices.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <label className="flex min-h-[44px] items-center gap-2 text-ink">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={c.is_correct}
                      onChange={() => markCorrect(qi, ci)}
                      className="h-5 w-5"
                    />
                    <span className="text-sm">Correct</span>
                  </label>
                  <input
                    className="input min-w-0 flex-grow"
                    aria-label={`Question ${qi + 1}, choice ${ci + 1}`}
                    value={c.body}
                    onChange={(e) => setChoiceBody(qi, ci, e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => removeChoice(qi, ci)}
                    disabled={q.choices.length <= MIN_CHOICES}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  variant="secondary"
                  onClick={() => addChoice(qi)}
                  disabled={q.choices.length >= MAX_CHOICES}
                >
                  Add choice
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div>
          <Button variant="secondary" onClick={addQuestion}>
            Add question
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save quiz'}
          </Button>
          {saved && (
            <p role="status" className="text-ink">
              Saved.
            </p>
          )}
        </div>
      </fieldset>
    </div>
  )
}

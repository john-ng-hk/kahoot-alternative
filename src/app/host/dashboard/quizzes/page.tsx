'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { Json } from '@/types/supabase'
import { supabase } from '@/types/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { draftQuestions } from './quiz-draft'

type Row = {
  id: string
  name: string
  questionCount: number
  played: boolean
}

export default function MyQuizzesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoaded(true)
      return
    }

    const { data, error } = await supabase
      .from('quiz_sets')
      .select('id, name, created_at, questions(id)')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoaded(true)
      return
    }

    const ids = data.map((quiz) => quiz.id)
    const playedIds: Record<string, boolean> = {}
    if (ids.length > 0) {
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('quiz_set_id')
        .in('quiz_set_id', ids)
      if (gamesError) {
        setError(gamesError.message)
        setLoaded(true)
        return
      }
      games.forEach((game) => {
        playedIds[game.quiz_set_id] = true
      })
    }

    setRows(
      data.map((quiz) => ({
        id: quiz.id,
        name: quiz.name,
        questionCount: quiz.questions.length,
        played: Boolean(playedIds[quiz.id]),
      }))
    )
    setLoaded(true)
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const duplicate = async (id: string) => {
    setBusyId(id)
    setError(null)
    const { data: quiz, error: loadError } = await supabase
      .from('quiz_sets')
      .select('*, questions(*, choices(*))')
      .eq('id', id)
      .order('order', { ascending: true, referencedTable: 'questions' })
      .single()
    if (loadError) {
      setBusyId(null)
      setError(loadError.message)
      return
    }

    const { data: newId, error: saveError } = await supabase.rpc(
      'save_quiz_set',
      {
        p_id: null,
        p_name: `${quiz.name} (copy)`,
        p_description: quiz.description,
        p_questions: draftQuestions(quiz.questions) as Json,
      }
    )
    setBusyId(null)
    if (saveError) {
      setError(saveError.message)
      return
    }
    router.push(`/host/dashboard/quizzes/${newId}`)
  }

  const remove = async (row: Row) => {
    if (
      !window.confirm(
        `Delete "${row.name}"? Its games and results will be deleted too. This cannot be undone.`
      )
    )
      return
    setBusyId(row.id)
    setError(null)
    const { error: deleteError } = await supabase
      .from('quiz_sets')
      .delete()
      .eq('id', row.id)
    setBusyId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await loadRows()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink">My quizzes</h2>
        <Link href="/host/dashboard/quizzes/new" className="btn-primary">
          New quiz
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {loaded && rows.length === 0 && !error && (
        <p className="text-gray-700">
          No quizzes yet. Create one to get started.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const status = row.played
            ? 'Locked (has games)'
            : row.questionCount === 0
              ? 'Draft'
              : 'Ready'
          return (
            <li
              key={row.id}
              className="card flex flex-wrap items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-grow">
                <h3 className="break-words font-bold text-ink">{row.name}</h3>
                <p className="text-sm text-gray-700">
                  {row.questionCount}{' '}
                  {row.questionCount === 1 ? 'question' : 'questions'} ·{' '}
                  {status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/host/dashboard/quizzes/${row.id}`}
                  className="btn-secondary"
                >
                  {row.played ? 'View' : 'Edit'}
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => duplicate(row.id)}
                  disabled={busyId !== null}
                >
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => remove(row)}
                  disabled={busyId !== null}
                >
                  Delete
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

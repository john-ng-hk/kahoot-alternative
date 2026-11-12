'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { QuizSet, supabase } from '@/types/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [quizSet, setQuizSet] = useState<QuizSet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const getQuizSets = async () => {
      // Only the host's own quizzes. Built-in presets have no owner and are not listed.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('quiz_sets')
        .select(`*, questions(*, choices(*))`)
        .eq('owner_user_id', user?.id ?? '')
        .order('created_at', { ascending: false })
      setLoaded(true)
      if (error) {
        setError('Could not load quiz sets. Refresh the page to try again.')
        return
      }
      setQuizSet(data)
    }
    getQuizSets()
  }, [])

  const startGame = async (quizSetId: string) => {
    // SignInGate in the layout guarantees an email session here
    const { data, error } = await supabase
      .from('games')
      .insert({
        quiz_set_id: quizSetId,
      })
      .select()
      .single()
    if (error) {
      console.error(error)
      setError('Could not start the game. Try again.')
      return
    }

    const gameId = data.id
    window.open(`/host/game/${gameId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-ink mb-4">Quiz sets</h1>
      {error && <Notice>{error}</Notice>}
      {loaded && quizSet.length === 0 && !error && (
        <p className="text-gray-700">
          No quiz sets yet.{' '}
          <Link
            className="text-accent underline"
            href="/host/dashboard/quizzes/new"
          >
            Create your first quiz
          </Link>
        </p>
      )}
      <div className="flex flex-col gap-4">
        {quizSet.map((quizSet) => (
          <div key={quizSet.id} className="card flex gap-4 p-4">
            <img
              className="h-28 rounded"
              src="/default.png"
              alt="default quiz image"
            />
            <div className="flex flex-grow flex-col justify-between gap-2">
              <h2 className="text-lg font-bold break-words">{quizSet.name}</h2>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="text-gray-700">
                  {quizSet.questions.length} questions
                </div>
                <Button
                  disabled={quizSet.questions.length === 0}
                  onClick={() => startGame(quizSet.id)}
                >
                  {quizSet.questions.length === 0
                    ? 'No questions yet'
                    : 'Start Game'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { EndGameButton } from '@/components/end-game-button'
import { Notice } from '@/components/ui/notice'
import { supabase } from '@/types/types'
import { useEffect, useState } from 'react'

type ActiveGame = {
  id: string
  created_at: string
  phase: string
  quiz_sets: { name: string } | null
  participants: { count: number }[]
}

const formatStart = (iso: string) =>
  new Date(iso).toLocaleString('en-HK', {
    timeZone: 'Asia/Hong_Kong',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' HKT'

/** The host's games that are not finished yet, with Resume and End. */
export default function ActiveGames() {
  const [games, setGames] = useState<ActiveGame[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('games')
        .select('id, created_at, phase, quiz_sets(name), participants(count)')
        .eq('host_user_id', user?.id ?? '')
        .neq('phase', 'result')
        .order('created_at', { ascending: false })
      if (error) {
        console.error(error)
        setError('Could not load active games. Refresh the page to try again.')
        return
      }
      setGames(data as unknown as ActiveGame[])
    }
    load()
  }, [])

  if (!error && games.length === 0) return null

  return (
    <section className="mb-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">Active games</h1>
      {error && <Notice>{error}</Notice>}
      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <h2 className="break-words font-bold">
                {game.quiz_sets?.name ?? 'Quiz'}
              </h2>
              <p className="text-gray-700">
                {game.phase === 'lobby' ? 'Lobby' : 'In progress'} ·{' '}
                {game.participants[0]?.count ?? 0} players ·{' '}
                {formatStart(game.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <a
                className="btn-secondary"
                href={`/host/game/${game.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Resume
              </a>
              <EndGameButton
                gameId={game.id}
                onEnded={() =>
                  setGames((current) => current.filter((g) => g.id !== game.id))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

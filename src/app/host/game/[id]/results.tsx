import { Notice } from '@/components/ui/notice'
import {
  GameResult,
  Participant,
  QuizSet,
  supabase,
} from '@/types/types'
import { useEffect, useMemo, useState } from 'react'
import Confetti from 'react-confetti'
import useWindowSize from 'react-use/lib/useWindowSize'
import { Ranked, rankRows, splitPodium } from './podium'

/** Podium column height by rank (1st, 2nd, 3rd). Tied players get the same height. */
const PODIUM_HEIGHT = ['h-44', 'h-32', 'h-24']

export default function Results({
  quizSet,
  gameId,
}: {
  participants: Participant[]
  quizSet: QuizSet
  gameId: string
}) {
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(true)

  const { width, height } = useWindowSize()

  useEffect(() => {
    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  useEffect(() => {
    const getResults = async () => {
      const { data, error } = await supabase
        .from('game_results')
        .select()
        .eq('game_id', gameId)
        .order('total_score', { ascending: false })
      if (error) {
        return setError(error.message)
      }

      setGameResults(data)
      setLoaded(true)
    }
    getResults()
  }, [gameId])

  const { podium, rest } = useMemo(
    () => splitPodium(rankRows(gameResults)),
    [gameResults]
  )

  /** Show 2nd, 1st, 3rd when there are 3 players; otherwise left to right in rank order */
  const podiumColumns = podium
    .map((row, position) => ({ row, position }))
    .sort((a, b) =>
      podium.length === 3 ? [1, 0, 2][a.position] - [1, 0, 2][b.position] : 0
    )

  return (
    <div className="min-h-screen bg-ink bg-[radial-gradient(ellipse_at_top,rgb(var(--brand-primary)/0.3),transparent_60%)] p-6 pt-24 text-white">
      <h1 className="mx-auto mb-8 max-w-3xl break-words text-center text-4xl font-bold">
        {quizSet.name}
      </h1>
      {error && (
        <div className="mx-auto mb-4 max-w-2xl">
          <Notice>{error}</Notice>
        </div>
      )}
      {loaded && gameResults.length === 0 && (
        <p className="text-center text-xl text-white/80">
          No players joined this game
        </p>
      )}
      {podium.length > 0 && (
        <div className="mx-auto mb-8 flex max-w-2xl items-end justify-center gap-3">
          {podiumColumns.map(({ row }) => (
            <PodiumColumn key={row.participant_id} row={row} />
          ))}
        </div>
      )}
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {rest.map((gameResult) => (
          <div
            key={gameResult.participant_id}
            className="card flex items-center gap-4 px-4 py-3 motion-safe:animate-fade-up"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-xl font-bold">
              {gameResult.rank}
            </div>
            <div className="min-w-0 flex-grow break-words text-2xl font-bold">
              {gameResult.nickname}
            </div>
            <div className="whitespace-nowrap text-lg tabular-nums">
              {gameResult.total_score ?? 0} pts
            </div>
          </div>
        ))}
      </div>
      {!reducedMotion && (
        <Confetti width={width} height={height} recycle={true} />
      )}
    </div>
  )
}

function PodiumColumn({ row }: { row: Ranked<GameResult> }) {
  const level = Math.min(row.rank, 3) - 1
  return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch">
      <div className="px-1 text-center">
        <div className="break-words text-xl font-bold md:text-2xl">
          {row.nickname}
        </div>
        <div className="mb-2 text-lg tabular-nums text-white/80">
          {row.total_score ?? 0} pts
        </div>
      </div>
      <div
        className={`flex origin-bottom items-start justify-center rounded-t-xl pt-3 text-5xl font-bold motion-safe:animate-grow ${
          PODIUM_HEIGHT[level]
        } ${level === 0 ? 'bg-brand' : 'bg-white/20'}`}
      >
        {row.rank}
      </div>
    </div>
  )
}

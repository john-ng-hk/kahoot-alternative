import { Notice } from '@/components/ui/notice'
import {
  GameResult,
  Participant,
  QuizSet,
  supabase,
} from '@/types/types'
import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'
import useWindowSize from 'react-use/lib/useWindowSize'

export default function Results({
  quizSet,
  gameId,
}: {
  participants: Participant[]
  quizSet: QuizSet
  gameId: string
}) {
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const { width, height } = useWindowSize()

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
    }
    getResults()
  }, [gameId])

  /** Competition ranking: tied players share a rank, e.g. 1, 2, 2, 4 */
  const rankOf = (gameResult: GameResult) =>
    1 +
    gameResults.filter(
      (other) => (other.total_score ?? 0) > (gameResult.total_score ?? 0)
    ).length

  return (
    <div className="min-h-screen bg-ink p-6 text-white">
      <h1 className="mx-auto mb-6 max-w-3xl break-words text-center text-3xl font-bold">
        {quizSet.name}
      </h1>
      {error && (
        <div className="mx-auto mb-4 max-w-2xl">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {gameResults.map((gameResult) => {
          const rank = rankOf(gameResult)
          const isTop = rank <= 3
          return (
            <div
              key={gameResult.participant_id}
              className={`card flex items-center gap-4 px-4 py-3 ${
                isTop ? 'shadow-xl' : ''
              }`}
            >
              <div
                className={`w-12 text-right font-bold ${
                  isTop ? 'text-4xl' : 'text-xl'
                }`}
              >
                {rank}
              </div>
              <div
                className={`min-w-0 flex-grow break-words font-bold ${
                  isTop ? 'text-4xl' : 'text-2xl'
                }`}
              >
                {gameResult.nickname}
              </div>
              <div className="whitespace-nowrap text-lg">
                {gameResult.total_score} pts
              </div>
            </div>
          )
        })}
      </div>
      <Confetti width={width} height={height} recycle={true} />
    </div>
  )
}

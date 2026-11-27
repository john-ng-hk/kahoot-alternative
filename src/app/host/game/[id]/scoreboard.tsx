import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { supabase } from '@/types/types'
import { useEffect, useState } from 'react'
import {
  RankedRow,
  ScoreRow,
  buildScoreboard,
  visibleRows,
} from './scoreboard-rank'

const ROW_HEIGHT = 72
const ROW_COUNT = 5
/** Time the previous order stays visible before rows move */
const SETTLE_DELAY = 600
const COUNT_UP_TIME = 800

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from `from` to `to` once `active` is true. Jumps straight to `to` for reduced motion. */
function useCountUp(from: number, to: number, active: boolean) {
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion() || from === to) {
      setValue(to)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_TIME, 1)
      setValue(Math.round(from + (to - from) * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [from, to, active])
  return value
}

function Row({
  row,
  index,
  settled,
}: {
  row: RankedRow
  index: number
  settled: boolean
}) {
  const score = useCountUp(row.previousTotal, row.total, settled)
  // Rows below the top 5 wait just under the list, invisible. They fade in when they enter and fade out when they drop.
  const inTopAfter = index < ROW_COUNT
  const inTopBefore = row.previousPosition < ROW_COUNT
  const position = Math.min(settled ? index : row.previousPosition, ROW_COUNT)
  const visible = settled ? inTopAfter : inTopBefore
  return (
    <div
      data-testid="scoreboard-row"
      data-nickname={row.nickname}
      data-rank={row.rank}
      data-change={row.change}
      aria-hidden={!visible}
      className="card absolute left-0 right-0 flex items-center gap-4 px-4 py-3 transition-[transform,opacity] duration-700 ease-in-out motion-reduce:transition-none"
      style={{
        height: ROW_HEIGHT - 8,
        transform: `translateY(${position * ROW_HEIGHT}px)`,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="w-10 text-right text-2xl font-bold">{row.rank}</div>
      <div className="min-w-0 flex-grow truncate text-2xl font-bold">
        {row.nickname}
      </div>
      <div className="w-14 text-right text-lg font-bold">
        {row.change > 0 && (
          <span className="text-answer-green" aria-label={`up ${row.change}`}>
            ▲{row.change}
          </span>
        )}
        {row.change < 0 && (
          <span className="text-answer-red" aria-label={`down ${-row.change}`}>
            ▼{-row.change}
          </span>
        )}
      </div>
      <div className="w-28 whitespace-nowrap text-right text-lg tabular-nums">
        {score} pts
      </div>
    </div>
  )
}

export default function Scoreboard({
  gameId,
  questionId,
  onContinue,
  error: continueError,
}: {
  gameId: string
  questionId: string
  onContinue: () => void
  /** Error from the parent, for example when "Continue" fails to update the game */
  error?: string | null
}) {
  const [rows, setRows] = useState<{ row: RankedRow; index: number }[] | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [results, answers] = await Promise.all([
        supabase
          .from('game_results')
          .select('participant_id, nickname, total_score')
          .eq('game_id', gameId),
        supabase
          .from('answers')
          .select('participant_id, score')
          .eq('question_id', questionId),
      ])
      if (cancelled) return
      if (results.error || answers.error) {
        setError((results.error ?? answers.error)!.message)
        return
      }
      const thisQuestion = new Map<string, number>()
      answers.data.forEach((a) =>
        thisQuestion.set(
          a.participant_id,
          (thisQuestion.get(a.participant_id) ?? 0) + (a.score ?? 0)
        )
      )
      const scoreRows: ScoreRow[] = results.data.map((r) => {
        const total = r.total_score ?? 0
        return {
          participantId: r.participant_id!,
          nickname: r.nickname ?? '',
          total,
          previousTotal: total - (thisQuestion.get(r.participant_id!) ?? 0),
        }
      })
      const all = buildScoreboard(scoreRows, scoreRows.length)
      setRows(
        visibleRows(all, ROW_COUNT).map((row) => ({
          row,
          index: all.indexOf(row),
        }))
      )
    }
    load()
    return () => {
      cancelled = true
    }
  }, [gameId, questionId])

  useEffect(() => {
    if (!rows) return
    if (prefersReducedMotion()) {
      setSettled(true)
      return
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_DELAY)
    return () => clearTimeout(timer)
  }, [rows])

  return (
    <div className="flex min-h-screen flex-col items-center bg-ink p-6 text-white">
      <h1 className="mb-6 text-3xl font-bold">Top 5</h1>
      {(continueError ?? error) && (
        <div className="mb-4 w-full max-w-2xl">
          <Notice>{continueError ?? error}</Notice>
        </div>
      )}
      <div
        className="relative w-full max-w-2xl"
        style={{ height: ROW_COUNT * ROW_HEIGHT }}
        data-testid="scoreboard"
        data-settled={settled}
      >
        {rows?.map(({ row, index }) => (
          <Row
            key={row.participantId}
            row={row}
            index={index}
            settled={settled}
          />
        ))}
      </div>
      <div className="mt-8">
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </div>
  )
}

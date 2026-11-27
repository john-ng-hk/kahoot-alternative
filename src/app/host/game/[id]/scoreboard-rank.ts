export type ScoreRow = {
  participantId: string
  nickname: string
  total: number
  previousTotal: number
}

export type RankedRow = ScoreRow & {
  /** Competition rank by total, e.g. 1, 1, 3 */
  rank: number
  /** Competition rank by previousTotal, over all players */
  previousRank: number
  /** 0-based index in the previous ordering (ties by nickname) */
  previousPosition: number
  /** previousRank - rank. Positive means the player moved up. */
  change: number
}

const byScoreThenName =
  (key: 'total' | 'previousTotal') => (a: ScoreRow, b: ScoreRow) =>
    b[key] - a[key] || a.nickname.localeCompare(b.nickname)

/** Competition rank: 1 + number of players with a strictly higher score */
const rankIn = (rows: ScoreRow[], row: ScoreRow, key: 'total' | 'previousTotal') =>
  1 + rows.filter((other) => other[key] > row[key]).length

/** Top `limit` players by total, with their rank movement since the previous ordering. */
export function buildScoreboard(rows: ScoreRow[], limit = 5): RankedRow[] {
  // When everyone was tied before (first question), there is no earlier ordering to move from.
  const hasPreviousOrder = rows.some(
    (row) => row.previousTotal !== rows[0].previousTotal
  )
  const previousOrder = [...rows].sort(byScoreThenName('previousTotal'))
  return [...rows]
    .sort(byScoreThenName('total'))
    .slice(0, limit)
    .map((row) => {
      const rank = rankIn(rows, row, 'total')
      const previousRank = rankIn(rows, row, 'previousTotal')
      return {
        ...row,
        rank,
        previousRank,
        previousPosition: previousOrder.findIndex(
          (r) => r.participantId === row.participantId
        ),
        change: hasPreviousOrder ? previousRank - rank : 0,
      }
    })
}

/**
 * Rows to draw: the new top `limit` plus anyone who was in the previous top `limit`,
 * so a player who drops out can fade out instead of vanishing. `all` is the full result of buildScoreboard.
 */
export function visibleRows(all: RankedRow[], limit = 5): RankedRow[] {
  return all.filter((row, index) => index < limit || row.previousPosition < limit)
}

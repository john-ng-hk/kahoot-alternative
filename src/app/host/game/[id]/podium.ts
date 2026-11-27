export type Ranked<T> = T & { rank: number }

const score = (row: { total_score: number | null }) => row.total_score ?? 0

/** Sorts by score (highest first, input order kept for ties) and adds a competition rank, e.g. 1, 1, 3. */
export function rankRows<T extends { total_score: number | null }>(
  rows: T[]
): Ranked<T>[] {
  return [...rows]
    .sort((a, b) => score(b) - score(a))
    .map((row) => ({
      ...row,
      rank: 1 + rows.filter((other) => score(other) > score(row)).length,
    }))
}

/** The first 3 ranked rows go on the podium; everyone else is listed below it. */
export function splitPodium<T>(rows: Ranked<T>[]): {
  podium: Ranked<T>[]
  rest: Ranked<T>[]
} {
  return { podium: rows.slice(0, 3), rest: rows.slice(3) }
}

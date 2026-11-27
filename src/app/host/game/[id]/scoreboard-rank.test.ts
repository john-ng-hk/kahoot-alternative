import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ScoreRow, buildScoreboard, visibleRows } from './scoreboard-rank'

const row = (
  nickname: string,
  previousTotal: number,
  total: number
): ScoreRow => ({ participantId: nickname, nickname, total, previousTotal })

test('orders by total and sets rank, previousRank and change', () => {
  const result = buildScoreboard([row('A', 100, 100), row('B', 0, 300)])
  assert.equal(result[0].nickname, 'B')
  assert.equal(result[0].rank, 1)
  assert.equal(result[0].previousRank, 2)
  assert.equal(result[0].change, 1)
  assert.equal(result[1].nickname, 'A')
  assert.equal(result[1].rank, 2)
  assert.equal(result[1].previousRank, 1)
  assert.equal(result[1].change, -1)
})

test('tied players share a rank and sort by nickname', () => {
  const result = buildScoreboard([
    row('Zoe', 0, 500),
    row('Amy', 0, 500),
    row('Bob', 0, 300),
  ])
  assert.deepEqual(
    result.map((r) => r.nickname),
    ['Amy', 'Zoe', 'Bob']
  )
  assert.deepEqual(
    result.map((r) => r.rank),
    [1, 1, 3]
  )
})

test('cuts to the limit', () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    row(`P${i}`, 0, 1000 - i * 100)
  )
  const result = buildScoreboard(rows)
  assert.equal(result.length, 5)
  assert.ok(!result.some((r) => r.nickname === 'P5' || r.nickname === 'P6'))
})

test('everyone tied at 0 returns 5 rows, all rank 1, change 0', () => {
  const rows = Array.from({ length: 40 }, (_, i) =>
    row(`P${String(i).padStart(2, '0')}`, 0, 0)
  )
  const result = buildScoreboard(rows)
  assert.equal(result.length, 5)
  assert.ok(result.every((r) => r.rank === 1 && r.change === 0))
})

test('no answers this question means change 0', () => {
  const result = buildScoreboard([
    row('A', 300, 300),
    row('B', 200, 200),
    row('C', 100, 100),
  ])
  assert.ok(result.every((r) => r.change === 0))
})

test('player entering top 5 has previousPosition >= 5', () => {
  const rows = [
    row('A', 600, 600),
    row('B', 500, 500),
    row('C', 400, 400),
    row('D', 300, 300),
    row('E', 200, 200),
    row('F', 100, 1100),
  ]
  const f = buildScoreboard(rows)[0]
  assert.equal(f.nickname, 'F')
  assert.equal(f.previousPosition, 5)
  assert.equal(f.change, 5)
})

test('previousRank is computed over all players, not only the top 5', () => {
  const rows = [
    row('A', 600, 600),
    row('B', 500, 500),
    row('C', 400, 400),
    row('D', 300, 300),
    row('E', 200, 200),
    row('F', 100, 1100),
  ]
  assert.equal(buildScoreboard(rows)[0].previousRank, 6)
})

test('no arrows when there was no previous ordering (everyone tied before)', () => {
  const result = buildScoreboard([
    row('A', 0, 900),
    row('B', 0, 500),
    row('C', 0, 0),
  ])
  assert.deepEqual(
    result.map((r) => r.rank),
    [1, 2, 3]
  )
  assert.ok(result.every((r) => r.change === 0))
})

test('visibleRows keeps players who just dropped out of the top 5', () => {
  const rows = [
    row('A', 600, 600),
    row('B', 500, 500),
    row('C', 400, 400),
    row('D', 300, 300),
    row('E', 200, 200),
    row('F', 100, 1100),
  ]
  const all = buildScoreboard(rows, rows.length)
  const names = visibleRows(all, 5).map((r) => r.nickname)
  // F enters, E drops out: both stay on screen so E can fade out
  assert.deepEqual(names, ['F', 'A', 'B', 'C', 'D', 'E'])
})

test('visibleRows is at most 10 rows when many players are tied', () => {
  const rows = Array.from({ length: 40 }, (_, i) =>
    row(`P${String(i).padStart(2, '0')}`, 0, 0)
  )
  assert.equal(visibleRows(buildScoreboard(rows, rows.length), 5).length, 5)
})

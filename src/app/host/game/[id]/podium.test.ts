import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rankRows, splitPodium } from './podium'

const row = (nickname: string, total_score: number | null) => ({
  nickname,
  total_score,
})

test('rankRows gives competition ranks to tied scores', () => {
  const ranked = rankRows([row('a', 10), row('b', 50), row('c', 50)])
  assert.deepEqual(
    ranked.map((r) => [r.nickname, r.rank]),
    [
      ['b', 1],
      ['c', 1],
      ['a', 3],
    ]
  )
})

test('rankRows treats a null score as 0', () => {
  const ranked = rankRows([row('a', null), row('b', 5)])
  assert.deepEqual(
    ranked.map((r) => [r.nickname, r.rank]),
    [
      ['b', 1],
      ['a', 2],
    ]
  )
})

test('rankRows of no rows is empty', () => {
  assert.deepEqual(rankRows([]), [])
})

test('splitPodium takes the first 3 and leaves the rest', () => {
  const { podium, rest } = splitPodium(
    rankRows([row('a', 5), row('b', 4), row('c', 3), row('d', 2), row('e', 1)])
  )
  assert.equal(podium.length, 3)
  assert.deepEqual(
    rest.map((r) => [r.nickname, r.rank]),
    [
      ['d', 4],
      ['e', 5],
    ]
  )
})

test('splitPodium with 2 players has no rest and no empty slots', () => {
  const { podium, rest } = splitPodium(rankRows([row('a', 5), row('b', 4)]))
  assert.equal(podium.length, 2)
  assert.equal(rest.length, 0)
})

test('splitPodium with four players tied on rank 1 keeps every rank 1', () => {
  const { podium, rest } = splitPodium(
    rankRows([row('a', 7), row('b', 7), row('c', 7), row('d', 7)])
  )
  assert.equal(podium.length, 3)
  assert.equal(rest.length, 1)
  assert.deepEqual(
    [...podium, ...rest].map((r) => r.rank),
    [1, 1, 1, 1]
  )
})

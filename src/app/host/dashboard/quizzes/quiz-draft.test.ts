import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DraftQuestion, validateDraft } from './quiz-draft'

const draft = (body: string, choiceBody = 'a'): DraftQuestion[] => [
  {
    body,
    choices: [
      { body: choiceBody, is_correct: true },
      { body: 'b', is_correct: false },
    ],
  },
]

// Postgres length() counts characters, not UTF-16 units: one emoji is 1 character.
test('counts an emoji as one character for the question limit', () => {
  assert.equal(validateDraft('Quiz', draft('😀'.repeat(150))), null)
  assert.equal(validateDraft('Quiz', draft('😀'.repeat(200))), null)
  assert.match(validateDraft('Quiz', draft('😀'.repeat(201))) ?? '', /Question 1/)
})

test('counts an emoji as one character for the choice limit', () => {
  assert.equal(validateDraft('Quiz', draft('q', '😀'.repeat(100))), null)
  assert.match(
    validateDraft('Quiz', draft('q', '😀'.repeat(101))) ?? '',
    /Question 1/
  )
})

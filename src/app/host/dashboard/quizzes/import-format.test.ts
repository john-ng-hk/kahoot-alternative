import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_QUIZZES,
  parseImportFile,
} from './import-format'

const question = (over: object = {}) => ({
  body: '2+2?',
  choices: ['3', '4', '5'],
  correct: 1,
  ...over,
})
const quiz = (over: object = {}) => ({
  name: 'Week 1',
  questions: [question()],
  ...over,
})
const file = (quizzes: unknown[]) => JSON.stringify({ quizzes })

function errorOf(text: string): string {
  const result = parseImportFile(text)
  assert.equal(result.ok, false)
  return result.ok ? '' : result.error
}

test('accepts the example file', () => {
  const result = parseImportFile(file([quiz()]))
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.quizzes.length, 1)
  assert.equal(result.quizzes[0].description, null)
  const choices = result.quizzes[0].questions[0].choices
  assert.deepEqual(
    choices.map((c) => c.is_correct),
    [false, true, false]
  )
  assert.deepEqual(
    choices.map((c) => c.body),
    ['3', '4', '5']
  )
})

test('keeps a description when given', () => {
  const result = parseImportFile(file([quiz({ description: 'Intro' })]))
  assert.equal(result.ok && result.quizzes[0].description, 'Intro')
})

test('strips a leading BOM', () => {
  assert.equal(parseImportFile('\uFEFF' + file([quiz()])).ok, true)
})

test('rejects invalid JSON and empty text', () => {
  assert.match(errorOf('{ nope'), /JSON/)
  assert.match(errorOf(''), /empty/i)
  assert.match(errorOf('   \n'), /empty/i)
})

test('rejects text over MAX_IMPORT_BYTES', () => {
  assert.match(errorOf(' '.repeat(MAX_IMPORT_BYTES + 1)), /too large/i)
})

test('rejects a missing or empty quizzes list', () => {
  assert.match(errorOf('{}'), /quizzes/)
  assert.match(errorOf(file([])), /quizzes/)
  assert.match(errorOf('[]'), /quizzes/)
})

test('rejects more than MAX_IMPORT_QUIZZES quizzes', () => {
  const many = Array.from({ length: MAX_IMPORT_QUIZZES + 1 }, quiz)
  assert.match(errorOf(file(many)), new RegExp(String(MAX_IMPORT_QUIZZES)))
})

test('rejects a quiz with no questions', () => {
  assert.match(errorOf(file([quiz({ questions: [] })])), /Quiz 1.*question/i)
})

test('rejects correct that is a string, float, negative or out of range', () => {
  for (const correct of ['1', 1.5, -1, 3, null]) {
    const message = errorOf(file([quiz({ questions: [question({ correct })] })]))
    assert.match(message, /Quiz 1, question 1/)
    assert.match(message, /correct/)
  }
})

test('rejects non-string choices and non-string description', () => {
  assert.match(
    errorOf(file([quiz({ questions: [question({ choices: ['a', 2] })] })])),
    /Quiz 1, question 1/
  )
  assert.match(errorOf(file([quiz({ description: 5 })])), /Quiz 1/)
})

test('reuses editor limits', () => {
  const message = errorOf(
    file([quiz({ questions: [question({ body: 'x'.repeat(201) })] })])
  )
  assert.match(message, /^Quiz 1: Question 1: /)
})

test('reports the quiz number of the invalid quiz', () => {
  const message = errorOf(
    file([quiz(), quiz({ questions: [question({ choices: ['only'] , correct: 0})] })])
  )
  assert.match(message, /^Quiz 2: /)
})

test('trims the quiz name', () => {
  const result = parseImportFile(file([quiz({ name: '  A  ' })]))
  assert.equal(result.ok && result.quizzes[0].name, 'A')
})

test('rejects a blank quiz name', () => {
  assert.match(errorOf(file([quiz({ name: '  ' })])), /^Quiz 1: /)
})

test('trims all surrounding whitespace so the database accepts the text', () => {
  const body = 'x'.repeat(200)
  const result = parseImportFile(
    file([
      quiz({
        questions: [question({ body: `\t${body}\n`, choices: ['a ', ' b\t'] , correct: 0 })],
      }),
    ])
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  const q = result.quizzes[0].questions[0]
  assert.equal(q.body, body)
  assert.deepEqual(
    q.choices.map((c) => c.body),
    ['a', 'b']
  )
})

test('rejects a NUL character in any text', () => {
  assert.match(errorOf(file([quiz({ name: 'a\u0000b' })])), /^Quiz 1: /)
  assert.match(
    errorOf(file([quiz({ questions: [question({ body: 'a\u0000' })] })])),
    /^Quiz 1, question 1/
  )
  assert.match(
    errorOf(file([quiz({ questions: [question({ choices: ['a', 'b\u0000'] })] })])),
    /^Quiz 1, question 1/
  )
  assert.match(errorOf(file([quiz({ description: 'x\u0000' })])), /^Quiz 1: /)
})

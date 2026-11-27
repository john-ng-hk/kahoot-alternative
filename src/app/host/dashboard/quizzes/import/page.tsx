'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { Json } from '@/types/supabase'
import { supabase } from '@/types/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImportQuiz, parseImportFile } from '../import-format'

export default function ImportQuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<ImportQuiz[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  /** Quizzes already saved in this import, so a retry resumes instead of creating duplicates */
  const [savedCount, setSavedCount] = useState(0)

  const onFile = async (file: File | undefined) => {
    setQuizzes(null)
    setSavedCount(0)
    setError(null)
    if (!file) return
    const result = parseImportFile(await file.text())
    if (result.ok) setQuizzes(result.quizzes)
    else setError(result.error)
  }

  const runImport = async () => {
    if (!quizzes || saving) return
    setSaving(true)
    setError(null)
    for (let i = savedCount; i < quizzes.length; i++) {
      const quiz = quizzes[i]
      const { error: saveError } = await supabase.rpc('save_quiz_set', {
        p_id: null,
        p_name: quiz.name,
        p_description: quiz.description,
        p_questions: quiz.questions as Json,
      })
      if (saveError) {
        setSaving(false)
        setError(
          `Saved ${i} of ${quizzes.length}. Failed at quiz ${i + 1} ("${quiz.name}"): ${saveError.message} Click Import to retry from quiz ${i + 1}.`
        )
        return
      }
      setSavedCount(i + 1)
    }
    router.push('/host/dashboard/quizzes')
  }

  const questionCount = quizzes?.reduce((sum, q) => sum + q.questions.length, 0)

  return (
    <div className="max-w-3xl">
      <h2 className="mb-4 text-2xl font-bold text-ink">Import quizzes</h2>

      <div className="card mb-4 text-sm text-gray-700">
        <p className="mb-2">
          Upload a JSON file with one or more quizzes. Each question has 2 to 4
          choices. <code>correct</code> is the position of the right choice,
          starting at 0. If the file has an error, nothing is imported.
        </p>
        <pre className="mb-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">
          {`{ "quizzes": [ {
  "name": "Week 1",
  "description": "optional",
  "questions": [ {
    "body": "2+2?",
    "choices": ["3", "4", "5"],
    "correct": 1
  } ]
} ] }`}
        </pre>
        <p>
          Limits: 1 MB, 50 quizzes, question up to 200 characters, choice up to
          100 characters.{' '}
          <a
            href="/quiz-import-example.json"
            download
            className="font-semibold text-accent underline"
          >
            Download an example file
          </a>
        </p>
      </div>

      <input
        type="file"
        accept=".json,application/json"
        data-testid="import-file"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          // Allow choosing the same file again after fixing it
          e.target.value = ''
        }}
        disabled={saving}
        className="mb-4 block"
      />

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {quizzes && (
        <div className="mb-4">
          <p className="mb-2 text-ink" data-testid="import-summary">
            {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'},{' '}
            {questionCount} {questionCount === 1 ? 'question' : 'questions'}
          </p>
          <ul className="mb-4 list-disc pl-6 text-gray-700">
            {quizzes.map((q, i) => (
              <li key={i} className="break-words">
                {q.name} ({q.questions.length})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={runImport} disabled={!quizzes || saving}>
          {saving ? 'Importing...' : 'Import'}
        </Button>
        <Link href="/host/dashboard/quizzes" className="btn-secondary">
          Back
        </Link>
      </div>
    </div>
  )
}

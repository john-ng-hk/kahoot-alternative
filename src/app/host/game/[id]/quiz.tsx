import { TIME_TIL_CHOICE_REVEAL } from '@/constants'
import { Answer, Participant, Question, supabase } from '@/types/types'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import Scoreboard from './scoreboard'

/** Adds answers that are not in the list yet (an answer can arrive both by realtime and by a read) */
const mergeAnswers = (current: Answer[], incoming: Answer[]) => [
  ...current,
  ...incoming.filter((a) => !current.some((c) => c.id === a.id)),
]

export default function Quiz({
  question: question,
  questionCount: questionCount,
  gameId,
  participants,
}: {
  question: Question
  questionCount: number
  gameId: string
  participants: Participant[]
}) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [hasShownChoices, setHasShownChoices] = useState(false)

  const [showScoreboard, setShowScoreboard] = useState(false)

  const [answers, setAnswers] = useState<Answer[]>([])

  const answerStateRef = useRef<Answer[]>()

  /** Players who answered this question. Updated in the event handler itself, because answers can arrive in the same tick, before a render updates answerStateRef. */
  const answeredRef = useRef(new Set<string>())

  const participantCountRef = useRef(participants.length)
  participantCountRef.current = participants.length

  answerStateRef.current = answers

  const getNextQuestion = async () => {
    setError(null)
    var updateData
    if (questionCount == question.order + 1) {
      updateData = { phase: 'result' }
    } else {
      updateData = {
        current_question_sequence: question.order + 1,
        is_answer_revealed: false,
      }
    }

    const { data, error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
    if (error) {
      return setError(error.message)
    }
  }

  const isLastQuestion = questionCount == question.order + 1

  /** The scoreboard sits between reveal and the next question; the last question goes straight to results */
  const onNext = () => {
    if (isLastQuestion) getNextQuestion()
    else setShowScoreboard(true)
  }

  const onTimeUp = async () => {
    setIsAnswerRevealed(true)
    await supabase
      .from('games')
      .update({
        is_answer_revealed: true,
      })
      .eq('id', gameId)
  }

  useEffect(() => {
    setIsAnswerRevealed(false)
    setHasShownChoices(false)
    setShowScoreboard(false)
    setAnswers([])
    answeredRef.current = new Set()
    setError(null)

    setTimeout(() => {
      setHasShownChoices(true)
    }, TIME_TIL_CHOICE_REVEAL)

    const channel = supabase
      .channel('answers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `question_id=eq.${question.id}`,
        },
        (payload) => {
          const answer = payload.new as Answer
          setAnswers((currentAnswers) =>
            mergeAnswers(currentAnswers, [answer])
          )

          answeredRef.current.add(answer.participant_id)
          if (answeredRef.current.size >= participantCountRef.current) {
            onTimeUp()
          }
        }
      )
      .subscribe()

    /** After a resume or refresh the host has missed earlier answers and a reveal; read them back */
    let cancelled = false
    const loadExisting = async () => {
      const [{ data: game }, { data: existing }] = await Promise.all([
        supabase
          .from('games')
          .select('is_answer_revealed')
          .eq('id', gameId)
          .single(),
        // answers has no game id: join through participants so other games on the same quiz are left out
        supabase
          .from('answers')
          .select('*, participants!inner(game_id)')
          .eq('question_id', question.id)
          .eq('participants.game_id', gameId),
      ])
      if (cancelled) return
      if (existing?.length) {
        const rows: Answer[] = existing.map(({ participants, ...a }) => a)
        rows.forEach((a) => answeredRef.current.add(a.participant_id))
        setAnswers((current) => mergeAnswers(current, rows))
      }
      if (game?.is_answer_revealed) setIsAnswerRevealed(true)
    }
    loadExisting()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [question.id])

  if (showScoreboard) {
    return (
      <Scoreboard
        gameId={gameId}
        questionId={question.id}
        onContinue={getNextQuestion}
        error={error}
      />
    )
  }

  const countFor = (choiceId: string) =>
    answers.filter((answer) => answer.choice_id === choiceId).length

  return (
    <div className="relative flex min-h-screen flex-col items-stretch bg-ink text-white">
      {error && (
        <div className="px-4 pt-16">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="absolute right-4 top-4 z-10">
        {isAnswerRevealed && (
          <Button className="px-8 text-lg" onClick={onNext}>
            Next
          </Button>
        )}
      </div>

      <div className="px-8 pb-4 pt-20 text-center">
        <h2 className="mx-auto max-w-5xl break-words rounded-xl border-b-8 border-brand bg-white p-6 text-3xl font-bold text-ink shadow-lg md:text-4xl">
          {question.body}
        </h2>
      </div>

      <div className="flex-grow px-8 text-white">
        {!hasShownChoices && (
          <p className="pt-8 text-center text-2xl text-white/80 motion-safe:animate-pulse-soft">
            Get ready
          </p>
        )}
        {hasShownChoices && !isAnswerRevealed && (
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="text-5xl font-bold">
              <CountdownCircleTimer
                onComplete={() => {
                  onTimeUp()
                }}
                isPlaying
                duration={20}
                size={140}
                strokeWidth={10}
                trailColor="#27272a"
                colors={['#1570ef', '#F7B801', '#dc2626', '#dc2626']}
                colorsTime={[7, 5, 2, 0]}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
            </div>
            <div className="rounded-xl bg-white/10 px-8 py-4 text-center">
              <div className="text-6xl font-bold tabular-nums">
                {answers.length}
              </div>
              <div className="text-2xl text-white/80">Answers</div>
            </div>
          </div>
        )}
        {isAnswerRevealed && (
          <div className="flex justify-center gap-4">
            {question.choices.map((choice, index) => {
              const count = countFor(choice.id)
              return (
                <div
                  key={choice.id}
                  className="flex h-44 w-28 flex-col items-stretch justify-end"
                >
                  <div className="mb-1 text-center text-2xl font-bold tabular-nums">
                    {count}
                  </div>
                  <div className="relative min-h-[4px] flex-grow">
                    <div
                      style={{
                        height: `${(count * 100) / (answers.length || 1)}%`,
                      }}
                      className={`absolute bottom-0 left-0 right-0 min-h-[4px] origin-bottom rounded-t motion-safe:animate-grow answer-${index} ${
                        choice.is_correct ? '' : 'opacity-60'
                      }`}
                    ></div>
                  </div>
                  <div
                    className={`mt-1 rounded-b py-2 text-center text-xl font-bold answer-${index} ${
                      choice.is_correct ? '' : 'opacity-60'
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {hasShownChoices && (
        <div className="grid grid-cols-2 gap-3 p-4">
          {question.choices.map((choice, index) => (
            <div
              key={choice.id}
              className={
                question.choices.length % 2 === 1 &&
                index === question.choices.length - 1
                  ? 'col-span-2'
                  : ''
              }
            >
              <div
                style={{ animationDelay: `${index * 80}ms` }}
                className={`flex w-full items-center gap-4 rounded-lg px-4 py-6 text-2xl font-bold shadow-md motion-safe:animate-fade-up answer-${index} ${
                  isAnswerRevealed && !choice.is_correct ? 'opacity-50' : ''
                } ${
                  isAnswerRevealed && choice.is_correct
                    ? 'ring-4 ring-white'
                    : ''
                }`}
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/20 text-xl">
                  {String.fromCharCode(65 + index)}
                </span>
                <div className="min-w-0 flex-grow break-words">
                  {choice.body}
                </div>
                {isAnswerRevealed && (
                  <div className="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={5}
                      stroke="currentColor"
                      className="h-8 w-8"
                      aria-label={choice.is_correct ? 'Correct' : 'Incorrect'}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={
                          choice.is_correct
                            ? 'm4.5 12.75 6 6 9-13.5'
                            : 'M6 18 18 6M6 6l12 12'
                        }
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-black px-4 py-2">
        <div className="text-xl text-white/80">
          Question {question.order + 1} of {questionCount}
        </div>
        <div className="mt-2 h-1 rounded bg-white/15">
          <div
            className="h-1 rounded bg-brand transition-[width] duration-500"
            style={{
              width: `${((question.order + 1) * 100) / questionCount}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}

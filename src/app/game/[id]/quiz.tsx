import { QUESTION_ANSWER_TIME, TIME_TIL_CHOICE_REVEAL } from '@/constants'
import { Notice } from '@/components/ui/notice'
import { Choice, Question, supabase } from '@/types/types'
import { useState, useEffect } from 'react'
import { ColorFormat, CountdownCircleTimer } from 'react-countdown-circle-timer'

export default function Quiz({
  question: question,
  questionCount: questionCount,
  participantId: playerId,
  isAnswerRevealed,
}: {
  question: Question
  questionCount: number
  participantId: string
  isAnswerRevealed: boolean
}) {
  const [chosenChoice, setChosenChoice] = useState<Choice | null>(null)

  const [hasShownChoices, setHasShownChoices] = useState(false)

  const [questionStartTime, setQuestionStartTime] = useState(Date.now())

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setChosenChoice(null)
    setHasShownChoices(false)
    setError(null)
  }, [question.id])

  /** Long answers get a full-width row each; two narrow columns would break words */
  const hasLongChoice = question.choices.some((c) => c.body.length > 30)

  const answer = async (choice: Choice) => {
    setChosenChoice(choice)

    const now = Date.now()
    const score = !choice.is_correct
      ? 0
      : 1000 -
        Math.round(
          Math.max(
            0,
            Math.min((now - questionStartTime) / QUESTION_ANSWER_TIME, 1)
          ) * 1000
        )

    const { error } = await supabase.from('answers').insert({
      participant_id: playerId,
      question_id: question.id,
      choice_id: choice.id,
      score,
    })
    if (error) {
      setChosenChoice(null)
      setError(error.message)
    }
  }

  return (
    <div className="h-screen flex flex-col items-stretch bg-ink text-white relative">
      <div className="px-4 pt-8 pb-4 text-center">
        <h2 className="mx-auto max-w-3xl break-words rounded-xl border-b-8 border-brand bg-white p-6 text-2xl font-bold text-ink shadow-lg md:text-3xl">
          {question.body}
        </h2>
      </div>
      {error && (
        <div className="px-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {!isAnswerRevealed && chosenChoice && (
        <div className="flex-grow flex justify-center items-center">
          <div className="p-4 text-center text-2xl text-white motion-safe:animate-pulse-soft">
            Wait for others to answer...
          </div>
        </div>
      )}

      {!hasShownChoices && !isAnswerRevealed && (
        <div className="flex-grow text-transparent flex justify-center">
          <CountdownCircleTimer
            onComplete={() => {
              setHasShownChoices(true)
              setQuestionStartTime(Date.now())
            }}
            isPlaying
            duration={TIME_TIL_CHOICE_REVEAL / 1000}
            colors={['#fff', '#fff', '#fff', '#fff']}
            trailColor={'transparent' as ColorFormat}
            colorsTime={[7, 5, 2, 0]}
          >
            {({ remainingTime }) => remainingTime}
          </CountdownCircleTimer>
        </div>
      )}

      {hasShownChoices && !isAnswerRevealed && !chosenChoice && (
        <div className="flex-grow flex flex-col items-stretch">
          <div className="flex-grow"></div>
          <div
            className={`grid gap-3 p-4 ${
              hasLongChoice ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {question.choices.map((choice, index) => (
              <div
                key={choice.id}
                className={
                  !hasLongChoice &&
                  question.choices.length % 2 === 1 &&
                  index === question.choices.length - 1
                    ? 'col-span-2'
                    : ''
                }
              >
                <button
                  onClick={() => answer(choice)}
                  disabled={chosenChoice !== null || isAnswerRevealed}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`flex min-h-[64px] w-full items-center justify-between gap-3 rounded-lg px-4 py-6 text-xl font-bold shadow-md transition-transform active:scale-95 motion-safe:animate-fade-up answer-${index} ${
                    isAnswerRevealed && !choice.is_correct ? 'opacity-60' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/20 font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div className="min-w-0 flex-grow break-words text-left">
                    {choice.body}
                  </div>
                  {isAnswerRevealed && (
                    <div>
                      {choice.is_correct && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={5}
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                      {!choice.is_correct && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={5}
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAnswerRevealed && (
        <div className="flex flex-grow flex-col items-center justify-center">
          <div
            className={`rounded-full p-6 text-white shadow-lg motion-safe:animate-pop ${
              chosenChoice?.is_correct ? 'bg-answer-green' : 'bg-answer-red'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={4}
              stroke="currentColor"
              className="h-16 w-16"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  chosenChoice?.is_correct
                    ? 'm4.5 12.75 6 6 9-13.5'
                    : 'M6 18 18 6M6 6l12 12'
                }
              />
            </svg>
          </div>
          <h2 className="pt-4 text-center text-3xl font-bold text-white">
            {chosenChoice?.is_correct ? 'Correct' : 'Incorrect'}
          </h2>
        </div>
      )}

      <div className="flex items-center bg-black px-4 py-2 text-lg text-white">
        <div>
          Question {question.order + 1} of {questionCount}
        </div>
      </div>
    </div>
  )
}

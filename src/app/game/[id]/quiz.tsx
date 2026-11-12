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
        <h2 className="mx-auto max-w-3xl break-words rounded-xl bg-white p-6 text-2xl font-bold text-ink md:text-3xl">
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
          <div className="text-white text-2xl text-center p-4">
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
                <button
                  onClick={() => answer(choice)}
                  disabled={chosenChoice !== null || isAnswerRevealed}
                  className={`min-h-[44px] w-full rounded px-4 py-6 text-xl font-bold flex items-center justify-between gap-3 answer-${index} ${
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
        <div className="flex-grow flex justify-center items-center flex-col">
          <h2 className="text-white text-2xl text-center pb-2">
            {chosenChoice?.is_correct ? 'Correct' : 'Incorrect'}
          </h2>
          <div
            className={`text-white rounded-full p-4  ${
              chosenChoice?.is_correct ? 'bg-answer-green' : 'bg-answer-red'
            }`}
          >
            {chosenChoice?.is_correct && (
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
            {!chosenChoice?.is_correct && (
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
        </div>
      )}

      <div className="flex items-center bg-black px-4 py-2 text-lg text-white">
        <div>
          {question.order + 1}/{questionCount}
        </div>
      </div>
    </div>
  )
}

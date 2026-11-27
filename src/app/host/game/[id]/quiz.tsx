import { TIME_TIL_CHOICE_REVEAL } from '@/constants'
import { Answer, Participant, Question, supabase } from '@/types/types'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import Scoreboard from './scoreboard'

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
          setAnswers((currentAnswers) => {
            return [...currentAnswers, answer]
          })

          answeredRef.current.add(answer.participant_id)
          if (answeredRef.current.size >= participantCountRef.current) {
            onTimeUp()
          }
        }
      )
      .subscribe()

    return () => {
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

  return (
    <div className="h-screen flex flex-col items-stretch bg-ink text-white relative">
      {error && (
        <div className="px-4 pt-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <div className="absolute right-4 top-4">
        {isAnswerRevealed && (
          <Button variant="secondary" onClick={onNext}>
            Next
          </Button>
        )}
      </div>

      <div className="px-8 pt-12 pb-6 text-center">
        <h2 className="mx-auto max-w-5xl break-words rounded-xl bg-white p-6 text-3xl font-bold text-ink">
          {question.body}
        </h2>
      </div>

      <div className="flex-grow text-white px-8">
        {hasShownChoices && !isAnswerRevealed && (
          <div className="flex justify-between items-center">
            <div className="text-5xl">
              <CountdownCircleTimer
                onComplete={() => {
                  onTimeUp()
                }}
                isPlaying
                duration={20}
                colors={['#004777', '#F7B801', '#A30000', '#A30000']}
                colorsTime={[7, 5, 2, 0]}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
            </div>
            <div className="text-center">
              <div className="text-6xl pb-4">{answers.length}</div>
              <div className="text-3xl">Answers</div>
            </div>
          </div>
        )}
        {isAnswerRevealed && (
          <div className="flex justify-center">
            {question.choices.map((choice, index) => (
              <div
                key={choice.id}
                className="mx-2 h-48 w-24 flex flex-col items-stretch justify-end"
              >
                <div className="flex-grow relative">
                  <div
                    style={{
                      height: `${
                        (answers.filter(
                          (answer) => answer.choice_id === choice.id
                        ).length *
                          100) /
                        (answers.length || 1)
                      }%`,
                    }}
                    className={`absolute bottom-0 left-0 right-0 mb-1 rounded-t answer-${index}`}
                  ></div>
                </div>
                <div
                  className={`mt-1 text-lg text-center py-2 rounded-b answer-${index}`}
                >
                  {String.fromCharCode(65 + index)} ·{' '}
                  {
                    answers.filter((answer) => answer.choice_id === choice.id)
                      .length
                  }
                </div>
              </div>
            ))}
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
                className={`px-4 py-6 w-full text-2xl rounded font-bold flex justify-between answer-${index} ${
                  isAnswerRevealed && !choice.is_correct ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 break-words">{choice.body}</div>
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
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex text-white py-2 px-4 items-center bg-black">
        <div className="text-2xl">
          {question.order + 1}/{questionCount}
        </div>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Participant, supabase } from '@/types/types'
import { on } from 'events'
import { FormEvent, useEffect, useState } from 'react'

export default function Lobby({
  gameId,
  onRegisterCompleted,
}: {
  gameId: string
  onRegisterCompleted: (participant: Participant) => void
}) {
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchParticipant = async () => {
      let userId: string | null = null

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionData.session) {
        userId = sessionData.session?.user.id ?? null
      } else {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) console.error(error)
        userId = data?.user?.id ?? null
      }

      if (!userId) {
        return
      }

      const { data: participantData, error } = await supabase
        .from('participants')
        .select()
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return setError(error.message)
      }

      if (participantData) {
        setParticipant(participantData)
        onRegisterCompleted(participantData)
      }
    }

    fetchParticipant()
  }, [gameId, onRegisterCompleted])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        {!participant && (
          <Register
            gameId={gameId}
            onRegisterCompleted={(participant) => {
              onRegisterCompleted(participant)
              setParticipant(participant)
            }}
          />
        )}

        {participant && (
          <div>
            <h1 className="pb-4 text-2xl font-bold break-words">
              Welcome {participant.nickname}！
            </h1>
            <p className="text-gray-700">
              You have been registered and your nickname should show up on the
              admin screen. Please sit back and wait until the game master
              starts the game.
            </p>
          </div>
        )}

        {error && <Notice>{error}</Notice>}
      </div>
    </div>
  )
}

function Register({
  onRegisterCompleted,
  gameId,
}: {
  onRegisterCompleted: (player: Participant) => void
  gameId: string
}) {
  const [nickname, setNickname] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!nickname) {
      return
    }
    setSending(true)
    setError(null)
    const { data: participant, error } = await supabase
      .from('participants')
      .insert({ nickname, game_id: gameId })
      .select()
      .single()

    if (error) {
      setSending(false)

      return setError(error.message)
    }

    onRegisterCompleted(participant)
  }

  return (
    <form onSubmit={(e) => onFormSubmit(e)}>
      <label htmlFor="nickname" className="block pb-2 font-semibold">
        Your nickname
      </label>
      <input
        id="nickname"
        className="input"
        type="text"
        onChange={(val) => setNickname(val.currentTarget.value)}
        placeholder="Nickname"
        maxLength={20}
      />
      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <Button type="submit" disabled={sending} className="mt-4 w-full">
        Join
      </Button>
    </form>
  )
}

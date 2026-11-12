import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Participant, supabase } from '@/types/types'
import { useQRCode } from 'next-qrcode'
import { useEffect, useState } from 'react'

export default function Lobby({
  participants: participants,
  gameId,
}: {
  participants: Participant[]
  gameId: string
}) {
  const { Canvas } = useQRCode()

  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const [error, setError] = useState<string | null>(null)

  const onClickStartGame = async () => {
    const { data, error } = await supabase
      .from('games')
      .update({ phase: 'quiz' })
      .eq('id', gameId)
    if (error) {
      return setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center p-6">
      <div className="grid w-full max-w-5xl items-start gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-bold">
            Players ({participants.length})
          </h1>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="flex flex-wrap gap-3">
              {participants.map((participant) => (
                <div
                  className="rounded-full bg-accent px-4 py-2 text-lg break-words"
                  key={participant.id}
                >
                  {participant.nickname}
                </div>
              ))}
            </div>
          </div>
          {error && <Notice>{error}</Notice>}
          <Button className="self-start text-xl" onClick={onClickStartGame}>
            Start Game
          </Button>
        </div>
        <div className="card flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-ink">Scan to join</h2>
          {origin && (
            <Canvas
              text={`${origin}/game/${gameId}`}
              options={{
                errorCorrectionLevel: 'M',
                margin: 3,
                scale: 4,
                width: 400,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { BrandLogo } from '@/components/brand'
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
    <div className="flex min-h-screen items-center justify-center bg-ink bg-[radial-gradient(ellipse_at_top_right,rgb(var(--brand-primary)/0.35),transparent_60%)] p-6 pt-24 text-white">
      <div className="grid w-full max-w-5xl items-start gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <BrandLogo />
          <h1 className="text-4xl font-bold">
            Players{' '}
            <span className="rounded-full bg-white/15 px-3 py-1 text-3xl">
              {participants.length}
            </span>
          </h1>
          <div className="max-h-[50vh] overflow-y-auto">
            {participants.length === 0 && (
              <p className="text-xl text-white/80 motion-safe:animate-pulse-soft">
                Waiting for players
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {participants.map((participant) => (
                <div
                  className="rounded-full bg-brand px-5 py-2 text-xl font-semibold break-words shadow-md motion-safe:animate-fade-up"
                  key={participant.id}
                >
                  {participant.nickname}
                </div>
              ))}
            </div>
          </div>
          {error && <Notice>{error}</Notice>}
          <Button className="self-start px-8 py-4 text-2xl" onClick={onClickStartGame}>
            Start game
          </Button>
        </div>
        <div className="card flex flex-col items-center gap-4 p-8">
          <h2 className="text-3xl font-bold text-ink">Scan to join</h2>
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
          {origin && (
            <p className="max-w-full break-all text-center text-sm text-gray-700">
              {origin}/game/{gameId}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

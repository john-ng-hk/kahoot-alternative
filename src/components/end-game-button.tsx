'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { supabase } from '@/types/types'
import { useState } from 'react'

/**
 * Ends a game early by moving it to the `result` phase. Realtime updates move the host
 * and the players to their results screens. Asks for confirmation first.
 */
export function EndGameButton({
  gameId,
  onEnded,
  className = '',
}: {
  gameId: string
  onEnded?: () => void
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endGame = async () => {
    setEnding(true)
    setError(null)
    const { data, error } = await supabase
      .from('games')
      .update({ phase: 'result' })
      .eq('id', gameId)
      .select('id')
    setEnding(false)
    // RLS hides games the user does not host: the update succeeds with zero rows and no error
    if (error || !data || data.length === 0) {
      if (error) console.error(error)
      setError('Could not end the game. Try again.')
      return
    }
    setConfirming(false)
    onEnded?.()
  }

  if (!confirming) {
    return (
      <div className={className}>
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          End game
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`flex max-w-xs flex-col gap-2 rounded-xl bg-white p-3 text-ink shadow-md ${className}`.trim()}
    >
      <p className="font-semibold">End this game now?</p>
      {error && <Notice>{error}</Notice>}
      <div className="flex gap-2">
        <Button onClick={endGame} disabled={ending}>
          Confirm
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          disabled={ending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

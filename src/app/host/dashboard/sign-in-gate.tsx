'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { supabase } from '@/types/types'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type GateState = 'loading' | 'signed-out' | 'signed-in'

/** Host pages need an email sign-in. Anonymous sessions cannot own quizzes (RLS enforces this too). */
export default function SignInGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('loading')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // is_anonymous is in the JWT and on the user object, but missing from this supabase-js version's User type
    const applySession = (user: User | null | undefined) => {
      const isAnonymous = (user as (User & { is_anonymous?: boolean }) | undefined)?.is_anonymous === true
      setState(user && !isAnonymous ? 'signed-in' : 'signed-out')
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session?.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const sendLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/host/dashboard`,
      },
    })
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (state === 'loading') {
    return <p className="text-gray-700">Loading...</p>
  }

  if (state === 'signed-in') {
    return <>{children}</>
  }

  return (
    <div className="card max-w-md">
      <h2 className="mb-2 text-xl font-bold">Sign in to host</h2>
      <p className="mb-4 text-gray-700">
        Enter your email. We will send you a sign-in link. Quizzes you create
        are tied to this email account.
      </p>
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {sent ? (
        <p className="text-ink">
          Check your email for the sign-in link. You can close this tab after
          you open it.
        </p>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-ink">
            <span className="font-bold">Email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send sign-in link'}
          </Button>
        </form>
      )}
    </div>
  )
}

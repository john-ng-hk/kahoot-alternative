'use client'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { supabase } from '@/types/types'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type GateState = 'loading' | 'signed-out' | 'signed-in'

/** Host pages need an email sign-in. Anonymous sessions cannot own quizzes (RLS enforces this too). */
export default function SignInGate({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = useState<GateState>('loading')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    // is_anonymous is in the JWT and on the user object, but missing from this supabase-js version's User type
    const applySession = (user: User | null | undefined) => {
      const isAnonymous =
        (user as (User & { is_anonymous?: boolean }) | undefined)
          ?.is_anonymous === true
      setState(user && !isAnonymous ? 'signed-in' : 'signed-out')
    }

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session?.user))

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session?.user)
      }
    )
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

  /** Sign in with the code from the email. Mail scanners can open the link and use it up, but they cannot enter a code. */
  const verifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setVerifying(false)
    if (error) {
      setError(error.message)
      return
    }
    // onAuthStateChange switches the page to the signed-in view
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
        Enter your email. We will send you a sign-in code and link. Quizzes you create
        are tied to this email account.
      </p>
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {sent ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-ink">
            We sent an email to <strong className="break-all">{email.trim()}</strong>.
            Enter the code from the email, or open the link in it.
          </p>
          <label className="flex flex-col gap-1 text-ink">
            <span className="font-bold">Code</span>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              minLength={6}
              maxLength={10}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={verifying}>
            {verifying ? 'Checking...' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="text-left text-sm text-accent underline"
            onClick={() => {
              setSent(false)
              setCode('')
              setError(null)
            }}
          >
            Use a different email
          </button>
        </form>
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

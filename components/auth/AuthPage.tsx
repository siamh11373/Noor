'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/providers/AuthProvider'
import { getSiteUrl } from '@/lib/supabase/env'
import { useSalahStore } from '@/lib/store'
import { cn, isSafeRedirect } from '@/lib/utils'

function messageForKey(key: string | null) {
  switch (key) {
    case 'verify-email':
      return 'Verify your email before opening your dashboard.'
    case 'supabase-not-configured':
      return 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable account creation.'
    case 'invalid-auth-link':
      return 'That auth link is no longer valid. Request a fresh one.'
    default:
      return ''
  }
}

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { client, isConfigured, user } = useAuth()
  const onboardingStatus = useSalahStore(state => state.onboardingStatus)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  // SECURITY FIX: validate the 'next' redirect parameter to prevent open redirect attacks.
  // An attacker could craft ?next=//evil.com which would pass a bare startsWith('/') check.
  const rawNext = searchParams.get('next')
  const next = isSafeRedirect(rawNext) ? rawNext : '/faith'

  const routeMessage = messageForKey(searchParams.get('message'))
  const submitLabel = mode === 'login' ? 'Sign in' : 'Create account'
  const heading = mode === 'login' ? "Welcome back, let's bring noor into your week" : 'Create your Noor account'
  const description = mode === 'login'
    ? 'Pick up where you left off and continue inside your private faith-first operating system.'
    : 'Create one personal account, verify your email, then finish your prayer setup before the dashboard unlocks.'

  const redirectTarget = useMemo(() => {
    if (!user?.emailConfirmedAt) {
      return null
    }

    if (onboardingStatus === 'complete') {
      return next
    }

    if (onboardingStatus === 'required') {
      return '/onboarding'
    }

    return null
  }, [next, onboardingStatus, user?.emailConfirmedAt])

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget)
    }
  }, [redirectTarget, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!client || !isConfigured) {
      setError('Supabase is not configured for this app yet.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    setInfo('')

    if (mode === 'login') {
      const { error: signInError } = await client.auth.signInWithPassword({ email, password })

      if (signInError) {
        if (/confirm|verified/i.test(signInError.message)) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          return
        }

        // SECURITY FIX: show a generic error instead of the raw Supabase message to avoid
        // leaking internal error details or account-existence information to the client
        setError('Invalid email or password.')
        setSubmitting(false)
        return
      }

      router.replace(next)
      router.refresh()
      return
    }

    const callbackUrl = new URL('/auth/callback', getSiteUrl())
    callbackUrl.searchParams.set('next', '/onboarding')

    const { error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        data: {
          display_name: displayName.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        },
      },
    })

    if (signUpError) {
      // SECURITY FIX: show generic message to prevent revealing whether an email is already registered
      setError('Could not create your account. If you already have an account, try signing in.')
      setSubmitting(false)
      return
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}&new=1`)
  }

  return (
    <AuthShell
      eyebrow={mode === 'login' ? 'Private Access' : 'Create Account'}
      title={heading}
      description={description}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/40">
          <span>Email verification is required before the dashboard unlocks.</span>
          <Link href={mode === 'login' ? '/signup' : '/login'} className="text-[rgb(214,170,95)] hover:text-[rgb(224,190,120)]">
            {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
          </Link>
        </div>
      }
    >
      {(routeMessage || info || error) && (
        <div
          className={cn(
            'mb-5 rounded-2xl border px-4 py-3 text-[13px]',
            error
              ? 'border-fitness/20 bg-fitness-light/50 text-fitness-text'
              : 'border-brand-200 bg-brand-50 text-ink-secondary'
          )}
        >
          {error || info || routeMessage}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
              Display name
            </label>
            <input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              className="input-base"
              placeholder="How should we address you?"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="input-base"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className={cn('grid gap-4', mode === 'signup' ? 'md:grid-cols-2' : undefined)}>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="input-base"
              placeholder="At least 12 characters"
              minLength={12}
              required
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                className="input-base"
                placeholder="Re-enter password"
                minLength={12}
                required
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-[13px] leading-6 text-ink-secondary">
          Your account is for one private prayer-centered dashboard. Setup for madhab, location, notifications,
          weekly split, and optional accountability happens after signup.
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={submitting || !isConfigured}>
          {submitting ? 'Working...' : submitLabel}
        </button>

        <div className="flex items-center justify-between text-[13px] text-white/40">
          <span>{mode === 'login' ? 'No shared workspace or roles.' : 'No restaurant/shelter roles.'}</span>
          <Link href="/reset-password" className="text-[rgb(214,170,95)] hover:text-[rgb(224,190,120)]">
            Reset password
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/providers/AuthProvider'
import { getSiteUrl } from '@/lib/supabase/env'
import { useSalahStore } from '@/lib/store'
import { MADHAB_OPTIONS, MADHAB_META } from '@/lib/madhabs'
import type { Madhab } from '@/types'
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
  const [madhab, setMadhab] = useState<Madhab>('hanafi')
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
          madhab,
        },
      },
    })

    if (signUpError) {
      // Production: generic copy. Development: show Supabase message + targeted hints.
      if (process.env.NODE_ENV === 'development') {
        const msg = signUpError.message ?? 'Unknown error'
        const keyHint =
          /unregistered api key|invalid api key|jwt/i.test(msg)
            ? ' Fix: Supabase → Settings → API → **Legacy anon, service_role API keys** → copy the **anon** `public` JWT (eyJ…) into NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, restart dev. Ensure it matches the same project as NEXT_PUBLIC_SUPABASE_URL.'
            : ` emailRedirectTo: ${callbackUrl.toString()} (if the error is about redirect, add this URL under Authentication → URL Configuration).`
        setError(`[dev] ${msg} —${keyHint}`)
      } else {
        setError('Could not create an account. Try again or sign in if you already have one.')
      }
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
          <Link href={mode === 'login' ? '/signup' : '/login'} className="text-[rgb(212,165,116)] hover:text-[rgb(237,196,146)]">
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
              : 'border-white/14 bg-white/[0.07] text-white/[0.92]'
          )}
        >
          {error || info || routeMessage}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
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

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
                Madhab
              </label>
              <select
                value={madhab}
                onChange={event => setMadhab(event.target.value as Madhab)}
                className="input-base"
              >
                {MADHAB_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-snug text-white/40">
                {MADHAB_META[madhab].description} You can change this later in Account settings.
              </p>
            </div>
          </>
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
              placeholder="At least 8 characters"
              minLength={8}
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
                minLength={8}
                required
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-[13px] leading-6 text-ink-secondary">
          Your account is for one private prayer-centered dashboard. Setup for location, notifications,
          weekly split, and optional accountability happens after signup.
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={submitting || !isConfigured}>
          {submitting ? 'Working...' : submitLabel}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[12px] text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (!client || !isConfigured) return
            void client.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${getSiteUrl()}/auth/callback` },
            })
          }}
          disabled={!isConfigured}
          className="flex w-full items-center justify-center gap-3 rounded-[10px] border border-white/12 bg-white/[0.07] py-3 text-[14px] font-medium text-white/90 transition-colors hover:bg-white/[0.11] disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center justify-between text-[13px] text-white/40">
          <span>{mode === 'login' ? 'No shared workspace or roles.' : 'Personal account.'}</span>
          <Link href="/reset-password" className="text-[rgb(212,165,116)] hover:text-[rgb(237,196,146)]">
            Reset password
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

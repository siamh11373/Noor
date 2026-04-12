'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/providers/AuthProvider'
import { getSiteUrl } from '@/lib/supabase/env'
import { cn } from '@/lib/utils'

export function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const { client, isConfigured, user } = useAuth()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(searchParams.get('new') ? 'Check your inbox for the verification link we just sent.' : '')
  const [error, setError] = useState('')

  const email = useMemo(() => searchParams.get('email') || user?.email || '', [searchParams, user?.email])

  async function handleResend() {
    if (!client || !isConfigured || !email) {
      setError('Add your email address to resend the verification link.')
      return
    }

    setSending(true)
    setError('')
    setMessage('')

    const callbackUrl = new URL('/auth/callback', getSiteUrl())
    callbackUrl.searchParams.set('next', '/onboarding')

    const { error: resendError } = await client.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (resendError) {
      setError(resendError.message)
      setSending(false)
      return
    }

    setMessage('Verification email sent again. Open the newest message in your inbox.')
    setSending(false)
  }

  return (
    <AuthShell
      eyebrow="Verify Email"
      title="Confirm your account before setup"
      description="Your dashboard stays locked until your email is verified. After that, you’ll be routed into onboarding to finish your prayer and weekly defaults."
      footer={
        <div className="flex items-center justify-between gap-3 text-[13px] text-ink-ghost">
          <span>Already verified?</span>
          <Link href="/login" className="text-brand-400 hover:text-brand-500">
            Return to sign in
          </Link>
        </div>
      }
    >
      {(message || error) && (
        <div
          className={cn(
            'mb-5 rounded-2xl border px-4 py-3 text-[13px]',
            error
              ? 'border-fitness/20 bg-fitness-light/50 text-fitness-text'
              : 'border-brand-200 bg-brand-50 text-ink-secondary'
          )}
        >
          {error || message}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Verification email</p>
          <p className="mt-2 text-[16px] font-medium text-ink-primary">{email || 'Use the same email address you signed up with.'}</p>
          <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
            Open the link in your inbox. Once it confirms your account, you’ll continue to onboarding automatically.
          </p>
        </div>

        <button onClick={() => void handleResend()} className="btn-primary w-full justify-center py-3" disabled={sending || !isConfigured}>
          {sending ? 'Sending...' : 'Resend verification email'}
        </button>

        <div className="text-[13px] text-ink-ghost">
          <Link href="/signup" className="text-brand-400 hover:text-brand-500">
            Create a different account
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}

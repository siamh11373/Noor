'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/providers/AuthProvider'
import { getSiteUrl } from '@/lib/supabase/env'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { client, isConfigured, user } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canUpdatePassword = Boolean(user)

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!client || !isConfigured) {
      setError('Supabase is not configured for this app yet.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    const callbackUrl = new URL('/auth/callback', getSiteUrl())
    callbackUrl.searchParams.set('next', '/reset-password')

    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    })

    if (resetError) {
      setError(resetError.message)
      setSubmitting(false)
      return
    }

    setMessage('Password reset email sent. Open the link in your inbox to set a new password.')
    setSubmitting(false)
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!client || !isConfigured) {
      setError('Supabase is not configured for this app yet.')
      return
    }

    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    const { error: updateError } = await client.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    setMessage('Password updated.')
    setSubmitting(false)
    router.push('/account')
  }

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title={canUpdatePassword ? 'Set a new password' : 'Reset your password'}
      description={
        canUpdatePassword
          ? 'Choose a new password for your Noor account.'
          : 'Request a password reset email. The secure link will bring you back here.'
      }
      footer={
        <Link href={user ? '/account' : '/login'} className="text-[13px] text-brand-400 hover:text-brand-500">
          {user ? 'Back to account' : 'Back to login'}
        </Link>
      }
    >
      {(message || error) && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-[13px] ${
            error
              ? 'border-fitness/20 bg-fitness-light/40 text-fitness-text'
              : 'border-brand-200 bg-brand-50 text-ink-secondary'
          }`}
        >
          {error || message}
        </div>
      )}

      {canUpdatePassword ? (
        <form className="space-y-4" onSubmit={handleUpdatePassword}>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="input-base"
            placeholder="New password"
            minLength={8}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            className="input-base"
            placeholder="Confirm new password"
            minLength={8}
            required
          />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={submitting || !isConfigured}>
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleRequestReset}>
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="input-base"
            placeholder="you@example.com"
            required
          />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={submitting || !isConfigured}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

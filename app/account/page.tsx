'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardPanel, PageHero } from '@/components/ui'
import { useAuth } from '@/components/providers/AuthProvider'

// SECURITY FIX: enforce a maximum display name length to prevent oversized data in the database
const DISPLAY_NAME_MAX_LENGTH = 100

export default function AccountPage() {
  const { client, profile, user, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
  }, [profile?.display_name])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!client || !user) {
      return
    }

    // SECURITY FIX: validate display name length before writing to the database
    const trimmed = displayName.trim() || null
    if (trimmed && trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`)
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const { error: updateError } = await client
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id)

    if (updateError) {
      // SECURITY FIX: show generic error instead of raw Supabase error message to avoid
      // leaking database internals or constraint names to the client
      setError('Could not save changes. Please try again.')
      setSaving(false)
      return
    }

    await refreshProfile()
    setMessage('Account updated.')
    setSaving(false)
  }

  return (
    <main className="space-y-5 px-6 py-6">
      <PageHero
        eyebrow="Account"
        title="Settings"
        description="Manage the name shown in your accountability circle and the email attached to your personal account."
      />

      <DashboardPanel title="Profile details" description="Keep your personal account details current.">
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

        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
              Display name
            </label>
            <input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              className="input-base"
              placeholder="Your name"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
              Email
            </label>
            <input value={user?.email ?? ''} className="input-base" disabled />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className="btn-primary px-5" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <Link href="/reset-password" className="btn-secondary">
              Reset password
            </Link>
          </div>
        </form>
      </DashboardPanel>
    </main>
  )
}

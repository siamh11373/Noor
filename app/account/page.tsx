'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardPanel, PageHero } from '@/components/ui'
import { useAuth } from '@/components/providers/AuthProvider'

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

    setSaving(true)
    setError('')
    setMessage('')

    const { error: updateError } = await client
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
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

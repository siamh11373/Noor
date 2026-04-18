'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** 1:1 accountability invite links open Circles (pairing is managed there). */
export function pairingInviteUrl(code: string) {
  if (typeof window === 'undefined') {
    return `/circles?invite=${encodeURIComponent(code)}`
  }
  return `${window.location.origin}/circles?invite=${encodeURIComponent(code)}`
}

export function randomPairingInviteCode() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  }
  return Math.random().toString(36).slice(2, 12).toUpperCase()
}

export function PairingInviteLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { client, user, refreshAccountability } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setInviteCode('')
      setInviteLink('')
      setError('')
      setCopied(false)
      setLoading(false)
      return
    }

    if (!client || !user) {
      setError('You need an account session before generating an invite.')
      return
    }

    const supabase = client
    const authUser = user
    let cancelled = false

    async function generateInvite() {
      setLoading(true)
      setError('')

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = randomPairingInviteCode()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data, error: insertError } = await supabase
          .from('accountability_invites')
          .insert({
            created_by: authUser.id,
            code,
            expires_at: expiresAt,
          })
          .select('*')
          .single()

        if (!insertError && data) {
          if (!cancelled) {
            setInviteCode(data.code)
            setInviteLink(pairingInviteUrl(data.code))
            setLoading(false)
            void refreshAccountability()
          }
          return
        }
      }

      if (!cancelled) {
        setError('Could not generate an invite code right now.')
        setLoading(false)
      }
    }

    void generateInvite()

    return () => {
      cancelled = true
    }
  }, [client, open, refreshAccountability, user])

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogHeader>
          <DialogTitle>Pairing invite link</DialogTitle>
          <DialogDescription>
            Share with another signed-in user. They join from Circles — weekly score and trend only, no private logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Invite code</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[0.18em] text-ink-primary">
              {loading ? 'Generating…' : inviteCode || '—'}
            </p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Invite link</p>
            <p className="mt-2 break-all text-[12px] text-ink-secondary">{inviteLink || 'Generating link…'}</p>
          </div>
          {error ? <p className="text-[12px] text-fitness-text">{error}</p> : null}
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="btn-secondary">
            Close
          </button>
          <button type="button" onClick={() => void handleCopy()} className="btn-primary" disabled={!inviteLink || loading}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PairingPendingInviteRow({ invite }: { invite: { id: string; code: string; expires_at: string } }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(pairingInviteUrl(invite.code))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-tasks-border bg-tasks-light/40 px-4 py-3 dark:bg-tasks-light/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-ink-primary">Pairing code: {invite.code}</p>
          <p className="mt-0.5 text-[10px] text-ink-ghost">
            Expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button type="button" onClick={() => void handleCopy()} className="btn-secondary px-3 py-1.5 text-[12px]">
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

export function JoinPairingDialog({
  open,
  onOpenChange,
  initialCode,
  onAccepted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCode: string
  onAccepted: () => void
}) {
  const { client } = useAuth()
  const [code, setCode] = useState(initialCode)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(initialCode)
      setError('')
      setMessage('')
    }
  }, [initialCode, open])

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()

    if (!client || trimmed.length < 4) {
      setError('Enter a valid invite code.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    const { data, error: rpcError } = await client.rpc('accept_accountability_invite', {
      invite_code: trimmed,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    const status = typeof data === 'object' && data && 'status' in data ? String(data.status) : 'invalid'

    if (status === 'accepted') {
      setMessage('You are now connected in the accountability circle.')
      setLoading(false)
      onAccepted()
      onOpenChange(false)
      return
    }

    const statusMessage =
      {
        invalid: 'That invite code does not exist.',
        expired: 'That invite has expired.',
        revoked: 'That invite was revoked.',
        self: 'You cannot join your own invite.',
        duplicate: 'You are already connected to this brother.',
        accepted_already: 'That invite was already accepted.',
        unauthenticated: 'Sign in before accepting an invite.',
      }[status] ?? 'This invite could not be accepted.'

    setError(statusMessage)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogHeader>
          <DialogTitle>Join with pairing code</DialogTitle>
          <DialogDescription>Accept a 1:1 accountability invite (weekly score and trend only).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
              if (error) setError('')
            }}
            onKeyDown={(event) => event.key === 'Enter' && void handleJoin()}
            className="input-base tracking-[0.18em] uppercase"
            placeholder="PASTE-CODE"
          />
          {message ? <p className="text-[12px] text-faith-text">{message}</p> : null}
          {error ? <p className="text-[12px] text-fitness-text">{error}</p> : null}
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void handleJoin()} className="btn-primary" disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Accept invite'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

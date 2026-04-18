'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Family hub UI is paused. Full implementation snapshot:
 * @see archive/family-page-v1/page.full.tsx
 * Pairing (1:1 accountability) and named circles: /circles
 */
export default function FamilyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invite = searchParams.get('invite')?.trim()

  useEffect(() => {
    if (invite) {
      router.replace(`/circles?invite=${encodeURIComponent(invite)}`)
    }
  }, [invite, router])

  if (invite) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-16">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-200 dark:bg-brand-800" />
        <p className="text-[13px] font-medium text-ink-primary">Opening Circles…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-ghost">Paused</p>
      <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-ink-primary">Family hub is in storage</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        The full family dashboard is archived for later. Pairing invites, join-with-code, and accountability boards now
        live under Circles.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/circles" className="btn-primary px-5 py-2.5 text-[13px]">
          Open Circles
        </Link>
        <Link href="/faith" className="btn-secondary px-5 py-2.5 text-[13px]">
          Back to Faith
        </Link>
      </div>
    </div>
  )
}

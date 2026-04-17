'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MarketingBackground } from '@/components/public/landing/MarketingBackground'
import {
  LANDING_DISPLAY_FONT,
  LANDING_BODY_FONT,
} from '@/components/public/landing/constants'

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className={`${LANDING_BODY_FONT} relative min-h-screen overflow-hidden`}>
      <MarketingBackground />

      {/* Header gradient for legibility */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-40 bg-gradient-to-b from-black/50 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-6 lg:px-10">
        {/* Top bar */}
        <div className="flex items-center pb-8">
          <Link
            href="/"
            className="flex items-center gap-4 text-[42px] font-semibold tracking-tight text-white/95"
          >
            <Image src="/logo-white.png" alt="" width={64} height={64} className="rounded-full" />
            Noor
          </Link>
        </div>

        {/* Two-column layout */}
        <div className="grid flex-1 items-center gap-12 lg:grid-cols-2">
          {/* Left: brand statement */}
          <div className="hidden lg:block">
            <p className={`${LANDING_BODY_FONT} text-[12px] font-semibold uppercase tracking-[0.3em] text-[rgb(212,165,116)]`}>
              Prayer-centered operating system
            </p>
            <h1 className="mt-6 text-[40px] leading-[1.06] tracking-tight xl:text-[52px]">
              <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
                Build your week{' '}
              </span>
              <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
                around{' '}
              </span>
              <span className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(172,212,182)]`}>
                salah
              </span>
              <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
                ,{' '}
              </span>
              <br className="hidden xl:block" />
              <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
                not around{' '}
              </span>
              <span className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(212,165,116)]`}>
                guilt
              </span>
              <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
                .
              </span>
            </h1>
            <p className={`${LANDING_BODY_FONT} mt-6 max-w-[440px] text-[16px] leading-7 text-white/50`}>
              {description}
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { value: '5', label: 'prayer anchors' },
                { value: '4', label: 'life pillars' },
                { value: '1', label: 'clear path forward' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4"
                >
                  <p className="text-[28px] font-semibold text-white/90">{stat.value}</p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[520px] rounded-[32px] border border-white/10 bg-white/[0.06] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[rgb(212,165,116)]">
                {eyebrow}
              </p>
              <h2 className={`${LANDING_BODY_FONT} mt-3 text-[28px] font-semibold tracking-tight text-white/95 sm:text-[32px]`}>
                {title}
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-white/50">
                {description}
              </p>

              {/* Form content — override input styles for dark bg */}
              <div className="auth-dark-inputs mt-7">{children}</div>
              {footer ? <div className="mt-6">{footer}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

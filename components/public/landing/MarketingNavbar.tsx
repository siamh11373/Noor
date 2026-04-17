'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  LANDING_BODY_FONT,
  MARKETING_NAV_ITEMS,
  type MarketingSectionId,
} from '@/components/public/landing/constants'

function useIsScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      setScrolled(window.scrollY > threshold)
    }
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return scrolled
}

function useActiveSection() {
  const [active, setActive] = useState<MarketingSectionId | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as MarketingSectionId)
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )

    MARKETING_NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return active
}

/* ------------------------------------------------------------------ */
/*  Mobile nav                                                         */
/* ------------------------------------------------------------------ */

function MobileNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="md:hidden fixed inset-x-0 top-0 z-50">
      <nav
        className={cn(
          LANDING_BODY_FONT,
          'flex h-[96px] items-center justify-between px-7',
          'bg-[rgba(10,18,14,0.92)] backdrop-blur-xl border-b border-white/8',
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-3 text-[28px] font-semibold tracking-tight text-white/95"
        >
          <Image src="/logo-white.png" alt="" width={44} height={44} className="rounded-full" />
          Noor
        </Link>

        <button
          onClick={() => setOpen((v) => !v)}
          className="size-7 flex items-center justify-center"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12h18M3 6h18M3 18h18"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* Fullscreen drawer */}
      <div
        className={cn(
          'fixed inset-0 top-[96px] bg-[rgba(8,14,12,0.98)] backdrop-blur-2xl transition-all duration-300 ease-out',
          open ? 'opacity-100 visible' : 'opacity-0 invisible',
        )}
      >
        <div
          className={cn(
            LANDING_BODY_FONT,
            'flex flex-col px-5 pt-4 pb-8 transition-transform duration-300 ease-out',
            open ? 'translate-y-0' : '-translate-y-4',
          )}
        >
          {MARKETING_NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="border-b border-white/8 py-5 text-[26px] font-medium text-white/90"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}

          <div className="mt-8 space-y-3">
            <Link
              href="/signup"
              className="btn-landing-primary flex items-center justify-center rounded-xl px-6 py-4 text-[17px]"
              onClick={() => setOpen(false)}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="btn-landing-ghost flex items-center justify-center rounded-xl px-6 py-4 text-[17px]"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Desktop navbar with scroll morph                                   */
/* ------------------------------------------------------------------ */

export function MarketingNavbar() {
  const isScrolled = useIsScrolled(56)
  const active = useActiveSection()
  const ease = 'cubic-bezier(0.16,1,0.3,1)'

  return (
    <>
      <MobileNav />

      <header className={cn('hidden md:block fixed inset-x-0 top-0 z-50', LANDING_BODY_FONT)}>
        <div
          className="mx-auto transition-[padding] duration-[1200ms]"
          style={{ transitionTimingFunction: ease, padding: isScrolled ? '16px 0' : '32px 0' }}
        >
          <div
            className="mx-auto transition-[width] duration-[1200ms]"
            style={{
              transitionTimingFunction: ease,
              width: isScrolled
                ? 'min(1000px, calc(100% - 32px))'
                : 'min(1400px, calc(100% - 48px))',
            }}
          >
            <nav
              className={cn(
                'relative transition-[background-color,backdrop-filter,border-color,box-shadow,border-radius] duration-[1200ms]',
                isScrolled
                  ? 'rounded-full border border-[rgba(184,144,74,0.18)] bg-[rgba(10,18,14,0.92)] shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl'
                  : 'rounded-none border border-transparent bg-transparent shadow-none backdrop-blur-none',
              )}
              style={{ transitionTimingFunction: ease }}
              aria-label="Primary navigation"
            >
              {/* Decorative ring */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 transition-opacity duration-[1200ms]',
                  isScrolled ? 'opacity-100' : 'opacity-0',
                )}
                style={{ transitionTimingFunction: ease }}
              >
                <div className="absolute inset-0 rounded-full ring-1 ring-[rgba(184,144,74,0.12)]" />
              </div>

              <div
                className="relative flex items-center justify-between transition-[padding] duration-[1200ms]"
                style={{
                  transitionTimingFunction: ease,
                  padding: isScrolled ? '18px 32px' : '8px 0',
                }}
              >
                {/* Left: logo + nav links */}
                <div
                  className="flex items-center transition-[column-gap] duration-[1200ms]"
                  style={{
                    transitionTimingFunction: ease,
                    columnGap: isScrolled ? '24px' : '40px',
                  }}
                >
                  <Link
                    href="/"
                    className="shrink-0 flex items-center gap-3.5 text-[30px] font-semibold tracking-tight text-white/95"
                  >
                    <Image src="/logo-white.png" alt="" width={48} height={48} className="rounded-full" />
                    Noor
                  </Link>

                  <div className="flex items-center gap-1">
                    {MARKETING_NAV_ITEMS.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={cn(
                          'px-6 py-3 rounded-full text-[16px] font-medium transition-[background-color,color] duration-300',
                          active === item.id
                            ? 'text-[rgb(212,165,116)]'
                            : 'text-white/70 hover:text-white/90 hover:bg-white/[0.06]',
                        )}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Right: auth */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-6 py-3 rounded-full text-[16px] font-medium text-white/70 hover:text-white/90 transition-colors duration-300"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-landing-primary shrink-0 rounded-full px-7 py-3 text-[16px]"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  )
}

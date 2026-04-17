import Link from 'next/link'
import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'
import { LandingProductMockup } from '@/components/public/landing/LandingProductMockup'

export function MarketingHero() {
  return (
    <section id="hero" className="relative pt-[140px] md:pt-[180px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-44 bg-gradient-to-b from-black/60 to-transparent" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 md:px-8">
        {/* Kicker */}
        <p
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.3em] text-[rgb(212,165,116)]`}
        >
          Prayer-centered operating system
        </p>

        {/* Headline — mixed serif/sans */}
        <h1 className="mx-auto mt-7 max-w-[900px] text-center text-[42px] leading-[1.04] tracking-tight sm:text-[56px] lg:text-[72px]">
          <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
            The{' '}
          </span>
          <span
            className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(212,165,116)]`}
          >
            light
          </span>
          <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
            {' '}
            that anchors your week around{' '}
          </span>
          <span
            className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(172,212,182)]`}
          >
            salah
          </span>
          <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
            .
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className={`${LANDING_BODY_FONT} mx-auto mt-7 max-w-[640px] text-center text-[17px] leading-8 text-white/60`}
        >
          Five daily prayers become the backbone for managing faith, tasks,
          fitness, and family — no streaks, no guilt, no public feeds. Just a
          private system built around the rhythm you already keep.
        </p>

        {/* CTAs */}
        <div
          className={`${LANDING_BODY_FONT} mt-9 flex flex-wrap items-center justify-center gap-3`}
        >
          <Link
            href="/signup"
            className="btn-landing-primary rounded-full px-7 py-3.5 text-[15px]"
          >
            Start your setup
          </Link>
          <a
            href="#preview"
            className="btn-landing-ghost rounded-full px-7 py-3.5 text-[15px]"
          >
            See the dashboard
          </a>
        </div>

        {/* Product mockup */}
        <div className="mt-16 md:mt-24">
          <LandingProductMockup />
        </div>
      </div>
    </section>
  )
}

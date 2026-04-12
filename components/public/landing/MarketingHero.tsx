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
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.3em] text-[rgb(214,170,95)]`}
        >
          Prayer-centered operating system
        </p>

        {/* Headline — mixed serif/sans */}
        <h1 className="mx-auto mt-7 max-w-[900px] text-center text-[42px] leading-[1.04] tracking-tight sm:text-[56px] lg:text-[72px]">
          <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
            The{' '}
          </span>
          <span
            className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(214,170,95)]`}
          >
            light
          </span>
          <span className={`${LANDING_BODY_FONT} font-semibold text-white/95`}>
            {' '}
            that anchors your week around{' '}
          </span>
          <span
            className={`${LANDING_DISPLAY_FONT} italic font-medium text-[rgb(154,214,158)]`}
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
            className="rounded-full bg-[rgb(196,144,58)] px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:bg-[rgb(214,170,95)] hover:shadow-[0_6px_24px_rgba(196,144,58,0.3)]"
          >
            Start your setup
          </Link>
          <a
            href="#preview"
            className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-medium text-white/80 backdrop-blur transition-all duration-300 hover:border-white/25 hover:bg-white/10"
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

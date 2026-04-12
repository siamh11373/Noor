import Link from 'next/link'
import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'

export function ClosingCTA() {
  return (
    <section
      id="start"
      className="relative overflow-hidden bg-[#0A120E] py-24 md:py-32"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,144,58,0.16),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[240px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(76,175,80,0.1),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[720px] px-5 text-center md:px-8">
        <h2
          className={`${LANDING_DISPLAY_FONT} text-[34px] font-semibold leading-[1.12] tracking-tight text-white/95 sm:text-[44px] lg:text-[52px]`}
        >
          Your week already has structure.{' '}
          <br className="hidden sm:block" />
          <span className="text-[rgb(214,170,95)]">Now build on it.</span>
        </h2>
        <p
          className={`${LANDING_BODY_FONT} mx-auto mt-6 max-w-[480px] text-[16px] leading-7 text-white/55`}
        >
          Create a free account, finish a short onboarding, and unlock your
          clarity in under five minutes.
        </p>

        <div
          className={`${LANDING_BODY_FONT} mt-9 flex flex-wrap items-center justify-center gap-3`}
        >
          <Link
            href="/signup"
            className="rounded-full bg-[rgb(196,144,58)] px-8 py-4 text-[16px] font-semibold text-white transition-all duration-300 hover:bg-[rgb(214,170,95)] hover:shadow-[0_6px_24px_rgba(196,144,58,0.35)]"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-[16px] font-medium text-white/75 backdrop-blur transition-all duration-300 hover:border-white/25 hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  )
}

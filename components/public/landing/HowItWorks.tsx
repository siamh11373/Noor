import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description:
      'One personal account with email and password. No social login, no third-party tracking.',
  },
  {
    number: '02',
    title: 'Verify your email',
    description:
      'A short confirmation step to keep your account secure and your data private.',
  },
  {
    number: '03',
    title: 'Complete onboarding',
    description:
      'Configure your madhab, prayer method, timezone, notification timing, and weekly rhythm defaults.',
  },
  {
    number: '04',
    title: 'Unlock your dashboard',
    description:
      'Your private operating system is ready — faith, tasks, fitness, and family anchored to your five daily prayers.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="flow" className="scroll-mt-28 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[960px] px-5 md:px-8">
        <p
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.28em] text-[rgb(184,144,74)]`}
        >
          How it works
        </p>
        <h2
          className={`${LANDING_DISPLAY_FONT} mx-auto mt-5 max-w-[580px] text-center text-[32px] font-semibold leading-[1.14] tracking-tight text-[#1C1E22] sm:text-[40px]`}
        >
          From signup to your first anchored week in four steps.
        </h2>

        <div className="mt-16">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative flex gap-6 pb-12 last:pb-0"
            >
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute bottom-0 left-[23px] top-[52px] w-px bg-[#E8E3DB]" />
              )}

              {/* Step number */}
              <div className="relative z-10 flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl border border-[rgba(184,144,74,0.2)] bg-[rgba(184,144,74,0.08)]">
                <span
                  className={`${LANDING_BODY_FONT} text-[14px] font-bold text-[rgb(184,144,74)]`}
                >
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="pt-1.5">
                <h3
                  className={`${LANDING_BODY_FONT} text-[17px] font-semibold text-[#1C1E22]`}
                >
                  {step.title}
                </h3>
                <p
                  className={`${LANDING_BODY_FONT} mt-2 text-[14px] leading-7 text-[#6B7280]`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

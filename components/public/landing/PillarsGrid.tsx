import {
  BookOpenText,
  ListChecks,
  Dumbbell,
  HeartHandshake,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'

const pillars = [
  {
    icon: BookOpenText,
    label: 'Faith',
    tone: 'bg-[rgba(122,148,129,0.18)] text-[rgb(172,212,182)]',
    description:
      "Track all five prayers, Quran reading, and dhikr — your day's spiritual anchor, not a streak to break.",
  },
  {
    icon: ListChecks,
    label: 'Tasks',
    tone: 'bg-[rgba(107,138,168,0.18)] text-[rgb(162,196,224)]',
    description:
      'Anchor work to prayer windows instead of arbitrary hours. Tasks reset by salah, not midnight.',
  },
  {
    icon: Dumbbell,
    label: 'Fitness',
    tone: 'bg-[rgba(200,135,96,0.18)] text-[rgb(240,186,148)]',
    description:
      'Log workouts, track recovery, and keep sessions tied to your weekly rhythm — not a gym bro app.',
  },
  {
    icon: HeartHandshake,
    label: 'Family',
    tone: 'bg-[rgba(155,138,181,0.18)] text-[rgb(212,196,240)]',
    description:
      'Private logs for touchpoints, responsibilities, and check-ins. No social feed, no comparison traps.',
  },
  {
    icon: Sparkles,
    label: 'Guided onboarding',
    tone: 'bg-[rgba(184,144,74,0.18)] text-[rgb(212,165,116)]',
    description:
      'A focused setup flow configures your madhab, prayer times, weekly defaults, and notification rhythm.',
  },
  {
    icon: ShieldCheck,
    label: 'Privacy first',
    tone: 'bg-[rgba(122,148,129,0.18)] text-[rgb(172,212,182)]',
    description:
      'Only you see your data. Accountability partners receive composite scores — never raw details.',
  },
] as const

export function PillarsGrid() {
  return (
    <section id="pillars" className="relative z-10 scroll-mt-28 pb-24 pt-20 md:pb-32 md:pt-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <p
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.28em] text-[rgb(212,165,116)]`}
        >
          Four pillars, one system
        </p>
        <h2
          className={`${LANDING_DISPLAY_FONT} mx-auto mt-5 max-w-[660px] text-center text-[32px] font-semibold leading-[1.14] tracking-tight text-white/95 sm:text-[40px]`}
        >
          Everything that matters, anchored to what already structures your day.
        </h2>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.label}
                className="group rounded-[28px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-6 transition-colors duration-300 hover:border-white/[0.14] hover:bg-[rgba(255,255,255,0.05)]"
              >
                <div className={cn('inline-flex rounded-2xl p-3', pillar.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3
                  className={`${LANDING_BODY_FONT} mt-5 text-[18px] font-semibold text-white/[0.92]`}
                >
                  {pillar.label}
                </h3>
                <p
                  className={`${LANDING_BODY_FONT} mt-3 text-[14px] leading-7 text-white/55`}
                >
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

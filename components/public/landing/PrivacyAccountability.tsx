import { ShieldCheck, Eye, Lock, Users } from 'lucide-react'
import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'

export function PrivacyAccountability() {
  return (
    <section id="privacy" className="scroll-mt-28 bg-[#FAF7F2] py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-5 md:px-8">
        <p
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.28em] text-[rgb(184,144,74)]`}
        >
          Privacy &amp; accountability
        </p>
        <h2
          className={`${LANDING_DISPLAY_FONT} mx-auto mt-5 max-w-[680px] text-center text-[32px] font-semibold leading-[1.14] tracking-tight text-[#1C1E22] sm:text-[40px]`}
        >
          Private by default. Accountable by choice.
        </h2>
        <p
          className={`${LANDING_BODY_FONT} mx-auto mt-5 max-w-[560px] text-center text-[16px] leading-7 text-[#6B7280]`}
        >
          Most habit apps turn your life into a public scoreboard. Noor
          does the opposite.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Private by default */}
          <div className="rounded-[28px] border border-[#E8E3DB] bg-white p-7">
            <div className="inline-flex rounded-2xl bg-[rgba(122,148,129,0.12)] p-3 text-[rgb(62,85,68)]">
              <Lock className="h-5 w-5" />
            </div>
            <h3
              className={`${LANDING_BODY_FONT} mt-5 text-[20px] font-semibold text-[#1C1E22]`}
            >
              Private by default
            </h3>
            <p
              className={`${LANDING_BODY_FONT} mt-3 text-[14px] leading-7 text-[#6B7280]`}
            >
              Your notes, prayer logs, task details, and family entries are
              never visible to anyone but you. No social feed, no public
              profile, no data shared with third parties.
            </p>
            <div className="mt-6 space-y-3">
              {[
                {
                  Icon: ShieldCheck,
                  text: 'End-to-end personal data — only you see the details',
                },
                {
                  Icon: Eye,
                  text: 'No public profile, timeline, or leaderboard',
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className={`${LANDING_BODY_FONT} flex items-start gap-3 text-[13px] text-[#1C1E22]`}
                >
                  <item.Icon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(122,148,129)]" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Score-only accountability */}
          <div className="rounded-[28px] border border-[#E8E3DB] bg-white p-7">
            <div className="inline-flex rounded-2xl bg-[rgba(184,144,74,0.1)] p-3 text-[rgb(156,118,52)]">
              <Users className="h-5 w-5" />
            </div>
            <h3
              className={`${LANDING_BODY_FONT} mt-5 text-[20px] font-semibold text-[#1C1E22]`}
            >
              Score-only accountability
            </h3>
            <p
              className={`${LANDING_BODY_FONT} mt-3 text-[14px] leading-7 text-[#6B7280]`}
            >
              Invite someone to see your weekly composite score — a single
              number that reflects your balance across all four pillars,
              without revealing any raw data.
            </p>

            {/* Inline demo card */}
            <div className="mt-6 rounded-[20px] border border-[#E8E3DB] bg-[#FAF7F2] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`${LANDING_BODY_FONT} text-[14px] font-semibold text-[#1C1E22]`}
                  >
                    Yusuf
                  </p>
                  <p
                    className={`${LANDING_BODY_FONT} text-[12px] text-[#6B7280]`}
                  >
                    Accountability partner
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(122,148,129,0.14)]">
                  <span
                    className={`${LANDING_BODY_FONT} text-[16px] font-bold text-[rgb(62,85,68)]`}
                  >
                    91
                  </span>
                </div>
              </div>
              <p
                className={`${LANDING_BODY_FONT} mt-3 text-[12px] leading-5 text-[#9CA0A8]`}
              >
                Yusuf sees &ldquo;91&rdquo; — not that you missed Fajr on
                Tuesday or skipped your workout. Just a score, nothing more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

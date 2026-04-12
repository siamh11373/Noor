import Image from 'next/image'
import {
  Activity,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Dumbbell,
  HeartHandshake,
  MoonStar,
  ShieldCheck,
  Sunrise,
  SunMedium,
  Sunset,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANDING_BODY_FONT } from '@/components/public/landing/constants'

const modules = [
  { label: 'Faith', tone: 'bg-[rgba(76,175,80,0.16)] text-[rgb(154,214,158)]' },
  { label: 'Tasks', tone: 'bg-[rgba(61,111,191,0.14)] text-[rgb(166,191,235)]' },
  { label: 'Fitness', tone: 'bg-[rgba(230,81,0,0.14)] text-[rgb(255,183,145)]' },
  { label: 'Family', tone: 'bg-[rgba(156,39,176,0.16)] text-[rgb(233,181,246)]' },
] as const

const prayers = [
  { label: 'Fajr', time: '5:18', status: 'Completed', icon: Sunrise },
  { label: 'Dhuhr', time: '1:09', status: 'Current anchor', icon: SunMedium },
  { label: 'Asr', time: '4:41', status: 'Tasks reset', icon: Activity },
  { label: 'Maghrib', time: '7:28', status: 'Family check-in', icon: Sunset },
  { label: 'Isha', time: '8:47', status: 'Quiet close', icon: MoonStar },
] as const

const tasks = [
  { label: 'Ship client revision', window: 'Before Dhuhr', done: true },
  { label: 'Call parents', window: 'After Maghrib', done: false },
  { label: 'Review workout split', window: 'Between Asr and Maghrib', done: false },
] as const

const accountability = [
  { name: 'Yusuf', score: 91, note: 'Faith +2 this week' },
  { name: 'Amal', score: 88, note: 'Family consistency strong' },
] as const

function MockupSectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[14px] font-semibold text-[rgb(244,238,227)]">{title}</p>
        <p className="mt-1 text-[12px] text-[rgba(235,228,212,0.62)]">{hint}</p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: string
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', tone)}>{label}</span>
      <p className="mt-3 text-[28px] font-semibold tracking-tight text-[rgb(247,243,236)]">{value}</p>
      <p className="mt-1 text-[12px] text-[rgba(235,228,212,0.6)]">{hint}</p>
    </div>
  )
}

export function LandingProductMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        LANDING_BODY_FONT,
        'relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,16,0.98),rgba(17,29,25,0.98))] p-4 shadow-[0_38px_120px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="absolute inset-x-[12%] top-[-16%] h-40 rounded-full bg-[rgba(196,144,58,0.18)] blur-3xl" />
      <div className="absolute inset-y-[24%] right-[-6%] w-32 rounded-full bg-[rgba(76,175,80,0.12)] blur-3xl" />

      <div className="relative rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,14,12,0.96),rgba(14,23,20,0.96))] p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.16)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.12)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.08)]" />
            </div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo-white.png" alt="" width={22} height={22} className="rounded-full opacity-80" />
              <div>
                <p className="text-[13px] font-semibold text-[rgb(247,243,236)]">Noor</p>
                <p className="text-[11px] text-[rgba(235,228,212,0.58)]">Private weekly operating system</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(76,175,80,0.26)] bg-[rgba(76,175,80,0.14)] px-3 py-1 text-[11px] font-medium text-[rgb(154,214,158)]">
              Private by default
            </span>
            <span className="rounded-full border border-white/8 bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[11px] font-medium text-[rgba(247,243,236,0.76)]">
              Cloud synced
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[190px_minmax(0,1fr)_230px]">
          <aside className="hidden rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-4 xl:block">
            <div className="flex items-center gap-3 rounded-[20px] bg-[rgba(196,144,58,0.1)] px-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(196,144,58,0.16)] text-[rgb(214,170,95)]">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[rgb(247,243,236)]">Weekly rhythm</p>
                <p className="text-[11px] text-[rgba(235,228,212,0.56)]">Anchored to prayer windows</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {modules.map(module => (
                <div
                  key={module.label}
                  className="flex items-center justify-between rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
                >
                  <span className="text-[13px] text-[rgba(247,243,236,0.88)]">{module.label}</span>
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', module.tone)}>
                    Live
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[20px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(235,228,212,0.42)]">Target</p>
              <p className="mt-2 text-[24px] font-semibold text-[rgb(247,243,236)]">83 / 100</p>
              <p className="mt-1 text-[12px] leading-5 text-[rgba(235,228,212,0.58)]">
                Weekly balance stays visible without exposing private notes to anyone else.
              </p>
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.035)] p-4">
              <MockupSectionTitle title="Today&apos;s prayer windows" hint="The day is broken into calm, usable blocks instead of streaks." />
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {prayers.map(prayer => {
                  const Icon = prayer.icon

                  return (
                    <div
                      key={prayer.label}
                      className="rounded-[20px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-3"
                    >
                      <div className="flex items-center gap-2 text-[rgba(247,243,236,0.78)]">
                        <Icon className="h-4 w-4" />
                        <span className="text-[12px] font-medium">{prayer.label}</span>
                      </div>
                      <p className="mt-4 text-[24px] font-semibold tracking-tight text-[rgb(247,243,236)]">{prayer.time}</p>
                      <p className="mt-1 text-[11px] text-[rgba(235,228,212,0.58)]">{prayer.status}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.035)] p-4">
                <MockupSectionTitle title="Operating system scores" hint="Every pillar updates without turning life into a public scoreboard." />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Faith" value="92" hint="All five windows planned" tone="bg-[rgba(76,175,80,0.16)] text-[rgb(154,214,158)]" />
                  <MetricCard label="Tasks" value="06" hint="Deep work split by prayer" tone="bg-[rgba(61,111,191,0.14)] text-[rgb(166,191,235)]" />
                  <MetricCard label="Fitness" value="04" hint="Sessions + recovery tracked" tone="bg-[rgba(230,81,0,0.14)] text-[rgb(255,183,145)]" />
                  <MetricCard label="Family" value="03" hint="Quiet touchpoints captured" tone="bg-[rgba(156,39,176,0.16)] text-[rgb(233,181,246)]" />
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.035)] p-4">
                <MockupSectionTitle title="Anchored tasks" hint="Tasks carry their next prayer checkpoint so the day stays realistic." />
                <div className="mt-4 space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.label}
                      className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-[rgb(247,243,236)]',
                            task.done
                              ? 'border-[rgba(76,175,80,0.26)] bg-[rgba(76,175,80,0.18)]'
                              : 'border-white/10 bg-[rgba(255,255,255,0.06)]'
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[rgb(247,243,236)]">{task.label}</p>
                          <p className="mt-1 text-[11px] text-[rgba(235,228,212,0.56)]">{task.window}</p>
                        </div>
                      </div>
                      <Clock3 className="h-4 w-4 text-[rgba(235,228,212,0.4)]" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center gap-2 text-[rgb(247,243,236)]">
                <Dumbbell className="h-4 w-4 text-[rgb(255,183,145)]" />
                <p className="text-[14px] font-semibold">Fitness + recovery</p>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Strength', value: '82%' },
                  { label: 'Mobility', value: '64%' },
                  { label: 'Sleep', value: '88%' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[11px] text-[rgba(235,228,212,0.64)]">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(230,81,0,0.85),rgba(255,197,160,0.9))]"
                        style={{ width: item.value }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center gap-2 text-[rgb(247,243,236)]">
                <ShieldCheck className="h-4 w-4 text-[rgb(214,170,95)]" />
                <p className="text-[14px] font-semibold">Score-only accountability</p>
              </div>
              <div className="mt-4 space-y-3">
                {accountability.map(peer => (
                  <div
                    key={peer.name}
                    className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-[rgb(247,243,236)]">{peer.name}</span>
                      <span className="rounded-full border border-[rgba(76,175,80,0.22)] bg-[rgba(76,175,80,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(154,214,158)]">
                        {peer.score}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-[rgba(235,228,212,0.58)]">{peer.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center gap-2 text-[rgb(247,243,236)]">
                <HeartHandshake className="h-4 w-4 text-[rgb(233,181,246)]" />
                <p className="text-[14px] font-semibold">Family quiet log</p>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-[rgba(235,228,212,0.58)]">
                Capture touchpoints, check-ins, and responsibilities without publishing your private details to a feed.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

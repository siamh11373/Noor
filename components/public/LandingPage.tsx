import { LANDING_BODY_FONT } from '@/components/public/landing/constants'
import { LandingSmoothScroll } from '@/components/public/landing/LandingSmoothScroll'
import { MarketingNavbar } from '@/components/public/landing/MarketingNavbar'
import { MarketingBackground } from '@/components/public/landing/MarketingBackground'
import { MarketingHero } from '@/components/public/landing/MarketingHero'
import { PillarsGrid } from '@/components/public/landing/PillarsGrid'
import { DashboardPreview } from '@/components/public/landing/DashboardPreview'
import { HowItWorks } from '@/components/public/landing/HowItWorks'
import { PrivacyAccountability } from '@/components/public/landing/PrivacyAccountability'
import { ClosingCTA } from '@/components/public/landing/ClosingCTA'
import { MarketingFooter } from '@/components/public/landing/MarketingFooter'

export function LandingPage() {
  return (
    <main className={LANDING_BODY_FONT}>
      <LandingSmoothScroll />
      <MarketingNavbar />

      {/* ── Dark hero zone ── */}
      <div className="relative overflow-hidden">
        <MarketingBackground />
        <div className="relative z-10">
          <MarketingHero />
          <PillarsGrid />
        </div>
        {/* Fade into lighter sections */}
        <div className="relative z-10 h-24 bg-gradient-to-b from-transparent to-[#F7F7F5]" />
      </div>

      {/* ── Light middle sections ── */}
      <DashboardPreview />
      <HowItWorks />
      <PrivacyAccountability />

      {/* ── Dark closing zone ── */}
      <ClosingCTA />
      <MarketingFooter />
    </main>
  )
}

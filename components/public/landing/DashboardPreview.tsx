import { LANDING_DISPLAY_FONT, LANDING_BODY_FONT } from '@/components/public/landing/constants'
import { LandingProductMockup } from '@/components/public/landing/LandingProductMockup'

export function DashboardPreview() {
  return (
    <section id="preview" className="scroll-mt-28 bg-[#FAF7F2] py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <p
          className={`${LANDING_BODY_FONT} text-center text-[12px] font-semibold uppercase tracking-[0.28em] text-[rgb(184,144,74)]`}
        >
          Inside the dashboard
        </p>
        <h2
          className={`${LANDING_DISPLAY_FONT} mx-auto mt-5 max-w-[680px] text-center text-[32px] font-semibold leading-[1.14] tracking-tight text-[#1C1E22] sm:text-[40px]`}
        >
          A weekly operating system, not another habit tracker.
        </h2>
        <p
          className={`${LANDING_BODY_FONT} mx-auto mt-5 max-w-[560px] text-center text-[16px] leading-7 text-[#6B7280]`}
        >
          Four modules work together across prayer windows, giving you a
          realistic view of your week — not an idealized one.
        </p>

        <div className="mt-14">
          <LandingProductMockup />
        </div>
      </div>
    </section>
  )
}

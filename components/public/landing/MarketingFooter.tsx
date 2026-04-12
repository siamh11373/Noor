import Link from 'next/link'
import Image from 'next/image'
import { LANDING_BODY_FONT } from '@/components/public/landing/constants'

const sectionLinks = [
  { label: 'Pillars', href: '#pillars' },
  { label: 'Dashboard', href: '#preview' },
  { label: 'How it works', href: '#flow' },
  { label: 'Privacy', href: '#privacy' },
] as const

const accountLinks = [
  { label: 'Log in', href: '/login' },
  { label: 'Create account', href: '/signup' },
] as const

export function MarketingFooter() {
  return (
    <footer
      className={`${LANDING_BODY_FONT} border-t border-white/8 bg-[#080E0C] px-5 py-10 md:px-8 md:py-14`}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 text-[18px] font-semibold tracking-tight text-white/90"
          >
            <Image src="/logo-white.png" alt="" width={24} height={24} className="rounded-full opacity-80" />
            Noor
          </Link>
          <p className="mt-2 max-w-[280px] text-[13px] leading-6 text-white/40">
            The light that anchors your week around salah.
          </p>
        </div>

        {/* Link columns */}
        <div className="flex gap-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Sections
            </p>
            <ul className="mt-3 space-y-2">
              {sectionLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[13px] text-white/55 transition-colors hover:text-white/80"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Account
            </p>
            <ul className="mt-3 space-y-2">
              {accountLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/55 transition-colors hover:text-white/80"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[1200px] border-t border-white/6 pt-6 text-center">
        <p className="text-[12px] text-white/30">
          &copy; {new Date().getFullYear()} Noor. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

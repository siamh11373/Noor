import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Noor — Your life, anchored to your prayers',
  description:
    'The only system that uses your 5 daily prayers as the foundation for managing faith, family, career, and fitness — without streaks or guilt.',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} bg-surface-bg text-ink-primary`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

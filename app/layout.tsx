import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getThemeBootstrapScript, getThemeColorScheme, resolveTheme, type Theme } from '@/lib/theme'
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
  // Favicons: use app/icon.png + app/apple-icon.png (same asset as public/logo-white.png) so
  // Next emits proper link tags; metadata-only /logo-white.png often shows the generic globe.
}

async function getInitialThemePreference(): Promise<Theme | null> {
  const client = await createSupabaseServerClient()

  if (!client) {
    return null
  }

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user?.email_confirmed_at) {
    return null
  }

  const { data: profile } = await client
    .from('profiles')
    .select('theme_preference')
    .eq('id', user.id)
    .maybeSingle()

  return resolveTheme(profile?.theme_preference)
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialTheme = await getInitialThemePreference()

  return (
    <html
      lang="en"
      data-theme={initialTheme ?? undefined}
      className={initialTheme === 'dark' ? 'dark' : undefined}
      style={initialTheme ? { colorScheme: getThemeColorScheme(initialTheme) } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript(initialTheme) }} />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} bg-surface-bg text-ink-primary`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { isSafeRedirect } from '@/lib/utils'

export async function GET(request: Request) {
  const env = getSupabaseEnv()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')

  if (!env || !code) {
    return NextResponse.redirect(new URL('/login?message=invalid-auth-link', request.url))
  }

  const cookieStore = await cookies()

  // Collect session cookies written during code exchange so we can apply them
  // to the final response after we've determined the correct destination URL.
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet)
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?message=invalid-auth-link', request.url))
  }

  // Detect new vs returning user by checking for an existing user_state row.
  // New Google users skip onboarding without this — now we route them correctly.
  let destinationUrl = isSafeRedirect(next) && next !== '/' ? next : '/faith?welcomed=1'

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: stateRow } = await supabase
      .from('user_state')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!stateRow) {
      // Brand new user — send to onboarding (skipped for Google users previously)
      destinationUrl = '/onboarding'
    }
    // else: returning user — keep destinationUrl with ?welcomed=1
  }

  const response = NextResponse.redirect(new URL(destinationUrl, request.url))

  // Apply the session cookies collected during exchange to the redirect response
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  }

  return response
}

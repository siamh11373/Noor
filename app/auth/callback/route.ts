import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function GET(request: Request) {
  const env = getSupabaseEnv()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const destination = next && next.startsWith('/') ? next : '/faith'

  if (!env || !code) {
    return NextResponse.redirect(new URL('/login?message=invalid-auth-link', request.url))
  }

  const cookieStore = cookies()
  const response = NextResponse.redirect(new URL(destination, request.url))

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?message=invalid-auth-link', request.url))
  }

  return response
}

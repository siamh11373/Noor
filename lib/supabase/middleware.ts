import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function updateSupabaseSession(request: NextRequest) {
  const env = getSupabaseEnv()
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  if (!env) {
    return { response, user: null as User | null, supabase: null as ReturnType<typeof createServerClient<Database>> | null }
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user, supabase }
}

export function copySupabaseCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach(cookie => {
    destination.cookies.set(cookie)
  })

  return destination
}

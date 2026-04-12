import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'

type CookieAdapter = {
  getAll: () => { name: string; value: string }[]
  setAll?: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => void
}

function defaultCookieAdapter(): CookieAdapter {
  const cookieStore = cookies()

  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      } catch {
        // Server Components can read cookies but not always mutate them.
      }
    },
  }
}

export function createSupabaseServerClient(cookieAdapter: CookieAdapter = defaultCookieAdapter()): SupabaseClient<Database> | null {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieAdapter.getAll(),
      setAll: cookiesToSet => cookieAdapter.setAll?.(cookiesToSet),
    },
  })
}

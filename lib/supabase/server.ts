import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'

type CookieAdapter = {
  getAll: () => { name: string; value: string }[]
  setAll?: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => void
}

async function getDefaultCookieAdapter(): Promise<CookieAdapter> {
  const cookieStore = await cookies()

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

export async function createSupabaseServerClient(
  cookieAdapter?: CookieAdapter
): Promise<SupabaseClient<Database> | null> {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  const adapter = cookieAdapter ?? (await getDefaultCookieAdapter())

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => adapter.getAll(),
      setAll: cookiesToSet => adapter.setAll?.(cookiesToSet),
    },
  })
}

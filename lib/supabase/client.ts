'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { getSupabaseEnv } from '@/lib/supabase/env'

let browserClient: SupabaseClient<Database> | null = null

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  if (!browserClient) {
    // Belt-and-suspenders try/catch: getSupabaseEnv() already validates the URL,
    // but if @supabase/ssr adds stricter validation in a future version this prevents
    // an unhandled exception from breaking static page generation during the Vercel build.
    try {
      browserClient = createBrowserClient<Database>(env.url, env.anonKey)
    } catch {
      return null
    }
  }

  return browserClient
}

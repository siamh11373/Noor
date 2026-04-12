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
    browserClient = createBrowserClient<Database>(env.url, env.anonKey)
  }

  return browserClient
}

const DEFAULT_LOCAL_SITE_URL = 'http://localhost:3000'

function read(value: string | undefined) {
  return value?.trim() || null
}

export function getSupabaseEnv() {
  const url = read(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!url || !anonKey) {
    return null
  }

  return { url, anonKey }
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null
}

export function getSiteUrl() {
  const explicit = read(process.env.NEXT_PUBLIC_SITE_URL)

  if (explicit) {
    return explicit
  }

  const vercelUrl = read(process.env.VERCEL_URL)
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  }

  return DEFAULT_LOCAL_SITE_URL
}

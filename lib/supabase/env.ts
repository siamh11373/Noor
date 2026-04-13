const DEFAULT_LOCAL_SITE_URL = 'http://localhost:3000'

function read(value: string | undefined) {
  return value?.trim() || null
}

// SECURITY FIX: validate that the URL is actually HTTP/HTTPS before accepting it.
// Previously a placeholder like "undefined" or "https://your-project.supabase.co" would
// pass the non-empty check, reach createBrowserClient, and throw at build time with
// "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL."
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSupabaseEnv() {
  const url = read(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!url || !anonKey) {
    return null
  }

  // Reject placeholder or malformed URL values so they never reach the Supabase constructor
  if (!isValidHttpUrl(url)) {
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

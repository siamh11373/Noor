/**
 * NEXT_PUBLIC_SUPABASE_ANON_KEY must be the **anon** credential for this project URL.
 * If Auth returns "Unregistered API key", use the **legacy anon JWT** (starts with `eyJ`)
 * from Dashboard → Settings → API → **Legacy anon, service_role API keys**, not a stray
 * or cross-project `sb_publishable_…` key. Publishable keys can fail until fully wired to Auth.
 *
 * Vercel vs local:
 * - Use the **same Supabase project** or separate dev/prod projects; URL + anon key must match.
 * - On Vercel set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and optionally
 *   NEXT_PUBLIC_SITE_URL (your live origin, e.g. https://your-app.vercel.app) for email links.
 * - Local-only auth bypass (no login): see NEXT_PUBLIC_DEV_AUTH_BYPASS in middleware.ts.
 */
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

function isLoopbackOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

/**
 * Canonical site origin for auth redirects (email links, password reset, etc.).
 * - NEXT_PUBLIC_SITE_URL when set to a real public URL (custom domain or Vercel URL).
 * - If that env is mistakenly still `http://localhost:3000` on a Vercel deployment, prefer
 *   `window.location.origin` so Supabase `redirect_to` is not stuck on localhost.
 * - Without explicit URL: browser uses non-loopback origin when possible; server uses VERCEL_URL.
 */
export function getSiteUrl() {
  const explicit = read(process.env.NEXT_PUBLIC_SITE_URL)
  const clientOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : null

  const explicitOk = explicit && isValidHttpUrl(explicit)
  const clientOk = clientOrigin && isValidHttpUrl(clientOrigin) && !isLoopbackOrigin(clientOrigin)

  // Vercel (or any public host) + env still pointing at localhost → do not send users to localhost
  if (explicitOk && clientOk && isLoopbackOrigin(explicit)) {
    return clientOrigin
  }

  if (explicitOk) {
    return explicit
  }

  if (clientOk) {
    return clientOrigin
  }

  const vercelUrl = read(process.env.VERCEL_URL)
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  }

  return DEFAULT_LOCAL_SITE_URL
}

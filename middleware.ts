import { NextResponse, type NextRequest } from 'next/server'
import { copySupabaseCookies, updateSupabaseSession } from '@/lib/supabase/middleware'
import { isSupabaseConfigured } from '@/lib/supabase/env'

/**
 * Local UI testing without going through Supabase auth.
 * Set in `.env.local` only: NEXT_PUBLIC_DEV_AUTH_BYPASS=true
 * Requires `next dev` (NODE_ENV=development). Ignored on Vercel production/preview builds.
 */
function devAuthBypassActive(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'
}

const AUTH_ROUTES = ['/login', '/signup', '/verify-email', '/reset-password', '/auth/callback']
const ONBOARDING_ROUTES = ['/onboarding']
const PRIVATE_ROUTES = ['/faith', '/tasks', '/fitness', '/family', '/circles', '/account']

// SECURITY FIX: simple in-memory rate limiter for authentication endpoints.
// Limits each IP to 10 requests per minute on auth routes to slow brute-force and enumeration attacks.
// Note: state is per-instance; upgrade to Upstash Redis for multi-instance/serverless deployments.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some(route => pathname === route || pathname.startsWith(`${route}/`))
}

async function getOnboardingComplete(request: NextRequest) {
  const { supabase, response, user } = await updateSupabaseSession(request)

  if (!supabase || !user?.email_confirmed_at) {
    return {
      response,
      user,
      onboardingComplete: false,
    }
  }

  const { data } = await supabase
    .from('user_state')
    .select('state')
    .eq('user_id', user.id)
    .maybeSingle()

  const state = data?.state as { settings?: { onboardingComplete?: boolean } } | null

  return {
    response,
    user,
    onboardingComplete: Boolean(state?.settings?.onboardingComplete),
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  if (devAuthBypassActive()) {
    return NextResponse.next()
  }

  // SECURITY FIX: apply rate limiting to all authentication-related routes before any other processing.
  // Uses x-forwarded-for (set by Vercel/proxies) with a fallback to x-real-ip.
  // Skip in development: RSC/HMR triggers many middleware runs; a shared "unknown" IP hits the cap quickly.
  if (process.env.NODE_ENV !== 'development' && isRouteMatch(pathname, AUTH_ROUTES)) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    if (isRateLimited(`${pathname}:${ip}`)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
      })
    }
  }

  if (pathname === '/auth/callback') {
    const { response } = await updateSupabaseSession(request)
    return response
  }

  const authRoute = isRouteMatch(pathname, AUTH_ROUTES)
  const onboardingRoute = isRouteMatch(pathname, ONBOARDING_ROUTES)
  const privateRoute = isRouteMatch(pathname, PRIVATE_ROUTES)

  if (!isSupabaseConfigured()) {
    if (privateRoute || onboardingRoute) {
      return NextResponse.redirect(new URL('/signup?message=supabase-not-configured', request.url))
    }

    return NextResponse.next()
  }

  const { response, user, onboardingComplete } = await getOnboardingComplete(request)
  const verified = Boolean(user?.email_confirmed_at)

  if (!user) {
    if (privateRoute || onboardingRoute) {
      const next = `${pathname}${search}`
      const url = new URL('/signup', request.url)
      url.searchParams.set('next', next)
      return copySupabaseCookies(response, NextResponse.redirect(url))
    }

    return response
  }

  if (!verified) {
    if (pathname === '/') {
      // SECURITY FIX: removed ?email= query parameter from the redirect URL.
      // Previously the user's email was appended to the URL, exposing it in server access logs
      // and browser history. VerifyEmailClient falls back to user?.email from the auth context.
      return copySupabaseCookies(
        response,
        NextResponse.redirect(new URL('/verify-email', request.url))
      )
    }

    if (!authRoute) {
      // SECURITY FIX: removed ?email= query parameter (same reason as above).
      return copySupabaseCookies(response, NextResponse.redirect(new URL('/verify-email', request.url)))
    }

    return response
  }

  if (pathname === '/') {
    return copySupabaseCookies(
      response,
      NextResponse.redirect(new URL(onboardingComplete ? '/faith' : '/onboarding', request.url))
    )
  }

  if (!onboardingComplete) {
    if (privateRoute || authRoute) {
      return copySupabaseCookies(response, NextResponse.redirect(new URL('/onboarding', request.url)))
    }

    return response
  }

  if (onboardingRoute || pathname === '/login' || pathname === '/signup' || pathname === '/verify-email') {
    return copySupabaseCookies(response, NextResponse.redirect(new URL('/faith', request.url)))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

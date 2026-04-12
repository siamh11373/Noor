import { NextResponse, type NextRequest } from 'next/server'
import { copySupabaseCookies, updateSupabaseSession } from '@/lib/supabase/middleware'
import { isSupabaseConfigured } from '@/lib/supabase/env'

const AUTH_ROUTES = ['/login', '/signup', '/verify-email', '/reset-password', '/auth/callback']
const ONBOARDING_ROUTES = ['/onboarding']
const PRIVATE_ROUTES = ['/faith', '/tasks', '/fitness', '/family', '/account']

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
      return copySupabaseCookies(
        response,
        NextResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(user.email ?? '')}`, request.url))
      )
    }

    if (!authRoute) {
      const url = new URL('/verify-email', request.url)
      if (user.email) {
        url.searchParams.set('email', user.email)
      }
      return copySupabaseCookies(response, NextResponse.redirect(url))
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

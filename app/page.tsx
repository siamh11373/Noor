import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/public/LandingPage'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createSupabaseServerClient()

  if (!supabase) {
    return <LandingPage />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  if (!user.email_confirmed_at) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email ?? '')}`)
  }

  const { data } = await supabase
    .from('user_state')
    .select('state')
    .eq('user_id', user.id)
    .maybeSingle()

  const onboardingComplete = Boolean((data?.state as { settings?: { onboardingComplete?: boolean } } | null)?.settings?.onboardingComplete)

  redirect(onboardingComplete ? '/faith' : '/onboarding')
}

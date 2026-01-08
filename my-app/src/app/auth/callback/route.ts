import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/onboarding'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Use the request origin to redirect to the same domain that made the request
  // This ensures localhost redirects to localhost and production redirects to production
  const baseUrl = requestUrl.origin
  const redirectUrl = new URL(next, baseUrl)
  
  return NextResponse.redirect(redirectUrl)
}
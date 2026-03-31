import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PREFIX = '/dashboard'
const CLIENT_PORTAL_PREFIX = '/client-portal'
const CLIENT_PORTAL_LOGIN = '/client-portal/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = pathname.startsWith(PROTECTED_PREFIX)
  const isPublicAuth = pathname === '/login' || pathname === '/signup'
  const isClientPortal = pathname.startsWith(CLIENT_PORTAL_PREFIX) && pathname !== CLIENT_PORTAL_LOGIN

  // Redirect unauthenticated users trying to access protected routes.
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect unauthenticated users away from client portal pages.
  if (isClientPortal && !user) {
    const url = request.nextUrl.clone()
    url.pathname = CLIENT_PORTAL_LOGIN
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup to dashboard.
  if (isPublicAuth && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.searchParams.delete('next')
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico, sitemap.xml, robots.txt
     *  - public folder assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}

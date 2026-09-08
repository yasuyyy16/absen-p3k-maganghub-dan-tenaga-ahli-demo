import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isLoginPage = pathname === '/absensi/login';

  // If user is accessing login page while already authenticated with a valid VIEWER session
  if (isLoginPage) {
    if (session && session.role === 'VIEWER') {
      const destination = session.isProfileComplete ? '/absensi' : '/absensi/profil';
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // If user is accessing any protected /absensi/* route without a valid VIEWER session
  if (!session || session.role !== 'VIEWER') {
    return NextResponse.redirect(new URL('/absensi/login', request.url));
  }

  // If profile is incomplete, user must complete profile at /absensi/profil
  // Do not block /absensi/profil itself so the user can complete onboarding
  if (!session.isProfileComplete && pathname !== '/absensi/profil') {
    return NextResponse.redirect(new URL('/absensi/profil', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/absensi/:path*'],
};

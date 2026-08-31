import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isLoginPage = pathname === '/absensi/login';

  // If user is accessing login page while already authenticated
  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(new URL('/absensi', request.url));
    }
    return NextResponse.next();
  }

  // If user is accessing any protected /absensi/* route without valid session
  if (!session) {
    return NextResponse.redirect(new URL('/absensi/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/absensi/:path*'],
};

import { cookies } from 'next/headers';
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from './types';

/**
 * Server-side helper to read the active locale from incoming request cookies.
 * Safe for all Server Components and Server Actions.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (cookieVal === 'en') {
      return 'en';
    }
    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

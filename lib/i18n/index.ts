import { Locale, DEFAULT_LOCALE, TranslationDictionary } from './types';
import { idDictionary } from './dictionaries/id';
import { enDictionary } from './dictionaries/en';
import { WIB_TIMEZONE } from '@/lib/time';

export * from './types';

/**
 * Returns the dictionary for the requested locale, falling back safely to Indonesian.
 */
export function getDictionary(locale: Locale = DEFAULT_LOCALE): TranslationDictionary {
  if (locale === 'en') {
    return enDictionary;
  }
  return idDictionary;
}

/**
 * Locale-aware long calendar date formatting in Asia/Jakarta timezone.
 * id: "Senin, 31 Agustus 2026"
 * en: "Monday, August 31, 2026"
 */
export function formatI18nDateLong(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  const intlLocale = locale === 'en' ? 'en-US' : 'id-ID';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: WIB_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Locale-aware date-only formatting for PostgreSQL UTC dates.
 * id: "31 Agustus 2026"
 * en: "August 31, 2026"
 */
export function formatI18nDateOnlyLong(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  const intlLocale = locale === 'en' ? 'en-US' : 'id-ID';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Locale-aware month formatting for 'YYYY-MM' strings.
 * id: "Agustus 2026"
 * en: "August 2026"
 */
export function formatI18nMonthLong(yearMonth: string, locale: Locale = DEFAULT_LOCALE): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return yearMonth;
  }
  const date = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const intlLocale = locale === 'en' ? 'en-US' : 'id-ID';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: WIB_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Locale-aware date and time formatting.
 * id: "31 Agustus 2026, 16.05 WIB"
 * en: "August 31, 2026 at 4:05 PM WIB"
 */
export function formatI18nDateTime(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  const intlLocale = locale === 'en' ? 'en-US' : 'id-ID';
  const formatted = new Intl.DateTimeFormat(intlLocale, {
    timeZone: WIB_TIMEZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(date));
  return `${formatted} WIB`;
}

/**
 * Locale-aware duration formatting.
 */
export function formatI18nDuration(start: Date, end: Date, locale: Locale = DEFAULT_LOCALE): string {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  if (!Number.isFinite(days) || days <= 0) return '-';
  if (locale === 'en') {
    return `${days} calendar day${days > 1 ? 's' : ''}`;
  }
  return `${days} hari kalender`;
}

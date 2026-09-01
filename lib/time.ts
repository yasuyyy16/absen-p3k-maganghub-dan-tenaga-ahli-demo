import { WibDateParts, WibTimeParts } from './types';

export const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Returns current timestamp in WIB, respecting DEV_TIME_OVERRIDE in non-production environments.
 */
export function getNowWib(): Date {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_TIME_OVERRIDE) {
    const parsed = new Date(process.env.DEV_TIME_OVERRIDE);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

/**
 * Extracts year, month, day, dateString ('YYYY-MM-DD') and a normalized UTC midnight Date object
 * corresponding to the calendar date in Asia/Jakarta timezone.
 *
 * The `dateObj` returned is specifically formatted for PostgreSQL `@db.Date` fields to avoid
 * any day-shifting caused by server local timezones.
 */
export function getWibDateParts(date: Date = getNowWib()): WibDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateString = formatter.format(date); // 'YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // UTC midnight date represents exact calendar date without local offset distortion
  const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  return {
    year,
    month,
    day,
    dateString,
    dateObj,
  };
}

/**
 * Extracts hours, minutes, seconds and formatted strings according to Asia/Jakarta timezone.
 */
export function getWibTimeParts(date: Date = getNowWib()): WibTimeParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const timeString = formatter.format(date); // 'HH:mm:ss'
  const [hoursStr, minutesStr, secondsStr] = timeString.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeFormatted = `${pad(hours)}:${pad(minutes)} WIB`;

  return {
    hours,
    minutes,
    seconds,
    timeString,
    timeFormatted,
  };
}


/**
 * Checks if the check-out reminder should be shown.
 * Active starting from 17:00:00 WIB if user checked in today (HADIR) but has not checked out yet.
 */
export function isReminderActive(
  date: Date = getNowWib(),
  hasIn: boolean,
  hasOut: boolean,
  status: string
): boolean {
  if (status !== 'HADIR') return false;
  if (!hasIn || hasOut) return false;
  const { hours } = getWibTimeParts(date);
  return hours >= 17;
}

/**
 * Formats a Date into a human-readable Indonesian calendar string in WIB timezone.
 * e.g., "Senin, 31 Agustus 2026"
 */
export function formatWibDateLong(date: Date = getNowWib()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a Date into a short Indonesian calendar string in WIB timezone.
 * e.g., "31 Agu 2026"
 */
export function formatWibDateShort(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a Date into a time string with WIB suffix.
 * e.g., "16:05 WIB"
 */
export function formatWibTime(date: Date): string {
  const parts = getWibTimeParts(date);
  return parts.timeFormatted;
}

/**
 * Returns current month in 'YYYY-MM' format in Asia/Jakarta timezone.
 */
export function getCurrentWibMonth(): string {
  const parts = getWibDateParts();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}`;
}

/**
 * Formats 'YYYY-MM' into Indonesian month name, e.g. "Agustus 2026".
 */
export function formatWibMonthLong(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return yearMonth;
  }
  const date = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Creates date range for month filter (from 1st of month 00:00 UTC to 1st of next month 00:00 UTC).
 */
export function getMonthDateRange(yearMonth: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0, 0));

  return { start, end };
}

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * according to Asia/Jakarta (WIB) timezone.
 */
export function getWibDayOfWeek(date: Date = getNowWib()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TIMEZONE,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

/**
 * Checks whether a given Date is a working day (Monday through Friday) in WIB timezone.
 * Returns true for Mon-Fri, false for Sat-Sun.
 */
export function isWibWorkingDay(date: Date = getNowWib()): boolean {
  const day = getWibDayOfWeek(date);
  return day >= 1 && day <= 5;
}

/**
 * Safely parses a 'YYYY-MM-DD' date string into a normalized WibDateParts object.
 */
export function parseWibDateString(dateStr: string): WibDateParts | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(dateStr.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return {
    year,
    month,
    day,
    dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    dateObj,
  };
}


import { PersonnelType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getMonthDateRange,
  getCurrentWibMonth,
  formatWibDateLong,
  formatWibTime,
} from '@/lib/time';
import { AttendanceHistoryItem, AttendanceHistoryResult } from '@/lib/types';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Loads paginated attendance history for a specific person in a given WIB month.
 * Identity is strictly constrained to the authenticated personType and personId.
 */
export async function getAttendanceHistory(
  personType: PersonnelType,
  personId: number,
  rawMonth?: string,
  rawPage?: string | number,
  pageSize: number = 10
): Promise<AttendanceHistoryResult & { selectedMonth: string }> {
  // Validate month parameter, default to current WIB month if missing or invalid
  const selectedMonth =
    rawMonth && MONTH_REGEX.test(rawMonth.trim())
      ? rawMonth.trim()
      : getCurrentWibMonth();

  // Validate page number
  const parsedPage = typeof rawPage === 'number' ? rawPage : parseInt(String(rawPage), 10);
  const page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Get calendar date boundaries for the selected month in UTC representation
  const { start, end } = getMonthDateRange(selectedMonth);

  const where = {
    person_type: personType,
    person_id: personId,
    date: {
      gte: start,
      lt: end,
    },
  };

  const [rawRecords, totalCount] = await Promise.all([
    prisma.attendances.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { id: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendances.count({ where }),
  ]);

  const items: AttendanceHistoryItem[] = rawRecords.map((rec) => ({
    id: rec.id,
    date: rec.date,
    dateFormatted: formatWibDateLong(rec.date),
    checkInFormatted: rec.check_in ? formatWibTime(rec.check_in) : null,
    checkOutFormatted: rec.check_out ? formatWibTime(rec.check_out) : null,
    status: rec.status,
    notes: rec.notes,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    selectedMonth,
  };
}

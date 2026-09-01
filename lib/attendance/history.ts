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
 * Loads paginated attendance history for a specific user/person in a given WIB month.
 * Identity is strictly constrained to the authenticated user ID.
 */
export async function getAttendanceHistory(
  personTypeOrUserId: PersonnelType | number,
  personIdOrMonth?: number | string,
  rawMonthOrPage?: string | number,
  rawPageOrSize?: string | number,
  pageSize: number = 10
): Promise<AttendanceHistoryResult & { selectedMonth: string }> {
  let targetPersonId: number;
  let rawMonth: string | undefined;
  let rawPage: string | number | undefined;

  if (typeof personTypeOrUserId === 'number') {
    // Called as: getAttendanceHistory(userId, rawMonth, rawPage, pageSize)
    targetPersonId = personTypeOrUserId;
    rawMonth = typeof personIdOrMonth === 'string' ? personIdOrMonth : undefined;
    rawPage = rawMonthOrPage;
    if (typeof rawPageOrSize === 'number') {
      pageSize = rawPageOrSize;
    }
  } else {
    // Legacy: called as: getAttendanceHistory(personType, personId, rawMonth, rawPage, pageSize)
    targetPersonId = typeof personIdOrMonth === 'number' ? personIdOrMonth : 0;
    rawMonth = typeof rawMonthOrPage === 'string' ? rawMonthOrPage : undefined;
    rawPage = rawPageOrSize;
  }

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
    person_id: targetPersonId,
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
    latitude: rec.latitude,
    longitude: rec.longitude,
    accuracy: rec.accuracy,
    address: rec.address,
    latitude_out: rec.latitude_out,
    longitude_out: rec.longitude_out,
    accuracy_out: rec.accuracy_out,
    address_out: rec.address_out,
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

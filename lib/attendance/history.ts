import { PersonnelType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getMonthDateRange,
  getCurrentWibMonth,
  formatWibDateLong,
  formatWibTime,
} from '@/lib/time';
import {
  AttendanceHistoryItem,
  AttendanceHistoryResult,
  SuratTugasHistoryDetails,
} from '@/lib/types';
import { resolveProofUrl } from '@/lib/attendance-proof';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function formatSuratTugasPeriod(
  start: Date | string,
  end: Date | string
): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return '-';
  }

  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const startParts = formatter.formatToParts(startDate);
  const endParts = formatter.formatToParts(endDate);
  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const startDay = getPart(startParts, 'day');
  const startMonth = getPart(startParts, 'month');
  const startYear = getPart(startParts, 'year');
  const endDay = getPart(endParts, 'day');
  const endMonth = getPart(endParts, 'month');
  const endYear = getPart(endParts, 'year');

  if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
    return `${startDay} ${startMonth} ${startYear}`;
  }

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth} ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${startYear}`;
  }

  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
}

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

  const rawRecords = await prisma.attendances.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { id: 'desc' },
      ],
      include: {
        surat_tugas: {
          include: {
            user: {
              select: { id: true, nama: true, username: true },
            },
          },
        },
      },
    });

  const rawItems: AttendanceHistoryItem[] = rawRecords.map((rec) => ({
      id: rec.id,
      date: rec.date,
      dateFormatted: rec.status === 'SURAT_TUGAS' && rec.surat_tugas
        ? formatSuratTugasPeriod(rec.surat_tugas.mulai_tugas, rec.surat_tugas.selesai_tugas)
        : formatWibDateLong(rec.date),
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
      proof_file_url: resolveProofUrl(rec.proof_file_url),
      surat_tugas_id: rec.surat_tugas_id,
      surat_tugas: rec.surat_tugas as SuratTugasHistoryDetails | null,
    }));

  const items = consolidateAttendanceHistory(rawItems);
  const totalCount = items.length;
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items: paginatedItems,
    totalCount,
    page,
    pageSize,
    totalPages,
    selectedMonth,
  };
}

export function consolidateAttendanceHistory(
  items: AttendanceHistoryItem[]
): AttendanceHistoryItem[] {
  const displayed: AttendanceHistoryItem[] = [];
  const groupedSuratTugas = new Set<string>();

  for (const item of items) {
    if (
      item.status === 'SURAT_TUGAS' &&
      item.surat_tugas_id &&
      item.surat_tugas
    ) {
      if (!groupedSuratTugas.has(item.surat_tugas_id)) {
        groupedSuratTugas.add(item.surat_tugas_id);
        displayed.push(item);
      }
      continue;
    }

    displayed.push(item);
  }

  return displayed;
}

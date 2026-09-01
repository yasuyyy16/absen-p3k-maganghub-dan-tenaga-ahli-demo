import { PersonnelType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getNowWib,
  getWibDateParts,
  isWibWorkingDay,
  parseWibDateString,
} from '@/lib/time';
import { WibDateParts } from '@/lib/types';


export interface AlfaGenerationOptions {
  targetDate?: string | Date;
  forceWorkingDay?: boolean;
}

export interface AlfaGenerationResult {
  success: boolean;
  date: string;
  isWorkingDay: boolean;
  totalEligibleViewers: number;
  existingAttendanceCount: number;
  alfaCreatedCount: number;
  skippedCount: number;
  details: {
    createdUserIds: number[];
    skippedUserIds: number[];
  };
  error?: string;
}

/**
 * Service to automatically generate ALFA attendance records for active VIEWER accounts
 * who have no attendance record (HADIR, IZIN, SAKIT, or ALFA) on a given working day.
 *
 * Business Rules:
 * 1. Eligible participants: role === 'VIEWER' AND is_active === true in `users` table.
 * 2. Working days only (Monday–Friday in WIB timezone). Saturday/Sunday are skipped.
 * 3. Never overwrites existing attendance records (HADIR, IZIN, SAKIT, ALFA).
 * 4. Idempotent: safe to run multiple times without creating duplicate records.
 */
export async function generateAlfaAttendance(
  options: AlfaGenerationOptions = {}
): Promise<AlfaGenerationResult> {
  try {
    let dateParts: WibDateParts;
    let evalDate: Date;

    if (typeof options.targetDate === 'string') {
      const parsed = parseWibDateString(options.targetDate);
      if (!parsed) {
        return {
          success: false,
          date: options.targetDate,
          isWorkingDay: false,
          totalEligibleViewers: 0,
          existingAttendanceCount: 0,
          alfaCreatedCount: 0,
          skippedCount: 0,
          details: { createdUserIds: [], skippedUserIds: [] },
          error: `Format tanggal tidak valid: "${options.targetDate}". Gunakan format YYYY-MM-DD.`,
        };
      }
      dateParts = parsed;
      evalDate = parsed.dateObj;
    } else if (options.targetDate instanceof Date) {
      dateParts = getWibDateParts(options.targetDate);
      evalDate = options.targetDate;
    } else {
      evalDate = getNowWib();
      dateParts = getWibDateParts(evalDate);
    }

    const isWorkingDay = isWibWorkingDay(evalDate);

    // Skip weekend execution unless explicitly forced for testing
    if (!isWorkingDay && !options.forceWorkingDay) {
      console.log(
        `[ALFA GENERATOR] ${dateParts.dateString} adalah akhir pekan (bukan hari kerja). Proses ALFA dilewati.`
      );
      return {
        success: true,
        date: dateParts.dateString,
        isWorkingDay: false,
        totalEligibleViewers: 0,
        existingAttendanceCount: 0,
        alfaCreatedCount: 0,
        skippedCount: 0,
        details: { createdUserIds: [], skippedUserIds: [] },
      };
    }

    // 1. Retrieve all active VIEWER accounts
    const activeViewers = await prisma.users.findMany({
      where: {
        role: 'VIEWER',
        is_active: true,
      },
      select: {
        id: true,
        nama: true,
        jenis_personel: true,
      },
    });

    if (activeViewers.length === 0) {
      console.log(
        `[ALFA GENERATOR] ${dateParts.dateString}: Tidak ada akun VIEWER aktif yang ditemukan.`
      );
      return {
        success: true,
        date: dateParts.dateString,
        isWorkingDay: true,
        totalEligibleViewers: 0,
        existingAttendanceCount: 0,
        alfaCreatedCount: 0,
        skippedCount: 0,
        details: { createdUserIds: [], skippedUserIds: [] },
      };
    }

    const activeViewerIds = activeViewers.map((u) => u.id);

    // 2. Query existing attendance records for these active viewers on the target date
    const existingAttendances = await prisma.attendances.findMany({
      where: {
        date: dateParts.dateObj,
        person_id: { in: activeViewerIds },
      },
      select: {
        person_id: true,
        status: true,
      },
    });

    const attendedPersonIds = new Set(
      existingAttendances.map((att) => att.person_id)
    );

    // 3. Determine which active viewers have no attendance record
    const missingViewers = activeViewers.filter(
      (viewer) => !attendedPersonIds.has(viewer.id)
    );
    const skippedUserIds = activeViewers
      .filter((viewer) => attendedPersonIds.has(viewer.id))
      .map((viewer) => viewer.id);

    if (missingViewers.length === 0) {
      console.log(
        `[ALFA GENERATOR] ${dateParts.dateString}: Semua akun VIEWER aktif (${activeViewers.length}) sudah memiliki data absensi. Tidak ada ALFA baru yang dibuat.`
      );
      return {
        success: true,
        date: dateParts.dateString,
        isWorkingDay: true,
        totalEligibleViewers: activeViewers.length,
        existingAttendanceCount: existingAttendances.length,
        alfaCreatedCount: 0,
        skippedCount: skippedUserIds.length,
        details: {
          createdUserIds: [],
          skippedUserIds,
        },
      };
    }

    // 4. Prepare ALFA attendance records
    const now = getNowWib();
    const recordsToCreate = missingViewers.map((viewer) => {
      const isTenagaAhli =
        viewer.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
      const personType: PersonnelType = isTenagaAhli
        ? 'TENAGA_AHLI'
        : 'MAGANG';

      return {
        person_type: personType,
        person_id: viewer.id,
        date: dateParts.dateObj,
        status: 'ALFA' as const,
        check_in: null,
        check_out: null,
        notes: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        address: null,
        latitude_out: null,
        longitude_out: null,
        accuracy_out: null,
        address_out: null,
        updated_at: now,
      };
    });

    // 5. Batch insert missing records with skipDuplicates for idempotency
    const createResult = await prisma.attendances.createMany({
      data: recordsToCreate,
      skipDuplicates: true,
    });

    const createdUserIds = missingViewers.map((v) => v.id);

    console.log(
      `[ALFA GENERATOR] Tanggal: ${dateParts.dateString} | Total VIEWER Aktif: ${activeViewers.length} | Absensi Ada: ${existingAttendances.length} | ALFA Dibuat: ${createResult.count} | Dilewati: ${skippedUserIds.length}`
    );

    return {
      success: true,
      date: dateParts.dateString,
      isWorkingDay: true,
      totalEligibleViewers: activeViewers.length,
      existingAttendanceCount: existingAttendances.length,
      alfaCreatedCount: createResult.count,
      skippedCount: skippedUserIds.length,
      details: {
        createdUserIds,
        skippedUserIds,
      },
    };
  } catch (error) {
    console.error('[ALFA GENERATOR ERROR]', error);
    return {
      success: false,
      date: typeof options.targetDate === 'string' ? options.targetDate : 'UNKNOWN',
      isWorkingDay: false,
      totalEligibleViewers: 0,
      existingAttendanceCount: 0,
      alfaCreatedCount: 0,
      skippedCount: 0,
      details: { createdUserIds: [], skippedUserIds: [] },
      error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat proses ALFA.',
    };
  }
}

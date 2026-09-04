import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getNowWib, getWibDateParts, parseWibDateString, WIB_TIMEZONE } from '@/lib/time';

export const PROOF_RETENTION_DAYS = 5;

export interface ProofCleanupOptions {
  /**
   * Optional reference date (Date or YYYY-MM-DD string) to calculate retention against.
   * Defaults to current time in WIB.
   */
  referenceDate?: Date | string;
  /**
   * If true, checks and logs what would be deleted without actually removing files from disk.
   */
  dryRun?: boolean;
}

export interface DeletedProofDetail {
  attendanceId: number;
  date: string;
  proofUrl: string;
  fileName: string;
  status: 'DELETED' | 'ALREADY_MISSING' | 'ERROR' | 'DRY_RUN';
  error?: string;
}

export interface ProofCleanupResult {
  success: boolean;
  referenceDate: string;
  cutoffDate: string;
  retentionDays: number;
  totalExpiredRecords: number;
  deletedFilesCount: number;
  alreadyMissingFilesCount: number;
  errorsCount: number;
  details: DeletedProofDetail[];
  error?: string;
}

/**
 * Calculates calendar day difference in WIB timezone between referenceDate and targetDate.
 */
export function getWibDayDifference(
  targetDate: Date | string,
  referenceDate: Date = getNowWib()
): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const refParts = formatter.format(referenceDate).split('-');
  const refUtcMidnight = Date.UTC(Number(refParts[0]), Number(refParts[1]) - 1, Number(refParts[2]));

  const targetDateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const targetParts = formatter.format(targetDateObj).split('-');
  const targetUtcMidnight = Date.UTC(Number(targetParts[0]), Number(targetParts[1]) - 1, Number(targetParts[2]));

  const diffMs = refUtcMidnight - targetUtcMidnight;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Server-side cleanup function for attendance proof files.
 *
 * Business Rules:
 * 1. Proof files (public/uploads/proofs/*) have a strict 5-day retention policy calculated in WIB.
 * 2. Any attendance record whose date is older than 5 calendar days (diffDays > 5) has its physical file deleted.
 * 3. Files <= 5 days old are strictly preserved within the retention window.
 * 4. NEVER deletes attendance records from the database.
 * 5. NEVER removes or alters the `proof_file_url` column in the database (preserving historical audit data).
 * 6. Idempotent: can be executed multiple times without errors or side effects.
 * 7. Graceful: if a file is already missing on disk (ENOENT), logs a warning and proceeds without failing the job.
 */
export async function cleanupExpiredProofs(
  options: ProofCleanupOptions = {}
): Promise<ProofCleanupResult> {
  const details: DeletedProofDetail[] = [];
  let deletedFilesCount = 0;
  let alreadyMissingFilesCount = 0;
  let errorsCount = 0;

  try {
    // 1. Resolve reference date in WIB
    let refDate: Date;
    if (options.referenceDate) {
      if (typeof options.referenceDate === 'string') {
        const parsed = parseWibDateString(options.referenceDate);
        if (parsed) {
          refDate = parsed.dateObj;
        } else {
          refDate = new Date(options.referenceDate);
        }
      } else {
        refDate = options.referenceDate;
      }
    } else {
      refDate = getNowWib();
    }

    const refDateParts = getWibDateParts(refDate);

    // 2. Calculate cutoff date (strictly 5 days before reference date)
    // Records strictly older than 5 calendar days (date < cutoffDate) are expired.
    // E.g., if refDate = 2026-09-04:
    // 5 days retention: 2026-09-04 (0), 09-03 (1), 09-02 (2), 09-01 (3), 08-31 (4), 08-30 (5) are retained.
    // Any record with date <= 2026-08-29 (diffDays > 5) is expired.
    const cutoffDate = new Date(refDateParts.dateObj);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - PROOF_RETENTION_DAYS);
    const cutoffDateParts = getWibDateParts(cutoffDate);

    console.log(
      `[PROOF CLEANUP] Running cleanup. Reference date: ${refDateParts.dateString} WIB, Retention: ${PROOF_RETENTION_DAYS} days, Cutoff date: ${cutoffDateParts.dateString} WIB`
    );

    // 3. Query all attendance records with proofs that are older than cutoffDate
    const expiredRecords = await prisma.attendances.findMany({
      where: {
        date: {
          lt: cutoffDate,
        },
        proof_file_url: {
          not: null,
        },
      },
      select: {
        id: true,
        date: true,
        status: true,
        proof_file_url: true,
        person_id: true,
        person_type: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`[PROOF CLEANUP] Found ${expiredRecords.length} expired proof record(s) to process.`);

    const uploadBaseDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');

    for (const record of expiredRecords) {
      if (!record.proof_file_url) continue;

      const recordDateStr = getWibDateParts(record.date).dateString;

      // Extract filename safely using path.basename to prevent any directory traversal
      const rawFileName = record.proof_file_url.split('?')[0].split('#')[0];
      const fileName = path.basename(rawFileName);

      if (!fileName || fileName === '.' || fileName === '..') {
        console.warn(
          `[PROOF CLEANUP] Skipping invalid proof filename "${record.proof_file_url}" for attendance ID #${record.id}`
        );
        continue;
      }

      const absoluteFilePath = path.join(uploadBaseDir, fileName);

      if (options.dryRun) {
        console.log(
          `[PROOF CLEANUP][DRY_RUN] Would delete file: ${fileName} for attendance ID #${record.id} (${recordDateStr})`
        );
        details.push({
          attendanceId: record.id,
          date: recordDateStr,
          proofUrl: record.proof_file_url,
          fileName,
          status: 'DRY_RUN',
        });
        continue;
      }

      try {
        // Check if file exists before attempting unlink
        await fs.access(absoluteFilePath);

        // Delete file from disk
        await fs.unlink(absoluteFilePath);
        deletedFilesCount++;

        console.log(
          `[PROOF CLEANUP] [DELETED] File "${fileName}" removed successfully for attendance ID #${record.id} (Date: ${recordDateStr}, Status: ${record.status})`
        );

        details.push({
          attendanceId: record.id,
          date: recordDateStr,
          proofUrl: record.proof_file_url,
          fileName,
          status: 'DELETED',
        });
      } catch (fileErr: unknown) {
        const err = fileErr as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          // File already missing/deleted: expected & safe, not a job failure
          alreadyMissingFilesCount++;
          console.warn(
            `[PROOF CLEANUP] [ALREADY_MISSING] File "${fileName}" already not found on disk for attendance ID #${record.id} (Date: ${recordDateStr})`
          );

          details.push({
            attendanceId: record.id,
            date: recordDateStr,
            proofUrl: record.proof_file_url,
            fileName,
            status: 'ALREADY_MISSING',
          });
        } else {
          // Other I/O error (e.g., EPERM/EACCES)
          errorsCount++;
          console.error(
            `[PROOF CLEANUP] [ERROR] Failed to delete file "${fileName}" for attendance ID #${record.id}: ${err.message}`
          );

          details.push({
            attendanceId: record.id,
            date: recordDateStr,
            proofUrl: record.proof_file_url,
            fileName,
            status: 'ERROR',
            error: err.message,
          });
        }
      }
    }

    console.log(
      `[PROOF CLEANUP] Completed. Deleted: ${deletedFilesCount}, Already Missing: ${alreadyMissingFilesCount}, Errors: ${errorsCount}`
    );

    return {
      success: errorsCount === 0,
      referenceDate: refDateParts.dateString,
      cutoffDate: cutoffDateParts.dateString,
      retentionDays: PROOF_RETENTION_DAYS,
      totalExpiredRecords: expiredRecords.length,
      deletedFilesCount,
      alreadyMissingFilesCount,
      errorsCount,
      details,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown cleanup error';
    console.error(`[PROOF CLEANUP] Fatal error during cleanup job: ${errorMsg}`);
    return {
      success: false,
      referenceDate: getWibDateParts().dateString,
      cutoffDate: 'UNKNOWN',
      retentionDays: PROOF_RETENTION_DAYS,
      totalExpiredRecords: 0,
      deletedFilesCount,
      alreadyMissingFilesCount,
      errorsCount: errorsCount + 1,
      details,
      error: errorMsg,
    };
  }
}

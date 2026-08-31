'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  getNowWib,
  getWibDateParts,
  formatWibTime,
  isCheckoutAllowed,
} from '@/lib/time';

export interface AttendanceActionResult {
  success: boolean;
  message: string;
  checkInFormatted?: string;
  checkOutFormatted?: string;
}

/**
 * Server Action to record Absen Pagi (Check-in) for the authenticated user.
 */
export async function absenPagiAction(): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Check if attendance already exists today for this person
    const existing = await prisma.attendances.findUnique({
      where: {
        person_type_person_id_date: {
          person_type: session.personType,
          person_id: session.personId,
          date: today.dateObj,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: 'Kamu sudah absen pagi hari ini',
      };
    }

    const newRecord = await prisma.attendances.create({
      data: {
        person_type: session.personType,
        person_id: session.personId,
        date: today.dateObj,
        check_in: now,
        status: 'HADIR',
        updated_at: now,
      },
    });

    revalidatePath('/absensi');

    return {
      success: true,
      message: 'Absen pagi berhasil dicatat.',
      checkInFormatted: formatWibTime(newRecord.check_in ?? now),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message: 'Kamu sudah absen pagi hari ini',
      };
    }

    console.error('Error recording absen pagi:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mencatat absensi. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to record Absen Pulang (Check-out) for the authenticated user.
 */
export async function absenPulangAction(): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const now = getNowWib();
  const today = getWibDateParts(now);

  // Server-side validation: must be >= 16:00 WIB
  if (!isCheckoutAllowed(now)) {
    return {
      success: false,
      message: 'Absen pulang hanya dapat dilakukan mulai pukul 16:00 WIB.',
    };
  }

  try {
    // Find today's attendance record
    const existing = await prisma.attendances.findUnique({
      where: {
        person_type_person_id_date: {
          person_type: session.personType,
          person_id: session.personId,
          date: today.dateObj,
        },
      },
    });

    if (!existing || existing.status !== 'HADIR' || !existing.check_in) {
      return {
        success: false,
        message: 'Kamu belum melakukan absen pagi hari ini.',
      };
    }

    if (existing.check_out) {
      return {
        success: false,
        message: 'Kamu sudah melakukan absen pulang hari ini.',
      };
    }

    const updated = await prisma.attendances.update({
      where: {
        id: existing.id,
      },
      data: {
        check_out: now,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');

    return {
      success: true,
      message: 'Absen pulang berhasil dicatat.',
      checkOutFormatted: formatWibTime(updated.check_out ?? now),
    };
  } catch (error) {
    console.error('Error recording absen pulang:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mencatat absen pulang. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to submit an initial Izin or Sakit attendance request (when not yet checked in).
 * Strictly accepts only 'IZIN' or 'SAKIT' status, rejects 'ALFA' and others.
 */
export async function submitIzinSakitAction(
  formData: FormData
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const rawStatus = formData.get('status')?.toString().trim().toUpperCase();
  const rawNotes = formData.get('notes')?.toString().trim();

  // Validate status strictly (reject ALFA and unknown statuses)
  if (rawStatus !== 'IZIN' && rawStatus !== 'SAKIT') {
    return {
      success: false,
      message: 'Jenis pengajuan tidak valid. Hanya Izin atau Sakit yang diperbolehkan.',
    };
  }

  // Validate notes length (max 500 characters)
  if (rawNotes && rawNotes.length > 500) {
    return {
      success: false,
      message: 'Keterangan maksimal 500 karakter.',
    };
  }

  const notes = rawNotes && rawNotes.length > 0 ? rawNotes : null;
  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Check if attendance already exists today for this person
    const existing = await prisma.attendances.findUnique({
      where: {
        person_type_person_id_date: {
          person_type: session.personType,
          person_id: session.personId,
          date: today.dateObj,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: 'Data absensi hari ini sudah tercatat. Pengajuan tidak dapat diproses.',
      };
    }

    await prisma.attendances.create({
      data: {
        person_type: session.personType,
        person_id: session.personId,
        date: today.dateObj,
        status: rawStatus,
        notes: notes,
        check_in: null,
        check_out: null,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');

    return {
      success: true,
      message: `Pengajuan ${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'} berhasil dicatat.`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message: 'Data absensi hari ini sudah tercatat.',
      };
    }

    console.error('Error submitting izin/sakit:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat memproses pengajuan. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to convert an existing today's 'HADIR' attendance record to 'IZIN' or 'SAKIT'.
 * Only permitted when today's record exists, status === 'HADIR', and check_out === null.
 * Clears check_in and check_out, updates status, saves validated notes, and updates updated_at.
 */
export async function ubahKeIzinSakitAction(
  formData: FormData
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const rawStatus = formData.get('status')?.toString().trim().toUpperCase();
  const rawNotes = formData.get('notes')?.toString().trim();

  // Validate status strictly (reject ALFA and unknown statuses)
  if (rawStatus !== 'IZIN' && rawStatus !== 'SAKIT') {
    return {
      success: false,
      message: 'Jenis pengajuan tidak valid. Hanya Izin atau Sakit yang diperbolehkan.',
    };
  }

  // Validate notes length (max 500 characters)
  if (rawNotes && rawNotes.length > 500) {
    return {
      success: false,
      message: 'Keterangan maksimal 500 karakter.',
    };
  }

  const notes = rawNotes && rawNotes.length > 0 ? rawNotes : null;
  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Find today's attendance record
    const existing = await prisma.attendances.findUnique({
      where: {
        person_type_person_id_date: {
          person_type: session.personType,
          person_id: session.personId,
          date: today.dateObj,
        },
      },
    });

    // Validate that record exists, status is HADIR, and check_out is null
    if (!existing || existing.status !== 'HADIR') {
      return {
        success: false,
        message: 'Perubahan status hanya dapat dilakukan jika Anda berstatus Hadir hari ini.',
      };
    }

    if (existing.check_out !== null) {
      return {
        success: false,
        message: 'Perubahan status tidak dapat dilakukan karena Anda sudah melakukan Absen Pulang.',
      };
    }

    // Convert record to IZIN / SAKIT, clearing check_in and check_out
    await prisma.attendances.update({
      where: {
        id: existing.id,
      },
      data: {
        status: rawStatus,
        notes: notes,
        check_in: null,
        check_out: null,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');

    return {
      success: true,
      message: `Status kehadiran hari ini berhasil diubah menjadi ${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'}.`,
    };
  } catch (error) {
    console.error('Error converting status to izin/sakit:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mengubah status kehadiran. Silakan coba lagi.',
    };
  }
}

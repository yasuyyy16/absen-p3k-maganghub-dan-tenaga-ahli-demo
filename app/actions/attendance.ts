'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  getNowWib,
  getWibDateParts,
  formatWibTime,
} from '@/lib/time';
import { LocationPayload, PersonnelType } from '@/lib/types';
import { isValidCoordinates, reverseGeocode } from '@/lib/location';

export interface AttendanceActionResult {
  success: boolean;
  message: string;
  checkInFormatted?: string;
  checkOutFormatted?: string;
}

/**
 * Server Action to record Absen Pagi (Check-in) with GPS coordinates for the authenticated user.
 */
export async function absenPagiAction(
  location?: LocationPayload
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  // Validate GPS coordinates from client
  if (!location || !isValidCoordinates(location.latitude, location.longitude)) {
    return {
      success: false,
      message: 'Lokasi GPS diperlukan untuk melakukan absen pagi. Pastikan izin lokasi diaktifkan pada browser.',
    };
  }

  // Fetch authenticated user to ensure active status and derive personType
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Sesi login tidak valid atau akun dinonaktifkan.',
    };
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Check if attendance already exists today for this user
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
      },
    });

    if (existing) {
      return {
        success: false,
        message: 'Kamu sudah absen pagi hari ini',
      };
    }

    // Reverse geocode to get human-readable address (graceful fallback to null)
    const address = await reverseGeocode(location.latitude, location.longitude);

    const newRecord = await prisma.attendances.create({
      data: {
        person_type: personType,
        person_id: user.id,
        date: today.dateObj,
        check_in: now,
        status: 'HADIR',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
        address: address,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');
    revalidatePath('/absensi/riwayat');

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
 * Server Action to record Absen Pulang (Check-out) with GPS coordinates for the authenticated user.
 */
export async function absenPulangAction(
  location?: LocationPayload
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  // Validate GPS coordinates from client
  if (!location || !isValidCoordinates(location.latitude, location.longitude)) {
    return {
      success: false,
      message: 'Lokasi GPS diperlukan untuk melakukan absen pulang. Pastikan izin lokasi diaktifkan pada browser.',
    };
  }

  // Verify active user
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Sesi login tidak valid atau akun dinonaktifkan.',
    };
  }

  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Find today's attendance record for this user
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
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

    // Reverse geocode checkout location
    const addressOut = await reverseGeocode(location.latitude, location.longitude);

    const updated = await prisma.attendances.update({
      where: {
        id: existing.id,
      },
      data: {
        check_out: now,
        latitude_out: location.latitude,
        longitude_out: location.longitude,
        accuracy_out: location.accuracy ?? null,
        address_out: addressOut,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');
    revalidatePath('/absensi/riwayat');

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

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Sesi login tidak valid atau akun dinonaktifkan.',
    };
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  const notes = rawNotes && rawNotes.length > 0 ? rawNotes : null;
  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Check if attendance already exists today for this user
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
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
        person_type: personType,
        person_id: user.id,
        date: today.dateObj,
        status: rawStatus,
        notes: notes,
        check_in: null,
        check_out: null,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');
    revalidatePath('/absensi/riwayat');

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

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Sesi login tidak valid atau akun dinonaktifkan.',
    };
  }

  const notes = rawNotes && rawNotes.length > 0 ? rawNotes : null;
  const now = getNowWib();
  const today = getWibDateParts(now);

  try {
    // Find today's attendance record
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
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

    // Convert record to IZIN / SAKIT, clearing check_in, check_out, and location data
    await prisma.attendances.update({
      where: {
        id: existing.id,
      },
      data: {
        status: rawStatus,
        notes: notes,
        check_in: null,
        check_out: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        address: null,
        latitude_out: null,
        longitude_out: null,
        accuracy_out: null,
        address_out: null,
        updated_at: now,
      },
    });

    revalidatePath('/absensi');
    revalidatePath('/absensi/riwayat');

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

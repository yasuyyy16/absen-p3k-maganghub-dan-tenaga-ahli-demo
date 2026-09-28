'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  getNowWib,
  getWibDateParts,
  parseWibDateString,
  formatWibTime,
  getWibDayOfWeek,
  isWibAttendanceWindowClosed,
  isWibAttendanceWindowOpen,
} from '@/lib/time';
import { formatSuratTugasPeriod } from '@/lib/attendance/history';
import { LocationPayload, PersonnelType } from '@/lib/types';
import { isValidCoordinates, reverseGeocode, isWithinAttendanceRadius } from '@/lib/location';
import { uploadAttendanceProof } from '@/lib/storage';
import { validateProofFile } from '@/lib/constants/attendance';
import { getServerLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';

export interface AttendanceActionResult {
  success: boolean;
  message: string;
  checkInFormatted?: string;
  checkOutFormatted?: string;
}

function safeRevalidatePaths(...paths: string[]) {
  try {
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Graceful fallback when executed outside Next.js request context (e.g. tests)
  }
}

async function createActivityLog(
  tx: Prisma.TransactionClient,
  userId: number,
  title: string,
  description: string
) {
  await tx.user_activities.create({
    data: {
      user_id: userId,
      title,
      description,
    },
  });
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu sebelum menggunakan fitur absensi.',
    };
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  const now = getNowWib();
  const today = getWibDateParts(now);
  const dayOfWeek = getWibDayOfWeek(now);
  const isFriday = dayOfWeek === 5;

  // Reject attendance if daily window is closed (>= 23:59:00 WIB)
  if (isWibAttendanceWindowClosed(today.dateObj, now)) {
    return {
      success: false,
      message: 'udah gabisa absen lol. Absen Pagi tidak dapat dilakukan setelah pukul 23:58 WIB.',
    };
  }

  // Reject attendance if daily window is not yet open (< 00:01:00 WIB)
  if (!isWibAttendanceWindowOpen(today.dateObj, now)) {
    return {
      success: false,
      message: 'Periode absensi harian belum dimulai. Absensi dimulai pukul 00:01 WIB.',
    };
  }

  // Reject attendance on Saturday (6) and Sunday (0)
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      success: false,
      message: 'Hari Sabtu dan Minggu merupakan hari libur. Jadi ga absen yakh.',
    };
  }

  // Check for SURAT_TUGAS before requiring GPS — user shouldn't be asked for GPS when they have a Surat Tugas.
  const todaySuratTugas = await prisma.attendances.findFirst({
    where: {
      person_id: user.id,
      date: today.dateObj,
      status: 'SURAT_TUGAS',
    },
  });

  if (todaySuratTugas) {
    return {
      success: false,
      message: 'Kamu memiliki Surat Tugas pada hari ini. Tidak perlu absen.',
    };
  }

  // GPS & Radius Validation:
  // Friday is WFA: GPS is optional, and geofence validation is bypassed.
  // Monday-Thursday (1, 2, 3, 4): GPS coordinates are strictly required and radius check is enforced.
  const hasValidGps = Boolean(
    location && isValidCoordinates(location.latitude, location.longitude)
  );

  if (!isFriday) {
    if (!hasValidGps || !location) {
      return {
        success: false,
        message: 'Nyalain GPS nya woi buat absen pagi. Nyalain izin lokasi di browser.',
      };
    }

    if (!isWithinAttendanceRadius(location.latitude, location.longitude)) {
      return {
        success: false,
        message: 'Masuk ke radiusnya dulu mas/mba. Absensi Senin-Kamis cuman bisa dilakukan dalam radius 100 meter dari Gedung Mina Bahari 3.',
      };
    }
  }

  try {
    // Check if attendance already exists today for this user
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
      },
    });

    if (existing) {
      if (existing.status === 'HADIR') {
        return {
          success: false,
          message: 'Kamu sudah absen cik pagi hari ini',
        };
      }
      if (existing.status === 'IZIN' || existing.status === 'SAKIT') {
        return {
          success: false,
          message: `Kamu sudah tercatat ${existing.status} hari ini.`,
        };
      }
      if (existing.status === 'RAPAT') {
        return {
          success: false,
          message: 'Kamu sedang tercatat dalam mode RAPAT.',
        };
      }

      // If existing record has status 'ALFA' (e.g. premature ALFA during ongoing window), update it to HADIR
      const address = hasValidGps && location
        ? await reverseGeocode(location.latitude, location.longitude)
        : null;

      const updatedRecord = await prisma.$transaction(async (tx) => {
        const record = await tx.attendances.update({
          where: { id: existing.id },
          data: {
            check_in: now,
            status: 'HADIR',
            latitude: hasValidGps && location ? location.latitude : null,
            longitude: hasValidGps && location ? location.longitude : null,
            accuracy: hasValidGps && location ? (location.accuracy ?? null) : null,
            address: address,
            updated_at: now,
          },
        });

        await createActivityLog(
          tx,
          user.id,
          'Absen pagi berhasil',
          `Presensi masuk berhasil dicatat pada ${today.dateString}, ${formatWibTime(record.check_in ?? now)}.`
        );

        return record;
      });

      safeRevalidatePaths('/absensi', '/absensi/riwayat');

      const locale = await getServerLocale();
      const t = getDictionary(locale);

      return {
        success: true,
        message: t.actions.absenPagiSuccess,
        checkInFormatted: formatWibTime(updatedRecord.check_in ?? now),
      };
    }

    // Reverse geocode to get human-readable address (graceful fallback to null)
    const address = hasValidGps && location
      ? await reverseGeocode(location.latitude, location.longitude)
      : null;

    const newRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.attendances.create({
        data: {
          person_type: personType,
          person_id: user.id,
          date: today.dateObj,
          check_in: now,
          status: 'HADIR',
          latitude: hasValidGps && location ? location.latitude : null,
          longitude: hasValidGps && location ? location.longitude : null,
          accuracy: hasValidGps && location ? (location.accuracy ?? null) : null,
          address: address,
          updated_at: now,
        },
      });

      await createActivityLog(
        tx,
        user.id,
        'Absen pagi berhasil',
        `Presensi masuk berhasil dicatat pada ${today.dateString}, ${formatWibTime(record.check_in ?? now)}.`
      );

      return record;
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return {
      success: true,
      message: t.actions.absenPagiSuccess,
      checkInFormatted: formatWibTime(newRecord.check_in ?? now),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message: 'Kamu sudah absen cik pagi hari ini',
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu sebelum menggunakan fitur absensi.',
    };
  }

  const now = getNowWib();
  const today = getWibDateParts(now);
  const dayOfWeek = getWibDayOfWeek(now);

  // Reject attendance on Saturday (6) and Sunday (0)
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      success: false,
      message: 'Hari Sabtu dan Minggu merupakan hari libur. Jadi ga absen yakh.',
    };
  }

  // GPS & Location for Absen Pulang:
  // Absen Pulang is location-independent (bebas lokasi) on all working days (Mon-Fri).
  // GPS coordinates and geofence/radius validation are NOT required.
  const hasValidGps = Boolean(
    location && isValidCoordinates(location.latitude, location.longitude)
  );

  try {
    // Find today's attendance record for this user
    const existing = await prisma.attendances.findFirst({
      where: {
        person_id: user.id,
        date: today.dateObj,
      },
    });

    if (existing?.status === 'RAPAT') {
      return {
        success: false,
        message: 'Data absensi hari ini sudah tercatat sebagai Rapat. Absen Pulang tidak diperlukan.',
      };
    }

    if (existing?.status === 'SURAT_TUGAS') {
      return {
        success: false,
        message: 'Data absensi hari ini sudah tercatat sebagai Surat Tugas. Absen Pulang tidak diperlukan.',
      };
    }

    if (!existing) {
      return {
        success: false,
        message: 'Kamu belum absen pagi hari ini cik. Tidak bisa absen pulang.',
      };
    }

    if (existing.status !== 'HADIR' || !existing.check_in) {
      return {
        success: false,
        message: 'Kamu belum melakukan absen pagi hari ini woila.',
      };
    }

    if (existing.check_out) {
      return {
        success: false,
        message: 'Kamu sudah melakukan absen pulang cik hari ini.',
      };
    }

    // Reverse geocode checkout location (graceful fallback to null)
    const addressOut = hasValidGps && location
      ? await reverseGeocode(location.latitude, location.longitude)
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.attendances.update({
        where: {
          id: existing.id,
        },
        data: {
          check_out: now,
          latitude_out: hasValidGps && location ? location.latitude : null,
          longitude_out: hasValidGps && location ? location.longitude : null,
          accuracy_out: hasValidGps && location ? (location.accuracy ?? null) : null,
          address_out: addressOut,
          updated_at: now,
        },
      });

      await createActivityLog(
        tx,
        user.id,
        'Absen pulang berhasil',
        `Presensi pulang berhasil dicatat pada ${today.dateString}, ${formatWibTime(record.check_out ?? now)}.`
      );

      return record;
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return {
      success: true,
      message: t.actions.absenPulangSuccess,
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
  const proofFile = formData.get('proof') as File | null;

  // Validate status strictly (reject ALFA and unknown statuses)
  if (rawStatus !== 'IZIN' && rawStatus !== 'SAKIT') {
    return {
      success: false,
      message: 'Jenis pengajuan tidak valid. Hanya Izin atau Sakit yang diperbolehkan.',
    };
  }

  // Validate proof file (server-side authority)
  if (!proofFile) {
    return {
      success: false,
      message: 'Bukti wajib diunggah untuk pengajuan IZIN atau SAKIT.',
    };
  }

  const proofValidation = validateProofFile(proofFile);
  if (!proofValidation.valid) {
    return {
      success: false,
      message: proofValidation.error || 'Bukti tidak valid.',
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu sebelum menggunakan fitur absensi.',
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
        if (existing.status === 'SURAT_TUGAS') {
          return {
            success: false,
            message: 'Kamu memiliki Surat Tugas pada hari ini. Tidak dapat mengajukan Izin/Sakit.',
          };
        }
        if (existing.status === 'HADIR') {
          return {
            success: false,
            message: 'Terdapat catatan kehadiran (HADIR) pada hari ini. Tidak dapat mengajukan Izin/Sakit.',
          };
        }
        if (existing.status === 'RAPAT') {
          return {
            success: false,
            message: 'Terdapat status RAPAT pada hari ini. Tidak dapat mengajukan Izin/Sakit.',
          };
        }
        if (existing.status === 'IZIN' || existing.status === 'SAKIT') {
          return {
            success: false,
            message: `Kamu sudah memiliki status ${existing.status} pada hari ini.`,
          };
        }

      // If existing record has status 'ALFA' (e.g. premature ALFA), update it to IZIN or SAKIT
      const proofUrl = await uploadAttendanceProof(proofFile);

      await prisma.$transaction(async (tx) => {
        await tx.attendances.update({
          where: { id: existing.id },
          data: {
            status: rawStatus,
            notes: notes,
            proof_file_url: proofUrl,
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

        await createActivityLog(
          tx,
          user.id,
          `${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'} berhasil dicatat`,
          `Status presensi hari ini berhasil diubah menjadi ${rawStatus === 'IZIN' ? 'IZIN' : 'SAKIT'}.`
        );
      });

      safeRevalidatePaths('/absensi', '/absensi/riwayat');

      const locale = await getServerLocale();
      const t = getDictionary(locale);

      return {
        success: true,
        message: rawStatus === 'IZIN' ? t.actions.izinSuccess : t.actions.sakitSuccess,
      };
    }

    const proofUrl = await uploadAttendanceProof(proofFile);

    await prisma.$transaction(async (tx) => {
      await tx.attendances.create({
        data: {
          person_type: personType,
          person_id: user.id,
          date: today.dateObj,
          status: rawStatus,
          notes: notes,
          proof_file_url: proofUrl,
          check_in: null,
          check_out: null,
          updated_at: now,
        },
      });

      await createActivityLog(
        tx,
        user.id,
        `${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'} berhasil dicatat`,
        `Status presensi hari ini berhasil diubah menjadi ${rawStatus === 'IZIN' ? 'IZIN' : 'SAKIT'}.`
      );
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return {
      success: true,
      message: rawStatus === 'IZIN' ? t.actions.izinSuccess : t.actions.sakitSuccess,
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
  const proofFile = formData.get('proof') as File | null;

  // Validate status strictly (reject ALFA and unknown statuses)
  if (rawStatus !== 'IZIN' && rawStatus !== 'SAKIT') {
    return {
      success: false,
      message: 'Jenis pengajuan tidak valid. Hanya Izin atau Sakit yang diperbolehkan.',
    };
  }

  // Validate proof file (server-side authority)
  if (!proofFile) {
    return {
      success: false,
      message: 'Bukti wajib diunggah untuk pengajuan IZIN atau SAKIT.',
    };
  }

  const proofValidation = validateProofFile(proofFile);
  if (!proofValidation.valid) {
    return {
      success: false,
      message: proofValidation.error || 'Bukti tidak valid.',
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu sebelum menggunakan fitur absensi.',
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

    if (existing && existing.status === 'SURAT_TUGAS') {
      return {
        success: false,
        message: 'Perubahan status tidak dapat dilakukan karena Anda sedang dalam status Surat Tugas.',
      };
    }

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

    const proofUrl = await uploadAttendanceProof(proofFile);

    // Convert record to IZIN / SAKIT, clearing check_in, check_out, and location data
    await prisma.$transaction(async (tx) => {
      await tx.attendances.update({
        where: {
          id: existing.id,
        },
        data: {
          status: rawStatus,
          notes: notes,
          proof_file_url: proofUrl,
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

      await createActivityLog(
        tx,
        user.id,
        `${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'} berhasil dicatat`,
        `Status presensi hari ini berhasil diubah menjadi ${rawStatus === 'IZIN' ? 'IZIN' : 'SAKIT'}.`
      );
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return {
      success: true,
      message: rawStatus === 'IZIN' ? t.actions.ubahIzinSuccess : t.actions.ubahSakitSuccess,
    };
  } catch (error) {
    console.error('Error converting status to izin/sakit:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mengubah status kehadiran. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to record meeting attendance (Rapat) for the authenticated user.
 * Supports direct Rapat (when no attendance exists) and in-place conversion from HADIR.
 * Requires mandatory keterangan rapat (description) saved in notes.
 */
export async function catatRapatAction(
  keteranganOrFormData?: string | FormData
): Promise<AttendanceActionResult> {
  let rawKeterangan: string | undefined;
  if (typeof keteranganOrFormData === 'string') {
    rawKeterangan = keteranganOrFormData;
  } else if (keteranganOrFormData instanceof FormData) {
    rawKeterangan = (
      keteranganOrFormData.get('keterangan') || keteranganOrFormData.get('notes')
    )?.toString();
  }

  const keterangan = rawKeterangan?.trim();
  if (!keterangan) {
    return {
      success: false,
      message: 'Keterangan rapat wajib diisi.',
    };
  }

  if (keterangan.length > 500) {
    return {
      success: false,
      message: 'Keterangan rapat maksimal 500 karakter.',
    };
  }

  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu sebelum menggunakan fitur absensi.',
    };
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  const now = getNowWib();
  const today = getWibDateParts(now);
  const dayOfWeek = getWibDayOfWeek(now);

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      success: false,
      message: 'Hari Sabtu dan Minggu merupakan hari libur. Jadi ga absen yakh.',
    };
  }

  if (isWibAttendanceWindowClosed(today.dateObj, now)) {
    return {
      success: false,
      message: 'Waktu absensi hari ini telah berakhir ang ang ang.',
    };
  }

  if (!isWibAttendanceWindowOpen(today.dateObj, now)) {
    return {
      success: false,
      message: 'Periode absensi harian belum dimulai. Absensi dimulai pukul 00:01 WIB.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.attendances.findFirst({
        where: {
          person_id: user.id,
          date: today.dateObj,
        },
      });

      if (existing) {
        if (existing.status === 'HADIR' && existing.check_in !== null) {
          await tx.attendances.update({
            where: { id: existing.id },
            data: {
              status: 'RAPAT',
              notes: keterangan,
              check_out: null,
              updated_at: now,
            },
          });

          await createActivityLog(
            tx,
            user.id,
            'Rapat berhasil dicatat',
            `Status presensi diubah menjadi RAPAT. Keterangan: ${keterangan}`
          );

          const locale = await getServerLocale();
          const t = getDictionary(locale);

          return {
            success: true,
            message: t.actions.rapatSuccess,
          };
        }

        if (existing.status === 'RAPAT') {
          return {
            success: false,
            message: 'Presensi Rapat hari ini sudah tercatat.',
          };
        }

        if (existing.status === 'SURAT_TUGAS') {
          return {
            success: false,
            message: 'Kamu memiliki Surat Tugas pada hari ini. Tidak dapat mengubah status ke RAPAT.',
          };
        }

        if (existing.status === 'IZIN' || existing.status === 'SAKIT') {
          return {
            success: false,
            message: `Tidak bisa ubah ke RAPAT karena Anda sedang ${existing.status}.`,
          };
        }

        return {
          success: false,
          message: 'Status absensi saat ini tidak dapat diubah ke RAPAT.',
        };
      }

      await tx.attendances.create({
        data: {
          person_type: personType,
          person_id: user.id,
          date: today.dateObj,
          status: 'RAPAT',
          notes: keterangan,
          check_in: now,
          updated_at: now,
        },
      });

      await createActivityLog(
        tx,
        user.id,
        'Rapat berhasil dicatat',
        `Status presensi diubah menjadi RAPAT. Keterangan: ${keterangan}`
      );

      const locale = await getServerLocale();
      const t = getDictionary(locale);

      return {
        success: true,
        message: t.actions.rapatSuccess,
      };
    });

    if (result.success) {
      safeRevalidatePaths('/absensi', '/absensi/riwayat');
    }

    return result;
  } catch (error) {
    console.error('Error recording rapat:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mencatat presensi Rapat. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to record Surat Tugas (Official Assignment) for the authenticated user.
 * Generates SURAT_TUGAS attendance records for a specific date range.
 * Working days only (Monday-Friday). Skips Saturday/Sunday.
 * If ANY of the working dates already have an attendance record, the entire transaction is rejected.
 */
export async function suratTugasAction(
  formData: FormData
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const rawNomor = (formData.get('nomor_surat_tugas') || formData.get('nomorSuratTugas'))?.toString().trim();
  const rawLokasi = formData.get('lokasi')?.toString().trim();
  const rawTanggalTerbit = formData.get('tanggal_terbit')?.toString().trim();
  const rawStartDate = (formData.get('start_date') || formData.get('mulai_tugas'))?.toString().trim();
  const rawEndDate = (formData.get('end_date') || formData.get('selesai_tugas'))?.toString().trim();

  if (!rawNomor || !rawLokasi || !rawTanggalTerbit || !rawStartDate || !rawEndDate) {
    return {
      success: false,
      message: 'Semua field (Nomor Surat, Lokasi, Tanggal Terbit, Tanggal Mulai, Tanggal Selesai) wajib diisi.',
    };
  }

  // Parse calendar dates without local timezone shifts
  const terbitParsed = parseWibDateString(rawTanggalTerbit) || getWibDateParts(new Date(rawTanggalTerbit + 'T00:00:00.000+07:00'));
  const startParsed = parseWibDateString(rawStartDate) || getWibDateParts(new Date(rawStartDate + 'T00:00:00.000+07:00'));
  const endParsed = parseWibDateString(rawEndDate) || getWibDateParts(new Date(rawEndDate + 'T00:00:00.000+07:00'));

  if (!terbitParsed || !startParsed || !endParsed) {
    return {
      success: false,
      message: 'Format tanggal tidak valid.',
    };
  }

  if (startParsed.dateString > endParsed.dateString) {
    return {
      success: false,
      message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
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

  if (!user.nama?.trim() || !user.jenis_personel?.trim()) {
    return {
      success: false,
      message: 'Silakan lengkapi profil Anda terlebih dahulu.',
    };
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  // Calculate working dates between start and end (UTC milliseconds to preserve immutability)
  const workingDates: Date[] = [];
  let curTime = startParsed.dateObj.getTime();
  const endTime = endParsed.dateObj.getTime();
  const now = getNowWib();

  while (curTime <= endTime) {
    const curDate = new Date(curTime);
    const dayOfWeek = getWibDayOfWeek(curDate);
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDates.push(curDate);
    }
    curTime += 86400000;
  }

  if (workingDates.length === 0) {
    return {
      success: false,
      message: 'Tidak ada hari kerja dalam rentang tanggal Surat Tugas. Pastikan rentang mencakup setidaknya satu hari kerja (Senin–Jumat).',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. OVERLAP CHECK: Check for overlapping SuratTugas date ranges
      const overlapping = await tx.surat_tugas.findFirst({
        where: {
          user_id: user.id,
          // Overlap condition: StartA <= EndB AND EndA >= StartB
          mulai_tugas: {
            lte: endParsed.dateObj
          },
          selesai_tugas: {
            gte: startParsed.dateObj
          }
        }
      });

      if (overlapping) {
        return {
          success: false,
          message: `Gagal. Terdapat Surat Tugas lain (No: ${overlapping.nomor_surat_tugas}) yang tumpang tindih dengan periode ini.`,
        };
      }

      // 2. CONFLICT CHECK: Check for any existing attendance records in the working date range
      if (workingDates.length > 0) {
        const existing = await tx.attendances.findMany({
          where: {
            person_id: user.id,
            date: {
              in: workingDates,
            },
          },
          select: {
            date: true,
            status: true,
          },
        });

        if (existing.length > 0) {
          // If there's any existing record, reject the whole transaction
          const conflictDates = existing.map(e => e.date.toISOString().split('T')[0]).join(', ');
          return {
            success: false,
            message: `Pembuatan Surat Tugas gagal karena sudah ada data absensi pada tanggal: ${conflictDates}.`,
          };
        }
      }

      // 3. CREATE SURAT TUGAS ENTITY
      const createdSuratTugas = await tx.surat_tugas.create({
        data: {
          user_id: user.id,
          nomor_surat_tugas: rawNomor,
          tanggal_terbit: terbitParsed.dateObj,
          mulai_tugas: startParsed.dateObj,
          selesai_tugas: endParsed.dateObj,
          lokasi: rawLokasi,
          created_at: now,
          updated_at: now,
        }
      });

      // 4. CREATE ATTENDANCE ROWS FOR WORKING DAYS
      if (workingDates.length > 0) {
        const recordsToCreate = workingDates.map(date => ({
          person_type: personType,
          person_id: user.id,
          date: date,
          status: 'SURAT_TUGAS' as const,
          surat_tugas_id: createdSuratTugas.id,
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
        }));

        await tx.attendances.createMany({
          data: recordsToCreate,
        });
      }

      const periodStr = formatSuratTugasPeriod(startParsed.dateObj, endParsed.dateObj);

      await tx.user_activities.create({
        data: {
          user_id: user.id,
          title: 'Surat Tugas berhasil dibuat',
          description: `${rawNomor}\n${periodStr} \u00B7 ${rawLokasi}`
        }
      });

      const locale = await getServerLocale();
      const t = getDictionary(locale);

      return {
        success: true,
        message: t.actions.suratTugasSuccess,
      };
    });

    if (result.success) {
      safeRevalidatePaths('/absensi', '/absensi/riwayat');
    }

    return result;
  } catch (error) {
    console.error('Error creating surat tugas:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat membuat Surat Tugas. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action to delete a Surat Tugas and its associated generated attendance records.
 * Strictly restricted to the owner (authenticated user who created the Surat Tugas).
 */
export async function deleteSuratTugasAction(
  suratTugasId: string
): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  if (!suratTugasId || typeof suratTugasId !== 'string' || !suratTugasId.trim()) {
    return {
      success: false,
      message: 'ID Surat Tugas tidak valid.',
    };
  }

  const cleanId = suratTugasId.trim();

  try {
    const existing = await prisma.surat_tugas.findUnique({
      where: { id: cleanId },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Surat Tugas tidak ditemukan.',
      };
    }

    if (existing.user_id !== session.userId) {
      return {
        success: false,
        message: 'Anda tidak memiliki akses untuk menghapus Surat Tugas ini.',
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all attendance records generated for this Surat Tugas
      await tx.attendances.deleteMany({
        where: {
          surat_tugas_id: cleanId,
        },
      });

      // 2. Delete the parent Surat Tugas
      await tx.surat_tugas.delete({
        where: {
          id: cleanId,
        },
      });

      // 3. Create persistent activity snapshot
      const periodStr = formatSuratTugasPeriod(existing.mulai_tugas, existing.selesai_tugas);
      await tx.user_activities.create({
        data: {
          user_id: session.userId,
          title: 'Surat Tugas berhasil dihapus',
          description: `Nomor: ${existing.nomor_surat_tugas}\nPeriode: ${periodStr}\nLokasi: ${existing.lokasi}`,
        },
      });
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    const locale = await getServerLocale();
    const t = getDictionary(locale);

    return {
      success: true,
      message: t.actions.deleteSuratTugasSuccess,
    };
  } catch (error) {
    console.error('Error deleting surat tugas:', error);
    return {
      success: false,
      message: 'Gagal menghapus Surat Tugas. Silakan coba lagi.',
    };
  }
}


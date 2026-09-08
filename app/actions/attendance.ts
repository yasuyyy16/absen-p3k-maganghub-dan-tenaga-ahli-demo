'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  getNowWib,
  getWibDateParts,
  formatWibTime,
  getWibDayOfWeek,
  isWibAttendanceWindowClosed,
  isWibAttendanceWindowOpen,
} from '@/lib/time';
import { LocationPayload, PersonnelType } from '@/lib/types';
import { isValidCoordinates, reverseGeocode, isWithinAttendanceRadius } from '@/lib/location';
import { uploadAttendanceProof } from '@/lib/storage';
import { MAX_PROOF_FILE_SIZE, validateProofFile } from '@/lib/constants/attendance';

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
          message: `Data absensi hari ini sudah tercatat sebagai ${existing.status === 'IZIN' ? 'Izin' : 'Sakit'}.`,
        };
      }
      if (existing.status === 'RAPAT') {
        return {
          success: false,
          message: 'Data absensi hari ini sudah tercatat sebagai Rapat.',
        };
      }

      // If existing record has status 'ALFA' (e.g. premature ALFA during ongoing window), update it to HADIR
      const address = hasValidGps && location
        ? await reverseGeocode(location.latitude, location.longitude)
        : null;

      const updatedRecord = await prisma.attendances.update({
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

      safeRevalidatePaths('/absensi', '/absensi/riwayat');

      return {
        success: true,
        message: 'Absen pagi berhasil dicatat bos.',
        checkInFormatted: formatWibTime(updatedRecord.check_in ?? now),
      };
    }

    // Reverse geocode to get human-readable address (graceful fallback to null)
    const address = hasValidGps && location
      ? await reverseGeocode(location.latitude, location.longitude)
      : null;

    const newRecord = await prisma.attendances.create({
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

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    return {
      success: true,
      message: 'Absen pagi berhasil dicatat bos.',
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
  const isFriday = dayOfWeek === 5;

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

    if (!existing || existing.status !== 'HADIR' || !existing.check_in) {
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

    const updated = await prisma.attendances.update({
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

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    return {
      success: true,
      message: 'Absen pulang berhasil dicatat yeakh.',
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
      if (existing.status === 'HADIR') {
        return {
          success: false,
          message: 'Data absensi hari ini sudah tercatat. Pengajuan tidak dapat diproses.',
        };
      }
      if (existing.status === 'IZIN' || existing.status === 'SAKIT') {
        return {
          success: false,
          message: `Pengajuan ${existing.status === 'IZIN' ? 'Izin' : 'Sakit'} hari ini sudah tercatat.`,
        };
      }
      if (existing.status === 'RAPAT') {
        return {
          success: false,
          message: 'Data absensi hari ini sudah tercatat sebagai Rapat.',
        };
      }

      // If existing record has status 'ALFA' (e.g. premature ALFA), update it to IZIN or SAKIT
      const proofUrl = await uploadAttendanceProof(proofFile);

      await prisma.attendances.update({
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

      safeRevalidatePaths('/absensi', '/absensi/riwayat');

      return {
        success: true,
        message: `Pengajuan ${rawStatus === 'IZIN' ? 'Izin' : 'Sakit'} berhasil dicatat.`,
      };
    }

    const proofUrl = await uploadAttendanceProof(proofFile);

    await prisma.attendances.create({
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

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

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
    await prisma.attendances.update({
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

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

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

          return {
            success: true,
            message: 'Presensi Rapat berhasil dicatat.',
          };
        }

        if (existing.status === 'RAPAT') {
          return {
            success: false,
            message: 'Presensi Rapat hari ini sudah tercatat.',
          };
        }

        if (existing.status === 'IZIN' || existing.status === 'SAKIT') {
          return {
            success: false,
            message: `Tidak dapat memilih Rapat karena status kehadiran hari ini adalah ${existing.status === 'IZIN' ? 'Izin' : 'Sakit'}.`,
          };
        }

        if (existing.status === 'ALFA') {
          return {
            success: false,
            message: 'Tidak dapat memilih Rapat karena status kehadiran hari ini sudah tercatat sebagai Alfa.',
          };
        }

        return {
          success: false,
          message: 'Presensi hari ini sudah tercatat.',
        };
      }

      await tx.attendances.create({
        data: {
          person_type: personType,
          person_id: user.id,
          date: today.dateObj,
          status: 'RAPAT',
          notes: keterangan,
          check_in: null,
          check_out: null,
          latitude: null,
          longitude: null,
          accuracy: null,
          address: null,
          updated_at: now,
        },
      });

      return {
        success: true,
        message: 'Presensi Rapat berhasil dicatat.',
      };
    });

    safeRevalidatePaths('/absensi', '/absensi/riwayat');

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message: 'Presensi hari ini sudah tercatat.',
      };
    }

    console.error('Error recording rapat:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mencatat kehadiran Rapat. Silakan coba lagi.',
    };
  }
}

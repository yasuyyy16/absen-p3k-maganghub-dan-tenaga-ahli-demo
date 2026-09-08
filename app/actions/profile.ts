'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  getSession,
  signSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';
import {
  PersonnelCategory,
  VALID_PERSONNEL_CATEGORIES,
  SessionPayload,
  PersonnelType,
} from '@/lib/types';

export interface ProfileActionResult {
  success: boolean;
  message: string;
}

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

async function safeSetSessionCookie(token: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  } catch {
    // Graceful fallback when executed outside Next.js request context (e.g. tests)
  }
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
 * Server action to update user's personnel information (Nama, Jenis Personel, Universitas).
 * Security: Authenticated session exclusively determines target user identity in the shared `users` table.
 */
export async function updatePersonnelInfoAction(
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const rawNama = formData.get('nama')?.toString().trim();
  const rawJenisPersonel = formData.get('jenisPersonel')?.toString().trim();
  const rawUniversitas = formData.get('universitas')?.toString().trim();

  // Validate full name (required, trimmed, min 2 chars, max 100 chars)
  if (!rawNama || rawNama.length < 2) {
    return {
      success: false,
      message: 'Nama lengkap wajib diisi (minimal 2 karakter).',
    };
  }

  if (rawNama.length > 100) {
    return {
      success: false,
      message: 'Nama lengkap maksimal 100 karakter.',
    };
  }

  // Validate personnel category against strictly allowed 3 values
  if (
    !rawJenisPersonel ||
    !VALID_PERSONNEL_CATEGORIES.includes(rawJenisPersonel as PersonnelCategory)
  ) {
    return {
      success: false,
      message: 'Silakan pilih jenis personel yang valid (Tenaga Ahli, MagangHub, atau Magang Biasa).',
    };
  }

  const nama = rawNama;
  const jenisPersonel = rawJenisPersonel as PersonnelCategory;
  const universitas = rawUniversitas && rawUniversitas.length > 0 ? rawUniversitas : null;

  // Enforce conditional validation for Magang Biasa: University is REQUIRED
  if (jenisPersonel === 'Magang Biasa') {
    if (!universitas || universitas.length === 0) {
      return {
        success: false,
        message: 'Universitas wajib diisi untuk jenis personel Magang Biasa.',
      };
    }
  }

  try {
    // 1. Update shared `users` record directly
    const updatedUser = await prisma.users.update({
      where: { id: session.userId },
      data: {
        nama: nama,
        jenis_personel: jenisPersonel,
        universitas: universitas,
        updated_at: new Date(),
      },
    });

    // 2. Re-sign session JWT with updated full name & personType
    const isTenagaAhli = updatedUser.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
    const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';
    const isComplete = Boolean(
      updatedUser.nama && updatedUser.nama.trim().length > 0 &&
      updatedUser.jenis_personel && updatedUser.jenis_personel.trim().length > 0
    );

    const newPayload: SessionPayload = {
      ...session,
      nama: updatedUser.nama,
      personType,
      isProfileComplete: isComplete,
    };
    const newToken = await signSessionToken(newPayload);
    await safeSetSessionCookie(newToken);
    safeRevalidatePaths('/absensi', '/absensi/profil', '/absensi/riwayat');

    return {
      success: true,
      message: 'Informasi personel berhasil disimpan.',
    };
  } catch (error) {
    console.error('Error updating personnel info:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan saat menyimpan informasi personel. Silakan coba lagi.',
    };
  }
}

/**
 * Server action to update user's username.
 * Verifies uniqueness across all accounts in `users` table, excluding the authenticated user.
 */
export async function updateUsernameAction(
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const rawUsername = formData.get('username')?.toString().trim();

  if (!rawUsername) {
    return {
      success: false,
      message: 'Username tidak boleh kosong.',
    };
  }

  if (rawUsername.length < 3 || rawUsername.length > 30) {
    return {
      success: false,
      message: 'Username harus memiliki panjang antara 3 hingga 30 karakter.',
    };
  }

  if (!USERNAME_REGEX.test(rawUsername)) {
    return {
      success: false,
      message: 'Username hanya boleh berisi huruf, angka, titik, underscore, dan strip.',
    };
  }

  // If submitting the current username, no change needed
  if (rawUsername.toLowerCase() === session.username.toLowerCase()) {
    return {
      success: true,
      message: 'Username tidak mengalami perubahan.',
    };
  }

  try {
    // Check if username is already taken by another account in `users`
    const existing = await prisma.users.findFirst({
      where: {
        username: { equals: rawUsername, mode: 'insensitive' },
        id: { not: session.userId },
      },
    });

    if (existing) {
      return {
        success: false,
        message: 'Username sudah digunakan. Silakan gunakan username lain.',
      };
    }

    // Update username in shared `users` table
    const updatedUser = await prisma.users.update({
      where: { id: session.userId },
      data: {
        username: rawUsername,
        updated_at: new Date(),
      },
    });

    // Re-sign JWT session with updated username
    const newPayload: SessionPayload = {
      ...session,
      username: updatedUser.username,
    };
    const newToken = await signSessionToken(newPayload);
    await safeSetSessionCookie(newToken);
    safeRevalidatePaths('/absensi', '/absensi/profil', '/absensi/riwayat');

    return {
      success: true,
      message: 'Username berhasil diperbarui.',
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message: 'Username sudah digunakan. Silakan gunakan username lain.',
      };
    }

    console.error('Error updating username:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat memperbarui username.',
    };
  }
}

/**
 * Server action to update user's password using Argon2id.
 * Verifies current password before applying new Argon2id hash.
 */
export async function updatePasswordAction(
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    };
  }

  const currentPassword = formData.get('currentPassword')?.toString();
  const newPassword = formData.get('newPassword')?.toString();
  const confirmPassword = formData.get('confirmPassword')?.toString();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      success: false,
      message: 'Semua kolom password wajib diisi.',
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: 'Konfirmasi password tidak cocok.',
    };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      message: 'Password baru minimal 6 karakter.',
    };
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return {
        success: false,
        message: 'Pengguna tidak ditemukan.',
      };
    }

    // Verify current password with Argon2id
    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return {
        success: false,
        message: 'Password saat ini salah.',
      };
    }

    // Hash new password using Argon2id
    const newHash = await hashPassword(newPassword);

    await prisma.users.update({
      where: { id: session.userId },
      data: {
        password_hash: newHash,
        must_change_password: false,
        updated_at: new Date(),
      },
    });

    // Re-sign session JWT with mustChangePassword = false
    const newPayload: SessionPayload = {
      ...session,
      mustChangePassword: false,
    };
    const newToken = await signSessionToken(newPayload);
    await safeSetSessionCookie(newToken);
    safeRevalidatePaths('/absensi', '/absensi/profil', '/absensi/riwayat');

    return {
      success: true,
      message: 'Password berhasil diubah. Silakan gunakan password baru Anda untuk login berikutnya.',
    };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan sistem saat mengubah password.',
    };
  }
}

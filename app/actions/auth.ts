'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';
import { SessionPayload, PersonnelType } from '@/lib/types';

export interface AuthActionState {
  error?: string | null;
}

const GENERIC_LOGIN_ERROR = 'Login gagal. Username atau password salah.';

// Dummy hash to protect against timing enumeration attacks when user is not found
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dHVtbXlkdW1teWR1bW15$dHVtbXlkdW1teWR1bW15ZHVtbXlkdW1teWR1bW15ZHU';

/**
 * Handles participant login for the Absensi P3K application using the shared `users` table.
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawUsername = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();

  if (!rawUsername || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const username = rawUsername.trim();
  if (username.length === 0 || password.length === 0) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  let token: string | null = null;

  try {
    // 1. Look up user in the shared PostgreSQL `users` table
    const user = await prisma.users.findUnique({
      where: { username },
    });

    // 2. Always run verifyPassword to mitigate timing attacks
    const isPasswordValid = await verifyPassword(
      password,
      user ? user.password_hash : DUMMY_ARGON2_HASH
    );

    // 3. Reject if user doesn't exist, password is invalid, account is deactivated, or role is not VIEWER
    // Attendance Web is strictly restricted to participant accounts (VIEWER role only).
    if (!user || !isPasswordValid || !user.is_active || user.role !== 'VIEWER') {
      return { error: GENERIC_LOGIN_ERROR };
    }

    // 4. Update last_login timestamp in `users`
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // 5. Derive personType for attendance compatibility
    const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
    const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

    // 6. Assemble secure session payload
    const payload: SessionPayload = {
      userId: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      personId: user.id,
      personType,
    };

    token = await signSessionToken(payload);
  } catch (err) {
    // Log safe diagnostic on server side only, never leak details to client
    console.error('Authentication internal error (omitting sensitive details):', err instanceof Error ? err.message : 'Unknown error');
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (token) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    redirect('/absensi');
  }

  return { error: GENERIC_LOGIN_ERROR };
}

/**
 * Handles participant logout by clearing the session cookie.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/absensi/login');
}

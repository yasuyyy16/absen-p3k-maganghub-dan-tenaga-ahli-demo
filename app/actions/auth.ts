'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resolvePerson } from '@/lib/person';
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';
import { SessionPayload } from '@/lib/types';

export interface AuthActionState {
  error?: string | null;
}

const GENERIC_LOGIN_ERROR = 'Login gagal. Username atau password salah.';

/**
 * Handles participant login for the Absensi P3K application.
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  let token: string | null = null;

  try {
    const user = await prisma.attendance_users.findUnique({
      where: { username },
    });

    if (!user || !user.is_active) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    const person = await resolvePerson(user.person_type, user.person_id);
    if (!person) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    const payload: SessionPayload = {
      userId: user.id,
      username: user.username,
      personId: user.person_id,
      personType: user.person_type,
      nama: person.nama,
    };

    token = await signSessionToken(payload);
  } catch (err) {
    // Log safe diagnostic on server side only, never leak details to client
    console.error('Authentication internal error:', err);
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

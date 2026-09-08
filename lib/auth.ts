import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionPayload, Role } from './types';

export const SESSION_COOKIE_NAME = 'absensi_session';
export const SESSION_MAX_AGE_SECONDS = 43200; // 12 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: SESSION_SECRET or JWT_SECRET environment variable is required in production.'
      );
    }
    return new TextEncoder().encode(
      'p3k-absensi-jwt-secret-key-at-least-32-chars-for-dev-only!'
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT session token with HS256 algorithm and 12-hour expiration.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    nama: payload.nama,
    role: payload.role,
    personId: payload.personId ?? payload.userId,
    personType: payload.personType ?? 'MAGANG',
    isProfileComplete: Boolean(payload.isProfileComplete),
    mustChangePassword: Boolean(payload.mustChangePassword),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secretKey);
}

/**
 * Verifies a JWT session token and returns the parsed SessionPayload, or null if invalid/expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.userId === 'number' &&
      typeof payload.username === 'string' &&
      typeof payload.nama === 'string' &&
      payload.role === 'VIEWER'
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        nama: payload.nama,
        role: 'VIEWER',
        personId:
          typeof payload.personId === 'number'
            ? payload.personId
            : payload.userId,
        personType:
          payload.personType === 'TENAGA_AHLI' ? 'TENAGA_AHLI' : 'MAGANG',
        isProfileComplete: Boolean(payload.isProfileComplete),
        mustChangePassword: Boolean(payload.mustChangePassword),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns standard cookie options for the session cookie.
 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Retrieves and verifies the session from incoming HTTP request cookies.
 * Intended for use in Server Components and Server Actions.
 */
export async function getSession(): Promise<SessionPayload | null> {
  if (process.env.NODE_ENV !== 'production' && process.env.TEST_AUTH_USER_ID) {
    const userIdNum = parseInt(process.env.TEST_AUTH_USER_ID, 10);
    if (!isNaN(userIdNum)) {
      const { prisma } = await import('./prisma');
      const user = await prisma.users.findUnique({
        where: { id: userIdNum },
      });
      if (user && user.is_active) {
        const isComplete = Boolean(user.nama?.trim() && user.jenis_personel?.trim());
        return {
          userId: user.id,
          username: user.username,
          nama: user.nama,
          role: 'VIEWER',
          personId: user.id,
          personType:
            user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli'
              ? 'TENAGA_AHLI'
              : 'MAGANG',
          isProfileComplete: isComplete,
          mustChangePassword: Boolean(user.must_change_password),
        };
      }
    }
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateAlfaAttendance } from '@/lib/attendance/alfa';

/**
 * Validates whether the incoming cron request has valid authorization.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In production, CRON_SECRET is strictly required
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRON ALFA] FATAL: CRON_SECRET is not configured on server.');
      return false;
    }
    // In dev environment, allow if CRON_SECRET is not yet defined or matches fallback
    return true;
  }

  // 1. Check Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) {
      return true;
    }
  }

  // 2. Check x-cron-secret header
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Handler for GET requests (default method used by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing cron secret.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || undefined;
  const forceParam = searchParams.get('force') === 'true';

  const result = await generateAlfaAttendance({
    targetDate,
    forceWorkingDay: forceParam,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal menjalankan pembuatan absensi ALFA.',
        error: result.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Proses absensi ALFA otomatis selesai.',
      data: result,
    },
    { status: 200 }
  );
}

/**
 * Handler for POST requests (used by external webhooks, schedulers, or pipeline scripts).
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing cron secret.' },
      { status: 401 }
    );
  }

  let targetDate: string | undefined;
  let forceParam = false;

  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      if (typeof body.date === 'string') {
        targetDate = body.date;
      }
      if (typeof body.force === 'boolean') {
        forceParam = body.force;
      }
    }
  } catch {
    // If no JSON body, fallback to query params
    const { searchParams } = new URL(request.url);
    targetDate = searchParams.get('date') || undefined;
    forceParam = searchParams.get('force') === 'true';
  }

  const result = await generateAlfaAttendance({
    targetDate,
    forceWorkingDay: forceParam,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal menjalankan pembuatan absensi ALFA.',
        error: result.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Proses absensi ALFA otomatis selesai.',
      data: result,
    },
    { status: 200 }
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getNowWib,
  getWibDateParts,
  getWibTimeParts,
  formatWibDateLong,
  formatWibTime,
  isReminderActive,
  getWibDayOfWeek,
  isWibAttendanceWindowClosed,
  isDevTimeOverrideActive,
} from '@/lib/time';
import { PersonDetails, PersonnelType } from '@/lib/types';
import UserProfileCard from '@/components/dashboard/UserProfileCard';
import LiveClockCard from '@/components/dashboard/LiveClockCard';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import AbsenPagiCard from '@/components/dashboard/AbsenPagiCard';
import AbsenPulangCard from '@/components/dashboard/AbsenPulangCard';
import ReminderAlert from '@/components/dashboard/ReminderAlert';
import PostCheckoutCard from '@/components/dashboard/PostCheckoutCard';
import LeaveStatusCard from '@/components/dashboard/LeaveStatusCard';
import IzinSakitModal from '@/components/dashboard/IzinSakitModal';
import AttendanceLocationCard from '@/components/dashboard/AttendanceLocationCard';
import FridayWfhBanner from '@/components/dashboard/FridayWfhBanner';
import WeekendHolidayBanner from '@/components/dashboard/WeekendHolidayBanner';
import DashboardActionsContainer from '@/components/dashboard/DashboardActionsContainer';
import AktivitasKhususSection from '@/components/dashboard/AktivitasKhususSection';
import { resolveProofUrl } from '@/lib/attendance-proof';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session || session.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  // Fetch current user details from shared `users` table
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active || user.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  // Server-side profile completion enforcement:
  // User must complete Nama Lengkap and Jenis Personel before accessing the attendance dashboard.
  const isProfileComplete = Boolean(
    user.nama && user.nama.trim().length > 0 &&
    user.jenis_personel && user.jenis_personel.trim().length > 0
  );

  if (!isProfileComplete) {
    redirect('/absensi/profil');
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  const personDetails: PersonDetails = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: 'VIEWER',
    jenisPersonel: user.jenis_personel,
    universitas: user.universitas,
    isActive: user.is_active,
    personType,
  };

  // Time & Today's Calendar Date in Asia/Jakarta timezone
  const now = getNowWib();
  const todayParts = getWibDateParts(now);
  const timeParts = getWibTimeParts(now);
  const dateFormattedLong = formatWibDateLong(now);
  const dayOfWeek = getWibDayOfWeek(now);
  const isFriday = dayOfWeek === 5;
  const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

  // Query today's attendance record using user.id
  const todayAttendance = await prisma.attendances.findFirst({
    where: {
      person_id: user.id,
      date: todayParts.dateObj,
    },
  });

  // Check if the attendance window for today has closed (>= 23:59:00 WIB)
  const isWindowClosed = isWibAttendanceWindowClosed(todayParts.dateObj, now);

  // Determine current attendance state
  let currentBadgeStatus: 'BELUM_ABSEN' | 'SUDAH_PAGI' | 'LENGKAP' | 'IZIN' | 'SAKIT' | 'ALFA' | 'RAPAT' = 'BELUM_ABSEN';
  let isCheckedIn = false;
  let isCheckedOut = false;
  let isLeave = false;
  let isRapat = false;
  let leaveStatus: 'IZIN' | 'SAKIT' = 'IZIN';
  let leaveNotes: string | null = null;
  let checkInTimeFormatted: string | null = null;
  let checkOutTimeFormatted: string | null = null;
  let proofFileUrl: string | null = null;

  if (todayAttendance) {
    if (todayAttendance.status === 'HADIR') {
      if (todayAttendance.check_in && !todayAttendance.check_out) {
        currentBadgeStatus = 'SUDAH_PAGI';
        isCheckedIn = true;
        checkInTimeFormatted = formatWibTime(todayAttendance.check_in);
      } else if (todayAttendance.check_in && todayAttendance.check_out) {
        currentBadgeStatus = 'LENGKAP';
        isCheckedIn = true;
        isCheckedOut = true;
        checkInTimeFormatted = formatWibTime(todayAttendance.check_in);
        checkOutTimeFormatted = formatWibTime(todayAttendance.check_out);
      }
    } else if (todayAttendance.status === 'IZIN') {
      currentBadgeStatus = 'IZIN';
      isLeave = true;
      leaveStatus = 'IZIN';
      leaveNotes = todayAttendance.notes;
      proofFileUrl = resolveProofUrl(todayAttendance.proof_file_url);
    } else if (todayAttendance.status === 'SAKIT') {
      currentBadgeStatus = 'SAKIT';
      isLeave = true;
      leaveStatus = 'SAKIT';
      leaveNotes = todayAttendance.notes;
      proofFileUrl = resolveProofUrl(todayAttendance.proof_file_url);
    } else if (todayAttendance.status === 'RAPAT') {
      currentBadgeStatus = 'RAPAT';
      isRapat = true;
      checkInTimeFormatted = todayAttendance.check_in
        ? formatWibTime(todayAttendance.check_in)
        : null;
    } else if (todayAttendance.status === 'ALFA') {
      // If the attendance window is still open (< 23:59:00 WIB), treat as BELUM_ABSEN
      if (isWindowClosed) {
        currentBadgeStatus = 'ALFA';
      } else {
        currentBadgeStatus = 'BELUM_ABSEN';
      }
    }
  }

  const showReminder = isReminderActive(
    now,
    isCheckedIn,
    isCheckedOut,
    todayAttendance?.status ?? ''
  );
  const isCompleted = isCheckedIn && isCheckedOut;
  // If no record exists OR if existing record is a premature ALFA while window is still open:
  const isNotRecorded = !todayAttendance || (todayAttendance.status === 'ALFA' && !isWindowClosed);
  const canConvertToLeave = isCheckedIn && !isCheckedOut;

  // Determine Rapat eligibility and entry mode
  let canSelectRapat = false;
  let rapatEntryMode: 'NO_ATTENDANCE' | 'FROM_HADIR' | null = null;
  let rapatBlockedReason: string | null = null;

  if (isRapat) {
    canSelectRapat = false;
  } else if (isWeekend || isWindowClosed) {
    canSelectRapat = false;
  } else if (!todayAttendance || (todayAttendance.status === 'ALFA' && !isWindowClosed)) {
    canSelectRapat = true;
    rapatEntryMode = 'NO_ATTENDANCE';
  } else if (todayAttendance.status === 'HADIR' && Boolean(todayAttendance.check_in)) {
    canSelectRapat = true;
    rapatEntryMode = 'FROM_HADIR';
  } else if (todayAttendance.status === 'IZIN' || todayAttendance.status === 'SAKIT') {
    canSelectRapat = false;
    rapatBlockedReason = `Aktivitas Khusus (Rapat) tidak dapat dipilih karena status kehadiran hari ini sudah tercatat sebagai ${todayAttendance.status === 'IZIN' ? 'Izin' : 'Sakit'}.`;
  } else if (todayAttendance.status === 'ALFA') {
    canSelectRapat = false;
    rapatBlockedReason = 'Aktivitas Khusus (Rapat) tidak dapat dipilih karena status kehadiran hari ini sudah tercatat sebagai Alfa.';
  } else {
    canSelectRapat = false;
    rapatBlockedReason = 'Aktivitas Khusus tidak tersedia karena presensi hari ini sudah tercatat.';
  }

  const hasLocationData =
    todayAttendance &&
    (typeof todayAttendance.latitude === 'number' ||
      typeof todayAttendance.latitude_out === 'number');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Participant Profile Card */}
      <UserProfileCard
        username={user.username}
        nama={user.nama}
        personType={personType}
        personDetails={personDetails}
      />

      {/* Password Change Warning Banner */}
      {user.must_change_password && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xs text-amber-950"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold shrink-0"
              aria-hidden="true"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-sm sm:text-base font-bold text-amber-950">
                passwordnya perbarui dulu lah cik
              </p>
              <p className="text-xs text-amber-800 font-medium">
                Demi keamanan akun Anda, silakan ubah kata sandi awal akun Anda.
              </p>
            </div>
          </div>
          <Link
            href="/absensi/profil#ubah-password"
            className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <span>Ubah Password</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}

      {/* Live Operational WIB Clock */}
      <LiveClockCard
        initialDateFormatted={dateFormattedLong}
        initialTimeFormatted={timeParts.timeFormatted}
        isDevTimeOverride={isDevTimeOverrideActive()}
      />

      {/* Late Checkout Reminder Banner */}
      {showReminder && <ReminderAlert />}

      {/* Leave Status Card */}
      {isLeave && (
        <LeaveStatusCard 
          status={leaveStatus} 
          notes={leaveNotes} 
          proofFileUrl={proofFileUrl} 
        />
      )}

      {/* Post-Checkout Completed State */}
      {isCompleted && checkInTimeFormatted && checkOutTimeFormatted && (
        <PostCheckoutCard
          checkInTimeFormatted={checkInTimeFormatted}
          checkOutTimeFormatted={checkOutTimeFormatted}
        />
      )}

      {/* Today's Status Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Status Hari Ini
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-700">
            {todayParts.dateString}
          </span>
        </div>

        <AttendanceStatusBadge status={currentBadgeStatus} />
      </div>

      {/* Aktivitas Khusus (Rapat) */}
      <AktivitasKhususSection
        isRapat={isRapat}
        canSelectRapat={canSelectRapat}
        entryMode={rapatEntryMode}
        blockedReason={rapatBlockedReason}
        checkInTimeFormatted={checkInTimeFormatted}
        notes={todayAttendance?.notes ?? null}
        isWeekend={isWeekend}
        isWindowClosed={isWindowClosed}
      />

      {/* Friday WFH / Weekend Holiday Indicators */}
      {isFriday && !isLeave && !isRapat && <FridayWfhBanner />}
      {isWeekend && !isLeave && !isRapat && <WeekendHolidayBanner />}

      {/* Attendance Actions & Map Tracking */}
      <DashboardActionsContainer
        isCheckedIn={isCheckedIn}
        checkInTimeFormatted={checkInTimeFormatted}
        isCheckedOut={isCheckedOut}
        checkOutTimeFormatted={checkOutTimeFormatted}
        isLeave={isLeave}
        isWeekend={isWeekend}
        isWindowClosed={isWindowClosed}
        isFriday={isFriday}
        todayAttendance={todayAttendance}
      />

      {/* Initial Izin / Sakit Action Trigger */}
      {isNotRecorded && !isRapat && (
        <div className="pt-1">
          <IzinSakitModal mode="CREATE" />
        </div>
      )}

      {/* Controlled Status Change Trigger */}
      {canConvertToLeave && (
        <div className="pt-1">
          <IzinSakitModal mode="CONVERT" />
        </div>
      )}

      {/* Riwayat Link Card */}
      <div className="pt-1">
        <Link
          href="/absensi/riwayat"
          className="w-full bg-white border border-slate-200/80 hover:border-[#006194]/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs hover:shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#006194] border border-sky-100 flex items-center justify-center group-hover:bg-[#006194] group-hover:text-white transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#006194] transition-colors">
                Lihat Riwayat Absensi
              </span>
              <span className="text-xs text-slate-500">
                Cek riwayat dan status kehadiran sebelumnya
              </span>
            </div>
          </div>

          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#006194] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

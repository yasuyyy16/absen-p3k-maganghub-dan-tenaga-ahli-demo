import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { resolvePerson } from '@/lib/person';
import { prisma } from '@/lib/prisma';
import {
  getNowWib,
  getWibDateParts,
  getWibTimeParts,
  formatWibDateLong,
  formatWibTime,
  isCheckoutAllowed,
  isReminderActive,
} from '@/lib/time';
import UserProfileCard from '@/components/dashboard/UserProfileCard';
import LiveClockCard from '@/components/dashboard/LiveClockCard';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import AbsenPagiCard from '@/components/dashboard/AbsenPagiCard';
import AbsenPulangCard from '@/components/dashboard/AbsenPulangCard';
import ReminderAlert from '@/components/dashboard/ReminderAlert';
import PostCheckoutCard from '@/components/dashboard/PostCheckoutCard';
import LeaveStatusCard from '@/components/dashboard/LeaveStatusCard';
import IzinSakitModal from '@/components/dashboard/IzinSakitModal';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/absensi/login');
  }

  // Resolve latest profile details from database
  const personDetails = await resolvePerson(
    session.personType,
    session.personId
  );

  // Time & Today's Calendar Date in Asia/Jakarta timezone
  const now = getNowWib();
  const todayParts = getWibDateParts(now);
  const timeParts = getWibTimeParts(now);
  const dateFormattedLong = formatWibDateLong(now);

  // Query today's attendance record using polymorphic compound key
  const todayAttendance = await prisma.attendances.findUnique({
    where: {
      person_type_person_id_date: {
        person_type: session.personType,
        person_id: session.personId,
        date: todayParts.dateObj,
      },
    },
  });

  // Determine current attendance state
  let currentBadgeStatus: 'BELUM_ABSEN' | 'SUDAH_PAGI' | 'SUDAH_PULANG' | 'IZIN' | 'SAKIT' | 'ALFA' = 'BELUM_ABSEN';
  let isCheckedIn = false;
  let isCheckedOut = false;
  let isLeave = false;
  let leaveStatus: 'IZIN' | 'SAKIT' = 'IZIN';
  let leaveNotes: string | null = null;
  let checkInTimeFormatted: string | null = null;
  let checkOutTimeFormatted: string | null = null;

  if (todayAttendance) {
    if (todayAttendance.status === 'HADIR') {
      if (todayAttendance.check_in && !todayAttendance.check_out) {
        currentBadgeStatus = 'SUDAH_PAGI';
        isCheckedIn = true;
        checkInTimeFormatted = formatWibTime(todayAttendance.check_in);
      } else if (todayAttendance.check_in && todayAttendance.check_out) {
        currentBadgeStatus = 'SUDAH_PULANG';
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
    } else if (todayAttendance.status === 'SAKIT') {
      currentBadgeStatus = 'SAKIT';
      isLeave = true;
      leaveStatus = 'SAKIT';
      leaveNotes = todayAttendance.notes;
    } else if (todayAttendance.status === 'ALFA') {
      currentBadgeStatus = 'ALFA';
    }
  }

  const checkoutAllowed = isCheckoutAllowed(now);
  const showReminder = isReminderActive(
    now,
    isCheckedIn,
    isCheckedOut,
    todayAttendance?.status ?? ''
  );
  const isCompleted = isCheckedIn && isCheckedOut;
  const isNotRecorded = !todayAttendance;
  const canConvertToLeave = isCheckedIn && !isCheckedOut;

  return (
    <div className="space-y-5">
      {/* User Identity Card */}
      <UserProfileCard
        username={session.username}
        nama={personDetails?.nama ?? session.nama}
        personType={session.personType}
        personDetails={personDetails}
      />

      {/* Live Operational WIB Clock */}
      <LiveClockCard
        initialDateFormatted={dateFormattedLong}
        initialTimeFormatted={timeParts.timeFormatted}
      />

      {/* Late Checkout Reminder Banner (>= 17:00 WIB, Hadir, belum absen pulang) */}
      {showReminder && <ReminderAlert />}

      {/* Leave Status Card if user submitted Izin or Sakit today */}
      {isLeave && (
        <LeaveStatusCard status={leaveStatus} notes={leaveNotes} />
      )}

      {/* Post-Checkout Completed Confirmation State */}
      {isCompleted && checkInTimeFormatted && checkOutTimeFormatted && (
        <PostCheckoutCard
          checkInTimeFormatted={checkInTimeFormatted}
          checkOutTimeFormatted={checkOutTimeFormatted}
        />
      )}

      {/* Today's Status Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Status Hari Ini
          </span>
          <span className="text-sm font-medium text-slate-700">
            {todayParts.dateString}
          </span>
        </div>

        <AttendanceStatusBadge status={currentBadgeStatus} />
      </div>

      {/* Attendance Actions: Absen Pagi & Absen Pulang */}
      {!isLeave && (
        <>
          <AbsenPagiCard
            isCheckedIn={isCheckedIn}
            checkInTimeFormatted={checkInTimeFormatted}
            isLeave={false}
          />

          <AbsenPulangCard
            isCheckedIn={isCheckedIn}
            isCheckedOut={isCheckedOut}
            checkOutTimeFormatted={checkOutTimeFormatted}
            isLeave={false}
            isCheckoutAllowed={checkoutAllowed}
          />
        </>
      )}

      {/* Initial Izin / Sakit Action Trigger (available when attendance is not yet recorded today) */}
      {isNotRecorded && (
        <div className="pt-1">
          <IzinSakitModal mode="CREATE" />
        </div>
      )}

      {/* Controlled Status Change Trigger (available only when status is HADIR and check_out is still null) */}
      {canConvertToLeave && (
        <div className="pt-1">
          <IzinSakitModal mode="CONVERT" />
        </div>
      )}

      {/* Link to Riwayat Absensi */}
      <div className="pt-2">
        <Link
          href="/absensi/riwayat"
          className="w-full min-h-[44px] py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer shadow-xs flex items-center justify-between"
        >
          <span>Lihat Riwayat Absensi</span>
          <span className="text-slate-400 font-bold" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}

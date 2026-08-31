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
import AttendanceLocationCard from '@/components/dashboard/AttendanceLocationCard';

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

  const hasLocationData =
    todayAttendance &&
    (typeof todayAttendance.latitude === 'number' ||
      typeof todayAttendance.latitude_out === 'number');

  return (
    <div className="space-y-4 sm:space-y-5">
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

      {/* Late Checkout Reminder Banner */}
      {showReminder && <ReminderAlert />}

      {/* Leave Status Card */}
      {isLeave && (
        <LeaveStatusCard status={leaveStatus} notes={leaveNotes} />
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

      {/* Attendance Actions: Absen Pagi & Absen Pulang in 2-Column Responsive Grid */}
      {!isLeave && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
        </div>
      )}

      {/* Recorded GPS Attendance Location Card */}
      {hasLocationData && (
        <AttendanceLocationCard
          latitude={todayAttendance.latitude}
          longitude={todayAttendance.longitude}
          accuracy={todayAttendance.accuracy}
          address={todayAttendance.address}
          latitudeOut={todayAttendance.latitude_out}
          longitudeOut={todayAttendance.longitude_out}
          accuracyOut={todayAttendance.accuracy_out}
          addressOut={todayAttendance.address_out}
        />
      )}

      {/* Initial Izin / Sakit Action Trigger */}
      {isNotRecorded && (
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

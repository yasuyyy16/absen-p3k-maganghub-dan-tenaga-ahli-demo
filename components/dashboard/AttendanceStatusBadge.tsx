import { AttendanceStatus } from '@/lib/types';

export type ExtendedAttendanceStatus =
  | AttendanceStatus
  | 'BELUM_ABSEN'
  | 'SUDAH_PAGI'
  | 'SUDAH_PULANG'
  | 'LENGKAP'
  | string;

interface AttendanceStatusBadgeProps {
  status: ExtendedAttendanceStatus;
  hasCheckIn?: boolean;
  hasCheckOut?: boolean;
}

export default function AttendanceStatusBadge({
  status,
  hasCheckIn,
  hasCheckOut,
}: AttendanceStatusBadgeProps) {
  let label = 'Belum Absen';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotStyle = 'bg-slate-400';

  // Determine computed status based on props
  let effectiveStatus = status;

  if (hasCheckIn !== undefined || hasCheckOut !== undefined) {
    if (status === 'HADIR') {
      if (hasCheckIn && hasCheckOut) {
        effectiveStatus = 'LENGKAP';
      } else if (hasCheckIn) {
        effectiveStatus = 'SUDAH_PAGI';
      }
    }
  }

  if (effectiveStatus === 'LENGKAP' || effectiveStatus === 'SUDAH_PULANG') {
    label = 'Lengkap';
    badgeStyle = 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    dotStyle = 'bg-emerald-500';
  } else if (effectiveStatus === 'SUDAH_PAGI' || effectiveStatus === 'HADIR') {
    label = 'Sudah Absen Pagi';
    badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200/80';
    dotStyle = 'bg-amber-500';
  } else if (effectiveStatus === 'IZIN') {
    label = 'Izin';
    badgeStyle = 'bg-sky-50 text-[#006194] border-sky-200/80';
    dotStyle = 'bg-[#006194]';
  } else if (effectiveStatus === 'SAKIT') {
    label = 'Sakit';
    badgeStyle = 'bg-purple-50 text-purple-900 border-purple-200/80';
    dotStyle = 'bg-purple-600';
  } else if (effectiveStatus === 'ALFA') {
    label = 'Alfa';
    badgeStyle = 'bg-red-50 text-red-900 border-red-200/80';
    dotStyle = 'bg-red-500';
  } else if (effectiveStatus === 'RAPAT') {
    label = 'Rapat';
    badgeStyle = 'bg-teal-50 text-teal-900 border-teal-200/80';
    dotStyle = 'bg-teal-600';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${badgeStyle}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotStyle}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

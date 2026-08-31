import { AttendanceStatus } from '@/lib/types';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | 'BELUM_ABSEN' | 'SUDAH_PAGI' | 'SUDAH_PULANG';
}

export default function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  let label = 'Belum Absen';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotStyle = 'bg-slate-400';

  if (status === 'SUDAH_PAGI' || status === 'HADIR') {
    label = 'Sudah Absen Pagi';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    dotStyle = 'bg-amber-500';
  } else if (status === 'SUDAH_PULANG') {
    label = 'Presensi Selesai';
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotStyle = 'bg-emerald-500';
  } else if (status === 'IZIN') {
    label = 'Izin';
    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
    dotStyle = 'bg-sky-500';
  } else if (status === 'SAKIT') {
    label = 'Sakit';
    badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
    dotStyle = 'bg-purple-500';
  } else if (status === 'ALFA') {
    label = 'Tidak Hadir (Alfa)';
    badgeStyle = 'bg-red-50 text-red-800 border-red-200';
    dotStyle = 'bg-red-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${badgeStyle}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotStyle}`} aria-hidden="true" />
      {label}
    </span>
  );
}

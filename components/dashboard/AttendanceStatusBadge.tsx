import { AttendanceStatus } from '@/lib/types';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | 'BELUM_ABSEN' | 'SUDAH_PAGI' | 'SUDAH_PULANG';
}

export default function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  let label = 'Belum Absen';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotStyle = 'bg-slate-400';

  if (status === 'SUDAH_PAGI' || status === 'HADIR') {
    label = 'Sudah Absen Pagi';
    badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200/80';
    dotStyle = 'bg-amber-500';
  } else if (status === 'SUDAH_PULANG') {
    label = 'Presensi Selesai';
    badgeStyle = 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    dotStyle = 'bg-emerald-500';
  } else if (status === 'IZIN') {
    label = 'Izin';
    badgeStyle = 'bg-sky-50 text-[#006194] border-sky-200/80';
    dotStyle = 'bg-[#006194]';
  } else if (status === 'SAKIT') {
    label = 'Sakit';
    badgeStyle = 'bg-purple-50 text-purple-900 border-purple-200/80';
    dotStyle = 'bg-purple-600';
  } else if (status === 'ALFA') {
    label = 'Tidak Hadir (Alfa)';
    badgeStyle = 'bg-red-50 text-red-900 border-red-200/80';
    dotStyle = 'bg-red-500';
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

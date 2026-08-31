interface LeaveStatusCardProps {
  status: 'IZIN' | 'SAKIT';
  notes: string | null;
}

export default function LeaveStatusCard({
  status,
  notes,
}: LeaveStatusCardProps) {
  const isIzin = status === 'IZIN';
  const title = isIzin ? 'Pengajuan Izin Tercatat' : 'Pengajuan Sakit Tercatat';
  const badgeText = isIzin ? 'Izin' : 'Sakit';

  return (
    <div
      className={`border-2 rounded-xl p-5 sm:p-6 shadow-xs ${
        isIzin
          ? 'bg-sky-50/80 border-sky-300 text-sky-950'
          : 'bg-purple-50/80 border-purple-300 text-purple-950'
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold">{title}</h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              isIzin
                ? 'bg-sky-100 text-sky-900 border-sky-300'
                : 'bg-purple-100 text-purple-900 border-purple-300'
            }`}
          >
            {badgeText}
          </span>
        </div>

        {notes ? (
          <div className="bg-white/90 border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Keterangan
            </span>
            <p className="text-sm text-slate-800 leading-relaxed break-words">
              {notes}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic">
            Tidak ada keterangan tambahan yang dilampirkan.
          </p>
        )}

        <p className="text-xs text-slate-600 pt-1">
          Status kehadiran hari ini tercatat sebagai {badgeText}. Presensi harian Anda telah terkunci.
        </p>
      </div>
    </div>
  );
}

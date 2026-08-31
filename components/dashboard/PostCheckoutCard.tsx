interface PostCheckoutCardProps {
  checkInTimeFormatted: string;
  checkOutTimeFormatted: string;
}

export default function PostCheckoutCard({
  checkInTimeFormatted,
  checkOutTimeFormatted,
}: PostCheckoutCardProps) {
  return (
    <div className="bg-[#f0fdf4] border border-emerald-200 rounded-2xl p-6 sm:p-7 shadow-xs text-center relative overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shadow-2xs mb-1">
          ✓
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
          Status Kehadiran
        </span>

        <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
          Presensi Hari Ini Lengkap
        </h3>

        <p className="text-xs sm:text-sm text-emerald-800 font-medium">
          Seluruh rekaman presensi harian Anda telah tuntas dan tersimpan di sistem.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-3">
          <div className="bg-white/90 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">
              Masuk
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
              {checkInTimeFormatted}
            </span>
          </div>

          <div className="bg-white/90 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">
              Pulang
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
              {checkOutTimeFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

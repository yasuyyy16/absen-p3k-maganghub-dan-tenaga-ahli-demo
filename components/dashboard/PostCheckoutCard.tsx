interface PostCheckoutCardProps {
  checkInTimeFormatted: string;
  checkOutTimeFormatted: string;
}

export default function PostCheckoutCard({
  checkInTimeFormatted,
  checkOutTimeFormatted,
}: PostCheckoutCardProps) {
  return (
    <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            ✓
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-emerald-950">
              Presensi Hari Ini Lengkap
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800">
              Anda telah menyelesaikan Absen Pagi dan Absen Pulang.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white border border-emerald-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Absen Pagi
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {checkInTimeFormatted}
            </span>
          </div>

          <div className="bg-white border border-emerald-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Absen Pulang
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {checkOutTimeFormatted}
            </span>
          </div>
        </div>

        <p className="text-xs text-emerald-800 text-center pt-1 font-medium">
          Terima kasih atas dedikasi dan kehadiran Anda hari ini.
        </p>
      </div>
    </div>
  );
}

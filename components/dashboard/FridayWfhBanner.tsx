export default function FridayWfhBanner() {
  return (
    <div
      role="status"
      className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 sm:p-4.5 flex items-start sm:items-center gap-3.5 shadow-xs text-emerald-950"
    >
      <div
        className="w-8 h-8 rounded-xl bg-emerald-100/90 text-emerald-800 flex items-center justify-center text-base shrink-0 border border-emerald-200/80 mt-0.5 sm:mt-0"
        aria-hidden="true"
      >
        🏠
      </div>
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-bold text-emerald-900">
            Hari Jumat — WFH
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 uppercase tracking-wider">
            Bebas Lokasi
          </span>
        </div>
        <p className="text-xs text-emerald-800/90 font-medium leading-relaxed">
          Absensi dapat dilakukan dari lokasi mana saja.
        </p>
      </div>
    </div>
  );
}

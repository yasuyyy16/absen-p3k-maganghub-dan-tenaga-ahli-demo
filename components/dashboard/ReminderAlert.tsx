export default function ReminderAlert() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs text-amber-950"
    >
      <div
        className="w-7 h-7 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        aria-hidden="true"
      >
        !
      </div>
      <div className="space-y-0.5 flex-1">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
          Pengingat Absen Pulang
        </h3>
        <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
          Anda belum melakukan Absen Pulang hari ini. Segera lakukan Absen Pulang sebelum meninggalkan kantor.
        </p>
      </div>
    </div>
  );
}

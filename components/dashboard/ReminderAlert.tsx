export default function ReminderAlert() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-xs"
    >
      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">
        !
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm sm:text-base font-bold text-amber-950">
          Pengingat Absen Pulang
        </h3>
        <p className="text-xs sm:text-sm text-amber-900 font-medium">
          Anda lupa absen pulang hari ini. Segera lakukan Absen Pulang sebelum meninggalkan kantor.
        </p>
      </div>
    </div>
  );
}

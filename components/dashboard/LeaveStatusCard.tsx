interface LeaveStatusCardProps {
  status: 'IZIN' | 'SAKIT';
  notes: string | null;
  proofFileUrl?: string | null;
}

export default function LeaveStatusCard({
  status,
  notes,
  proofFileUrl,
}: LeaveStatusCardProps) {
  const isIzin = status === 'IZIN';
  const badgeText = isIzin ? 'Izin' : 'Sakit';

  return (
    <div className="space-y-3">
      {/* Main Status Announcement Card */}
      <div
        className={`rounded-2xl p-6 sm:p-7 shadow-xs text-center border relative overflow-hidden ${
          isIzin
            ? 'bg-[#f0f9ff] border-sky-200 text-sky-950'
            : 'bg-[#faf5ff] border-purple-200 text-purple-950'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xs mb-1 ${
              isIzin
                ? 'bg-sky-100 text-[#006194]'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {isIzin ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Status Hari Ini
          </span>

          <span
            className={`text-base sm:text-lg font-bold px-4 py-1 rounded-full border shadow-2xs ${
              isIzin
                ? 'bg-white text-[#006194] border-sky-300'
                : 'bg-white text-purple-700 border-purple-300'
            }`}
          >
            {badgeText}
          </span>

          <p className="text-xs sm:text-sm mt-1 font-medium">
            Anda telah tercatat absen karena {badgeText.toLowerCase()}.
          </p>
        </div>
      </div>

      {/* Keterangan Box */}
      {notes && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Keterangan
            </h3>
          </div>
          <p className="text-sm text-slate-800 font-medium pl-5 break-words">
            {notes}
          </p>
        </div>
      )}

      {/* Bukti Box */}
      {proofFileUrl && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Bukti {badgeText}
            </h3>
          </div>
          
          <div className="pl-5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate block">
                  Dokumen Bukti
                </span>
                <span className="text-xs text-slate-400 block">
                  Telah diunggah
                </span>
              </div>
            </div>

            <a
              href={proofFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[#006194] text-xs font-semibold shadow-2xs hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              Lihat Bukti
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

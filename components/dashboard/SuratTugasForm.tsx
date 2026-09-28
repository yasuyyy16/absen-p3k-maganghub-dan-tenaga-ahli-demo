'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { suratTugasAction } from '@/app/actions/attendance';
import { useI18n } from '@/lib/i18n/context';

export default function SuratTugasForm() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default to tomorrow for start date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStartDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('start_date')?.toString();
    const endDate = formData.get('end_date')?.toString();
    
    if (startDate && endDate && endDate < startDate) {
      setErrorMessage(t.suratTugas.dateError);
      return;
    }

    startTransition(async () => {
      const result = await suratTugasAction(formData);
      if (result.success) {
        router.push('/absensi?success=surat_tugas');
      } else {
        setErrorMessage(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="nomor_surat_tugas"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {t.suratTugas.nomorLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nomor_surat_tugas"
            name="nomor_surat_tugas"
            placeholder={t.suratTugas.nomorPlaceholder}
            required
            disabled={isPending}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194] disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="tanggal_terbit"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {t.suratTugas.tanggalTerbitLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="tanggal_terbit"
            name="tanggal_terbit"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
            disabled={isPending}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="start_date"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {t.suratTugas.startDateLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            defaultValue={defaultStartDate}
            required
            disabled={isPending}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="end_date"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {t.suratTugas.endDateLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            defaultValue={defaultStartDate}
            required
            disabled={isPending}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <label
          htmlFor="lokasi"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          {t.suratTugas.locationLabel} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="lokasi"
          name="lokasi"
          placeholder={t.suratTugas.locationPlaceholder}
          rows={3}
          maxLength={500}
          disabled={isPending}
          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194] disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 resize-none transition"
          required
        />
        <div className="text-[11px] text-slate-500 text-right">
          {locale === 'en' ? 'Maximum 500 characters' : 'Maksimal 500 karakter'}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer disabled:opacity-50"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#004f7a] text-white font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-xs"
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t.suratTugas.submittingBtn}</span>
            </>
          ) : (
            <span>{t.suratTugas.submitBtn}</span>
          )}
        </button>
      </div>
    </form>
  );
}

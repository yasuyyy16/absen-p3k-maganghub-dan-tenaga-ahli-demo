'use client';

import { useI18n } from '@/lib/i18n/context';

export default function ReminderAlert() {
  const { t } = useI18n();

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
          {t.dashboard.reminderTitle}
        </h3>
        <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
          {t.dashboard.reminderDesc}
        </p>
      </div>
    </div>
  );
}

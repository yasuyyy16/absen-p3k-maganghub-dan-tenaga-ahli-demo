'use client';

import { useI18n } from '@/lib/i18n/context';

export default function WeekendHolidayBanner() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      className="bg-slate-100/90 border border-slate-300/80 rounded-2xl p-4 sm:p-4.5 flex items-start sm:items-center gap-3.5 shadow-xs text-slate-800"
    >
      <div
        className="w-8 h-8 rounded-xl bg-slate-200/90 text-slate-700 flex items-center justify-center text-base shrink-0 border border-slate-300/80 mt-0.5 sm:mt-0"
        aria-hidden="true"
      >
        🏖️
      </div>
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
            {t.dashboard.weekendBannerTitle}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300/80 uppercase tracking-wider">
            {t.dashboard.weekendBannerBadge}
          </span>
        </div>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          {t.dashboard.weekendBannerDesc}
        </p>
      </div>
    </div>
  );
}

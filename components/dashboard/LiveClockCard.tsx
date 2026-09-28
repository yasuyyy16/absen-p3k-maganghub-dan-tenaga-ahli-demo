'use client';

import { useState, useEffect } from 'react';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import { useI18n } from '@/lib/i18n/context';

interface LiveClockCardProps {
  initialDateFormatted: string;
  initialTimeFormatted: string;
  workStatus: string;
  isDevTimeOverride?: boolean;
}

export default function LiveClockCard({
  initialDateFormatted,
  initialTimeFormatted,
  workStatus,
  isDevTimeOverride = false,
}: LiveClockCardProps) {
  const { t, locale } = useI18n();
  const [timeFormatted, setTimeFormatted] = useState(initialTimeFormatted);
  const [dateFormatted, setDateFormatted] = useState(initialDateFormatted);

  useEffect(() => {
    // When DEV_TIME_OVERRIDE is active in development, keep the consistent simulated time
    if (isDevTimeOverride) {
      return;
    }

    const updateClock = () => {
      const now = new Date();
      const timeStr =
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now) + ' WIB';

      const intlLocale = locale === 'en' ? 'en-US' : 'id-ID';
      const dateStr = new Intl.DateTimeFormat(intlLocale, {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      setTimeFormatted(timeStr);
      setDateFormatted(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isDevTimeOverride, locale]);

  const displayTime = isDevTimeOverride ? initialTimeFormatted : timeFormatted;
  const displayDate = isDevTimeOverride ? initialDateFormatted : dateFormatted;
  const displayTimeWithoutZone = displayTime.replace(/\s+WIB$/, '');

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute inset-0 bg-radial-[at_top] from-sky-50/50 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
        <div className="min-w-0 text-left">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            {t.dashboard.dateLabel}
          </span>
          <p className="text-sm sm:text-base font-medium text-slate-700 truncate">
            {displayDate}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-[#006194] mt-2">
            {displayTimeWithoutZone}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            {t.dashboard.timezoneLabel}
          </p>
        </div>

        <div className="shrink-0 lg:text-right">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            {t.dashboard.workStatusLabel}
          </span>
          <AttendanceStatusBadge status={workStatus} />
        </div>
      </div>
    </div>
  );
}

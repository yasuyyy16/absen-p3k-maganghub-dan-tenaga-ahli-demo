'use client';

import { useState, useEffect } from 'react';

interface LiveClockCardProps {
  initialDateFormatted: string;
  initialTimeFormatted: string;
}

export default function LiveClockCard({
  initialDateFormatted,
  initialTimeFormatted,
}: LiveClockCardProps) {
  const [timeFormatted, setTimeFormatted] = useState(initialTimeFormatted);
  const [dateFormatted, setDateFormatted] = useState(initialDateFormatted);

  useEffect(() => {
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

      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      setTimeFormatted(timeStr);
      setDateFormatted(dateStr);
    };

    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Waktu Operasional
          </span>
          <p className="text-sm sm:text-base font-medium text-slate-200 mt-0.5">
            {dateFormatted}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-sky-400">
            {timeFormatted}
          </div>
          <span className="text-[11px] text-slate-400">Zona Waktu Asia/Jakarta</span>
        </div>
      </div>
    </div>
  );
}

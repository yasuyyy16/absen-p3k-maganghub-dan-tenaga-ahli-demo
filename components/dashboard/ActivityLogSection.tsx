'use client';

import React from 'react';
import { formatWibTime } from '@/lib/time';
import { useI18n } from '@/lib/i18n/context';
import { formatI18nDateLong } from '@/lib/i18n';

interface Activity {
  id: string;
  title: string;
  description: string;
  created_at: Date;
}

interface ActivityLogSectionProps {
  activities: Activity[];
}

export default function ActivityLogSection({ activities }: ActivityLogSectionProps) {
  const { t, locale } = useI18n();

  const getTranslatedTitle = (title: string) => {
    switch (title) {
      case 'Absen pagi berhasil': return t.activityLog.pagiSuccess;
      case 'Absen pulang berhasil': return t.activityLog.pulangSuccess;
      case 'Izin berhasil dicatat': return t.activityLog.izinSakitSuccess.replace('{status}', t.status.leave);
      case 'Sakit berhasil dicatat': return t.activityLog.izinSakitSuccess.replace('{status}', t.status.sick);
      case 'Rapat berhasil dicatat': return t.activityLog.rapatSuccess;
      case 'Surat Tugas berhasil dibuat': return t.activityLog.stCreateSuccess;
      case 'Surat Tugas berhasil dihapus': return t.activityLog.stDeleteSuccess;
      default: return title;
    }
  };

  const getTranslatedDescription = (desc: string) => {
    if (desc.startsWith('Presensi masuk berhasil dicatat pada')) {
      const match = desc.match(/pada (.*?), (.*?\.)/);
      if (match) {
        return t.activityLog.pagiSuccessDesc.replace('{date}', match[1]).replace('{time}', match[2].replace('.', ''));
      }
    }
    if (desc.startsWith('Presensi pulang berhasil dicatat pada')) {
      const match = desc.match(/pada (.*?), (.*?\.)/);
      if (match) {
        return t.activityLog.pulangSuccessDesc.replace('{date}', match[1]).replace('{time}', match[2].replace('.', ''));
      }
    }
    if (desc === 'Status presensi hari ini berhasil diubah menjadi IZIN.') {
      return t.activityLog.izinSakitSuccessDesc.replace('{status}', 'IZIN');
    }
    if (desc === 'Status presensi hari ini berhasil diubah menjadi SAKIT.') {
      return t.activityLog.izinSakitSuccessDesc.replace('{status}', 'SAKIT');
    }
    if (desc === 'Status presensi hari ini berhasil dicatat dengan aktivitas khusus RAPAT.') {
      return t.activityLog.rapatSuccessDesc;
    }
    if (desc.startsWith('Nomor:')) {
      const match = desc.match(/Nomor: (.*?)\nPeriode: (.*?)\nLokasi: (.*)/);
      if (match) {
        return t.activityLog.stDeleteDesc
          .replace('{nomor}', match[1])
          .replace('{periode}', match[2])
          .replace('{lokasi}', match[3]);
      }
    }
    return desc;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        {t.dashboard.recentActivitiesTitle}
      </h3>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm font-medium text-slate-500">{t.dashboard.noRecentActivities}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold text-slate-900">{getTranslatedTitle(activity.title)}</p>
                  <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap pt-0.5">
                    {formatI18nDateLong(activity.created_at, locale)}, {formatWibTime(activity.created_at)}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                    {getTranslatedDescription(activity.description)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useI18n } from '@/lib/i18n/context';

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          {t.profile.languageSectionTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {t.profile.languageSectionSubtitle}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          Language / Bahasa
        </label>
        <div
          role="radiogroup"
          aria-label="Language selector"
          className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-full sm:w-auto"
        >
          <button
            type="button"
            role="radio"
            aria-checked={locale === 'id'}
            onClick={() => setLocale('id')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer flex items-center justify-center gap-2 ${
              locale === 'id'
                ? 'bg-white text-[#006194] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span aria-hidden="true">🇮🇩</span>
            <span>{t.profile.langId}</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={locale === 'en'}
            onClick={() => setLocale('en')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer flex items-center justify-center gap-2 ${
              locale === 'en'
                ? 'bg-white text-[#006194] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span aria-hidden="true">🇬🇧</span>
            <span>{t.profile.langEn}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

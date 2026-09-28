'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY, TranslationDictionary } from './types';
import { idDictionary } from './dictionaries/id';
import { enDictionary } from './dictionaries/en';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: idDictionary,
});

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [prevInitialLocale, setPrevInitialLocale] = useState<Locale>(initialLocale);
  const router = useRouter();

  // Adjust state during render when initialLocale prop changes from server re-render
  if (initialLocale !== prevInitialLocale) {
    setPrevInitialLocale(initialLocale);
    setLocaleState(initialLocale);
  }

  // Helper to persist to cookie and localStorage
  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);

      try {
        // 1. Persist to cookie (1 year expiration, accessible to server components)
        document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        // 2. Persist to localStorage
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        // 3. Update HTML lang attribute
        document.documentElement.lang = newLocale;
      } catch {
        // Safe fallback in restricted environments
      }

      // 4. Trigger router refresh so Server Components re-render with the new cookie
      router.refresh();
    },
    [router]
  );

  // Sync when another tab/window updates localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && (e.newValue === 'id' || e.newValue === 'en')) {
        setLocale(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [setLocale]);

  const dictionary = useMemo(() => {
    return locale === 'en' ? enDictionary : idDictionary;
  }, [locale]);

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t: dictionary,
    }),
    [locale, setLocale, dictionary]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

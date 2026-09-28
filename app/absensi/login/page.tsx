import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';
import { getDictionary } from '@/lib/i18n';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Login - Sistem Absensi P3K MagangHub & Tenaga Ahli',
  description: 'Portal Absensi Internal Peserta MagangHub dan Tenaga Ahli unit P3K KKP.',
};

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/absensi');
  }

  const locale = await getServerLocale();
  const t = getDictionary(locale);

  return (
    <main className="min-h-dvh flex flex-col justify-center items-center px-4 py-8 bg-[#f7f9ff] relative overflow-hidden">
      {/* Ambient background accent */}
      <div className="absolute inset-0 pointer-events-none bg-radial-[at_top_right] from-sky-100/40 via-transparent to-transparent" />

      <div className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8 relative z-10">
        <header className="mb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#006194] border border-sky-100 flex items-center justify-center font-bold text-xl mb-3 shadow-2xs">
            P3K
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.login.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.login.subtitle}
          </p>
        </header>

        <LoginForm />

        <footer className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-xs text-slate-500 text-center">
            {t.login.adminNotice}
          </p>
        </footer>
      </div>
    </main>
  );
}

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Login Absensi - P3K MagangHub & Tenaga Ahli',
  description: 'Sistem Absensi Internal Peserta MagangHub dan Tenaga Ahli unit P3K.',
};

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/absensi');
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center items-center px-4 py-8 bg-slate-100">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-100 text-sky-800 font-bold text-lg mb-3">
            P3K
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sistem Absensi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Peserta MagangHub & Tenaga Ahli
          </p>
        </header>

        <LoginForm />

        <footer className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Akun disediakan oleh Administrator unit P3K.
          </p>
        </footer>
      </div>
    </main>
  );
}

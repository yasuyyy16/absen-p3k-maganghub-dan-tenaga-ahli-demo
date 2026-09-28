import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/lib/i18n';
import { getServerLocale } from '@/lib/i18n/server';
import SuratTugasForm from '@/components/dashboard/SuratTugasForm';

export const metadata: Metadata = {
  title: 'Buat Surat Tugas Baru - P3K MagangHub & Tenaga Ahli',
  description: 'Form pembuatan Surat Tugas.',
};

export default async function SuratTugasBaruPage() {
  const session = await getSession();
  if (!session || session.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active || user.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  const isProfileComplete = Boolean(
    user.nama && user.nama.trim().length > 0 &&
    user.jenis_personel && user.jenis_personel.trim().length > 0
  );

  if (!isProfileComplete) {
    redirect('/absensi/profil');
  }

  const locale = await getServerLocale();
  const dict = getDictionary(locale);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/absensi"
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {dict.suratTugas.heading}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {dict.suratTugas.subheading}
            </p>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-5">
          <ul className="text-xs sm:text-sm text-sky-800 list-disc list-outside ml-4 space-y-1">
            <li>{dict.suratTugas.info1}</li>
            <li>{dict.suratTugas.info2}</li>
            <li>{dict.suratTugas.info3}</li>
          </ul>
        </div>

        <SuratTugasForm />
      </div>
    </div>
  );
}

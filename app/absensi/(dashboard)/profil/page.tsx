import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect('/absensi/login');
  }

  // Fetch current user from shared `users` table
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active) {
    redirect('/absensi/login');
  }

  // Check if profile is incomplete
  const isIncomplete =
    !user.nama ||
    user.nama.trim().length === 0 ||
    user.nama.trim() === user.username ||
    !user.jenis_personel ||
    (user.jenis_personel === 'Magang Biasa' &&
      (!user.universitas || user.universitas.trim().length === 0));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link
              href="/absensi"
              className="hover:text-[#006194] transition-colors focus:outline-none focus-visible:underline"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Profil & Pengaturan Akun</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Profil & Pengaturan Akun
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola nama lengkap, kategori kepegawaian, universitas, username, dan kata sandi Anda.
          </p>
        </div>

        <Link
          href="/absensi"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Incomplete Profile Alert Banner */}
      {isIncomplete && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs text-amber-950"
        >
          <div
            className="w-8 h-8 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
            aria-hidden="true"
          >
            !
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
              Profil Belum Lengkap
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
              Silakan lengkapi <strong>Nama Lengkap</strong>, <strong>Jenis Personel</strong>, dan <strong>Universitas</strong> Anda di bawah ini untuk memastikan pencatatan presensi yang akurat.
            </p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <ProfileForm
        initialNama={user.nama && user.nama !== user.username ? user.nama : ''}
        initialUsername={user.username}
        initialJenisPersonel={user.jenis_personel}
        initialUniversitas={user.universitas}
      />
    </div>
  );
}

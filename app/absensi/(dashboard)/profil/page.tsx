import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session || session.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  // Fetch current user from shared `users` table
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.is_active || user.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  // Check if profile is incomplete (Nama Lengkap & Jenis Personel must both be non-empty)
  const isIncomplete =
    !user.nama ||
    user.nama.trim().length === 0 ||
    !user.jenis_personel ||
    user.jenis_personel.trim().length === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {!isIncomplete ? (
              <>
                <Link
                  href="/absensi"
                  className="hover:text-[#006194] transition-colors focus:outline-none focus-visible:underline"
                >
                  Dashboard
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="text-slate-800 font-semibold">Profil & Pengaturan Akun</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Profil & Pengaturan Akun
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola nama lengkap, kategori kepegawaian, universitas, username, dan kata sandi Anda.
          </p>
        </div>

        {!isIncomplete ? (
          <Link
            href="/absensi"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Kembali ke Dashboard</span>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs sm:text-sm font-medium self-start sm:self-auto">
            <span>Selesaikan profil untuk membuka menu</span>
          </div>
        )}
      </div>

      {/* Incomplete Profile Alert Banner (Primary Onboarding State) */}
      {isIncomplete && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs text-amber-950"
        >
          <div
            className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
            aria-hidden="true"
          >
            !
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
              Profil Belum Lengkap
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
              Silakan lengkapi <strong>Nama Lengkap</strong> dan <strong>Jenis Personel</strong> Anda pada formulir di bawah ini untuk membuka akses fitur absensi.
            </p>
          </div>
        </div>
      )}

      {/* Password Change Warning Banner (Active after profile complete until password updated) */}
      {!isIncomplete && user.must_change_password && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xs text-amber-950"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold shrink-0"
              aria-hidden="true"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-sm sm:text-base font-bold text-amber-950">
                passwordnya perbarui dulu lah cik
              </p>
              <p className="text-xs text-amber-800 font-medium">
                Silakan ganti kata sandi akun Anda pada formulir Kata Sandi di bawah ini.
              </p>
            </div>
          </div>
          <a
            href="#ubah-password"
            className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <span>Ubah Password</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </a>
        </div>
      )}

      {/* Profile Form */}
      <ProfileForm
        initialNama={user.nama || ''}
        initialUsername={user.username}
        initialJenisPersonel={user.jenis_personel}
        initialUniversitas={user.universitas}
      />
    </div>
  );
}

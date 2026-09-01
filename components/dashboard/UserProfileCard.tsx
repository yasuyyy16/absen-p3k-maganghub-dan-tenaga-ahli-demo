import Link from 'next/link';
import { PersonDetails, PersonnelType } from '@/lib/types';

interface UserProfileCardProps {
  username: string;
  nama: string;
  personType: PersonnelType;
  personDetails: PersonDetails | null;
}

export default function UserProfileCard({
  username,
  nama,
  personDetails,
}: UserProfileCardProps) {
  const customRole = personDetails?.jenisPersonel;
  const roleLabel = customRole || 'Peserta';
  const effectiveUniv = personDetails?.universitas || (personDetails?.jenisPersonel ? 'Unit P3K' : 'Profil belum lengkap');

  // Get initial character for avatar
  const initial = nama ? nama.charAt(0).toUpperCase() : username ? username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
      <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
        {/* Avatar */}
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sky-50 text-[#006194] border border-sky-100 flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0 shadow-2xs"
          aria-hidden="true"
        >
          {initial}
        </div>

        {/* User Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {nama}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-mono">@{username}</p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                roleLabel === 'Tenaga Ahli'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                  : roleLabel === 'MagangHub'
                  ? 'bg-sky-50 text-[#006194] border border-sky-200/80'
                  : roleLabel === 'Magang Biasa'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {roleLabel}
            </span>

            {effectiveUniv && (
              <span className="text-xs text-slate-600 truncate max-w-full">
                {effectiveUniv}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Link Button */}
      <div className="sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
        <Link
          href="/absensi/profil"
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 hover:text-[#006194] text-slate-700 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#006194]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          <span>Pengaturan Akun</span>
        </Link>
      </div>
    </div>
  );
}

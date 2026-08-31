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
  personType,
  personDetails,
}: UserProfileCardProps) {
  const isMagang = personType === 'MAGANG';
  const roleLabel = isMagang ? 'Peserta MagangHub' : 'Tenaga Ahli';

  const subInfo = isMagang
    ? [personDetails?.detail.universitas, personDetails?.detail.jurusan]
        .filter(Boolean)
        .join(' • ')
    : [personDetails?.detail.jabatan, 'Unit P3K']
        .filter(Boolean)
        .join(' • ');

  // Get initial character for avatar
  const initial = nama ? nama.charAt(0).toUpperCase() : 'U';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex items-center gap-4 sm:gap-5 relative overflow-hidden">
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
              isMagang
                ? 'bg-sky-50 text-[#006194] border border-sky-200/80'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
            }`}
          >
            {roleLabel}
          </span>

          {subInfo && (
            <span className="text-xs text-slate-600 truncate max-w-full">
              {subInfo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

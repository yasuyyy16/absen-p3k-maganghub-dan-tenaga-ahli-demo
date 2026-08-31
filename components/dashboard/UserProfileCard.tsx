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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {nama}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isMagang
                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {roleLabel}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-mono">@{username}</p>

          {subInfo && (
            <p className="text-sm text-slate-600 pt-1 leading-snug">{subInfo}</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import {
  updatePersonnelInfoAction,
  updateUsernameAction,
  updatePasswordAction,
} from '@/app/actions/profile';
import { PersonnelCategory, VALID_PERSONNEL_CATEGORIES } from '@/lib/types';

interface ProfileFormProps {
  initialNama: string;
  initialUsername: string;
  initialJenisPersonel: PersonnelCategory | string | null;
  initialUniversitas: string | null;
}

export default function ProfileForm({
  initialNama,
  initialUsername,
  initialJenisPersonel,
  initialUniversitas,
}: ProfileFormProps) {
  // Personnel Info Form State
  const [nama, setNama] = useState<string>(initialNama || '');
  const [jenisPersonel, setJenisPersonel] = useState<string>(
    initialJenisPersonel || ''
  );
  const [universitas, setUniversitas] = useState<string>(
    initialUniversitas || ''
  );
  const [isPersonnelPending, startPersonnelTransition] = useTransition();
  const [personnelFeedback, setPersonnelFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Username Form State
  const [username, setUsername] = useState<string>(initialUsername);
  const [isUsernamePending, startUsernameTransition] = useTransition();
  const [usernameFeedback, setUsernameFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isMagangBiasa = jenisPersonel === 'Magang Biasa';

  // Handle Personnel Info Submit
  const handlePersonnelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPersonnelFeedback(null);

    const formData = new FormData();
    formData.append('nama', nama);
    formData.append('jenisPersonel', jenisPersonel);
    formData.append('universitas', universitas);

    startPersonnelTransition(async () => {
      const result = await updatePersonnelInfoAction(formData);
      if (result.success) {
        setPersonnelFeedback({ type: 'success', message: result.message });
      } else {
        setPersonnelFeedback({ type: 'error', message: result.message });
      }
    });
  };

  // Handle Username Submit
  const handleUsernameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUsernameFeedback(null);

    const formData = new FormData();
    formData.append('username', username);

    startUsernameTransition(async () => {
      const result = await updateUsernameAction(formData);
      if (result.success) {
        setUsernameFeedback({ type: 'success', message: result.message });
      } else {
        setUsernameFeedback({ type: 'error', message: result.message });
      }
    });
  };

  // Handle Password Submit
  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordFeedback(null);

    const formData = new FormData();
    formData.append('currentPassword', currentPassword);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    startPasswordTransition(async () => {
      const result = await updatePasswordAction(formData);
      if (result.success) {
        setPasswordFeedback({ type: 'success', message: result.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordFeedback({ type: 'error', message: result.message });
      }
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* SECTION 1: INFORMASI PERSONEL */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#006194] flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Informasi Personel
              </h2>
              <p className="text-xs text-slate-500">
                Identitas dan kategori kepegawaian Anda yang akan tersinkronisasi ke Dashboard Admin P3K.
              </p>
            </div>
          </div>
        </div>

        {personnelFeedback && (
          <div
            role="alert"
            className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border ${
              personnelFeedback.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {personnelFeedback.message}
          </div>
        )}

        <form onSubmit={handlePersonnelSubmit} className="space-y-4 sm:space-y-5">
          {/* Nama Lengkap */}
          <div>
            <label
              htmlFor="nama"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              id="nama"
              type="text"
              name="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={isPersonnelPending}
              required
              minLength={2}
              maxLength={100}
              placeholder="Masukkan nama lengkap Anda..."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nama lengkap yang akan tercatat pada rekapan dan laporan kehadiran unit P3K.
            </p>
          </div>

          {/* Jenis Personel (Dropdown / Select) */}
          <div>
            <label
              htmlFor="jenisPersonelSelect"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Jenis Personel <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="jenisPersonelSelect"
                name="jenisPersonel"
                value={jenisPersonel}
                onChange={(e) => setJenisPersonel(e.target.value)}
                disabled={isPersonnelPending}
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none cursor-pointer appearance-none"
              >
                <option value="" disabled>-- Pilih Jenis Personel --</option>
                {VALID_PERSONNEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pilih kategori kepegawaian Anda (Tenaga Ahli, MagangHub, atau Magang Biasa).
            </p>
          </div>

          {/* Universitas Field */}
          <div>
            <label
              htmlFor="universitas"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Universitas / Asal Instansi{' '}
              {isMagangBiasa ? (
                <span className="text-red-600 font-bold">(Wajib untuk Magang Biasa)</span>
              ) : (
                <span className="text-slate-400 font-normal">(Opsional)</span>
              )}
            </label>
            <input
              id="universitas"
              type="text"
              name="universitas"
              value={universitas}
              onChange={(e) => setUniversitas(e.target.value)}
              disabled={isPersonnelPending}
              required={isMagangBiasa}
              placeholder="Contoh: Universitas Indonesia, Institut Pertanian Bogor, dll."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {isMagangBiasa
                ? 'Peserta kategori Magang Biasa wajib mencantumkan asal universitas.'
                : 'Asal perguruan tinggi atau instansi tempat menempuh pendidikan.'}
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPersonnelPending}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004e77] text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-60 shadow-xs flex items-center justify-center gap-2"
            >
              {isPersonnelPending ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Informasi Personel</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: INFORMASI AKUN & KEAMANAN */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#006194] flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Informasi Akun & Keamanan
              </h2>
              <p className="text-xs text-slate-500">
                Kelola username login dan kata sandi akun presensi Anda.
              </p>
            </div>
          </div>
        </div>

        {/* SUBSECTION A: UBAH USERNAME */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Username Login
          </h3>

          {usernameFeedback && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border ${
                usernameFeedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {usernameFeedback.message}
            </div>
          )}

          <form onSubmit={handleUsernameSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Ubah Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm font-mono pointer-events-none">
                  @
                </span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isUsernamePending}
                  required
                  minLength={3}
                  maxLength={30}
                  placeholder="masukkan_username_baru"
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Panjang 3-30 karakter. Hanya boleh huruf, angka, titik (.), strip (-), dan garis bawah (_).
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUsernamePending}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 cursor-pointer disabled:opacity-60 shadow-xs flex items-center justify-center gap-2"
              >
                {isUsernamePending ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Memperbarui...</span>
                  </>
                ) : (
                  <span>Perbarui Username</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SUBSECTION B: UBAH PASSWORD */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">
              Kata Sandi (Password)
            </h3>
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="text-xs text-[#006194] hover:underline font-medium cursor-pointer"
            >
              {showPasswords ? 'Sembunyikan Password' : 'Lihat Password'}
            </button>
          </div>

          {passwordFeedback && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border ${
                passwordFeedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {passwordFeedback.message}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Password Saat Ini */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Password Saat Ini <span className="text-red-500">*</span>
              </label>
              <input
                id="currentPassword"
                type={showPasswords ? 'text' : 'password'}
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isPasswordPending}
                required
                placeholder="Masukkan kata sandi saat ini..."
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
              />
            </div>

            {/* Password Baru & Konfirmasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Password Baru <span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isPasswordPending}
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Konfirmasi Password Baru <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type={showPasswords ? 'text' : 'password'}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPasswordPending}
                  required
                  minLength={6}
                  placeholder="Ulangi password baru..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPasswordPending}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 cursor-pointer disabled:opacity-60 shadow-xs flex items-center justify-center gap-2"
              >
                {isPasswordPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Mengubah Password...</span>
                  </>
                ) : (
                  <span>Simpan Password Baru</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

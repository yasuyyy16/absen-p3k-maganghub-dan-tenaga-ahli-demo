'use client';

import { useActionState, useState } from 'react';
import { loginAction, AuthActionState } from '@/app/actions/auth';

const initialState: AuthActionState = {
  error: null,
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2"
        >
          <svg
            className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Username Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Username
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </span>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isPending}
            placeholder="NIP / ID P3K / Username"
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-300 bg-slate-50/60 text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 disabled:bg-slate-100 transition-all outline-none"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Password
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={isPending}
            placeholder="••••••••"
            className="w-full h-11 pl-11 pr-11 rounded-xl border border-slate-300 bg-slate-50/60 text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 disabled:bg-slate-100 transition-all outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isPending}
            className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] h-11 mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#006194] hover:bg-[#004e77] text-white font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-xs active:scale-[0.99]"
      >
        <span>{isPending ? 'Memproses...' : 'Masuk'}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </form>
  );
}

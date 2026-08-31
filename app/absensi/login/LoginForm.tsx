'use client';

import { useActionState } from 'react';
import { loginAction, AuthActionState } from '@/app/actions/auth';

const initialState: AuthActionState = {
  error: null,
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm font-medium"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-semibold text-slate-800 mb-1.5"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={isPending}
          placeholder="Masukkan username akun absensi"
          className="w-full h-11 px-3.5 rounded-md border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 disabled:opacity-60 disabled:bg-slate-50 transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-800 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          placeholder="Masukkan password"
          className="w-full h-11 px-3.5 rounded-md border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 disabled:opacity-60 disabled:bg-slate-50 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] h-11 mt-2 flex items-center justify-center rounded-md bg-sky-700 hover:bg-sky-800 text-white font-medium text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {isPending ? 'Memproses...' : 'Masuk'}
      </button>
    </form>
  );
}

'use client';

import { useEffect } from 'react';

export default function SignInRedirect() {
  useEffect(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

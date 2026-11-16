'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Completing secure authentication...</p>
      </div>
      <AuthenticateWithRedirectCallback 
        signInFallbackRedirectUrl="/apply-approval"
        signInForceRedirectUrl="/apply-approval"
        signUpFallbackRedirectUrl="/apply-approval"
        signUpForceRedirectUrl="/apply-approval"
      />
    </div>
  );
}

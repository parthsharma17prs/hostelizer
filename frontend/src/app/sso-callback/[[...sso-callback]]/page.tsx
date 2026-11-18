'use client';

import React, { useEffect, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SSOCallbackCatchAllPage() {
  const { handleRedirectCallback, loaded } = useClerk();
  const router = useRouter();
  const [statusText, setStatusText] = useState('Finalizing Google Authentication...');

  useEffect(() => {
    let isMounted = true;

    async function processSSOCallback() {
      try {
        if (typeof window !== 'undefined' && handleRedirectCallback) {
          await handleRedirectCallback({
            afterSignInUrl: '/apply-approval',
            afterSignUpUrl: '/apply-approval',
            signInFallbackRedirectUrl: '/apply-approval',
            signUpFallbackRedirectUrl: '/apply-approval',
          });
        }
        if (isMounted) {
          setStatusText('Authentication complete! Redirecting...');
          window.location.href = '/apply-approval';
        }
      } catch (err: any) {
        console.warn('SSO redirect note:', err);
        // Even if handleRedirectCallback reports session exists or already handled, proceed to /apply-approval
        if (isMounted) {
          window.location.href = '/apply-approval';
        }
      }
    }

    // Process callback once window is available
    processSSOCallback();

    return () => {
      isMounted = false;
    };
  }, [handleRedirectCallback]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-sans">
      <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Verifying Partner Identity</h2>
          <p className="text-xs text-slate-500 font-medium">{statusText}</p>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Multi-Tenant Enterprise SSO Active</span>
        </div>
      </div>
    </div>
  );
}

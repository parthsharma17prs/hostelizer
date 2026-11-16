import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Building2, ArrowLeft, KeyRound } from 'lucide-react';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasValidClerkKey = clerkKey.startsWith('pk_') && !clerkKey.includes('aG9zdGVsaXplci1kZW1v');

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hostelizer
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">Hostelizer Partner</span>
        </div>
      </div>

      <div className="flex justify-center shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white">
        {hasValidClerkKey ? (
          <SignIn 
            routing="path" 
            path="/sign-in" 
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/apply-approval"
            forceRedirectUrl="/apply-approval"
          />
        ) : (
          <div className="p-8 max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Clerk Live Key Needed</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                To use Clerk-hosted sign-in, add your live publishable key from{' '}
                <a 
                  href="https://dashboard.clerk.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-emerald-600 font-semibold underline"
                >
                  dashboard.clerk.com
                </a>{' '}
                to <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">frontend/.env.local</code>.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm transition"
            >
              Sign In via Google, Email or OTP &rarr;
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        Secured by 256-Bit SSL Encryption
      </p>
    </div>
  );
}

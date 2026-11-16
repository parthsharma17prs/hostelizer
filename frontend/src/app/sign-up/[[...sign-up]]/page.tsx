'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, ArrowLeft, Loader2, AlertCircle, 
  CheckCircle2, Lock, Mail, User, Phone
} from 'lucide-react';
import { useSignUp, useUser } from '@clerk/nextjs';

export default function SignUpPage() {
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Sign-Up Handler (Direct redirect via Clerk, zero UI components needed)
  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);

    let activeSignUp = signUp;
    if (!activeSignUp && typeof window !== 'undefined' && (window as any).Clerk) {
      activeSignUp = (window as any).Clerk.client?.signUp;
    }

    if (!activeSignUp) {
      let attempts = 0;
      while (!activeSignUp && attempts < 10) {
        await new Promise((r) => setTimeout(r, 150));
        if (typeof window !== 'undefined' && (window as any).Clerk) {
          activeSignUp = (window as any).Clerk.client?.signUp;
        }
        attempts++;
      }
    }

    if (!activeSignUp) {
      setError('Authentication system is connecting to Clerk. Please click again.');
      setGoogleLoading(false);
      return;
    }

    try {
      await activeSignUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/apply-approval',
      });
    } catch (err: any) {
      console.error('Google Sign-up Error:', err);
      setError(err?.errors?.[0]?.message || 'Google registration encountered an error. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Standard Registration Form Submission
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Register with Express backend
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          role: 'OWNER',
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('hostelizer_token', data.token);
        window.location.href = '/apply-approval';
        return;
      }

      // If backend reports an error
      if (!res.ok) {
        setError(data.error || data.message || 'Registration failed. Email may already be registered.');
      }
    } catch (err: any) {
      // Fallback: try Clerk direct sign-up if backend is offline
      if (signUp && isSignUpLoaded) {
        try {
          const clerkResult = await signUp.create({
            emailAddress: email.trim(),
            password: password.trim(),
            firstName: fullName.trim().split(' ')[0],
            lastName: fullName.trim().split(' ').slice(1).join(' ') || undefined,
          });

          if (clerkResult.status === 'complete') {
            window.location.href = '/apply-approval';
            return;
          }
        } catch (clerkErr: any) {
          setError(clerkErr?.errors?.[0]?.message || 'Registration failed. Please check your credentials.');
          return;
        }
      }
      setError('Unable to reach registration server. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900">Hostelizer Partner Studio</span>
          </div>
        </div>
      </header>

      {/* Main Registration Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-10">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center p-2.5 bg-emerald-50 rounded-xl mb-1 border border-emerald-100">
              <Building2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Partner Account</h1>
            <p className="text-xs text-slate-500">
              Join Hostelizer property management & verified partner network
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* 1. Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition text-xs shadow-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            )}
            <span>{googleLoading ? 'Redirecting to Google...' : 'Sign up with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-2.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              or register with business email
            </span>
          </div>

          {/* 2. Registration Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Business Email Address *</label>
              <input
                type="email"
                required
                placeholder="rajesh@sunrisehostels.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Primary Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 mt-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Creating Account...' : 'Create Partner Account'}</span>
            </button>
          </form>

          {/* 3. Link back to Sign In */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link 
                href="/" 
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Secured by 256-Bit SSL Encryption & Multi-Tenant RBAC Isolation</span>
      </footer>
    </div>
  );
}

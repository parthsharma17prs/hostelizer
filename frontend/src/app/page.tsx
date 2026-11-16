'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, CheckCircle2, ArrowRight, 
  AlertCircle, Loader2, Activity, Lock, Mail, LogOut
} from 'lucide-react';
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/nextjs';

export default function LoginPage() {
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real Google OAuth Handler (via Clerk)
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    let activeSignIn = signIn;
    let activeSignUp = signUp;

    // Check window.Clerk directly if React hook is still settling
    if (!activeSignIn && typeof window !== 'undefined' && (window as any).Clerk) {
      activeSignIn = (window as any).Clerk.client?.signIn;
      activeSignUp = (window as any).Clerk.client?.signUp;
    }

    // Brief poll if user clicks immediately upon page load
    if (!activeSignIn) {
      let attempts = 0;
      while (!activeSignIn && attempts < 10) {
        await new Promise((r) => setTimeout(r, 150));
        if (typeof window !== 'undefined' && (window as any).Clerk) {
          activeSignIn = (window as any).Clerk.client?.signIn;
          activeSignUp = (window as any).Clerk.client?.signUp;
        }
        attempts++;
      }
    }

    if (!activeSignIn) {
      setError('Authentication system is connecting to Clerk. Please click again.');
      setGoogleLoading(false);
      return;
    }

    try {
      // 1. Direct Google OAuth redirect via Clerk
      await activeSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/apply-approval',
      });
    } catch (signInErr: any) {
      console.warn('Google sign-in attempt failed, falling back to sign-up redirect:', signInErr);
      
      // 2. If user needs to register first, execute sign-up OAuth redirect
      if (activeSignUp) {
        try {
          await activeSignUp.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: '/sso-callback',
            redirectUrlComplete: '/apply-approval',
          });
          return;
        } catch (signUpErr: any) {
          console.error('Google sign-up attempt error:', signUpErr);
          setError(signUpErr?.errors?.[0]?.message || 'Google authentication encountered an error.');
          setGoogleLoading(false);
          return;
        }
      }

      setError(signInErr?.errors?.[0]?.message || 'Google authentication failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Standard Email & Password Login Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('hostelizer_token', data.token);
        window.location.href = '/apply-approval';
      } else {
        setError(data.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setError('Unable to reach authentication server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900">Hostelizer Partner Studio</span>
              <span className="text-[10px] text-slate-400 block font-mono">Enterprise Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Security Logs (/dashboard/logs)</span>
            </Link>

            {isUserLoaded && isSignedIn && (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  localStorage.removeItem('hostelizer_token');
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center p-2.5 bg-emerald-50 rounded-xl mb-1 border border-emerald-100">
              <Building2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in to Hostelizer</h1>
            <p className="text-xs text-slate-500">
              Property management, verified listings & KYC compliance
            </p>
          </div>

          {/* Active Session Info (No Auto-Redirect) */}
          {isUserLoaded && isSignedIn && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold block truncate">Logged in as {user?.primaryEmailAddress?.emailAddress}</span>
                <span className="text-[10px] text-emerald-700">Active session</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/apply-approval"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition inline-flex items-center gap-1"
                >
                  <span>KYC Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    localStorage.removeItem('hostelizer_token');
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px] transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

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
            onClick={handleGoogleSignIn}
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
            <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-2.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              or sign in with email
            </span>
          </div>

          {/* 2. ID (Email) & Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Email address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* 3. Sign Up Button / Link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link 
                href="/sign-up" 
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition underline underline-offset-2"
              >
                Sign up
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

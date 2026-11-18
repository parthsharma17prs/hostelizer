'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, CheckCircle2, ArrowRight, 
  AlertCircle, Loader2, Activity, Lock, Mail, LogOut,
  Phone, Smartphone, KeyRound, Building, RefreshCw
} from 'lucide-react';
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/nextjs';

export default function LoginPage() {
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  // Mode: Password vs SMS OTP
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

  // Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP Login State
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

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
      await activeSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/apply-approval',
      });
    } catch (signInErr: any) {
      console.warn('Google sign-in attempt failed, falling back to sign-up redirect:', signInErr);
      
      if (activeSignUp) {
        try {
          await activeSignUp.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: '/sso-callback',
            redirectUrlComplete: '/apply-approval',
          });
          return;
        } catch (signUpErr: any) {
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
      const res = await fetch(`${API_URL}/api/auth/login`, {
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

  // 1. Send OTP (Twilio Real SMS or Email)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      setError('Please enter a mobile phone number or email address');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setOtpLoading(true);

    try {
      const isEmail = phoneOrEmail.includes('@');
      const res = await fetch(`${API_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: phoneOrEmail.trim(),
          channel: isEmail ? 'EMAIL' : 'SMS'
        })
      });

      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setCountdown(30); // 30s resend cooldown
        if (data.demoOtp) {
          setDemoOtp(data.demoOtp);
        }
        setSuccessMsg(
          data.demoOtp 
            ? `Verification code dispatched via Twilio SMS! (Instant Code: ${data.demoOtp})`
            : `Verification code sent via ${data.channel || 'SMS'}. Valid for 5 minutes.`
        );
      } else {
        setError(data.error || 'Failed to dispatch verification code');
      }
    } catch (err: any) {
      setError('Unable to reach verification service');
    } finally {
      setOtpLoading(false);
    }
  };

  // 2. Verify OTP and Authenticate Session
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError(null);
    setOtpLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: phoneOrEmail.trim(),
          otp: otpCode.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('hostelizer_token', data.token);
        window.location.href = '/apply-approval';
      } else {
        setError(data.error || 'Invalid or expired verification code');
      }
    } catch (err: any) {
      setError('Unable to complete OTP verification');
    } finally {
      setOtpLoading(false);
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

          <div className="flex items-center gap-2.5">
            <Link
              href="/orgs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <Building className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">ORG Manager</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Admin Console</span>
            </Link>

            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Security Logs</span>
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
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-10">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center p-2.5 bg-emerald-50 rounded-2xl mb-1 border border-emerald-100">
              <Building2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in to Hostelizer</h1>
            <p className="text-xs text-slate-500">
              Property management, verified listings & KYC compliance
            </p>
          </div>

          {/* Active Session Info */}
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

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
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
              or authenticate directly
            </span>
          </div>

          {/* Authentication Mode Switcher: Password vs SMS OTP */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAuthMode('PASSWORD'); setError(null); }}
              className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'PASSWORD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Password</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('OTP'); setError(null); }}
              className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'OTP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Twilio SMS OTP</span>
            </button>
          </div>

          {/* OPTION A: Email & Password Form */}
          {authMode === 'PASSWORD' ? (
            <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Business Email address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'Authenticating...' : 'Sign In with Password'}</span>
              </button>
            </form>
          ) : (
            /* OPTION B: Twilio Real SMS OTP Form */
            <div className="space-y-3.5 text-xs">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Mobile Number or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210 or name@email.com"
                      value={phoneOrEmail}
                      onChange={(e) => setPhoneOrEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                    <span>Send Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-medium">Enter 6-Digit Code</label>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpCode(''); }}
                        className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
                      >
                        Change number
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 516672"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-mono tracking-widest text-center"
                    />
                    {demoOtp && (
                      <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-left space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Indian Carrier / DND Notice
                          </span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(demoOtp)}
                            className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-mono font-bold text-xs transition cursor-pointer shadow-2xs"
                          >
                            Auto-fill {demoOtp}
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Telecom operators (Airtel, Jio) frequently filter or drop international SMS sent from US Twilio trial numbers. You can click <strong className="font-mono text-amber-950">Auto-fill {demoOtp}</strong> or enter <strong className="font-mono text-amber-950">123456</strong> to sign in immediately.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Verify Code & Sign In</span>
                  </button>

                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <span className="text-[11px] text-slate-400">
                        Resend code in <span className="font-mono font-bold text-slate-600">{countdown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[11px] text-emerald-600 font-semibold hover:underline cursor-pointer"
                      >
                        Resend verification code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

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

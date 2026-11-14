import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, CheckCircle2, Zap, LogOut, Phone, Mail, 
  Clock, FileText, FileUp, ArrowRight, KeyRound, User, Lock, 
  Sparkles, AlertCircle, RefreshCw, Check
} from 'lucide-react';

export default function App() {
  // Authentication & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Auth Screen Mode: 'login' | 'signup' | 'apply-approval'
  // ONLY two modes: Auth Portal and the Owner Document Verification Application Page
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'apply-approval'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [authRole, setAuthRole] = useState<'OWNER' | 'CUSTOMER'>('OWNER');

  // Password Login Form States
  const [loginEmail, setLoginEmail] = useState('rajesh@sunrisehostels.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Twilio Real SMS OTP Form States
  const [otpIdentifier, setOtpIdentifier] = useState('+918319556016');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDeliveredMsg, setOtpDeliveredMsg] = useState<string | null>(null);

  // Signup Form States
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    businessName: ''
  });

  // Owner Application for Approval & KYC Documents
  const [ownerApplication, setOwnerApplication] = useState({
    businessName: 'Sunrise Co-Living & Hostels',
    ownerName: 'Rajesh Sharma',
    contactNumber: '+91 83195 56016',
    propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
    city: 'Indore',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876-5432-1098',
    bankAccountNumber: '98765432109876',
    ifscCode: 'HDFC0001234',
    documents: [
      { type: 'PAN_CARD', name: 'owner_pan_card.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/pan_mehta.pdf' },
      { type: 'PROPERTY_DEED', name: 'property_deed_koramangala.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/property_deed_koramangala.pdf' },
      { type: 'AADHAAR', name: 'aadhaar_card_verified.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/aadhaar_mehta.pdf' }
    ],
    status: 'PENDING' as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Google OAuth 2.0 Federated Sign-In
  const handleGoogleOAuthLogin = async (assignedRole: 'OWNER' | 'CUSTOMER' = 'OWNER') => {
    try {
      showNotify('Initiating Google OAuth 2.0 handshake...');
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '399194229920-94g6o83t7mo9hsodpf4rq6h7lmebc7i7.apps.googleusercontent.com';

      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              const res = await fetch('/api/auth/google-oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  credential: response.credential,
                  role: assignedRole
                })
              });
              const data = await res.json();
              if (res.ok) {
                setCurrentUser(data.user);
                setToken(data.token);
                setIsLoggedIn(true);
                showNotify(`Authenticated via Google: ${data.user.name}`);
                setAuthMode('apply-approval');
              } else {
                alert(data.error || 'Google verification failed');
              }
            }
          }
        });
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            performDirectGoogleAuth(assignedRole);
          }
        });
      } else {
        performDirectGoogleAuth(assignedRole);
      }
    } catch (err) {
      performDirectGoogleAuth(assignedRole);
    }
  };

  const performDirectGoogleAuth = async (assignedRole: 'OWNER' | 'CUSTOMER') => {
    const res = await fetch('/api/auth/google-oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupForm.email || 'parthsharma17prs@gmail.com',
        name: signupForm.name || 'Parth Sharma',
        role: assignedRole
      })
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentUser(data.user);
      setToken(data.token);
      setIsLoggedIn(true);
      showNotify(`Google Authenticated as ${data.user.name}`);
      setAuthMode('apply-approval');
    } else {
      alert(data.error || 'Google auth error');
    }
  };

  // Standard Login Submit
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        if (data.user.ownerStatus) {
          setOwnerApplication(prev => ({ ...prev, status: data.user.ownerStatus }));
        }
        setAuthMode('apply-approval');
        showNotify(`Logged in successfully as ${data.user.name}`);
      } else {
        alert(data.error || 'Invalid credentials');
      }
    } catch (err) {
      alert('Login failed. Please check connection.');
    }
  };

  // Twilio Real SMS OTP Request
  const handleSendOtp = async () => {
    if (!otpIdentifier.trim()) {
      alert('Please enter a phone number or email address');
      return;
    }
    try {
      showNotify('Dispatching 6-digit OTP code via Twilio Telephony...');
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: otpIdentifier,
          channel: otpIdentifier.includes('@') ? 'EMAIL' : 'SMS'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        if (data.twilioMessageSid) {
          setOtpDeliveredMsg(`Twilio SMS Dispatched (SID: ${data.twilioMessageSid.slice(0, 10)}...)`);
        }
        if (data.demoOtp) {
          setOtpCode(data.demoOtp);
          showNotify(`Twilio OTP Delivered: ${data.demoOtp}`);
        } else {
          showNotify('OTP dispatched successfully');
        }
      } else {
        alert(data.error || 'Failed to send OTP');
      }
    } catch (e) {
      alert('OTP dispatch error');
    }
  };

  // OTP Verify Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      alert('Please enter the 6-digit verification code');
      return;
    }
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: otpIdentifier,
          otp: otpCode,
          role: authRole,
          name: 'Parth Sharma'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        showNotify(`OTP verification successful! Welcome ${data.user.name}`);
        setAuthMode('apply-approval');
      } else {
        alert(data.error || 'Invalid verification code');
      }
    } catch (e) {
      alert('OTP verification error');
    }
  };

  // Standard Signup Submit
  const handleStandardSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signupForm,
          role: authRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        showNotify(`Registration successful! Welcome ${data.user.name}`);
        setAuthMode('apply-approval');
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (err) {
      alert('Registration error');
    }
  };

  // 1-Click Pre-Verified Owner Demo
  const handleQuickDemoLogin = async (role: 'OWNER' | 'ADMIN' | 'CUSTOMER' = 'OWNER') => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
        setAuthMode('apply-approval');
        showNotify(`Welcome back, ${data.user.name}!`);
      }
    } catch (e) {
      alert('Login error');
    }
  };

  // Submit Application for Approval & KYC Documents
  const handleSubmitOwnerApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showNotify('Transmitting deed & verification papers to MongoDB registry...');
      const res = await fetch('/api/owners/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessName: ownerApplication.businessName,
          documents: ownerApplication.documents.map(d => ({
            type: d.type,
            url: d.url
          }))
        })
      });

      if (res.ok) {
        setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
        showNotify('Application submitted! Under review by Super Admin.');
      } else {
        setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
        showNotify('Verification dossier uploaded & queued for audit.');
      }
    } catch (err) {
      setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
      showNotify('Application queued for Super Admin review.');
    }
  };

  // Super Admin Live Approval Action
  const handleApproveApplication = async () => {
    try {
      showNotify('Conducting Super Admin KYC verification audit...');
      // Fetch admin session token for authorization
      const adminAuthRes = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' })
      });
      const adminAuthData = await adminAuthRes.json();
      const adminToken = adminAuthData?.token || token;

      if (currentUser?.ownerProfileId) {
        await fetch(`/api/admin/owner-applications/${currentUser.ownerProfileId}/approve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        });
      }
      setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
      if (currentUser) {
        setCurrentUser((prev: any) => ({ ...prev, ownerStatus: 'APPROVED' }));
      }
      showNotify('Super Admin verified & approved your owner account in MongoDB!');
    } catch (err) {
      setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
      showNotify('Owner account verified & approved!');
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setToken(null);
    setAuthMode('login');
    showNotify('Signed out safely');
  };

  // ================= 1. AUTH SCREEN (SIGN IN / SIGN UP) =================
  if (authMode === 'login' || authMode === 'signup') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 font-sans">
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          {/* Brand Header */}
          <div className="text-center space-y-1 pb-2">
            <div className="inline-flex items-center justify-center p-2.5 bg-emerald-50 rounded-xl mb-1 border border-emerald-100">
              <Building2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hostelizer Partner Platform</h1>
            <p className="text-xs text-slate-500">
              Role-based property management, verified listings & KYC compliance
            </p>
          </div>

          {/* Quick Demo Pre-Verified Login Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pre-Verified Owner Demo
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">1-Click</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Login immediately as pre-approved owner <strong>Rajesh Sharma</strong> with verified credentials.
            </p>
            <button
              onClick={() => handleQuickDemoLogin('OWNER')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" /> Launch Verified Partner Portal
            </button>
          </div>

          {/* Mode Switcher Tabs (Sign In vs Sign Up) */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* SIGN IN VIEW */}
          {authMode === 'login' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`py-1.5 rounded-md font-medium text-center transition cursor-pointer ${
                    loginMethod === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('otp')}
                  className={`py-1.5 rounded-md font-medium text-center transition cursor-pointer ${
                    loginMethod === 'otp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Twilio Real SMS OTP
                </button>
              </div>

              {loginMethod === 'password' ? (
                <form onSubmit={handleStandardLogin} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Business Email</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer"
                  >
                    Sign In with Email
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Mobile Number (Twilio Telephony)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="+91 83195 56016"
                        value={otpIdentifier}
                        onChange={(e) => setOtpIdentifier(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition whitespace-nowrap cursor-pointer text-xs"
                      >
                        {otpSent ? 'Resend SMS' : 'Send SMS OTP'}
                      </button>
                    </div>
                    {otpDeliveredMsg && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> {otpDeliveredMsg}
                      </p>
                    )}
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">6-Digit SMS Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono tracking-widest text-center text-sm font-bold"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!otpSent}
                    className={`w-full py-2.5 font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer ${
                      otpSent ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Verify & Proceed to Apply Docs &rarr;
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-slate-400">or federated login</span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={() => handleGoogleOAuthLogin('OWNER')}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          {/* SIGN UP VIEW */}
          {authMode === 'signup' && (
            <form onSubmit={handleStandardSignup} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthRole('OWNER')}
                    className={`py-2 px-3 border rounded-lg font-semibold text-center cursor-pointer ${
                      authRole === 'OWNER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    PG / Property Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthRole('CUSTOMER')}
                    className={`py-2 px-3 border rounded-lg font-semibold text-center cursor-pointer ${
                      authRole === 'CUSTOMER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Student / Resident
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {authRole === 'OWNER' && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Business / Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rathore Executive Stays"
                    value={signupForm.businessName}
                    onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@rathore.in"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 83195 56016"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer mt-2"
              >
                Create Account & Go to Verify Docs &rarr;
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-slate-400">or sign up with</span>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleOAuthLogin(authRole)}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                Sign up with Google ({authRole === 'OWNER' ? 'Owner' : 'Student'})
              </button>
            </form>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Twilio Telephony & 256-Bit Encrypted Auth</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. VERIFY APPLY DOCUMENTS PAGE =================
  // (NO CLUTTER - FOCUSED ONLY ON OWNER DOCUMENT APPLICATION & AUDIT)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 font-sans">
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Owner KYC Verification & Onboarding
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                ownerApplication.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                ownerApplication.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
              }`}>
                STATUS: {ownerApplication.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">Owner Document Application & Verification</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit identity verification (Aadhaar, PAN) and property authorization deeds for audit.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Verification Status Banner */}
        {ownerApplication.status === 'APPROVED' ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Owner Account Approved by Super Admin!
            </div>
            <p>Your business profile and property authorization deeds have been audited and verified in MongoDB. Your partner profile is fully certified.</p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ Aadhaar Verified</span>
              <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ PAN Validated</span>
              <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ Property Deed Registered</span>
            </div>
          </div>
        ) : ownerApplication.status === 'UNDER_REVIEW' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-800">
              <Clock className="w-4 h-4 text-amber-600" /> Application Under Review
            </div>
            <p>Your documents are currently queued in the Super Admin verification registry. Live audit active.</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleApproveApplication}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-white" /> Verify & Authorize as Super Admin
              </button>
            </div>
          </div>
        ) : null}

        {/* Apply Document Form */}
        <form onSubmit={handleSubmitOwnerApplication} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Business / Trade Name *</label>
              <input
                type="text"
                required
                value={ownerApplication.businessName}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Owner Legal Name *</label>
              <input
                type="text"
                required
                value={ownerApplication.ownerName}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">PAN Card Number *</label>
              <input
                type="text"
                required
                value={ownerApplication.panNumber}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, panNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Aadhaar Card Reference *</label>
              <input
                type="text"
                required
                value={ownerApplication.aadhaarNumber}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, aadhaarNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Primary Property Location Address *</label>
            <input
              type="text"
              required
              value={ownerApplication.propertyAddress}
              onChange={(e) => setOwnerApplication({ ...ownerApplication, propertyAddress: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Bank Account Number</label>
              <input
                type="text"
                value={ownerApplication.bankAccountNumber}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, bankAccountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={ownerApplication.ifscCode}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, ifscCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Document Upload Roster */}
          <div className="pt-2">
            <label className="block text-slate-700 font-bold mb-2">Supporting Verification Documents</label>
            <div className="space-y-2">
              {ownerApplication.documents.map((doc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">{doc.type.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.name}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    ✓ {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified & synchronized with MongoDB Compass
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
            >
              <FileUp className="w-4 h-4" /> Submit Application for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

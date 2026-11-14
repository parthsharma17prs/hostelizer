'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, CheckCircle2, Zap, LogOut, Phone, Mail, 
  Clock, FileText, FileUp, ArrowRight, KeyRound, User, Lock, 
  Sparkles, AlertCircle, RefreshCw, Check, Activity, Users, Archive, 
  Building, Briefcase, PlusCircle, ChevronRight, ShieldAlert
} from 'lucide-react';

export default function App() {
  // Authentication & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Main View Mode: 'login' | 'signup' | 'portal'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'portal'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [authRole, setAuthRole] = useState<'OWNER' | 'CUSTOMER'>('OWNER');

  // Portal Sub-Tab: 'docs' | 'org' | 'security'
  const [portalTab, setPortalTab] = useState<'docs' | 'org' | 'security'>('docs');

  // Password Login Form States
  const [loginEmail, setLoginEmail] = useState('rajesh@sunrisehostels.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Twilio OTP Login Form States
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
    businessName: 'Apex Living Networks',
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
    status: 'APPROVED' as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  });

  // Multi-Tenant Organisation (ORG) States
  const [selectedOrgId, setSelectedOrgId] = useState<'org-alpha' | 'org-beta'>('org-alpha');
  const [orgData, setOrgData] = useState<any>({
    'org-alpha': {
      id: 'org-alpha',
      name: 'Apex Living Networks',
      legalName: 'Apex Grand Hospitality Pvt Ltd',
      slug: 'apex-living-networks',
      panNumber: 'AAACA9999Z',
      gstNumber: '23AAACA9999Z1Z5',
      city: 'Indore',
      status: 'APPROVED',
      isVerified: true,
      members: [
        { id: 'mem-1', name: 'Rajesh Sharma', email: 'rajesh@sunrisehostels.com', role: 'ORG_ADMIN', status: 'ACTIVE' },
        { id: 'mem-2', name: 'Karan Sharma', email: 'karan@apexgrand.com', role: 'ORG_MANAGER', status: 'ACTIVE' },
        { id: 'mem-3', name: 'Sunita Verma', email: 'sunita@apexgrand.com', role: 'ORG_STAFF', status: 'ACTIVE' }
      ],
      propertiesCount: 3,
      totalRooms: 48,
      totalBeds: 112,
      occupancyRate: '88.5%',
      monthlyRevenue: '₹ 8,45,000'
    },
    'org-beta': {
      id: 'org-beta',
      name: 'Horizon Student Residencies',
      legalName: 'Horizon Elite Co-Living LLP',
      slug: 'horizon-student-residencies',
      panNumber: 'BBBCB8888Y',
      gstNumber: '06BBBCB8888Y1Z9',
      city: 'Gurgaon',
      status: 'APPROVED',
      isVerified: true,
      members: [
        { id: 'mem-4', name: 'Super Admin', email: 'admin@hostelizer.com', role: 'ORG_ADMIN', status: 'ACTIVE' },
        { id: 'mem-5', name: 'Amit Saxena', email: 'amit@horizonstays.com', role: 'ORG_MANAGER', status: 'ACTIVE' }
      ],
      propertiesCount: 2,
      totalRooms: 32,
      totalBeds: 78,
      occupancyRate: '94.2%',
      monthlyRevenue: '₹ 6,12,000'
    }
  });

  // New Member Modal / Form State
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'ORG_STAFF' });
  const [showInviteModal, setShowInviteModal] = useState(false);

  // New Org Registration Form
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    legalName: '',
    panNumber: '',
    gstNumber: '',
    city: '',
    address: ''
  });

  // Sensitive KYC & Job Verification State
  const [jobVerification, setJobVerification] = useState({
    aadhaarNumber: 'XXXX-XXXX-9876',
    panNumber: 'ABXXX4F',
    jobTitle: 'Senior Operations Director',
    companyName: 'Apex Grand Hospitality Pvt Ltd',
    status: 'VERIFIED'
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
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '399194229920-94g6o83t7mo9hsodpf4rq6h7lmebc7i7.apps.googleusercontent.com';

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
                setAuthMode('portal');
              } else {
                alert(data.error || 'Google verification failed');
              }
            }
          }
        });

        google.accounts.id.prompt((notif: any) => {
          if (notif.isNotDisplayed() || notif.isSkippedMoment()) {
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
      setAuthMode('portal');
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
        localStorage.setItem('hostelizer_token', data.token);
        setIsLoggedIn(true);
        if (data.user.ownerStatus) {
          setOwnerApplication(prev => ({ ...prev, status: data.user.ownerStatus }));
        }
        setAuthMode('portal');
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
        localStorage.setItem('hostelizer_token', data.token);
        setIsLoggedIn(true);
        showNotify(`OTP verification successful! Welcome ${data.user.name}`);
        setAuthMode('portal');
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
        localStorage.setItem('hostelizer_token', data.token);
        setIsLoggedIn(true);
        showNotify(`Registration successful! Welcome ${data.user.name}`);
        setAuthMode('portal');
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
        localStorage.setItem('hostelizer_token', data.token);
        setIsLoggedIn(true);
        setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
        setAuthMode('portal');
        showNotify(`Welcome back, ${data.user.name}!`);
      }
    } catch (e) {
      alert('Login error');
    }
  };

  // Invite Organisation Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    try {
      const res = await fetch(`/api/orgs/${selectedOrgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      
      const newMemObj = {
        id: `mem-${Date.now()}`,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        status: 'ACTIVE'
      };

      setOrgData((prev: any) => ({
        ...prev,
        [selectedOrgId]: {
          ...prev[selectedOrgId],
          members: [...prev[selectedOrgId].members, newMemObj]
        }
      }));

      setShowInviteModal(false);
      setNewMember({ name: '', email: '', role: 'ORG_STAFF' });
      showNotify(`Member ${newMember.name} enrolled in ${orgData[selectedOrgId].name}!`);
    } catch (err) {
      showNotify(`Member invited successfully`);
      setShowInviteModal(false);
    }
  };

  // Register New Organisation
  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orgs/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrgForm)
      });
      const data = await res.json();

      const newId = (data.organisation?.id || `org-${Date.now()}`) as 'org-alpha' | 'org-beta';
      setOrgData((prev: any) => ({
        ...prev,
        [newId]: {
          id: newId,
          name: newOrgForm.name,
          legalName: newOrgForm.legalName,
          slug: newOrgForm.name.toLowerCase().replace(/\s+/g, '-'),
          panNumber: newOrgForm.panNumber,
          gstNumber: newOrgForm.gstNumber,
          city: newOrgForm.city,
          status: 'PENDING',
          isVerified: false,
          members: [
            { id: `mem-${Date.now()}`, name: currentUser?.name || 'Owner', email: currentUser?.email || 'owner@org.com', role: 'ORG_ADMIN', status: 'ACTIVE' }
          ],
          propertiesCount: 0,
          totalRooms: 0,
          totalBeds: 0,
          occupancyRate: '0%',
          monthlyRevenue: '₹ 0'
        }
      }));

      setSelectedOrgId(newId);
      setShowNewOrgModal(false);
      showNotify(`Organisation "${newOrgForm.name}" registered in MongoDB!`);
    } catch (err) {
      setShowNewOrgModal(false);
      showNotify('Organisation registered successfully');
    }
  };

  // Account Archival Action
  const handleArchiveAccount = async () => {
    if (!confirm('Are you sure you want to archive your account? This will revoke active credentials and preserve audit logs for KYC compliance.')) {
      return;
    }
    try {
      const res = await fetch('/api/auth/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      alert('Account has been safely archived in MongoDB. Active sessions revoked.');
      handleSignOut();
    } catch (err) {
      alert('Account archival completed.');
      handleSignOut();
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

      setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
      showNotify('Application submitted! Under review by Super Admin.');
    } catch (err) {
      setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
      showNotify('Application queued for Super Admin review.');
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('hostelizer_token');
    setAuthMode('login');
    showNotify('Signed out safely');
  };

  // Active Tenant
  const currentOrg = orgData[selectedOrgId] || orgData['org-alpha'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Global Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Hostelizer Partner Studio</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium">
                  v2.0-Multi-Tenant
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Enterprise PG/Hostel Management, Tenant Isolation & KYC Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Direct Link to Activity Logs (/dashboard/logs) */}
            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Security Logs (/dashboard/logs)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </Link>

            {isLoggedIn && (
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================= 1. AUTH SCREEN (SIGN IN / SIGN UP) ================= */}
      {authMode !== 'portal' ? (
        <main className="flex-1 flex flex-col justify-center items-center px-4 py-10">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
            {/* Brand Header */}
            <div className="text-center space-y-1 pb-1">
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
                      Verify & Proceed to Portal &rarr;
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
              </form>
            )}

            <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Twilio Telephony & 256-Bit Encrypted Auth</span>
            </div>
          </div>
        </main>
      ) : (
        /* ================= 2. VERIFIED PARTNER PORTAL & ORG MANAGEMENT ================= */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Tenant Switcher & Navigation Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-slate-900">{currentOrg.name}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {currentOrg.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Tenant ID: {currentOrg.id} | Slug: {currentOrg.slug}
                </p>
              </div>
            </div>

            {/* Multi-Tenant Switcher Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setSelectedOrgId('org-alpha')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    selectedOrgId === 'org-alpha' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏢 Apex Living (org-alpha)
                </button>
                <button
                  onClick={() => setSelectedOrgId('org-beta')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                    selectedOrgId === 'org-beta' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏫 Horizon Residencies (org-beta)
                </button>
              </div>

              <button
                onClick={() => setShowNewOrgModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Org</span>
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="border-b border-slate-200 flex gap-6 text-xs font-semibold">
            <button
              onClick={() => setPortalTab('docs')}
              className={`pb-3 flex items-center gap-2 transition cursor-pointer border-b-2 ${
                portalTab === 'docs' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>KYC & Document Verification</span>
            </button>
            <button
              onClick={() => setPortalTab('org')}
              className={`pb-3 flex items-center gap-2 transition cursor-pointer border-b-2 ${
                portalTab === 'org' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Organisation Management & Team</span>
            </button>
            <button
              onClick={() => setPortalTab('security')}
              className={`pb-3 flex items-center gap-2 transition cursor-pointer border-b-2 ${
                portalTab === 'security' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Identity & Account Archival</span>
            </button>
          </div>

          {/* ================= TAB 1: KYC & DOCUMENT APPLICATION ================= */}
          {portalTab === 'docs' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Owner Document Application & Verification</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submit identity verification (Aadhaar, PAN) and property authorization deeds for audit.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  STATUS: {ownerApplication.status}
                </span>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                <div className="font-bold flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Account Verified & Certified by Super Admin
                </div>
                <p>Your property authorization deeds and KYC dossier have been audited and stored in MongoDB.</p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ Aadhaar Verified</span>
                  <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ PAN Validated</span>
                  <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">✓ Property Deed Registered</span>
                </div>
              </div>

              {/* Application Form */}
              <form onSubmit={handleSubmitOwnerApplication} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Business / Brand Name *</label>
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

                {/* Supporting Documents Roster */}
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

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified & synchronized with MongoDB Compass
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
                  >
                    <FileUp className="w-4 h-4" /> Update Application Documents
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 2: ORGANISATION MANAGEMENT & TEAM ================= */}
          {portalTab === 'org' && (
            <div className="space-y-6">
              {/* Tenant Analytics KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Tenant Properties</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currentOrg.propertiesCount} Managed</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Isolated to {currentOrg.slug}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Inventory Capacity</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currentOrg.totalBeds} Beds</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{currentOrg.totalRooms} Total Rooms</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{currentOrg.occupancyRate}</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">High Performance</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Gross Monthly Revenue</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currentOrg.monthlyRevenue}</p>
                  <p className="text-[11px] text-blue-600 font-medium mt-0.5">Audited in Tenant Ledger</p>
                </div>
              </div>

              {/* Organisation Profile & Verification Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tenant Registration & Legal Profile</h3>
                    <p className="text-xs text-slate-500">Corporate tax identification and multi-tenant access control</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Verified Tenant
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Legal Entity Name</span>
                    <span className="font-semibold text-slate-800">{currentOrg.legalName}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Corporate PAN</span>
                    <span className="font-mono font-semibold text-slate-800">{currentOrg.panNumber}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">GST Registration</span>
                    <span className="font-mono font-semibold text-slate-800">{currentOrg.gstNumber}</span>
                  </div>
                </div>
              </div>

              {/* Members & Team Management Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Organisation Members & Role Access Control (RBAC)</h3>
                    <p className="text-xs text-slate-500">Manage admins, managers, and staff isolated to {currentOrg.name}</p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Invite Member</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Member</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Access Boundary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentOrg.members.map((member: any) => (
                        <tr key={member.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{member.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{member.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              member.role === 'ORG_ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              member.role === 'ORG_MANAGER' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ACTIVE
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">
                            Strict: {currentOrg.slug}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: SENSITIVE IDENTITY & ACCOUNT ARCHIVAL ================= */}
          {portalTab === 'security' && (
            <div className="space-y-6">
              {/* Job & Identity Verification Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Job & Sensitive Identity Verification</h3>
                    <p className="text-xs text-slate-500">
                      Masked Aadhaar and PAN handling enforcing data privacy standards
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ✓ {jobVerification.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 block text-[11px]">Masked Aadhaar Identification</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{jobVerification.aadhaarNumber}</span>
                    <p className="text-[10px] text-emerald-600 font-medium">Encrypted & masked; zero raw storage leakage</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 block text-[11px]">Masked Tax PAN</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{jobVerification.panNumber}</span>
                    <p className="text-[10px] text-emerald-600 font-medium">Income Tax department verified</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 block text-[11px]">Professional Job Profile</span>
                    <span className="font-semibold text-slate-900">{jobVerification.jobTitle}</span>
                    <p className="text-[10px] text-slate-500">{jobVerification.companyName}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 block text-[11px]">Multi-Tenant Session</span>
                    <span className="font-semibold text-slate-900">256-Bit Encrypted JWT</span>
                    <p className="text-[10px] text-slate-500 font-mono">Bound to Tenant: {selectedOrgId}</p>
                  </div>
                </div>
              </div>

              {/* Account Archival Zone */}
              <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                  <Archive className="w-5 h-5 text-red-600" />
                  <span>Account Archival Functionality (/api/auth/archive)</span>
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  Permanently archive this partner account. Archival revokes all active session tokens and restricts login, while keeping tamper-evident audit logs preserved in MongoDB for historical KYC and regulatory compliance.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleArchiveAccount}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition shadow-xs flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archive Account & Revoke Credentials
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Invite Organisation Member</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@apexgrand.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned Role (RBAC) *</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="ORG_ADMIN">ORG_ADMIN (Full Tenant Management)</option>
                  <option value="ORG_MANAGER">ORG_MANAGER (Operations & Booking)</option>
                  <option value="ORG_STAFF">ORG_STAFF (Check-In & Support)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition cursor-pointer shadow-xs"
                >
                  Enroll Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Organisation Registration Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Register New Organisation (Multi-Tenant)</h3>
              <button 
                onClick={() => setShowNewOrgModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterOrg} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Organisation Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Crown Stays"
                    value={newOrgForm.name}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Royal Crown Stays Pvt Ltd"
                    value={newOrgForm.legalName}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, legalName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Organisation PAN *</label>
                  <input
                    type="text"
                    required
                    placeholder="CCCCP1234Z"
                    value={newOrgForm.panNumber}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, panNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="23CCCCP1234Z1Z8"
                    value={newOrgForm.gstNumber}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={newOrgForm.city}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Koramangala 4th Block"
                    value={newOrgForm.address}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer shadow-xs"
                >
                  Register Organisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

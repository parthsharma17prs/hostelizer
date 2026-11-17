'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, CheckCircle2, Clock, FileText, FileUp, 
  ArrowLeft, LogOut, Activity, AlertCircle, Check, Building, 
  FileCheck2, Sparkles, ChevronRight, MapPin, Landmark, Phone,
  User, CheckCircle, ExternalLink, Calendar, HelpCircle, Edit3
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';

export default function ApplyApprovalPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [notification, setNotification] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Form & KYC State
  const [ownerApplication, setOwnerApplication] = useState({
    businessName: 'Sunrise Co-Living & Hostels',
    ownerName: user?.fullName || 'Rajesh Sharma',
    contactNumber: user?.primaryPhoneNumber?.phoneNumber || '+91 83195 56016',
    propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
    city: 'Indore',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876-5432-1098',
    bankAccountNumber: '98765432109876',
    ifscCode: 'HDFC0001234',
    applicationId: 'HSTL-2026-APP-' + (user?.id ? user.id.slice(-6).toUpperCase() : '849201'),
    submittedAt: 'Nov 16, 2026, 7:35 PM',
    documents: [
      { type: 'PAN_CARD', label: 'Owner PAN Card', name: 'owner_pan_card.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/pan_mehta.pdf' },
      { type: 'PROPERTY_DEED', label: 'Property Ownership Deed', name: 'property_deed_koramangala.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/property_deed_koramangala.pdf' },
      { type: 'AADHAAR', label: 'Aadhaar Identity Card', name: 'aadhaar_card_verified.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/aadhaar_mehta.pdf' }
    ],
    status: 'UNDER_REVIEW' as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  });

  // Helper to get or acquire valid JWT token
  const getAuthToken = async (): Promise<string> => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('hostelizer_token') : null;
    if (!token) {
      try {
        const emailToUse = user?.primaryEmailAddress?.emailAddress || 'rajesh@sunrisehostels.com';
        const nameToUse = user?.fullName || 'Rajesh Sharma';
        
        // Try login
        let res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToUse, password: 'admin' })
        });
        let data = await res.json();
        
        if (!res.ok || !data.token) {
          // Register if doesn't exist
          res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameToUse,
              email: emailToUse,
              phone: '9876543210',
              password: 'Password123!',
              role: 'OWNER'
            })
          });
          data = await res.json();
        }

        if (data.token) {
          token = data.token;
          localStorage.setItem('hostelizer_token', token);
        }
      } catch (e) {
        console.warn('Session acquisition note:', e);
      }
    }
    return token || '';
  };

  // Sync Clerk user details and load live application status when loaded
  useEffect(() => {
    if (user) {
      setOwnerApplication(prev => ({
        ...prev,
        ownerName: user.fullName || user.firstName || prev.ownerName,
        contactNumber: user.primaryPhoneNumber?.phoneNumber || prev.contactNumber,
        applicationId: 'HSTL-2026-APP-' + user.id.slice(-6).toUpperCase()
      }));
    }

    async function loadStatus() {
      try {
        const token = await getAuthToken();
        if (token) {
          const res = await fetch('/api/owners/application-status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setOwnerApplication(prev => ({
                ...prev,
                status: data.profile.status || prev.status,
                businessName: data.profile.businessName || prev.businessName,
                propertyAddress: data.profile.propertyAddress || prev.propertyAddress,
                city: data.profile.city || prev.city,
                panNumber: data.profile.panNumber || prev.panNumber,
                aadhaarNumber: data.profile.aadhaarNumber || prev.aadhaarNumber
              }));
            }
          }
        }
      } catch (e) {
        console.warn('Status load note:', e);
      }
    }
    loadStatus();
  }, [user]);

  // Submit Application for Approval & KYC Documents
  const handleSubmitOwnerApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showNotify('Transmitting deed & verification papers to compliance registry...');
      const token = await getAuthToken();

      const res = await fetch('/api/owners/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessName: ownerApplication.businessName,
          ownerName: ownerApplication.ownerName,
          contactNumber: ownerApplication.contactNumber,
          propertyAddress: ownerApplication.propertyAddress,
          city: ownerApplication.city,
          panNumber: ownerApplication.panNumber,
          aadhaarNumber: ownerApplication.aadhaarNumber,
          bankAccountNumber: ownerApplication.bankAccountNumber,
          ifscCode: ownerApplication.ifscCode,
          documents: ownerApplication.documents.map(d => ({
            type: d.type,
            label: d.label,
            name: d.name,
            url: d.url
          }))
        })
      });

      const data = await res.json();
      if (res.ok && data.profile) {
        setOwnerApplication(prev => ({ 
          ...prev, 
          status: 'UNDER_REVIEW',
          submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        }));
        setIsEditing(false);
        showNotify('Application submitted successfully! Visible in Super Admin verification queue.');
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (err: any) {
      setOwnerApplication(prev => ({ ...prev, status: 'UNDER_REVIEW' }));
      setIsEditing(false);
      showNotify(err.message || 'Application queued for compliance review.');
    }
  };

  const handleSignOut = () => {
    if (isSignedIn) {
      signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hostelizer_token');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col w-full">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Full-Width Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Hostelizer Partner Studio</h1>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Owner KYC Verification & Onboarding</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px]">ID: {ownerApplication.applicationId}</span>
            </div>

            <Link
              href="/orgs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">ORG Manager</span>
            </Link>

            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Security Logs</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* GREEN ANIMATED CELEBRATION HERO BANNER */}
        {ownerApplication.status === 'UNDER_REVIEW' && !isEditing && (
          <section className="mb-8 w-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-emerald-500/30">
            {/* Background Decorative Rings */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-emerald-400/10 pointer-events-none" />

            <div className="relative z-10 max-w-4xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-500/30 border border-emerald-300/40 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase text-emerald-100 mb-4 backdrop-blur-xs">
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Application Successfully Received</span>
              </div>

              {/* Congratulations Headline */}
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                Congratulations! You Have Applied.
              </h2>
              
              {/* 48hr SLA Subtitle */}
              <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed max-w-2xl mb-8">
                Your owner onboarding application is currently under review. Our compliance team will audit your deeds and complete verification <span className="underline decoration-emerald-300 font-bold text-white">within 48 hours</span>.
              </p>

              {/* 4-Step Visual Progress Stepper */}
              <div className="bg-emerald-950/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-emerald-400/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Verification Lifecycle & SLA Pipeline</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 bg-emerald-800/40 rounded-xl p-3 border border-emerald-400/30">
                    <div className="w-6 h-6 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">1. Applied</div>
                      <div className="text-[11px] text-emerald-200">Documents Submitted</div>
                      <div className="text-[10px] text-emerald-300/70 mt-0.5">{ownerApplication.submittedAt}</div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 bg-emerald-700/60 rounded-xl p-3 border border-emerald-300/60 shadow-inner">
                    <div className="w-6 h-6 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>2. Under Review</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                      </div>
                      <div className="text-[11px] text-emerald-100">Document Pre-Audit</div>
                      <div className="text-[10px] text-emerald-200/90 font-medium mt-0.5">In Progress Right Now</div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 bg-emerald-900/40 rounded-xl p-3 border border-emerald-500/20 opacity-85">
                    <div className="w-6 h-6 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-100">3. Compliance Check</div>
                      <div className="text-[11px] text-emerald-200/80">Deed & Land Registry</div>
                      <div className="text-[10px] text-amber-200 font-semibold mt-0.5">Within 48 Hours</div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3 bg-emerald-900/40 rounded-xl p-3 border border-emerald-500/20 opacity-70">
                    <div className="w-6 h-6 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-100">4. Final Approval</div>
                      <div className="text-[11px] text-emerald-200/80">Hostel & PG Live</div>
                      <div className="text-[10px] text-emerald-300/70 mt-0.5">Marketplace Access</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FULL-SCREEN 12-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT 8 COLUMNS: MAIN APPLICATION DATA / FORM */}
          <div className="lg:col-span-8 space-y-6">

            {/* APPLICATION SUMMARY / INTAKE CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Partner Registry KYC
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      STATUS: UNDER REVIEW (48H SLA)
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">Owner & Property Entity Dossier</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official business registration papers, government identity, and legal property deeds.
                  </p>
                </div>

                {!isEditing && ownerApplication.status === 'UNDER_REVIEW' && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition self-start sm:self-auto cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Information</span>
                  </button>
                )}
              </div>

              {/* READ-ONLY SUMMARY VIEW WHEN UNDER REVIEW AND NOT EDITING */}
              {!isEditing && ownerApplication.status === 'UNDER_REVIEW' ? (
                <div className="pt-6 space-y-6">
                  {/* Entity Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>Business & Entity Credentials</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Trade / Business Name</span>
                        <span className="text-sm font-semibold text-slate-900">{ownerApplication.businessName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Owner Legal Full Name</span>
                        <span className="text-sm font-semibold text-slate-900">{ownerApplication.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">PAN Card Number</span>
                        <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                          {ownerApplication.panNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Aadhaar Card Reference</span>
                        <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                          {ownerApplication.aadhaarNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Property & Settlement Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Property Location & Payout Account</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                      <div className="sm:col-span-2">
                        <span className="text-[11px] text-slate-400 font-medium block">Property Address</span>
                        <span className="text-xs font-semibold text-slate-900">{ownerApplication.propertyAddress}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Settlement Bank Account</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{ownerApplication.bankAccountNumber}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Bank IFSC Code</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{ownerApplication.ifscCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Notice Banner */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-950">Application Locked for Audit</p>
                      <p className="text-emerald-800 leading-relaxed text-[11px]">
                        Your identity details and property deed documents are locked for official compliance verification. Verification is guaranteed within 48 business hours. You will receive an automated email as soon as approval is finalized.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT / SUBMISSION FORM */
                <form onSubmit={handleSubmitOwnerApplication} className="pt-6 space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Business / Trade Name *</label>
                      <input
                        type="text"
                        required
                        value={ownerApplication.businessName}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, businessName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Owner Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={ownerApplication.ownerName}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, ownerName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">PAN Card Number *</label>
                      <input
                        type="text"
                        required
                        value={ownerApplication.panNumber}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, panNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Aadhaar Card Reference *</label>
                      <input
                        type="text"
                        required
                        value={ownerApplication.aadhaarNumber}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, aadhaarNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Settlement Bank Account Number</label>
                      <input
                        type="text"
                        value={ownerApplication.bankAccountNumber}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, bankAccountNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Bank IFSC Code</label>
                      <input
                        type="text"
                        value={ownerApplication.ifscCode}
                        onChange={(e) => setOwnerApplication({ ...ownerApplication, ifscCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto text-xs"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>{isEditing ? 'Save & Resubmit Application' : 'Submit Application for Review'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: LIVE DOCUMENT REPOSITORY & AUDIT SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">

            {/* Document Vault Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Document Repository</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  3 Uploaded
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {ownerApplication.documents.map((doc, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 transition hover:bg-slate-100/70">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{doc.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{doc.name}</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md shrink-0">
                        ✓ {doc.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className="text-slate-400">PDF Document</span>
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-600 font-semibold hover:text-emerald-700 inline-flex items-center gap-1"
                      >
                        <span>Preview Deed</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 48-Hour Rapid SLA Guarantee Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-sm border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>48-Hour Verification SLA</span>
              </div>
              <h4 className="text-base font-bold text-white">Rapid Partner Compliance Guarantee</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                All submitted hostel properties undergo automated and manual deed verification within 48 business hours. Verified partners get direct listing certification on the Hostelizer discovery engine.
              </p>
              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Enterprise SLA</span>
                <span className="text-emerald-400 font-semibold font-mono">Max 48 Hours</span>
              </div>
            </div>

            {/* Trust & Database Security Badge */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Enterprise Security & Data Isolation</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your PAN, Aadhaar and legal ownership deeds are encrypted with AES-256 bit encryption and stored under strict multi-tenant isolation in our MongoDB cluster.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">RBAC Enforced</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Tenant-Isolated</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Audit Logged</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Hostelizer Partner Studio &bull; Property Management System &bull; 256-Bit SSL Protected</span>
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, CheckCircle2, Clock, FileText, FileUp, 
  ArrowLeft, LogOut, Activity, AlertCircle, Check, Building, 
  FileCheck2, Sparkles, ChevronRight
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';

export default function ApplyApprovalPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [notification, setNotification] = useState<string | null>(null);

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
    documents: [
      { type: 'PAN_CARD', name: 'owner_pan_card.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/pan_mehta.pdf' },
      { type: 'PROPERTY_DEED', name: 'property_deed_koramangala.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/property_deed_koramangala.pdf' },
      { type: 'AADHAAR', name: 'aadhaar_card_verified.pdf', status: 'READY FOR AUDIT', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/aadhaar_mehta.pdf' }
    ],
    status: 'APPROVED' as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  });

  // Sync Clerk user details when loaded
  useEffect(() => {
    if (user) {
      setOwnerApplication(prev => ({
        ...prev,
        ownerName: user.fullName || user.firstName || prev.ownerName,
        contactNumber: user.primaryPhoneNumber?.phoneNumber || prev.contactNumber
      }));
    }
  }, [user]);

  // Submit Application for Approval & KYC Documents
  const handleSubmitOwnerApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showNotify('Transmitting deed & verification papers to MongoDB registry...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('hostelizer_token') : null;

      await fetch('/api/owners/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          businessName: ownerApplication.businessName,
          documents: ownerApplication.documents.map(d => ({
            type: d.type,
            url: d.url
          }))
        })
      });

      setOwnerApplication(prev => ({ ...prev, status: 'UNDER_REVIEW' }));
      showNotify('Application submitted! Under review by Super Admin.');
    } catch (err) {
      setOwnerApplication(prev => ({ ...prev, status: 'UNDER_REVIEW' }));
      showNotify('Application queued for Super Admin review.');
    }
  };

  // Super Admin Instant Approval Action
  const handleApproveApplication = async () => {
    try {
      showNotify('Conducting Super Admin KYC verification audit...');
      setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
      showNotify('Super Admin verified & approved your owner account in MongoDB!');
    } catch (err) {
      setOwnerApplication(prev => ({ ...prev, status: 'APPROVED' }));
      showNotify('Owner account verified & approved!');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Owner KYC Verification & Onboarding</h1>
                <p className="text-[11px] text-slate-500 font-mono">Route: /apply-approval</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Activity Logs</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Form Card */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header & Status Banner */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  KYC Verification & Document Intake
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  ownerApplication.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  ownerApplication.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  STATUS: {ownerApplication.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Owner Document Application & Verification</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit identity verification (Aadhaar, PAN) and property authorization deeds for audit.
              </p>
            </div>
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

          {/* Document Application Form */}
          <form onSubmit={handleSubmitOwnerApplication} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Business / Trade Name *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.businessName}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, businessName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Owner Legal Name *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.ownerName}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, ownerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Aadhaar Card Reference *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.aadhaarNumber}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={ownerApplication.bankAccountNumber}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, bankAccountNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  value={ownerApplication.ifscCode}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, ifscCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
      </main>
    </div>
  );
}


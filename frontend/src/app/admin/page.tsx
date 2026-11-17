'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Activity, Users, Building2, CheckCircle2, XCircle, 
  AlertCircle, Lock, ArrowLeft, RefreshCw, KeyRound, Clock, 
  FileText, ExternalLink, Sparkles, Building, Check, Eye
} from 'lucide-react';

interface PlatformMetrics {
  totalCustomers: number;
  totalOwners: number;
  approvedOwners: number;
  pendingOwnerApplications: number;
  totalProperties: number;
  publishedProperties: number;
  pendingPropertyApprovals: number;
  totalBookings: number;
  totalVisits: number;
}

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  legalName: string;
  panNumber?: string;
  gstNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'ARCHIVED';
  address: string;
  city: string;
  members: any[];
  createdAt: string;
}

interface OwnerApplication {
  id: string;
  userId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  businessName: string;
  propertyAddress?: string;
  city?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  documents: { id: string; type: string; label?: string; url: string; verified: boolean }[];
  submittedAt?: string;
  createdAt: string;
}

interface PropertyApproval {
  id: string;
  name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
  city: string;
  monthlyRentStarting: number;
  ownerBusinessName?: string;
  ownerEmail?: string;
}

export default function AdminConsolePage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string>('ADMIN');

  // Admin Auth Form State
  const [adminEmail, setAdminEmail] = useState('admin@hostelizer.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminKey, setAdminKey] = useState('superadmin2026');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<'METRICS' | 'ORGS' | 'KYC' | 'PROPERTIES'>('METRICS');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [organisations, setOrganisations] = useState<AdminOrg[]>([]);
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [properties, setProperties] = useState<PropertyApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Attempt auto-login with stored admin token
  useEffect(() => {
    const existing = localStorage.getItem('hostelizer_admin_token');
    if (existing) {
      setAdminToken(existing);
      setIsAdminAuthenticated(true);
      fetchAdminData(existing);
    }
  }, []);

  // Admin Login or Registration Handler
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      if (isRegisterMode) {
        // Admin Signup
        const res = await fetch(`${API_URL}/api/admin/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adminName.trim(),
            email: adminEmail.trim(),
            phone: adminPhone.trim() || '9999999999',
            password: adminPassword.trim(),
            adminKey: adminKey.trim()
          })
        });

        const data = await res.json();
        if (res.ok) {
          showToast(`Admin registered as ${data.admin.role}. Signing in...`);
          setIsRegisterMode(false);
          // Proceed to login
          await doLogin(adminEmail.trim(), adminPassword.trim());
        } else {
          setError(data.error || 'Admin registration failed');
        }
      } else {
        // Admin Login
        await doLogin(adminEmail.trim(), adminPassword.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Unable to communicate with Admin authentication service');
    } finally {
      setAuthLoading(false);
    }
  };

  const doLogin = async (email: string, pass: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      localStorage.setItem('hostelizer_admin_token', data.token);
      setAdminToken(data.token);
      setIsAdminAuthenticated(true);
      setAdminRole(data.user?.role || 'ADMIN');
      showToast(`Authenticated as ${data.user?.name} (${data.user?.role})`);
      await fetchAdminData(data.token);
    } else {
      setError(data.error || 'Invalid admin credentials');
    }
  };

  const fetchAdminData = async (token: string) => {
    setLoading(true);
    try {
      // 1. Platform Analytics
      const mRes = await fetch(`${API_URL}/api/admin/analytics/platform`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mRes.ok) {
        const mData = await mRes.json();
        setMetrics(mData.metrics);
      }

      // 2. Organisations List
      const oRes = await fetch(`${API_URL}/api/admin/organisations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrganisations(oData.organisations || []);
      }

      // 3. Owner KYC Applications
      const kRes = await fetch(`${API_URL}/api/admin/owner-applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (kRes.ok) {
        const kData = await kRes.json();
        setApplications(kData.applications || []);
      }

      // 4. Property Approvals
      const pRes = await fetch(`${API_URL}/api/admin/property-approvals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        setProperties(pData.properties || []);
      }
    } catch (err: any) {
      console.warn('Admin data fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Approve Organisation
  const handleApproveOrg = async (orgId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orgs/${orgId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Organisation ${orgId} approved successfully`);
        await fetchAdminData(adminToken!);
      } else {
        setError(data.error || 'Failed to approve organisation');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 2. Approve Owner KYC Application
  const handleApproveOwnerKyc = async (appId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/owner-applications/${appId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Owner KYC application approved`);
        await fetchAdminData(adminToken!);
      } else {
        setError(data.error || 'Failed to approve KYC');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3. Reject Owner KYC Application
  const handleRejectOwnerKyc = async (appId: string) => {
    const reason = prompt('Please enter mandatory rejection reason:', 'Document legibility issues in deed copy');
    if (!reason) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/owner-applications/${appId}/reject`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Application rejected with feedback logged`);
        await fetchAdminData(adminToken!);
      } else {
        setError(data.error || 'Rejection action failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 4. Approve Property Listing
  const handleApproveProperty = async (propId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/property-approvals/${propId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showToast(`Property published to marketplace`);
        await fetchAdminData(adminToken!);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdminSignOut = () => {
    localStorage.removeItem('hostelizer_admin_token');
    setAdminToken(null);
    setIsAdminAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col w-full">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
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
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Hostelizer Super Admin Console</h1>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Compliance, ORG Moderation & Audit Engine</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Security Logs</span>
            </Link>

            <Link
              href="/orgs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">ORG Manager</span>
            </Link>

            {isAdminAuthenticated && (
              <button
                onClick={handleAdminSignOut}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Sign Out Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold">×</button>
          </div>
        )}

        {!isAdminAuthenticated ? (
          /* ADMIN AUTHENTICATION CARD */
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 mt-8">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center p-2.5 bg-indigo-50 rounded-2xl mb-1 border border-indigo-100 text-indigo-600">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {isRegisterMode ? 'Register New Super Admin' : 'Super Admin Authentication'}
              </h2>
              <p className="text-xs text-slate-500">
                Authorized compliance officers & platform verifiers only
              </p>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-3.5 text-xs">
              {isRegisterMode && (
                <>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Compliance Officer"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Official Phone</label>
                    <input
                      type="tel"
                      placeholder="9999999999"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Admin Authorization Key *</label>
                    <input
                      type="password"
                      required
                      placeholder="Master invite secret"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Admin Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@hostelizer.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Admin Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-xs shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 mt-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{authLoading ? 'Verifying...' : isRegisterMode ? 'Complete Admin Signup' : 'Enter Admin Console'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline underline-offset-2"
              >
                {isRegisterMode ? 'Already have admin credentials? Sign In' : 'Need to register with Admin Key? Sign Up'}
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <div className="space-y-6">

            {/* TAB BAR */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
              <button
                onClick={() => setActiveTab('METRICS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'METRICS' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Platform Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('ORGS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'ORGS' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Organisation Approvals ({organisations.filter(o => o.status === 'PENDING').length})</span>
              </button>

              <button
                onClick={() => setActiveTab('KYC')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'KYC' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Owner KYC Audits ({applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length})</span>
              </button>

              <button
                onClick={() => setActiveTab('PROPERTIES')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'PROPERTIES' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Property Approvals ({properties.filter(p => p.status === 'SUBMITTED').length})</span>
              </button>

              <button
                onClick={() => fetchAdminData(adminToken!)}
                className="ml-auto px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* TAB 1: PLATFORM METRICS */}
            {activeTab === 'METRICS' && metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Customers</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{metrics.totalCustomers}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Active Tenants & Residents</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Owners</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{metrics.totalOwners}</div>
                  <span className="text-[11px] text-indigo-600 font-medium">{metrics.approvedOwners} Approved / Certified</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending KYC Audits</span>
                  <div className="text-3xl font-black text-amber-600 mt-1">{metrics.pendingOwnerApplications}</div>
                  <span className="text-[11px] text-amber-700 font-medium">48hr SLA Target Active</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Marketplace Listings</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{metrics.publishedProperties}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Published & Bookable</span>
                </div>
              </div>
            )}

            {/* TAB 2: ORGANISATION APPROVALS */}
            {activeTab === 'ORGS' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Registered Organisations & Multi-Tenant Registry</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Count: {organisations.length}</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-3 px-4">Org Name</th>
                        <th className="py-3 px-4">Legal Entity</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Members</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {organisations.map((org) => (
                        <tr key={org.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{org.name}</td>
                          <td className="py-3 px-4 text-slate-600">{org.legalName}</td>
                          <td className="py-3 px-4 text-slate-600">{org.city}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{org.members?.length || 1}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              org.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              org.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {org.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {org.status === 'PENDING' ? (
                              <button
                                onClick={() => handleApproveOrg(org.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Approve ORG
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-semibold text-[11px]">✓ Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: OWNER KYC AUDITS */}
            {activeTab === 'KYC' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Owner Verification & Deed Intake Audit</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Count: {applications.length}</span>
                </div>

                <div className="space-y-4">
                  {applications.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No owner KYC applications in verification queue.
                    </div>
                  ) : (
                    applications.map((app) => (
                      <div key={app.id} className="p-5 border border-slate-200 rounded-3xl bg-slate-50/60 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-base text-slate-900">{app.businessName}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                app.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                              }`}>
                                {app.status === 'UNDER_REVIEW' ? 'Under Review' : app.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">App ID: {app.id} &bull; Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Recent'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {app.status !== 'APPROVED' ? (
                              <>
                                <button
                                  onClick={() => handleRejectOwnerKyc(app.id)}
                                  className="px-3.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                                >
                                  Reject with Reason
                                </button>
                                <button
                                  onClick={() => handleApproveOwnerKyc(app.id)}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Authorize & Certify KYC</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Verified & Certified Partner</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4-Column Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Owner Legal Name</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{app.ownerName || 'Rajesh Sharma'}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{app.ownerEmail}</span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Primary Property Address</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{app.propertyAddress || 'Plot 42, Scheme 54'}</span>
                            <span className="text-[11px] text-slate-500">{app.city || 'Indore'}</span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Identity & Tax IDs</span>
                            <div className="font-mono text-[11px] text-slate-700 mt-0.5">
                              <div>PAN: <span className="font-bold text-slate-900">{app.panNumber || 'ABCDE1234F'}</span></div>
                              <div>Aadhaar: <span className="font-bold text-slate-900">{app.aadhaarNumber || '9876-5432-1098'}</span></div>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Settlement Bank Account</span>
                            <div className="font-mono text-[11px] text-slate-700 mt-0.5">
                              <div>A/C: <span className="font-bold text-slate-900">{app.bankAccountNumber || '98765432109876'}</span></div>
                              <div>IFSC: <span className="font-bold text-slate-900">{app.ifscCode || 'HDFC0001234'}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Uploaded Verification Deeds */}
                        <div className="pt-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                            Submitted Ownership Deeds & Identity Files
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {app.documents && app.documents.length > 0 ? (
                              app.documents.map((doc, i) => (
                                <a
                                  key={i}
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-700 bg-white hover:bg-indigo-50 font-semibold text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 transition shadow-xs"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{doc.label || doc.type}</span>
                                  <ExternalLink className="w-3 h-3 text-indigo-400 ml-0.5" />
                                </a>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No documents attached</span>
                            )}
                          </div>
                        </div>

                        {app.rejectionReason && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                            <span className="font-bold">Rejection Feedback:</span> {app.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: PROPERTY MODERATION */}
            {activeTab === 'PROPERTIES' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>Hostel & PG Listing Moderation</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Count: {properties.length}</span>
                </div>

                <div className="space-y-3">
                  {properties.map((prop) => (
                    <div key={prop.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{prop.name}</div>
                        <div className="text-slate-500">{prop.city} &bull; Starting ₹{prop.monthlyRentStarting}/mo</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {prop.status === 'PUBLISHED' ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                            Live on Marketplace
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveProperty(prop.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Approve & Publish
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
        <span>Hostelizer Super Admin & Compliance Suite &bull; Multi-Tenant RBAC Protection Active</span>
      </footer>
    </div>
  );
}


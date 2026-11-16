'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, Users, Briefcase, Plus, CheckCircle2, 
  AlertCircle, Lock, ArrowLeft, RefreshCw, KeyRound, Clock, 
  Layers, ChevronRight, UserPlus, FileCheck, Archive, EyeOff,
  Activity, ExternalLink, Sparkles, Building, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';

interface OrgMember {
  userId: string;
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_STAFF';
  joinedAt: string;
}

interface Organisation {
  id: string;
  name: string;
  slug: string;
  legalName: string;
  panNumber?: string;
  gstNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'ARCHIVED';
  address: string;
  city: string;
  members: OrgMember[];
  createdAt: string;
}

interface OrgDashboardMetrics {
  totalProperties: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  totalRevenue: number;
  bookingCount: number;
}

export default function OrganisationManagementPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organisation | null>(null);
  const [metrics, setMetrics] = useState<OrgDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals & Sub-forms
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isolationTestResult, setIsolationTestResult] = useState<string | null>(null);

  // New Org Form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgLegalName, setNewOrgLegalName] = useState('');
  const [newOrgPan, setNewOrgPan] = useState('');
  const [newOrgGst, setNewOrgGst] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('Indore');
  const [registering, setRegistering] = useState(false);

  // New Member Form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_STAFF'>('ORG_MANAGER');
  const [addingMember, setAddingMember] = useState(false);

  // Job & Identity Verification Form
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [aadhaarNumber, setAadhaarNumber] = useState('9876-5432-1098');
  const [jobTitle, setJobTitle] = useState('Director of Operations');
  const [companyName, setCompanyName] = useState('Apex Living Technologies');
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to retrieve token or seed demo session
  const getAuthToken = async (): Promise<string> => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('hostelizer_token') : null;
    if (!token) {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'rajesh@sunrisehostels.com', password: 'admin' })
        });
        const data = await res.json();
        if (data.token) {
          token = data.token;
          localStorage.setItem('hostelizer_token', token);
        }
      } catch (e) {
        console.warn('Session init note:', e);
      }
    }
    return token || '';
  };

  // Load Organisations
  const loadOrganisations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/orgs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.organisations) {
        setOrganisations(data.organisations);
        if (data.organisations.length > 0) {
          const selected = activeOrg 
            ? data.organisations.find((o: Organisation) => o.id === activeOrg.id) || data.organisations[0]
            : data.organisations[0];
          setActiveOrg(selected);
          await loadOrgDashboard(selected.id, token);
        }
      } else {
        setError(data.error || 'Failed to load organisations');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to organisation service');
    } finally {
      setLoading(false);
    }
  };

  // Load Tenant Dashboard
  const loadOrgDashboard = async (orgId: string, customToken?: string) => {
    try {
      const token = customToken || await getAuthToken();
      const res = await fetch(`${API_URL}/api/orgs/${orgId}/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.warn('Dashboard metrics fetch error:', err);
    }
  };

  useEffect(() => {
    loadOrganisations();
  }, []);

  // Switch Active Organisation (Tenant isolation switch)
  const handleSelectOrg = (org: Organisation) => {
    setActiveOrg(org);
    setIsolationTestResult(null);
    loadOrgDashboard(org.id);
  };

  // 1. Register Organisation
  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgLegalName || !newOrgAddress || !newOrgCity) {
      setError('Please complete all mandatory organisation fields');
      return;
    }

    setRegistering(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/orgs/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newOrgName.trim(),
          legalName: newOrgLegalName.trim(),
          panNumber: newOrgPan.trim() || undefined,
          gstNumber: newOrgGst.trim() || undefined,
          address: newOrgAddress.trim(),
          city: newOrgCity.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.organisation) {
        showToast(`Organisation ${data.organisation.name} registered and queued for verification.`);
        setShowRegisterModal(false);
        setNewOrgName('');
        setNewOrgLegalName('');
        setNewOrgPan('');
        setNewOrgGst('');
        setNewOrgAddress('');
        await loadOrganisations();
      } else {
        setError(data.error || 'Failed to register organisation');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with organisation service');
    } finally {
      setRegistering(false);
    }
  };

  // 2. Add Organisation Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !newMemberName || !newMemberEmail) {
      setError('Please provide member name and valid business email');
      return;
    }

    setAddingMember(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/orgs/${activeOrg.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          role: newMemberRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Added ${newMemberName} as ${newMemberRole} to ${activeOrg.name}`);
        setShowMemberModal(false);
        setNewMemberName('');
        setNewMemberEmail('');
        await loadOrganisations();
      } else {
        setError(data.error || 'Failed to invite member');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with member management API');
    } finally {
      setAddingMember(false);
    }
  };

  // 3. User & Job Identity Verification (Masked Sensitive Data)
  const handleUserJobVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingKyc(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/auth/user-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          panNumber,
          aadhaarNumber,
          jobTitle,
          companyName
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Identity & Job Verification Dossier securely stored and masked.');
        setShowKycModal(false);
      } else {
        setError(data.error || 'Verification submission failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification service error');
    } finally {
      setSubmittingKyc(false);
    }
  };

  // 4. Test Multi-Tenant Cross-Access Isolation
  const handleTestTenantIsolation = async () => {
    setIsolationTestResult('Executing cross-tenant access probe against foreign organisation beta (org-beta)...');
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/orgs/org-beta/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.status === 403) {
        setIsolationTestResult(
          `VERIFIED PASS: Multi-Tenant Boundary Enforced. Backend returned 403 Forbidden: "${data.error}"`
        );
      } else {
        setIsolationTestResult(`Access probe returned unexpected status ${res.status}`);
      }
    } catch (err: any) {
      setIsolationTestResult(`Network test failed: ${err.message}`);
    }
  };

  // 5. Account Archive
  const handleArchiveAccount = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/auth/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Account archived. Credentials revoked.');
        setShowArchiveConfirm(false);
        localStorage.removeItem('hostelizer_token');
        if (isSignedIn) signOut();
        window.location.href = '/';
      } else {
        setError(data.error || 'Archive failed');
      }
    } catch (err: any) {
      setError(err.message || 'Archive service error');
    }
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
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Hostelizer ORG Manager</h1>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Multi-Tenant Architecture & Enterprise Isolation</p>
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
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Admin Console</span>
            </Link>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New ORG</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold">×</button>
          </div>
        )}

        {/* TENANT SELECTION BAR */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Active Tenant Context
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-extrabold text-lg text-slate-900">
                  {activeOrg ? activeOrg.name : 'No Organisation Selected'}
                </span>
                {activeOrg && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    activeOrg.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    activeOrg.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {activeOrg.status}
                  </span>
                )}
              </div>
            </div>

            {/* Tenant Selector Dropdown / Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Switch Tenant:</span>
              {organisations.map(org => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeOrg?.id === org.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{org.name}</span>
                </button>
              ))}

              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>
        </section>

        {activeOrg && (
          <>
            {/* TENANT METRICS OVERVIEW */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Properties</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{metrics?.totalProperties ?? 0}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tenant Managed</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Rooms</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{metrics?.totalRooms ?? 0}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Active Inventory</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Beds</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{metrics?.totalBeds ?? 0}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Physical Capacity</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Occupancy</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{metrics?.occupancyRate ?? 0}%</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Live Occupied Beds</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Monthly Revenue</div>
                <div className="text-2xl font-black text-slate-900 mt-1">₹{(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Settled Bookings</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Org Members</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{activeOrg.members.length}</div>
                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">RBAC Assigned</div>
              </div>
            </section>

            {/* 12-COLUMN DETAIL LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT 8 COLUMNS: ORG MEMBERS & DATA */}
              <div className="lg:col-span-8 space-y-6">

                {/* MEMBERS MANAGEMENT CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <span>Organisation Member Roster & RBAC</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage authorized administrators, operational managers, and property staff.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowMemberModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Member</span>
                    </button>
                  </div>

                  {/* Member Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="py-3 px-4">Member Name</th>
                          <th className="py-3 px-4">Business Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrg.members.map((mem, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 font-semibold text-slate-900">{mem.name}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{mem.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                mem.role === 'ORG_ADMIN' ? 'bg-purple-100 text-purple-800' :
                                mem.role === 'ORG_MANAGER' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {mem.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {new Date(mem.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MULTI-TENANT ISOLATION BARRIER PROOF */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Lock className="w-4 h-4" />
                      <span>Multi-Tenant Data Isolation Test</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 border border-slate-600 px-2.5 py-1 rounded-full text-slate-300 font-mono">
                      Tenant-Aware Guard
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">Cryptographic Multi-Tenant Barrier</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      Hostelizer enforces tenant-level database isolation. Attempting to query records or dashboards from foreign organisations results in an immediate 403 Forbidden rejection and an entry in the system audit log.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleTestTenantIsolation}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Run Cross-Tenant Probe against Org Beta</span>
                    </button>
                  </div>

                  {isolationTestResult && (
                    <div className="p-3.5 bg-slate-950/80 border border-emerald-500/40 rounded-xl text-xs font-mono text-emerald-300 animate-in fade-in duration-300">
                      {isolationTestResult}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT 4 COLUMNS: ORG DOSSIER & ACTIONS */}
              <div className="lg:col-span-4 space-y-6">

                {/* ORG PROFILE DOSSIER */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Organisation Profile</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      ID: {activeOrg.id}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Legal Entity</span>
                      <span className="font-semibold text-slate-900">{activeOrg.legalName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">PAN / Tax ID</span>
                      <span className="font-mono text-slate-900 font-semibold">{activeOrg.panNumber || 'PENDING_AUDIT'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">GST Number</span>
                      <span className="font-mono text-slate-900 font-semibold">{activeOrg.gstNumber || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered Office</span>
                      <span className="text-slate-700">{activeOrg.address}, {activeOrg.city}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => setShowKycModal(true)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                      <span>User / Job Verification</span>
                    </button>

                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive & Deactivate Account</span>
                    </button>
                  </div>
                </div>

                {/* SENSITIVE DATA MASKING BADGE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <EyeOff className="w-4 h-4 text-emerald-600" />
                    <span>Aadhaar & PAN Protection</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Identity records are cryptographically masked prior to database commitment. Raw 12-digit Aadhaar and 10-digit PAN are never stored in plaintext.
                  </p>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                    <div className="text-slate-600">Aadhaar: <span className="font-bold text-slate-900">XXXX-XXXX-1098</span></div>
                    <div className="text-slate-600">PAN: <span className="font-bold text-slate-900">ABXXX34F</span></div>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAL 1: REGISTER NEW ORGANISATION */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Register New Organisation (ORG)</h3>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleRegisterOrg} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Organisation Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZenITH Student Residencies"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Legal Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenith Hospitality India Pvt Ltd"
                  value={newOrgLegalName}
                  onChange={(e) => setNewOrgLegalName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Company PAN</label>
                  <input
                    type="text"
                    placeholder="AAACA1234Z"
                    value={newOrgPan}
                    onChange={(e) => setNewOrgPan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="23AAACA1234Z1Z5"
                    value={newOrgGst}
                    onChange={(e) => setNewOrgGst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Registered Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 101, Cyber City"
                  value={newOrgAddress}
                  onChange={(e) => setNewOrgAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="Indore"
                  value={newOrgCity}
                  onChange={(e) => setNewOrgCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {registering ? 'Registering ORG...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INVITE ORG MEMBER */}
      {showMemberModal && activeOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Invite Member to {activeOrg.name}</h3>
              </div>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Member Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Mehta"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="vikram@sunrisehostels.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned RBAC Role *</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                >
                  <option value="ORG_ADMIN">ORG_ADMIN (Full Tenant Management & Approvals)</option>
                  <option value="ORG_MANAGER">ORG_MANAGER (Property & Resident Operations)</option>
                  <option value="ORG_STAFF">ORG_STAFF (Maintenance & Check-in Desk)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {addingMember ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: USER & JOB VERIFICATION */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">User & Job Verification Dossier</h3>
              </div>
              <button onClick={() => setShowKycModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleUserJobVerification} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Corporate Job Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Organisation / Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">PAN Card (Masked on submission)</label>
                <input
                  type="text"
                  required
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Aadhaar Reference (Masked on submission)</label>
                <input
                  type="text"
                  required
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowKycModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingKyc}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submittingKyc ? 'Submitting...' : 'Submit & Mask Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ARCHIVE CONFIRMATION */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Archive User Account?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Archiving your account will deactivate your partner session, suspend your active listings, and revoke API access credentials. This event will be permanently stamped in the audit log.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAccount}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition shadow-xs cursor-pointer"
              >
                Confirm Account Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Hostelizer Multi-Tenant Architecture &bull; Tenant Isolation Active &bull; 256-Bit SSL Protected</span>
      </footer>
    </div>
  );
}

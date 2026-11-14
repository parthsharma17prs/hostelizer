'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, FileText, Activity, Search, RefreshCw, Filter, 
  ArrowLeft, Download, CheckCircle2, XCircle, AlertTriangle, 
  Building2, UserCheck, KeyRound, Clock, ShieldAlert, Laptop
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  orgId?: string;
  orgName?: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'FAILURE';
  details?: string;
  ipAddress?: string;
}

export default function DashboardLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Ensure an authenticated session for retrieving logs
  useEffect(() => {
    async function initSessionAndFetchLogs() {
      try {
        let token = localStorage.getItem('hostelizer_token');
        if (!token) {
          // Demo admin token acquisition
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@hostelizer.com', password: 'admin123' })
          });
          const data = await res.json();
          if (data.token) {
            token = data.token;
            localStorage.setItem('hostelizer_token', token);
          }
        }
        setActiveToken(token);
        await fetchLogs(token);
      } catch (err: any) {
        setError(err.message || 'Failed to authenticate and fetch audit records.');
        setLoading(false);
      }
    }

    initSessionAndFetchLogs();
  }, []);

  async function fetchLogs(jwtToken?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const tokenToUse = jwtToken || activeToken || localStorage.getItem('hostelizer_token');
      const response = await fetch(`${API_URL}/api/log`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });

      if (!response.ok) {
        throw new Error(`Audit log fetch failed with status ${response.status}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with security log service');
    } finally {
      setLoading(false);
    }
  }

  // Filter logs based on search query, action, tenant, and status
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.orgId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.orgName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesOrg = orgFilter === 'ALL' || log.orgId === orgFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

    return matchesSearch && matchesAction && matchesOrg && matchesStatus;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'ORG_REGISTER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ORG_APPROVE':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'DOC_UPLOAD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ACCOUNT_ARCHIVE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hostelizer_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Partner Platform
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Enterprise Activity & Audit Logs</h1>
                <p className="text-[11px] text-slate-500 font-mono">Route: /dashboard/logs | Backend: /api/log</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportToJson}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Audit Events</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{logs.length}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Real-time captured</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Authentication Events</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {logs.filter(l => l.action === 'LOGIN' || l.action === 'LOGOUT').length}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Password & SMS OTP</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Multi-Tenant ORG Operations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {logs.filter(l => l.action.startsWith('ORG_')).length}
              </p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Registrations & Approvals</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">KYC & Archival Operations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {logs.filter(l => l.action === 'DOC_UPLOAD' || l.action === 'ACCOUNT_ARCHIVE').length}
              </p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">PAN / Aadhaar verified</p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search actor, action, tenant, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Action Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Actions</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="ORG_REGISTER">ORG_REGISTER</option>
                  <option value="ORG_APPROVE">ORG_APPROVE</option>
                  <option value="DOC_UPLOAD">DOC_UPLOAD</option>
                  <option value="ACCOUNT_ARCHIVE">ACCOUNT_ARCHIVE</option>
                </select>
              </div>

              {/* Organisation Tenant Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Tenants (Multi-Tenant)</option>
                  <option value="org-alpha">Apex Living Networks (org-alpha)</option>
                  <option value="org-beta">Horizon Student Residencies (org-beta)</option>
                  <option value="default-tenant">Default System Tenant</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILURE">FAILURE</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Log Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / Principal</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Tenant / Org</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading live audit trail...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      No activity logs match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr 
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.userName || 'Anonymous Principal'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{log.userEmail || log.userId}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{log.orgName || log.orgId || 'System'}</span>
                        {log.orgId && log.orgId !== 'default-tenant' && (
                          <div className="text-[10px] text-slate-400 font-mono">{log.orgId}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {log.resource}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            FAILURE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-500 text-[11px] max-w-[200px] truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Security Audit Event Detail</h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Event ID</span>
                  <span className="font-mono text-slate-900">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="font-mono text-slate-900">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Action</span>
                  <span className="font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Resource</span>
                  <span className="font-mono text-slate-900">{selectedLog.resource}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Tenant / Organisation</span>
                  <span className="font-semibold text-slate-900">{selectedLog.orgName || selectedLog.orgId || 'System'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Actor</span>
                  <span className="text-slate-900">{selectedLog.userName} ({selectedLog.userEmail})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600">{selectedLog.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">IP Address</span>
                  <span className="font-mono text-slate-900">{selectedLog.ipAddress}</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-500 block mb-1">Details & Description</span>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-800 leading-relaxed">
                    {selectedLog.details || 'No additional metadata logged.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


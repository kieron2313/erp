import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Trash2, UserPlus, ShieldCheck, Mail, Users, CheckCircle2, Clock, AlertCircle, Database } from 'lucide-react';

interface AllowedEmail {
  id: number;
  email: string;
  addedBy: string;
  createdAt: string;
  userUid?: string | null;
  userRole?: string | null;
  lastLogin?: string | null;
}

export default function AccessControl() {
  const { token, user: currentUser } = useAuth();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchEmails();
  }, [token]);

  const fetchEmails = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/allowed-emails', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (err) {
      console.error('Failed to fetch allowed emails', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !token) return;
    
    setIsAdding(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch('/api/allowed-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add email');
      }
      
      setSuccessMsg(`Successfully authorized ${newEmail.trim().toLowerCase()}`);
      setNewEmail('');
      await fetchEmails();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setError(null);
    try {
      const response = await fetch(`/api/allowed-emails/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke access');
      }
      
      setDeleteConfirmId(null);
      setSuccessMsg('Access revoked successfully');
      await fetchEmails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setDeleteConfirmId(null);
    }
  };

  const activeCount = emails.filter(e => !!e.userUid).length;
  const pendingCount = emails.length - activeCount;

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Access & Permissions</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Manage who is authorized to log in. All authorized team members see and work with the same shared database.
              </p>
            </div>
          </div>
        </header>

        {/* Global Shared Database Notice */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-indigo-800/40 flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-2xl shrink-0 mt-0.5">
            <Database className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white mb-1">Unified Shared Database Active</h3>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Every authorized user who signs in accesses the exact same customers, suppliers, products, inventory, and transactions. Any changes, payments, or scanned invoices made by any team member are immediately synced across all active sessions.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Authorized Accounts</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{emails.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Active Users</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Pending First Login</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Add Email Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/80">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Authorize New User</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter the Google account email address of the team member you wish to grant access to.
          </p>

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. colleague@kalogiroucandles.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-slate-900 font-medium"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding || !newEmail.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 h-[50px] shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              {isAdding ? 'Authorizing...' : 'Authorize Email'}
            </button>
          </form>
        </div>

        {/* Allowed Emails Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Authorized Users List</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {emails.length} accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">User Account</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Role</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Login Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Authorized By</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Loading authorized users...
                      </div>
                    </td>
                  </tr>
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No authorized emails found.
                    </td>
                  </tr>
                ) : (
                  emails.map((item) => {
                    const isSuperAdmin = item.email.toLowerCase() === 'wdsolutionnet@gmail.com';
                    const isSelf = currentUser?.email?.toLowerCase() === item.email.toLowerCase();
                    const isProtected = isSuperAdmin || isSelf;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {item.email.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{item.email}</p>
                              {isSelf && (
                                <span className="inline-block text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5">
                                  Current Session
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Primary Admin
                            </span>
                          ) : item.userRole === 'admin' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              ERP User
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {item.userUid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Pending First Sign-in
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500">
                          <p className="font-medium text-slate-700">{item.addedBy || 'System'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isProtected ? (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          ) : deleteConfirmId === item.id ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-xs text-rose-600 font-semibold">Confirm?</span>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex"
                              title="Revoke access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

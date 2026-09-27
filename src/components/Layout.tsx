import { Outlet, NavLink } from 'react-router';
import { useAuth } from './AuthProvider.tsx';
import { LayoutDashboard, Users, UserSquare2, Package, ArrowRightLeft, FileBarChart, LogOut, Search, Bell, ShieldCheck, Database } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

interface QuotaData {
  usedBytes: number;
  totalQuotaBytes: number;
  remainingBytes: number;
  percentUsed: number;
  percentLeft: number;
  usedFormatted: string;
  remainingFormatted: string;
  totalFormatted: string;
  status: string;
}

export default function Layout() {
  const { user, logout, token } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/quota', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setQuota(data))
      .catch(console.error);
  }, [token]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/suppliers', icon: UserSquare2, label: 'Suppliers' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/transactions', icon: ArrowRightLeft, label: 'Transactions' },
    { to: '/reports', icon: FileBarChart, label: 'Data Mgmt' },
    { to: '/settings', icon: ShieldCheck, label: 'User Access' },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans text-slate-900 bg-slate-50">
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-white text-xl">E</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Erp<span className="text-indigo-400">Core</span></h1>
          </div>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'hover:bg-slate-800/50 hover:text-white'
                )
              }
            >
              <item.icon className={clsx("w-5 h-5 shrink-0 transition-colors duration-200", 
                 "group-hover:text-indigo-400"
              )} />
              {item.label}
            </NavLink>
          ))}
          
          <div className="mt-8 px-4">
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60 shadow-inner">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Storage Quota</span>
                </div>
                {quota && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    {quota.remainingFormatted} left
                  </span>
                )}
              </div>

              {quota ? (
                <>
                  <div className="w-full bg-slate-950 h-2 rounded-full mb-2.5 overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out" 
                      style={{ width: `${Math.max(2, Math.min(100, quota.percentUsed))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                    <span>{quota.usedFormatted} used</span>
                    <span className="text-slate-200 font-semibold">{quota.totalFormatted} total</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Used: {quota.percentUsed}%</span>
                    <span className="text-emerald-400 font-medium">{quota.percentLeft}% available</span>
                  </div>
                </>
              ) : (
                <div className="animate-pulse space-y-2 py-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full"></div>
                  <div className="h-3 w-3/4 bg-slate-800 rounded"></div>
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className="p-6 border-t border-slate-800 mt-auto bg-slate-900/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-300 rounded-xl hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        <header className="h-20 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="relative w-[400px]">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers, transactions..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-100/50 border border-transparent hover:border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 text-slate-900"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative focus:outline-none p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

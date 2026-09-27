import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Package, Plus, Users, Truck, FileText, ChevronUp, AlertCircle, ArrowUpRight, ArrowDownRight, Activity, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import AddEntityModal from '../components/AddEntityModal.tsx';
import TransactionModal from '../components/TransactionModal.tsx';

interface QuotaInfo {
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

export default function Dashboard() {
  const { token, getFreshToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Floating menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const fetchDashboard = async (overrideToken?: string) => {
    const activeToken = overrideToken || token;
    if (!activeToken) return;

    setError(null);
    try {
      let res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      // If token expired, try refreshing once
      if (res.status === 401 && getFreshToken) {
        const fresh = await getFreshToken(true);
        if (fresh) {
          res = await fetch('/api/dashboard', {
            headers: { Authorization: `Bearer ${fresh}` }
          });
        }
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const d = await res.json();
      setData(d);
    } catch (e: any) {
      console.error('Failed to load dashboard:', e);
      setError(e.message || 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchQuota();
    }
  }, [token]);

  const fetchQuota = async (overrideToken?: string) => {
    const activeToken = overrideToken || token;
    if (!activeToken) return;
    try {
      let res = await fetch('/api/quota', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.status === 401 && getFreshToken) {
        const fresh = await getFreshToken(true);
        if (fresh) {
          res = await fetch('/api/quota', {
            headers: { Authorization: `Bearer ${fresh}` }
          });
        }
      }
      if (res.ok) {
        const q = await res.json();
        setQuota(q);
      }
    } catch (err) {
      console.warn('Failed to load quota in dashboard:', err);
    }
  };

  const handleAddCustomer = async (formData: any) => {
    const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to add customer');
    fetchDashboard();
  };

  const handleAddSupplier = async (formData: any) => {
    const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to add supplier');
    fetchDashboard();
  };

  const handleAddTransaction = async (formData: any) => {
    const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to add transaction');
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-40 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
           <div className="h-32 bg-slate-200 rounded-3xl col-span-1"></div>
           <div className="h-32 bg-slate-200 rounded-3xl col-span-1"></div>
           <div className="h-32 bg-slate-200 rounded-3xl col-span-1"></div>
           <div className="h-32 bg-slate-200 rounded-3xl col-span-1"></div>
           <div className="h-32 bg-slate-200 rounded-3xl col-span-1"></div>
        </div>
      </div>
    );
  }

  // Dummy chart data for illustration (would normally come from API)
  const chartData = [
    { name: 'Jan', sales: 4000, purchases: 2400 },
    { name: 'Feb', sales: 3000, purchases: 1398 },
    { name: 'Mar', sales: 2000, purchases: 9800 },
    { name: 'Apr', sales: 2780, purchases: 3908 },
    { name: 'May', sales: 1890, purchases: 4800 },
    { name: 'Jun', sales: 2390, purchases: 3800 },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-slate-500 mt-1">Here's what's happening with your business today.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboard()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {data?.overdueTransactions && data.overdueTransactions.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-200/60 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 md:items-center">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-rose-600" />
                <h4 className="text-lg font-bold text-rose-900">Alert: Overdue Invoices</h4>
                <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{data.overdueTransactions.length}</span>
             </div>
             <p className="text-sm text-rose-700/80">You have {data.overdueTransactions.length} transaction(s) that are unpaid and over 45 days old.</p>
          </div>
          <div className="flex-1 w-full bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="text-[10px] text-rose-800/50 uppercase tracking-widest bg-rose-50/30">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Transaction ID</th>
                    <th className="px-4 py-3 font-semibold">Remaining</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-rose-50 text-rose-900">
                  {data.overdueTransactions.slice(0,3).map((tx: any) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 font-mono text-xs">{tx.transactionNumber}</td>
                      <td className="px-4 py-3 font-bold">€{(Number(tx.totalAmount) - Number(tx.paidAmount)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Storage Quota Card */}
      {quota && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-sm border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h4 className="text-base font-bold text-white tracking-tight">Database Storage & Quota</h4>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {quota.remainingFormatted} Left
                </span>
                <span className="text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                  {quota.totalFormatted} Total
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                You have used <span className="text-white font-semibold">{quota.usedFormatted}</span> of your <span className="text-white font-semibold">{quota.totalFormatted}</span> total quota ({quota.percentUsed}% used, <span className="text-emerald-400 font-medium">{quota.percentLeft}% available</span>).
              </p>
            </div>
          </div>

          <div className="w-full md:w-72 shrink-0 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Storage Used</span>
              <span className="text-emerald-400 font-semibold">{quota.remainingFormatted} available</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(2, Math.min(100, quota.percentUsed))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>{quota.usedFormatted} used</span>
              <span>Total: {quota.totalFormatted}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownRight className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">Receivables <ArrowDownRight className="w-3 h-3 text-emerald-500" /></p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">€{parseFloat(data?.receivables || 0).toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-16 h-16 text-rose-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">Payables <ArrowUpRight className="w-3 h-3 text-rose-500" /></p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">€{parseFloat(data?.payables || 0).toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Customers</p>
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{data?.totalCustomers || 0}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Suppliers</p>
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{data?.totalSuppliers || 0}</h3>
        </div>
        
        <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-600/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-2 flex items-center gap-2">Products <Package className="w-3.5 h-3.5" /></p>
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight mb-4">{data?.totalProducts || 0} <span className="text-sm font-medium text-indigo-300 tracking-normal">Items</span></h3>
            <div className="w-full bg-indigo-900/30 h-1.5 rounded-full overflow-hidden">
              <div className="w-3/4 bg-white h-full rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Transaction Volume</h4>
              <p className="text-sm text-slate-500 mt-1">Overview of sales vs purchases over time</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Sales
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span> Purchases
              </div>
            </div>
          </div>
          <div className="flex-1 h-72 min-h-[280px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={8}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={15} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} tickFormatter={(value) => `€${value}`} />
                 <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', fontWeight: 500, fontSize: '13px'}} 
                 />
                 <Bar dataKey="sales" name="Sales" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={16} />
                 <Bar dataKey="purchases" name="Purchases" fill="#1e293b" radius={[8, 8, 0, 0]} barSize={16} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200/60 p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Recent Activity</h4>
          </div>
          
          <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-2">
            {data?.recentTransactions?.length > 0 ? (
              data.recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    ['sale', 'payment_received'].includes(tx.type) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                  }`}>
                    {['sale', 'payment_received'].includes(tx.type) ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                       <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 capitalize truncate">{tx.type.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{tx.transactionNumber}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${
                      ['sale', 'payment_received'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {['sale', 'payment_received'].includes(tx.type) ? '+' : '-'}
                      €{parseFloat(tx.totalAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            )}
          </div>
          <button className="mt-6 w-full py-3 bg-white rounded-xl text-xs font-semibold uppercase tracking-widest text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            View All History
          </button>
        </div>
      </div>

      {/* Floating Quick Action Menu */}
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
        {isMenuOpen && (
          <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-2">
            <button
              onClick={() => { setShowAddTransaction(true); setIsMenuOpen(false); }}
              className="flex items-center gap-4 bg-white pl-4 pr-2 py-2 rounded-full shadow-xl border border-slate-200/60 hover:bg-slate-50 transition-all group"
            >
              <span className="text-sm font-semibold text-slate-700 ml-2">New Transaction</span>
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </button>
            <button
              onClick={() => { setShowAddCustomer(true); setIsMenuOpen(false); }}
              className="flex items-center gap-4 bg-white pl-4 pr-2 py-2 rounded-full shadow-xl border border-slate-200/60 hover:bg-slate-50 transition-all group"
            >
              <span className="text-sm font-semibold text-slate-700 ml-2">Add Customer</span>
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </button>
            <button
              onClick={() => { setShowAddSupplier(true); setIsMenuOpen(false); }}
              className="flex items-center gap-4 bg-white pl-4 pr-2 py-2 rounded-full shadow-xl border border-slate-200/60 hover:bg-slate-50 transition-all group"
            >
              <span className="text-sm font-semibold text-slate-700 ml-2">Add Supplier</span>
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all ${isMenuOpen ? 'rotate-180 bg-slate-800 hover:bg-slate-900 shadow-slate-800/30' : ''}`}
        >
          {isMenuOpen ? <ChevronUp className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      <AddEntityModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        entityType="customer"
        onSave={handleAddCustomer}
      />
      <AddEntityModal
        isOpen={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        entityType="supplier"
        onSave={handleAddSupplier}
      />
      <TransactionModal
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSave={handleAddTransaction}
      />
    </div>
  );
}

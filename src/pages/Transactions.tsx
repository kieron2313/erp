import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import { Edit, Search, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import TransactionModal from '../components/TransactionModal.tsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Transactions() {
  const { token, loading, getFreshToken } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editTxData, setEditTxData] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all'); // all, paid, unpaid, partial

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let res = await fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 && getFreshToken) {
        const fresh = await getFreshToken(true);
        if (fresh) {
          res = await fetch('/api/transactions', { headers: { Authorization: `Bearer ${fresh}` } });
        }
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && token) {
      fetchTransactions();
    }
  }, [loading, token]);

  const filteredTransactions = transactions.filter(tx => {
    const term = searchTerm.toLowerCase();
    const entityName = tx.customerName || tx.supplierName || '';
    const matchesSearch = term === '' || 
      (tx.notes || '').toLowerCase().includes(term) ||
      (tx.transactionNumber || '').toLowerCase().includes(term) ||
      entityName.toLowerCase().includes(term);

    const matchesStartDate = startDate === '' || new Date(tx.date) >= new Date(startDate);
    const matchesEndDate = endDate === '' || new Date(tx.date) <= new Date(endDate);
    
    let matchesPayment = true;
    const remaining = Number(tx.totalAmount) - Number(tx.paidAmount);
    if (paymentStatus === 'paid') matchesPayment = remaining <= 0 && Number(tx.totalAmount) > 0;
    else if (paymentStatus === 'unpaid') matchesPayment = Number(tx.paidAmount) === 0 && Number(tx.totalAmount) > 0;
    else if (paymentStatus === 'partial') matchesPayment = remaining > 0 && Number(tx.paidAmount) > 0;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesPayment;
  });

  const groupTransactionsByMonth = () => {
    const grouped: Record<string, any[]> = {};
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(tx);
    });
    return grouped;
  };

  const handleSaveTransaction = async (txData: any) => {
    if (!txData.id) return;
    try {
      const response = await fetch(`/api/transactions/${txData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(txData)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update transaction');
      }
      fetchTransactions();
      setEditTxData(null);
    } catch (e: any) {
      alert(e.message || 'Error saving transaction');
    }
  };

  const groupedTx = groupTransactionsByMonth();

  const totalOwed = filteredTransactions.reduce((acc, t) => {
    const remaining = Number(t.totalAmount) - Number(t.paidAmount);
    return acc + (remaining > 0 ? remaining : 0);
  }, 0);

  const revenueTotal = filteredTransactions
    .filter(tx => tx.type === 'sale')
    .reduce((acc, tx) => acc + Number(tx.totalAmount), 0);
  const expenseTotal = filteredTransactions
    .filter(tx => tx.type === 'purchase')
    .reduce((acc, tx) => acc + Number(tx.totalAmount), 0);

  const chartData = [
    { name: 'Revenue', amount: revenueTotal },
    { name: 'Expenses', amount: expenseTotal }
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <TransactionModal 
        isOpen={!!editTxData}
        onClose={() => setEditTxData(null)}
        initialData={editTxData}
        onSave={handleSaveTransaction}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1">Manage sales, purchases, and payments.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm px-6 py-4 flex gap-6 items-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Total Balance Owed</p>
            <p className="text-2xl font-bold text-rose-500 tracking-tight">€{totalOwed.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/60 p-8 flex flex-col md:flex-row gap-8 items-center shadow-sm">
        <div className="flex-1 w-full md:w-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
               <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Financial Overview</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} tickFormatter={(val) => `€${val}`} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', fontWeight: 500, fontSize: '13px' }}
                  formatter={(value: any, name: any, props: any) => [`€${Number(value || 0).toFixed(2)}`, props.payload.name]}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex flex-col gap-4 min-w-[240px]">
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 relative overflow-hidden group">
            <ArrowDownRight className="w-12 h-12 text-emerald-500/10 absolute top-2 right-2 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-widest mb-1 relative z-10">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight relative z-10">€{revenueTotal.toFixed(2)}</p>
          </div>
          <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100/50 relative overflow-hidden group">
            <ArrowUpRight className="w-12 h-12 text-rose-500/10 absolute top-2 right-2 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] uppercase font-bold text-rose-600/80 tracking-widest mb-1 relative z-10">Total Expenses</p>
            <p className="text-2xl font-bold text-rose-600 tracking-tight relative z-10">€{expenseTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ref, notes or entity name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-600"
            title="Start Date"
          />
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-600"
            title="End Date"
          />
          <select 
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-600 font-medium appearance-none min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="p-8 text-center text-slate-400 font-medium">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center flex flex-col items-center justify-center shadow-sm">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
             <Search className="w-6 h-6 text-slate-300" />
           </div>
           <p className="text-slate-500 font-medium text-lg">No transactions recorded yet.</p>
           <p className="text-slate-400 text-sm mt-1">Check your filters or create a new transaction.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedTx).map(([monthYear, txs]) => (
            <div key={monthYear} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center">
                 <h3 className="font-semibold text-slate-700 tracking-wide text-sm uppercase">{monthYear}</h3>
                 <span className="ml-3 px-2 py-0.5 bg-slate-200/50 text-slate-500 rounded-full text-xs font-bold">{txs.length}</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                    <thead className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
                      <tr>
                         <th className="py-4 px-6">Date</th>
                         <th className="py-4 px-6">Ref</th>
                         <th className="py-4 px-6">Entity</th>
                         <th className="py-4 px-6">Type</th>
                         <th className="py-4 px-6">Product/Notes</th>
                         <th className="py-4 px-6 text-right">Cost</th>
                         <th className="py-4 px-6 text-right">Paid</th>
                         <th className="py-4 px-6 text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {txs.map(tx => {
                        const remaining = Number(tx.totalAmount) - Number(tx.paidAmount);
                        const isOwed = remaining > 0;
                        const entityName = tx.customerName || tx.supplierName || '-';
                        return (
                          <tr key={tx.id} onClick={() => setEditTxData(tx)} className="text-sm hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="py-4 px-6 text-slate-600 font-medium">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="py-4 px-6 font-mono text-xs text-slate-400 flex gap-2 items-center group-hover:text-indigo-600 transition-colors">
                              {tx.transactionNumber}
                              <Edit className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                            <td className="py-4 px-6 text-slate-900 font-medium">{entityName}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                tx.type === 'sale' ? 'bg-emerald-50 text-emerald-600' :
                                tx.type === 'purchase' ? 'bg-rose-50 text-rose-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-500 max-w-[200px] truncate">{tx.notes || '-'}</td>
                            <td className="py-4 px-6 text-right font-medium text-slate-900">€{Number(tx.totalAmount).toFixed(2)}</td>
                            <td className="py-4 px-6 text-right font-semibold text-emerald-600">€{Number(tx.paidAmount).toFixed(2)}</td>
                            <td className={`py-4 px-6 text-right font-bold ${isOwed ? 'text-rose-500' : 'text-slate-300'}`}>
                              €{Math.max(0, remaining).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

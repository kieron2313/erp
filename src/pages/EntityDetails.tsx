import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../components/AuthProvider.tsx';
import { ArrowLeft, Edit, Plus, Camera, Trash2, CalendarDays, Hash, ReceiptText, CircleDollarSign, CheckCircle2, Clock } from 'lucide-react';
import AddEntityModal from '../components/AddEntityModal.tsx';
import TransactionModal from '../components/TransactionModal.tsx';
import ScanInvoiceModal from '../components/ScanInvoiceModal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';

export default function EntityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const path = window.location.pathname;
  const isCustomer = path.includes('/customers/');
  const isSupplier = path.includes('/suppliers/');
  // Default to customers if something weird happens
  const entityType = isCustomer ? 'customers' : isSupplier ? 'suppliers' : 'Unknown';
  const entityName = isCustomer ? 'Customer' : isSupplier ? 'Supplier' : 'Unknown';
  
  const [data, setData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editTxData, setEditTxData] = useState<any>(null);

  useEffect(() => {
    if (!token || !id || entityType === 'Unknown') return;
    fetchData();
  }, [token, id, entityType]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/${entityType}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`/api/entities/transactions/${isCustomer ? 'customer' : 'supplier'}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ]).then(([entityData, txData]) => {
      setData(entityData);
      setTransactions(txData.length ? txData : []);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  };

  const handleUpdate = async (updatedData: any) => {
    const response = await fetch(`/api/${entityType}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedData)
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.error || 'Failed to update');
    }
    fetchData();
  };

  const handleSaveTransaction = async (txData: any) => {
    const isEdit = !!txData.id;
    const url = isEdit ? `/api/transactions/${txData.id}` : `/api/transactions`;
    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(txData)
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.error || 'Failed to save transaction');
    }
    fetchData();
    setEditTxData(null);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-medium">Loading {entityName} profile...</div>;
  }

  if (!data || data.error) {
    return <div className="p-12 text-center text-rose-500 font-medium">{data?.error || `${entityName} not found`}</div>;
  }

  // Calculate unpaid balances older than 45 days
  const unpaidTransactions = transactions.filter(t => {
    const remaining = Number(t.totalAmount) - Number(t.paidAmount);
    if (remaining <= 0) return false;
    const daysPassed = (new Date().getTime() - new Date(t.date).getTime()) / (1000 * 3600 * 24);
    return daysPassed > 45;
  });

  const totalOwed = transactions.reduce((acc, t) => {
    const remaining = Number(t.totalAmount) - Number(t.paidAmount);
    return acc + (remaining > 0 ? remaining : 0);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <AddEntityModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        entityType={isCustomer ? 'customer' : 'supplier'} 
        initialData={data} 
        onSave={handleUpdate} 
      />
      
      <TransactionModal 
        isOpen={isTxModalOpen || !!editTxData} 
        onClose={() => {
          setIsTxModalOpen(false);
          setEditTxData(null);
        }} 
        entityId={Number(id)} 
        entityType={isCustomer ? 'customer' : 'supplier'} 
        initialData={editTxData}
        onSave={handleSaveTransaction} 
      />
      
      <ScanInvoiceModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
        entityId={Number(id)} 
        entityType={isCustomer ? 'customer' : 'supplier'} 
        onScanComplete={fetchData} 
        token={token}
      />
      
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200/60 rounded-full hover:bg-slate-50 transition-all text-slate-600 hover:text-slate-900 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{data.companyName}</h1>
          <p className="text-slate-500 mt-1">{entityName} Profile</p>
        </div>
      </div>
      
      {unpaidTransactions.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-rose-700 font-medium text-sm">
            <strong className="font-bold">Alert:</strong> There are {unpaidTransactions.length} transaction(s) with an outstanding balance older than 45 days.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Profile Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Company Name</p>
                <p className="text-sm font-semibold text-slate-900">{data.companyName}</p>
              </div>
              {data.afm && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Tax ID (AFM)</p>
                  <p className="text-sm text-slate-700 font-mono">{data.afm}</p>
                </div>
              )}
              {data.email && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Email</p>
                  <p className="text-sm text-slate-700">{data.email}</p>
                </div>
              )}
              {data.phone && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Phone</p>
                  <p className="text-sm text-slate-700">{data.phone}</p>
                </div>
              )}
              {data.address && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Address</p>
                  <p className="text-sm text-slate-700">{data.address}</p>
                </div>
              )}
              {data.notes && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap p-4 bg-slate-50 rounded-xl">{data.notes}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex gap-3 max-w-md">
              <button onClick={() => setIsEditModalOpen(true)} className="flex-1 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
              <button onClick={() => setIsConfirmOpen(true)} className="px-4 py-2.5 bg-rose-50 border border-rose-200/60 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
              <CircleDollarSign className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Remaining Balance</h3>
            <p className="text-4xl font-bold text-slate-900">€{totalOwed.toFixed(2)}</p>
          </div>
        </div>

        <ConfirmModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={async () => {
            try {
              const response = await fetch(`/api/${entityType}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Delete failed');
              navigate(`/${entityType}`);
            } catch (e) {
              console.error(e);
            }
          }}
          title={`Delete ${entityName}`}
          message={`Are you sure you want to delete ${entityName.toLowerCase()} "${data.companyName}"? This action cannot be undone.`}
        />

        <div className="bg-white rounded-3xl border border-slate-200/60 p-8 flex-1 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Transactions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setIsScanModalOpen(true)} className="px-4 py-2.5 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2">
                <Camera className="w-4 h-4" /> Scan Invoice
              </button>
              <button onClick={() => setIsTxModalOpen(true)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Transaction
              </button>
            </div>
          </div>
              
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-400 min-h-[250px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <ReceiptText className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-base font-semibold text-slate-600">No transactions found</p>
                  <p className="text-sm mt-1">Add a transaction manually or scan an invoice.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {Object.entries(
                    transactions.reduce((grouped, tx) => {
                      const date = new Date(tx.date);
                      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                      if (!grouped[monthYear]) grouped[monthYear] = [];
                      grouped[monthYear].push(tx);
                      return grouped;
                    }, {} as Record<string, any[]>)
                  ).map(([monthYear, txs]: [string, any[]]) => (
                    <div key={monthYear} className="border border-slate-200/60 rounded-2xl overflow-hidden">
                       <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/60 flex items-center gap-2">
                         <CalendarDays className="w-4 h-4 text-slate-400" />
                         <h4 className="font-bold text-slate-700 text-sm">{monthYear}</h4>
                       </div>
                       <div className="overflow-x-auto">
                         <table className="w-full text-left whitespace-nowrap">
                            <thead className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 bg-white">
                              <tr>
                                 <th className="py-4 px-5">Date</th>
                                 <th className="py-4 px-5">Ref</th>
                                 <th className="py-4 px-5">Notes</th>
                                 <th className="py-4 px-5 text-right">Cost</th>
                                 <th className="py-4 px-5 text-right">Paid</th>
                                 <th className="py-4 px-5 text-right">Remaining</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                              {txs.map((tx: any) => {
                                const remaining = Number(tx.totalAmount) - Number(tx.paidAmount);
                                const isOwed = remaining > 0;
                                return (
                                  <tr key={tx.id} onClick={() => setEditTxData(tx)} className="text-sm hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <td className="py-4 px-5 text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="py-4 px-5 font-mono text-xs text-slate-400 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                      <Hash className="w-3 h-3" />
                                      {tx.transactionNumber}
                                      <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </td>
                                    <td className="py-4 px-5 text-slate-900 max-w-[200px] truncate">{tx.notes || '-'}</td>
                                    <td className="py-4 px-5 text-right font-medium text-slate-900">€{Number(tx.totalAmount).toFixed(2)}</td>
                                    <td className="py-4 px-5 text-right">
                                      <div className="flex items-center justify-end gap-1.5 text-emerald-600">
                                        €{Number(tx.paidAmount).toFixed(2)}
                                        {Number(tx.paidAmount) >= Number(tx.totalAmount) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                      </div>
                                    </td>
                                    <td className={`py-4 px-5 text-right font-bold ${isOwed ? 'text-rose-500' : 'text-slate-300'}`}>
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
      </div>
    </div>
  );
}

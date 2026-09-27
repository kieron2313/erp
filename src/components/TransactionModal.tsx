import React, { useState } from 'react';
import { X, Save, Download } from 'lucide-react';
import { useAuth } from './AuthProvider.tsx';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: number; // make optional since initialData might have it
  entityType?: 'customer' | 'supplier'; // make optional
  onSave: (data: any) => Promise<void>;
  initialData?: any;
}

export default function TransactionModal({ isOpen, onClose, entityId, entityType, onSave, initialData }: TransactionModalProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().substring(0, 10),
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
    productId: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<'unpaid'|'full'|'partial'>('unpaid');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          date: new Date(initialData.date).toISOString().substring(0, 10),
          totalAmount: Number(initialData.totalAmount) || 0,
          paidAmount: Number(initialData.paidAmount) || 0,
        });
        const total = Number(initialData.totalAmount) || 0;
        const paid = Number(initialData.paidAmount) || 0;
        if (paid === 0) setPaymentStatus('unpaid');
        else if (paid >= total && total > 0) setPaymentStatus('full');
        else setPaymentStatus('partial');
      } else {
        setFormData({
          date: new Date().toISOString().substring(0, 10),
          totalAmount: 0,
          paidAmount: 0,
          notes: '',
          productId: ''
        });
        setPaymentStatus('unpaid');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleTotalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setFormData((prev: any) => ({
      ...prev,
      totalAmount: val,
      paidAmount: paymentStatus === 'full' ? val : paymentStatus === 'unpaid' ? 0 : prev.paidAmount
    }));
  };

  const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as 'unpaid' | 'full' | 'partial';
    setPaymentStatus(status);
    if (status === 'full') {
      setFormData((prev: any) => ({ ...prev, paidAmount: prev.totalAmount }));
    } else if (status === 'unpaid') {
      setFormData((prev: any) => ({ ...prev, paidAmount: 0 }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (initialData) {
        await onSave(formData);
      } else {
        await onSave({
          ...formData,
          ...(entityType === 'customer' ? { customerId: entityId } : {}),
          ...(entityType === 'supplier' ? { supplierId: entityId } : {}),
          type: entityType ? (entityType === 'customer' ? 'sale' : 'purchase') : formData.type || 'sale'
        });
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDocument = async (download: boolean = false) => {
    try {
      setIsLoadingDocument(true);
      const response = await fetch(`/api/transactions/${initialData.id}/document`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch document');
      const data = await response.json();
      
      const mime = data.documentMimeType || 'application/octet-stream';
      const linkSource = `data:${mime};base64,${data.documentData}`;
      
      if (download) {
        let ext = 'bin';
        if (mime.includes('pdf')) ext = 'pdf';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = `Invoice_${initialData.transactionNumber || initialData.id}.${ext}`;
        downloadLink.click();
      } else {
        setDocumentUrl(linkSource);
        setDocumentMimeType(mime);
      }
    } catch (error) {
      alert('Error fetching document. It may have been corrupted or lost.');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const inputClass = "w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 focus:bg-white transition-all";
  const labelClass = "block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className={`bg-white rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/60 w-full ${documentUrl ? 'max-w-4xl' : 'max-w-lg'} flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]`}>
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{initialData ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {documentUrl && (
            <div className="w-1/2 border-r border-slate-100 bg-slate-50 p-4 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-semibold text-slate-700">Invoice Document</h3>
                <button 
                  onClick={() => handleDownloadDocument(true)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                {documentMimeType?.includes('pdf') ? (
                  <iframe src={documentUrl} className="w-full h-full" title="Invoice PDF" />
                ) : (
                  <img src={documentUrl} alt="Invoice" className="max-w-full max-h-full object-contain" />
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-8 bg-white space-y-5 ${documentUrl ? 'w-1/2' : ''}`}>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Date *</label>
              <input required type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} />
            </div>
            {!initialData && !entityType && (
              <div>
                <label className={labelClass}>Type *</label>
                <select name="type" value={formData.type || 'sale'} onChange={handleChange} className={inputClass}>
                  <option value="sale">Sale</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Total Cost *</label>
              <input required type="number" step="0.01" name="totalAmount" value={formData.totalAmount || ''} onChange={handleTotalAmountChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Status *</label>
              <select value={paymentStatus} onChange={handlePaymentStatusChange} className={inputClass}>
                <option value="unpaid">Unpaid</option>
                <option value="full">Fully Paid</option>
                <option value="partial">Partially Paid</option>
              </select>
            </div>
          </div>
          
          {paymentStatus === 'partial' && (
            <div>
              <label className={labelClass}>Amount Paid *</label>
              <input required type="number" step="0.01" name="paidAmount" value={formData.paidAmount || ''} onChange={handleChange} className={inputClass} />
            </div>
          )}
          
          {formData.totalAmount > formData.paidAmount && (
             <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-semibold flex items-center">
               Remaining balance: €{(formData.totalAmount - formData.paidAmount).toFixed(2)}
             </div>
          )}
          {formData.paidAmount > formData.totalAmount && (
             <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm font-semibold flex items-center">
               Overpaid: €{(formData.paidAmount - formData.totalAmount).toFixed(2)}
             </div>
          )}

          <div>
            <label className={labelClass}>Notes / Product Details</label>
            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} placeholder="E.g. Purchased 10 units of Product A" className={inputClass} />
          </div>
          
          <div className="mt-10 flex justify-between items-center gap-3 pt-6 border-t border-slate-100">
            <div>
              {initialData?.hasDocument && !documentUrl && (
                <button type="button" onClick={() => handleDownloadDocument(false)} disabled={isLoadingDocument} className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isLoadingDocument ? 'Loading...' : 'View Invoice'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

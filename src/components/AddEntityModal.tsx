import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'customer' | 'supplier' | 'product';
  onSave: (data: any) => Promise<void>;
  initialData?: any;
}

export default function AddEntityModal({ isOpen, onClose, entityType, onSave, initialData }: AddEntityModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 focus:bg-white transition-all";
  const labelClass = "block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2";

  const renderFields = () => {
    if (entityType === 'product') {
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Product Name *</label>
            <input required name="productName" value={formData.productName || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>SKU</label>
              <input name="sku" value={formData.sku || ''} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <select name="unit" value={formData.unit || 'pcs'} onChange={handleChange} className={inputClass}>
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input name="category" value={formData.category || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className={inputClass} />
          </div>
        </div>
      );
    } // End product fields

    // Customer or Supplier fields
    return (
      <div className="space-y-5">
        <div>
          <label className={labelClass}>Company Name *</label>
          <input required name="companyName" value={formData.companyName || ''} onChange={handleChange} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Tax ID (AFM)</label>
            <input name="afm" value={formData.afm || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" value={formData.phone || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input name="address" value={formData.address || ''} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className={inputClass} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/60 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-bold text-slate-900 capitalize tracking-tight">{initialData ? 'Edit' : 'Add New'} {entityType}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-white">
          {renderFields()}
          
          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

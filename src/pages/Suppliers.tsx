import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../components/AuthProvider.tsx';
import AddEntityModal from '../components/AddEntityModal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import FileUploadModal from '../components/FileUploadModal.tsx';
import { ArrowDownAZ, ArrowUpZA, Plus, Trash2, Search, FileSpreadsheet } from 'lucide-react';

interface Supplier {
  id: number;
  companyName: string;
  afm: string;
  address: string;
  phone: string;
  email: string;
  totalOwed?: number;
}

export default function Suppliers() {
  const { token, loading, getFreshToken } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!loading && token) {
      fetchSuppliers();
    }
  }, [loading, token]);

  const fetchSuppliers = async () => {
    try {
      let response = await fetch('/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401 && getFreshToken) {
        const fresh = await getFreshToken(true);
        if (fresh) {
          response = await fetch('/api/suppliers', {
            headers: { Authorization: `Bearer ${fresh}` }
          });
        }
      }
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setSuppliers(data);
        } else {
          console.warn("Received non-JSON response");
        }
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSubmit = async (mappedData: any[]) => {
    if (!token) return;
    const response = await fetch('/api/import/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: mappedData })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Import failed');
    }

    const result = await response.json();
    alert(`Successfully imported ${result.count} records!`);
    fetchSuppliers();
  };

  const handleAdd = async (data: any) => {
    const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.error || 'Failed to add supplier');
    }
    fetchSuppliers();
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/bulk-delete/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      if (!response.ok) throw new Error('Bulk delete failed');
      setSelectedIds([]);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    setIsConfirmOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map(c => c.id));
    }
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const cmp = a.companyName.localeCompare(b.companyName);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-slate-500 mt-1">Manage your suppliers and vendors.</p>
        </div>
        <div className="flex gap-3 items-center">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200/80 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeBulkDelete}
        title="Delete Suppliers"
        message={`Are you sure you want to delete ${selectedIds.length} supplier(s)? This action cannot be undone.`}
      />

      {isImportModalOpen && (
        <FileUploadModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          entity="suppliers"
          onImport={handleImportSubmit}
        />
      )}

      <AddEntityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        entityType="supplier" 
        onSave={handleAdd} 
      />

      <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
        {isLoading ? (
           <div className="p-12 text-center text-slate-400 font-medium">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
           <div className="p-16 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Search className="w-6 h-6 text-slate-300" />
             </div>
             <p className="text-slate-500 font-medium text-lg">No suppliers found.</p>
             <p className="text-slate-400 text-sm mt-1">Click 'Add Supplier' to create your first one.</p>
           </div>
        ) : (
          <div className="overflow-x-auto text-left w-full block">
            <table className="w-full align-middle">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-5 w-[40px]">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={selectedIds.length === suppliers.length && suppliers.length > 0}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 font-bold text-left cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-2">
                      Company Name
                      <div className="text-slate-300 group-hover:text-slate-500">
                        {sortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-5 font-bold text-left">Email</th>
                  <th className="px-6 py-5 font-bold text-left">Phone</th>
                  <th className="px-6 py-5 font-bold text-left text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} onClick={() => navigate(`/suppliers/${supplier.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 w-[40px]" onClick={(e) => e.stopPropagation()}>
                       <input 
                          type="checkbox" 
                          checked={selectedIds.includes(supplier.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(supplier.id, e as any);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer"
                        />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors break-words max-w-[200px]">{supplier.companyName}</td>
                    <td className="px-6 py-4 text-slate-600 break-all max-w-[200px]">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{supplier.phone || '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold ${Number(supplier.totalOwed) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      €{Number(supplier.totalOwed || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

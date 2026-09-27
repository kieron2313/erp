import { useAuth } from '../components/AuthProvider.tsx';
import { Download, Upload, FileJson } from 'lucide-react';
import { useState } from 'react';
import FileUploadModal from '../components/FileUploadModal.tsx';

export default function Reports() {
  const { token, user, loading } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importEntity, setImportEntity] = useState<string | null>(null);

  const handleExport = async (entity: string) => {
    if (!token) return;
    setDownloading(entity);
    try {
      const response = await fetch(`/api/export/${entity}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
           alert(`No data found for ${entity}`);
        } else {
           throw new Error('Export failed');
        }
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${entity}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export data.');
    } finally {
      setDownloading(null);
    }
  };

  const handleImportClick = (entity: string) => {
    setImportEntity(entity);
    setIsModalOpen(true);
  };

  const handleImportSubmit = async (mappedData: any[]) => {
    if (!token || !importEntity) return;

    const response = await fetch(`/api/import/${importEntity}`, {
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
  };

  const reports = [
    { title: 'Customers Data', entity: 'customers', description: 'Export or import customer records' },
    { title: 'Suppliers Data', entity: 'suppliers', description: 'Export or import supplier records' },
    { title: 'Products Data', entity: 'products', description: 'Export or import product catalog' }
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Management</h1>
          <p className="text-slate-500 mt-1">Export your financial data or import master records.</p>
        </div>
      </div>
      
      {isModalOpen && importEntity && (
        <FileUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          entity={importEntity}
          onImport={handleImportSubmit}
        />
      )}

      <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FileJson className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Import & Export Entities</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map(report => (
             <div key={report.entity} className="border border-slate-200/60 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="w-full">
                  <h4 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{report.title}</h4>
                  <p className="text-slate-500 text-sm mt-1">{report.description}</p>
                </div>
                <div className="mt-auto flex w-full gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleExport(report.entity)}
                    disabled={downloading === report.entity}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {downloading === report.entity ? 'Wait...' : 'Export'}
                  </button>
                  <button
                    onClick={() => handleImportClick(report.entity)}
                    disabled={!user || loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { X, Camera, UploadCloud, Loader2 } from 'lucide-react';

interface ScanInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: number;
  entityType: 'customer' | 'supplier';
  onScanComplete: () => void;
  token: string | null;
}

export default function ScanInvoiceModal({ isOpen, onClose, entityId, entityType, onScanComplete, token }: ScanInvoiceModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const response = await fetch('/api/scan-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          image: base64.split(',')[1],
          mimeType: file.type,
          entityId,
          entityType
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to scan invoice');
      }

      onScanComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process invoice');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/60 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Scan Invoice</h2>
          <button onClick={!isScanning ? onClose : undefined} disabled={isScanning} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 bg-white flex flex-col items-center justify-center min-h-[300px]">
          {isScanning ? (
            <div className="flex flex-col items-center text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <p className="text-lg text-slate-900 font-bold tracking-tight">Analyzing Invoice...</p>
              <p className="text-sm text-slate-500 mt-2 max-w-[250px]">Using Gemini AI to extract transaction details and amounts automatically.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex-col flex items-center justify-center py-10 rounded-3xl border-2 border-dashed border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 rounded-full flex items-center justify-center mb-5 transition-colors">
                  <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <p className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Click to upload invoice</p>
                <p className="text-sm text-slate-400 mt-2">Accepts Images and PDFs</p>
              </button>
              
              {error && (
                <div className="mt-6 p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm w-full font-semibold flex items-center justify-center text-center">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

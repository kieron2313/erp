import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, ArrowRight, Check, FileSpreadsheet, Download } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: string;
  onImport: (mappedData: any[]) => Promise<void>;
}

const ENTITY_CONFIG: Record<string, { key: string; label: string; required: boolean }[]> = {
  customers: [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'address', label: 'Address', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'afm', label: 'Tax ID (AFM)', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  suppliers: [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'address', label: 'Address', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'afm', label: 'Tax ID (AFM)', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
  products: [
    { key: 'productName', label: 'Product Name', required: true },
    { key: 'sku', label: 'SKU', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'unit', label: 'Unit', required: false },
  ],
};

type Step = 'UPLOAD' | 'MAP' | 'PREVIEW';

export default function FileUploadModal({ isOpen, onClose, entity, onImport }: FileUploadModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const expectedFields = ENTITY_CONFIG[entity] || [];

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        alert("File has no data or headers.");
        setFile(null);
        return;
      }
      
      const fileHeaders = (jsonData[0] as string[]).map(h => String(h).trim());
      const fileData = jsonData.slice(1).map((row: any) => {
        const obj: any = {};
        fileHeaders.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });

      setHeaders(fileHeaders);
      setParsedData(fileData);
      
      // Auto-map based on similar names
      const initialMapping: Record<string, string> = {};
      expectedFields.forEach(field => {
        const match = fileHeaders.find(h => 
          h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.label.toLowerCase().replace(/[^a-z0-9]/g, '') ||
          h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (match) {
          initialMapping[field.key] = match;
        }
      });
      setMapping(initialMapping);
      setStep('MAP');
    } catch (err) {
      console.error(err);
      alert("Failed to parse file.");
      setFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleMappingChange = (expectedKey: string, fileHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [expectedKey]: fileHeader
    }));
  };

  const getMappedData = () => {
    return parsedData.map(row => {
      const mappedRow: any = {};
      expectedFields.forEach(field => {
        const mappedHeader = mapping[field.key];
        if (mappedHeader && row[mappedHeader] !== undefined) {
          mappedRow[field.key] = row[mappedHeader];
        }
      });
      return mappedRow;
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(getMappedData());
      handleClose();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setStep('UPLOAD');
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setMapping({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isMappingValid = () => {
    return expectedFields.filter(f => f.required).every(f => !!mapping[f.key]);
  };

  const downloadTemplate = () => {
    const headers = expectedFields.map(f => f.label).join(',');
    const blob = new Blob(['\uFEFF' + headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}_import_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const mappedDataPreview = step === 'PREVIEW' ? getMappedData().slice(0, 5) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/60 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import {entity.charAt(0).toUpperCase() + entity.slice(1)}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {step === 'UPLOAD' && 'Upload a CSV or Excel file'}
              {step === 'MAP' && 'Map your file columns to the system fields'}
              {step === 'PREVIEW' && 'Preview imported records'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {step === 'UPLOAD' && (
            <div 
              onDragOver={e => e.preventDefault()} 
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 rounded-3xl bg-white flex flex-col items-center justify-center p-12 text-center transition-colors hover:border-indigo-300 hover:bg-slate-50"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 shadow-sm">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Drag & Drop your file</h3>
              <p className="text-sm text-slate-500 mt-2 mb-8 max-w-xs">Supports .csv, .xlsx, and .xls files.</p>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-md shadow-slate-900/10 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Browse Files
                </button>
                <button
                  onClick={downloadTemplate}
                  className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-200/60">
                    <tr>
                      <th className="px-6 py-4">Expected Field</th>
                      <th className="px-6 py-4">File Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expectedFields.map(field => (
                      <tr key={field.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-slate-900">{field.label}</span>
                            {field.required && <span className="text-[10px] bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-bold tracking-wider">REQUIRED</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 focus:bg-white transition-all"
                            value={mapping[field.key] || ''}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          >
                            <option value="">-- Ignore Field --</option>
                            {headers.map(h => (
                               <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm font-medium text-amber-800 flex items-center">
                Previewing the first {mappedDataPreview.length} of {parsedData.length} records to be imported.
              </div>
              <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-200/60">
                    <tr>
                      {expectedFields.map(f => (
                        <th key={f.key} className="px-6 py-4">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappedDataPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {expectedFields.map(f => (
                          <td key={f.key} className="px-6 py-4 text-sm text-slate-700">
                            {row[f.key] || <span className="text-slate-400 italic">Empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'UPLOAD' && (
          <div className="px-8 py-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
            <button 
              onClick={() => step === 'PREVIEW' ? setStep('MAP') : reset()}
              className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
              disabled={isImporting}
            >
              Back
            </button>
            
            {step === 'MAP' && (
              <button 
                onClick={() => setStep('PREVIEW')}
                disabled={!isMappingValid()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                Continue to Preview
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'PREVIEW' && (
              <button 
                onClick={handleImport}
                disabled={isImporting}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? 'Importing Data...' : `Import ${parsedData.length} Records`}
                {!isImporting && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

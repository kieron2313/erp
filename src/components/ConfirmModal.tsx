import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/60 w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
        
        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 active:scale-95">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

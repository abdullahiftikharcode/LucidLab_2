import React from 'react';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  accentColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  accentColor = '#14b8a6',
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-[1.75rem] bg-white border border-white shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3" style={{ backgroundColor: danger ? '#fff1f2' : `${accentColor}12` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: danger ? '#ffe4e6' : '#ffffff' }}>
            <span className="material-symbols-outlined" style={{ color: danger ? '#b91c1c' : accentColor }}>
              {danger ? 'warning' : 'help'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <div className="px-6 pb-6 pt-1 flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: danger ? '#e11d48' : accentColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

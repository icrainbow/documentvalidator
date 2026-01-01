'use client';

interface Flow2ModeSwitchModalProps {
  isOpen: boolean;
  currentMode: 'empty' | 'demo' | 'upload';
  targetMode: 'demo' | 'upload';
  documentCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Flow2ModeSwitchModal({
  isOpen,
  currentMode,
  targetMode,
  documentCount,
  onConfirm,
  onCancel
}: Flow2ModeSwitchModalProps) {
  if (!isOpen) return null;

  const currentLabel = currentMode === 'demo' ? 'Demo' : 'Upload';
  const targetLabel = targetMode === 'demo' ? 'Demo' : 'Upload';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-bold text-yellow-900">
              Switch Input Mode?
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-slate-800 leading-relaxed">
            You are currently in <span className="font-bold text-purple-700">{currentLabel} Mode</span> with{' '}
            <span className="font-bold">{documentCount} document{documentCount !== 1 ? 's' : ''}</span>.
          </p>
          <p className="text-slate-800 leading-relaxed">
            Switching to <span className="font-bold text-blue-700">{targetLabel} Mode</span> will clear:
          </p>
          <ul className="ml-6 space-y-1 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span>All current documents</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span>Derived topics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span>Review results and trace</span>
            </li>
          </ul>
          <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2">
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">Note:</span> This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
          >
            Clear & Switch to {targetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


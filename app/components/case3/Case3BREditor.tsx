'use client';

import { useState } from 'react';

/**
 * Case 3: BR Editor Component
 * 
 * Minimal BR field editor for demo purposes.
 * Allows user to correct Business Requirement fields to match uploaded document.
 */

interface Case3BREditorProps {
  initialDocType?: string;
  onSubmit: (payload: { docType: string; purpose?: string; expectedDataPoints?: string }) => void;
  onCancel: () => void;
}

const DOC_TYPE_OPTIONS = [
  'Passport',
  'National ID',
  'Bank Statement',
  'Utility Bill',
  'Employment Letter',
  'Business Registration',
  'Other'
];

export default function Case3BREditor({ initialDocType, onSubmit, onCancel }: Case3BREditorProps) {
  const [docType, setDocType] = useState(initialDocType || '');
  const [purpose, setPurpose] = useState('');
  const [expectedDataPoints, setExpectedDataPoints] = useState('');

  const handleSubmit = () => {
    if (!docType) return; // Require docType

    onSubmit({
      docType,
      purpose: purpose.trim() || undefined,
      expectedDataPoints: expectedDataPoints.trim() || undefined
    });
  };

  const isValid = docType.length > 0;

  return (
    <div className="bg-white border-4 border-orange-400 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>📝</span>
          <span>Edit Business Requirement Fields</span>
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-600 hover:text-slate-800 text-sm"
        >
          ← Back
        </button>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        Correct these fields to match the uploaded document:
      </p>

      {/* Document Type */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Document Type: <span className="text-red-500">*</span>
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none"
        >
          <option value="">-- Select document type --</option>
          {DOC_TYPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Document Purpose */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Document Purpose: <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value.slice(0, 100))}
          placeholder="e.g., Financial verification for compliance review"
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none"
          maxLength={100}
        />
        <p className="text-xs text-slate-500 mt-1">{purpose.length}/100 characters</p>
      </div>

      {/* Expected Data Points */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Expected Data Points: <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <textarea
          value={expectedDataPoints}
          onChange={(e) => setExpectedDataPoints(e.target.value.slice(0, 500))}
          placeholder="e.g., Account number, transaction history, balance statement, account holder name and address"
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-slate-500 mt-1">{expectedDataPoints.length}/500 characters</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isValid
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          ✓ Save & Re-validate
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


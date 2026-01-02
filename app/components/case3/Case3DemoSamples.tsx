'use client';

import { useState } from 'react';

/**
 * Case 3: Demo Samples Panel
 * 
 * Provides download links to sample files for testing guardrail detection.
 * Files are stored in /public/demo/case3/
 */

export default function Case3DemoSamples() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-50 border-2 border-slate-300 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <span className="text-lg font-bold text-slate-800">
            Case 3: Guardrail Demo Samples
          </span>
        </div>
        <span className="text-slate-600 text-sm font-medium">
          {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-slate-600 mb-4">
            Test the Guardrail detection with these sample files:
          </p>

          {/* Wrong BR Scenario */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="text-orange-600">⚠️</span>
              <span>Wrong BR Scenario</span>
            </h4>
            <p className="text-sm text-slate-600 mb-3">
              Upload this to see "BR fields are wrong" guardrail alert.
              The document type doesn't match what the BR form expects.
            </p>
            <a
              href="/demo/case3/bank_statement_WRONG_BR.txt"
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <span>⬇</span>
              <span>Download: bank_statement_WRONG_BR.txt</span>
            </a>
          </div>

          {/* Wrong Document Scenario */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span>Wrong Document Scenario</span>
            </h4>
            <p className="text-sm text-slate-600 mb-3">
              Upload this to see "Document is wrong" guardrail alert.
              This file is completely irrelevant for KYC review.
            </p>
            <a
              href="/demo/case3/utility_bill_WRONG_DOCUMENT.txt"
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <span>⬇</span>
              <span>Download: utility_bill_WRONG_DOCUMENT.txt</span>
            </a>
          </div>

          {/* Correct Document */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Correct Document</span>
            </h4>
            <p className="text-sm text-slate-600 mb-3">
              Use this to test resolution. This document passes validation
              and can be used to replace a blocked document.
            </p>
            <a
              href="/demo/case3/passport_CORRECT.txt"
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <span>⬇</span>
              <span>Download: passport_CORRECT.txt</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


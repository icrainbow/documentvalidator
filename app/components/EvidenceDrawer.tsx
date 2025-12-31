/**
 * Flow2: Evidence Drawer Component
 * 
 * Simple drawer showing evidence references for a topic/issue.
 * Milestone B: Basic list only (no full context view).
 */

import React from 'react';

interface EvidenceRef {
  docId: string;
  filename: string;
  page?: number;
  section?: string;
  snippet: string;
}

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  evidenceRefs: EvidenceRef[];
}

export default function EvidenceDrawer({
  open,
  onClose,
  title,
  evidenceRefs
}: EvidenceDrawerProps) {
  if (!open) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-purple-600 text-white p-4 flex items-center justify-between border-b-4 border-purple-700">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">📎</span>
            Evidence: {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-purple-700 flex items-center justify-center transition-colors"
            aria-label="Close evidence drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {evidenceRefs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">📭</div>
              <p>No evidence references found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-600 mb-4">
                Found <span className="font-semibold">{evidenceRefs.length}</span> evidence reference{evidenceRefs.length > 1 ? 's' : ''}.
              </div>
              
              {evidenceRefs.map((ref, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-purple-600">#{idx + 1}</span>
                      <span className="text-sm">{ref.filename}</span>
                    </div>
                  </div>
                  
                  {ref.section && (
                    <div className="text-xs text-slate-600 mb-2">
                      Section: {ref.section}
                      {ref.page && ` • Page ${ref.page}`}
                    </div>
                  )}
                  
                  <div className="mt-2 p-3 bg-white border border-slate-300 rounded text-sm text-slate-700 italic">
                    "{ref.snippet}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}



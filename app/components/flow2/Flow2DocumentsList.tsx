'use client';

import React, { useState } from 'react';
import { Flow2Document } from '../../lib/flow2/types';

interface Flow2DocumentsListProps {
  documents: Flow2Document[];
  onRemove: (docId: string) => void;
  onClearAll: () => void;
}

const Flow2DocumentsList: React.FC<Flow2DocumentsListProps> = ({
  documents,
  onRemove,
  onClearAll,
}) => {
  const [viewingDoc, setViewingDoc] = useState<Flow2Document | null>(null);

  const handleClearAll = () => {
    if (confirm(`Remove all ${documents.length} document(s)?`)) {
      onClearAll();
    }
  };

  const handleRemove = (doc: Flow2Document) => {
    if (confirm(`Remove "${doc.filename}"?`)) {
      onRemove(doc.doc_id);
    }
  };

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4" data-testid="flow2-documents-list">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
            📚 Loaded Documents ({documents.length})
          </h3>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            🗑️ Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => (
            <div
              key={doc.doc_id}
              className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-800 text-sm truncate" title={doc.filename}>
                      {doc.filename}
                    </h4>
                    {/* Case 3: Blocked badge */}
                    {doc.guardrailBlocked && (
                      <span 
                        className="px-2 py-0.5 bg-orange-100 border border-orange-400 text-orange-800 text-xs font-bold rounded whitespace-nowrap"
                        title="This document triggered a guardrail alert"
                      >
                        ⚠️ BLOCKED
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {doc.doc_type_hint}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                {doc.text.length.toLocaleString()} characters
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingDoc(doc)}
                  className="flex-1 px-2 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleRemove(doc)}
                  className="flex-1 px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  ❌ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border-2 border-slate-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{viewingDoc.filename}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {viewingDoc.doc_type_hint}
                </span>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-2 text-xs text-slate-500">
                {viewingDoc.text.length.toLocaleString()} characters
              </div>
              <textarea
                readOnly
                value={viewingDoc.text}
                className="w-full h-96 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm bg-slate-50 text-slate-800"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-lg font-semibold text-sm bg-slate-600 text-white hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Flow2DocumentsList;



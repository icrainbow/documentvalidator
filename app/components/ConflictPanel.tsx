/**
 * Flow2: Conflict Panel Component
 * 
 * Simple list of conflicts detected during KYC review.
 * Milestone B: Basic display only (no resolution buttons).
 */

import React from 'react';

interface EvidenceRef {
  docId: string;
  filename: string;
  page?: number;
  section?: string;
  snippet: string;
}

interface Conflict {
  topicIds: string[];
  description: string;
  severity: 'high' | 'medium' | 'low';
  evidenceRefs: EvidenceRef[];
}

interface ConflictPanelProps {
  conflicts: Conflict[];
}

const SEVERITY_STYLES = {
  high: 'bg-red-100 border-red-300 text-red-800',
  medium: 'bg-orange-100 border-orange-300 text-orange-800',
  low: 'bg-yellow-100 border-yellow-300 text-yellow-800'
};

const SEVERITY_ICONS = {
  high: '🔴',
  medium: '🟠',
  low: '🟡'
};

export default function ConflictPanel({ conflicts }: ConflictPanelProps) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-5xl mb-3">✅</div>
        <p className="font-semibold">No conflicts detected.</p>
        <p className="text-sm mt-1">All information appears consistent across documents.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 mb-4 p-3 bg-red-50 border border-red-200 rounded">
        <span className="font-semibold text-red-700">⚠️ {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected</span>
        <p className="text-xs mt-1 text-slate-600">
          Conflicts indicate inconsistent or contradictory information across KYC documents.
        </p>
      </div>
      
      {conflicts.map((conflict, idx) => (
        <div
          key={idx}
          className={`border-2 rounded-lg p-4 ${SEVERITY_STYLES[conflict.severity]}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{SEVERITY_ICONS[conflict.severity]}</span>
              <div>
                <div className="font-bold text-sm uppercase tracking-wide">
                  Conflict #{idx + 1}
                </div>
                <div className="text-xs mt-0.5 opacity-75">
                  Topics: {conflict.topicIds.join(', ')}
                </div>
              </div>
            </div>
            
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
              conflict.severity === 'high' ? 'bg-red-200' :
              conflict.severity === 'medium' ? 'bg-orange-200' :
              'bg-yellow-200'
            }`}>
              {conflict.severity}
            </span>
          </div>
          
          {/* Description */}
          <div className="mb-3 p-3 bg-white/60 rounded text-sm">
            {conflict.description}
          </div>
          
          {/* Evidence */}
          {conflict.evidenceRefs.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2 opacity-75">
                Evidence ({conflict.evidenceRefs.length} source{conflict.evidenceRefs.length > 1 ? 's' : ''}):
              </div>
              <div className="space-y-2">
                {conflict.evidenceRefs.map((ref, refIdx) => (
                  <div
                    key={refIdx}
                    className="p-2 bg-white/80 border border-slate-300 rounded text-xs"
                  >
                    <div className="font-semibold text-slate-700 mb-1">
                      {ref.filename}
                      {ref.section && ` • ${ref.section}`}
                    </div>
                    <div className="text-slate-600 italic">
                      "{ref.snippet.substring(0, 150)}{ref.snippet.length > 150 ? '...' : ''}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}



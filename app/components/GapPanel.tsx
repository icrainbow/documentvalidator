/**
 * Flow2: Gap Panel Component
 * 
 * Simple list of coverage gaps in KYC documentation.
 * Milestone B: Basic display only (no "copy request" buttons).
 */

import React from 'react';

interface Coverage {
  topicId: string;
  status: 'complete' | 'partial' | 'missing';
  reason?: string;
}

interface GapPanelProps {
  gaps: Coverage[];
}

const STATUS_STYLES = {
  missing: 'bg-red-100 border-red-300 text-red-800',
  partial: 'bg-orange-100 border-orange-300 text-orange-800',
  complete: 'bg-green-100 border-green-300 text-green-800'
};

const STATUS_ICONS = {
  missing: '❌',
  partial: '⚠️',
  complete: '✅'
};

export default function GapPanel({ gaps }: GapPanelProps) {
  // Filter to only show missing/partial (not complete)
  const actualGaps = gaps.filter(g => g.status === 'missing' || g.status === 'partial');
  
  if (actualGaps.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-5xl mb-3">✅</div>
        <p className="font-semibold">All required topics covered.</p>
        <p className="text-sm mt-1">KYC documentation appears complete.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
        <span className="font-semibold text-orange-700">📋 {actualGaps.length} coverage gap{actualGaps.length > 1 ? 's' : ''} identified</span>
        <p className="text-xs mt-1 text-slate-600">
          These topics require additional documentation or clarification.
        </p>
      </div>
      
      {actualGaps.map((gap, idx) => (
        <div
          key={idx}
          className={`border-2 rounded-lg p-4 ${STATUS_STYLES[gap.status]}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{STATUS_ICONS[gap.status]}</span>
              <div>
                <div className="font-bold text-sm">
                  {gap.topicId.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-xs mt-0.5 opacity-75">
                  Topic ID: {gap.topicId}
                </div>
              </div>
            </div>
            
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
              gap.status === 'missing' ? 'bg-red-200' : 'bg-orange-200'
            }`}>
              {gap.status}
            </span>
          </div>
          
          {/* Reason */}
          {gap.reason && (
            <div className="p-3 bg-white/60 rounded text-sm">
              <span className="font-semibold">Reason:</span> {gap.reason}
            </div>
          )}
          
          {/* Action Hint */}
          <div className="mt-3 p-2 bg-white/40 border border-slate-300 rounded text-xs text-slate-700">
            {gap.status === 'missing' ? (
              <>
                <span className="font-semibold">⚠️ Action Required:</span> Request documentation for this topic from the client.
              </>
            ) : (
              <>
                <span className="font-semibold">ℹ️ Recommendation:</span> Request additional details or clarification for this topic.
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


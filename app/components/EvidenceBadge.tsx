/**
 * Flow2: Evidence Badge Component
 * 
 * Simple clickable badge showing evidence count.
 * Milestone B: Badge only (drawer TBD future).
 */

import React from 'react';

interface EvidenceBadgeProps {
  count: number;
  onClick: () => void;
}

export default function EvidenceBadge({ count, onClick }: EvidenceBadgeProps) {
  if (count === 0) {
    return null; // Don't show badge if no evidence
  }
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded text-xs font-medium text-purple-700 transition-colors"
      title={`View ${count} evidence document${count > 1 ? 's' : ''}`}
    >
      <span>📎</span>
      <span>{count} doc{count > 1 ? 's' : ''}</span>
    </button>
  );
}



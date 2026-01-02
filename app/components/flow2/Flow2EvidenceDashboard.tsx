'use client';

/**
 * Flow2EvidenceDashboard
 * 
 * 3-column evidence display for demo EDD injection feature.
 * Left: Reject comment | Middle: PDF snippet | Right: Corporate structure
 * 
 * DEMO ONLY - No real integrations.
 */

import React from 'react';

interface Flow2EvidenceDashboardProps {
  visible: boolean;
  rejectComment: string;
  pdfSnippetImageUrl: string;
  disclosureCurrent: string;
  disclosureWealth: string;
  regulationTitle: string;
  regulationEffectiveDate: string;
}

export default function Flow2EvidenceDashboard({
  visible,
  rejectComment,
  pdfSnippetImageUrl,
  disclosureCurrent,
  disclosureWealth,
  regulationTitle,
  regulationEffectiveDate,
}: Flow2EvidenceDashboardProps) {
  if (!visible) return null;
  
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 className="text-sm font-bold text-amber-900">
          Evidence Dashboard (Demo)
        </h3>
        <span className="ml-auto text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
          Enhanced Due Diligence Triggered
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Reject Comment */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Approver Comment
          </h4>
          <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-200">
            {rejectComment}
          </div>
        </div>
        
        {/* Middle: PDF Snippet */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Wealth Report Extract
          </h4>
          <div className="bg-gray-50 rounded p-2 border border-gray-200">
            <img
              src={pdfSnippetImageUrl}
              alt="Wealth Annual Report 2024"
              className="w-full h-auto rounded"
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            <span className="font-semibold">Discrepancy:</span>{' '}
            Current SOF: <span className="text-red-600 font-bold">{disclosureCurrent}</span>
            {' vs '}
            Wealth: <span className="text-red-600 font-bold">{disclosureWealth}</span>
          </p>
        </div>
        
        {/* Right: Corporate Structure */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Ownership Structure
          </h4>
          <div className="bg-gray-50 rounded p-3 border border-gray-200">
            <CorporateStructureSVG />
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Regulation:</span> {regulationTitle}
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
              ⚠️ Effective: {regulationEffectiveDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple SVG corporate structure tree
 * Client -> Shell A -> Shell B -> Beneficial Owner
 */
function CorporateStructureSVG() {
  return (
    <svg
      viewBox="0 0 200 180"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Client */}
      <rect x="60" y="10" width="80" height="30" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" rx="4" />
      <text x="100" y="28" textAnchor="middle" fontSize="11" fill="#1f2937" fontWeight="600">
        Client
      </text>
      
      {/* Arrow 1 */}
      <line x1="100" y1="40" x2="100" y2="55" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />
      
      {/* Shell A */}
      <rect x="55" y="55" width="90" height="30" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" rx="4" />
      <text x="100" y="73" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="600">
        Shell Entity A
      </text>
      
      {/* Arrow 2 */}
      <line x1="100" y1="85" x2="100" y2="100" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />
      
      {/* Shell B */}
      <rect x="55" y="100" width="90" height="30" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" rx="4" />
      <text x="100" y="118" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="600">
        Shell Entity B
      </text>
      
      {/* Arrow 3 */}
      <line x1="100" y1="130" x2="100" y2="145" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />
      
      {/* Beneficial Owner */}
      <rect x="45" y="145" width="110" height="30" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" rx="4" />
      <text x="100" y="163" textAnchor="middle" fontSize="10" fill="#14532d" fontWeight="600">
        Beneficial Owner
      </text>
      
      {/* Arrowhead marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
        </marker>
      </defs>
      
      {/* Annotation */}
      <text x="5" y="75" fontSize="8" fill="#f59e0b" fontWeight="600">
        Aliases/
      </text>
      <text x="5" y="85" fontSize="8" fill="#f59e0b" fontWeight="600">
        Nominees
      </text>
    </svg>
  );
}


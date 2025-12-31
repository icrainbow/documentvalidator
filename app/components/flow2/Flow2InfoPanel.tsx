'use client';

import { useState } from 'react';

export default function Flow2InfoPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 border-2 border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          <span className="font-semibold text-blue-900 text-sm">
            What Happens in Graph Review?
          </span>
        </div>
        <span className="text-blue-700 font-bold">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 bg-white text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-800">
            Flow2 executes an agentic graph with adaptive routing:
          </p>
          
          <div className="space-y-2 pl-2">
            <div>
              <span className="font-bold text-blue-700">1. Topic Assembler</span>
              <p className="pl-4 text-slate-600">
                Organizes uploaded documents into KYC topics (identity, wealth source, transaction patterns)
              </p>
            </div>
            
            <div>
              <span className="font-bold text-purple-700">2. Risk Triage</span>
              <p className="pl-4 text-slate-600">
                Scores overall risk (0-1 scale) and selects path:
                <br/>• Fast (&lt;0.3): Skip optional checks
                <br/>• Crosscheck (0.3-0.6): Run all parallel checks
                <br/>• Escalate (&gt;0.6): Strict checks + human gate
              </p>
            </div>
            
            <div>
              <span className="font-bold text-green-700">3. Parallel Checks</span>
              <p className="pl-4 text-slate-600">
                • Gap Collector: Missing information
                <br/>• Conflict Sweep: Cross-document contradictions
                <br/>• Policy Flags: Regulatory violations
              </p>
            </div>
            
            <div>
              <span className="font-bold text-orange-700">4. Reflection (Optional)</span>
              <p className="pl-4 text-slate-600">
                Agent pauses to evaluate: "Do I need more info? Should I rerun with stricter rules?"
                <br/>Decision: skip | rerun | escalate
              </p>
            </div>
            
            <div>
              <span className="font-bold text-slate-700">5. Output</span>
              <p className="pl-4 text-slate-600">
                • Issues list (gaps, conflicts, flags)
                <br/>• Graph trace (visible in Agents panel)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


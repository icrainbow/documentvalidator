'use client';

/**
 * Case2RecommendedStagesPanel
 * 
 * Secondary stages panel for Case2 demo path.
 * Renders OUTSIDE and BELOW Flow2MonitorPanel as an additive UI element.
 * 
 * CRITICAL: This is a demo-only client-side visualization.
 * No backend orchestration, no emails, no checkpoints are involved.
 */

import React from 'react';

interface Case2RecommendedStage {
  id: string;
  label: string;
  status: 'pending' | 'completed';
  detail?: string; // Optional: for tooltip or expanded view
}

interface Case2RecommendedStagesPanelProps {
  stages: Case2RecommendedStage[];
  visible: boolean;
}

export default function Case2RecommendedStagesPanel({
  stages,
  visible,
}: Case2RecommendedStagesPanelProps) {
  if (!visible || stages.length === 0) return null;

  return (
    <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2 mb-2">
          <span className="text-xl">📋</span>
          Recommended Review Path (CS Integration Exception)
        </h3>
        
        {/* CRITICAL MICROCOPY - EXACT TEXT */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full">
          <span className="text-amber-800 text-xs font-semibold italic">
            ⚠️ Demo path (no orchestration / no emails / no checkpoints)
          </span>
        </div>
      </div>

      {/* Stages List (Vertical Stack) */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isPending = stage.status === 'pending';
          const isCompleted = stage.status === 'completed';

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                isCompleted
                  ? 'bg-green-50 border-green-400'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              {/* Stage Number/Status Badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>

              {/* Stage Label */}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isCompleted ? 'text-green-900' : 'text-slate-700'
                  }`}
                >
                  {stage.label}
                </p>
                {stage.detail && (
                  <p className="text-xs text-slate-600 mt-1">{stage.detail}</p>
                )}
              </div>

              {/* Status Label */}
              <div>
                <span
                  className={`text-xs font-semibold uppercase ${
                    isCompleted ? 'text-green-700' : 'text-slate-500'
                  }`}
                >
                  {stage.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-purple-200">
        <p className="text-xs text-purple-700 italic">
          Note: Stages will animate to "completed" when you click "Run Process Review". 
          This is a client-side demo and does not create any backend workflow state.
        </p>
      </div>
    </div>
  );
}


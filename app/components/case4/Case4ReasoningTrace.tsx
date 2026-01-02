'use client';

/**
 * Case4ReasoningTrace
 * 
 * Timeline of reasoning steps, revealed based on currentTime.
 * Steps fade in sequentially as timeline progresses.
 */

import React from 'react';
import { ReasoningStep } from '@/app/lib/case4/case4Timeline';

interface Case4ReasoningTraceProps {
  steps: ReasoningStep[];
  currentTime: number;
}

export default function Case4ReasoningTrace({ steps, currentTime }: Case4ReasoningTraceProps) {
  const visibleSteps = steps.filter(step => currentTime >= step.atMs);
  
  if (visibleSteps.length === 0) return null;
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🧠</span>
        <h2 className="text-base font-bold text-slate-800">Agent Reasoning Trace</h2>
      </div>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {visibleSteps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200 animate-fade-in"
          >
            <span className="text-lg flex-shrink-0">{step.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-slate-500">
                t={step.atMs}ms
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {step.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



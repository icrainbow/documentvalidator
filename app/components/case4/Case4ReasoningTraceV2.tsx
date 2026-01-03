'use client';

/**
 * Case4ReasoningTraceV2 (Timeline-Driven)
 * 
 * Displays reasoning steps as they appear in timeline state.
 * No internal timers. Steps appear sequentially.
 */

import React from 'react';
import { ReasoningStep } from '@/app/lib/case4/case4TimelineV2';

interface Case4ReasoningTraceV2Props {
  steps: ReasoningStep[];
}

export default function Case4ReasoningTraceV2({ steps }: Case4ReasoningTraceV2Props) {
  
  if (steps.length === 0) {
    return (
      <div className="bg-white border-2 border-purple-300 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧠</span>
          <h2 className="text-base font-bold text-slate-800">AI Reasoning Trace</h2>
        </div>
        <p className="text-sm text-slate-500 text-center py-4">
          Waiting for bulletins to complete ingestion...
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🧠</span>
        <h2 className="text-base font-bold text-slate-800">AI Reasoning Trace</h2>
      </div>
      
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.index}
            className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 animate-fadeIn"
          >
            <span className="text-base flex-shrink-0">{step.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-slate-700 leading-relaxed">{step.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">t={step.appearedAt}ms</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


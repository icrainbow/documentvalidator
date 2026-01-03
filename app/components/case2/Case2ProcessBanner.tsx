'use client';

/**
 * Case2ProcessBanner
 * 
 * Top-level orchestrator for Case 2 UI.
 * 
 * State-driven rendering:
 * - triggered/tracing: Show thinking trace panel
 * - synthesized: Show graph + assistant text + Accept button
 * - accepted: (upload removed - unified with top-level control)
 * - files_ready: (deprecated - state remains in union but unused)
 * - started: Show success message
 */

import React, { useEffect, useRef } from 'react';
import { Case2DemoData } from '@/app/lib/case2/demoCase2Data';
import Case2ThinkingTracePanel from './Case2ThinkingTracePanel';
import Case2SuggestedPathGraph from './Case2SuggestedPathGraph';

export type Case2State = 'idle' | 'triggered' | 'tracing' | 'synthesized' | 'accepted' | 'files_ready' | 'started';

interface Case2ProcessBannerProps {
  state: Case2State;
  data: Case2DemoData;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAccept: () => void;
  isAcceptLoading?: boolean;
  onStart: () => void;
  onTraceComplete: () => void;
}

export default function Case2ProcessBanner({
  state,
  data,
  collapsed,
  onToggleCollapse,
  onAccept,
  isAcceptLoading = false,
  onStart,
  onTraceComplete
}: Case2ProcessBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  // Auto-scroll into view when first shown
  useEffect(() => {
    if (state !== 'idle' && !hasScrolledRef.current && bannerRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [state]);
  
  if (state === 'idle') return null;
  
  return (
    <div ref={bannerRef} className="mb-6 bg-blue-50 border-2 border-blue-400 rounded-xl overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-700 font-bold text-xl">
            {collapsed ? '▶' : '▼'}
          </span>
          <div className="text-left">
            <h2 className="text-lg font-bold text-blue-900">
              Case 2: CS Integration Exception
            </h2>
            <p className="text-sm text-blue-700">
              {state === 'started' ? 'Approval flow initiated' : 'Analyzing exception approval requirements'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full font-bold text-xs uppercase bg-blue-600 text-white">
          {state === 'started' ? '✓ Started' : 'Active'}
        </span>
      </button>
      
      {/* Collapsible Content */}
      {!collapsed && (
        <div className="p-6 pt-0">
          {/* Thinking Trace Panel (triggered/tracing) */}
          {(state === 'triggered' || state === 'tracing') && (
            <Case2ThinkingTracePanel
              sources={data.sources}
              isAnimating={state === 'tracing'}
              onComplete={onTraceComplete}
            />
          )}
          
          {/* Graph + Assistant Text (synthesized and beyond) */}
          {(state === 'synthesized' || state === 'accepted' || state === 'started') && (
            <>
              <Case2SuggestedPathGraph steps={data.path_steps} />
              
              {/* Assistant Text Panel */}
              <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-lg font-bold text-slate-800">Analysis Summary</h3>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                  {data.assistant_text}
                </div>
              </div>
            </>
          )}
          
          {/* Accept Button (synthesized only) */}
          {state === 'synthesized' && (
            <div className="mb-6">
              <button
                onClick={onAccept}
                disabled={isAcceptLoading}
                className={`w-full px-6 py-4 rounded-lg transition-colors font-bold text-lg shadow-md ${
                  isAcceptLoading
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAcceptLoading ? '🔄 Analyzing documents...' : '✓ Accept Recommended Process'}
              </button>
              <p className="text-xs text-slate-600 text-center mt-2">
                {isAcceptLoading 
                  ? 'Generating AI analysis of uploaded documents...'
                  : 'Click to proceed with AI analysis and show recommended approval stages'}
              </p>
            </div>
          )}
          
          {/* Success Message (started) */}
          {state === 'started' && (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    Exception Approval Flow Initiated
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed mb-3">
                    Your request has been successfully submitted to the Joint Steering Committee for review. 
                    The case will follow the approved exception path outlined above.
                  </p>
                  <div className="text-xs text-green-700 space-y-1">
                    <p><strong>Next Steps:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Data Gap Remediation team will retrieve CS archive documents</li>
                      <li>Strategic Value Waiver will be validated by LOD1</li>
                      <li>Joint Steering Committee will schedule case review</li>
                      <li>Group Head approval will be requested upon committee recommendation</li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs text-green-700 italic">
                      This is a demonstration flow. In production, automated notifications would be sent to all stakeholders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


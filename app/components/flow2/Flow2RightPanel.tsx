'use client';

import Flow2InfoPanel from './Flow2InfoPanel';
import Flow2ReviewStatus from './Flow2ReviewStatus';

interface Flow2RightPanelProps {
  flow2Documents: any[];
  isOrchestrating: boolean;
  orchestrationResult: any | null;
  isDegraded: boolean;
  degradedReason?: string;
  onRunReview: () => void;
  onRetry: () => void;
  onOpenAgents: () => void;
  agentParticipants: any[];
}

export default function Flow2RightPanel({
  flow2Documents,
  isOrchestrating,
  orchestrationResult,
  isDegraded,
  degradedReason,
  onRunReview,
  onRetry,
  onOpenAgents,
  agentParticipants
}: Flow2RightPanelProps) {
  
  const hasDocuments = flow2Documents.length > 0;
  const canRunReview = hasDocuments && !isOrchestrating;

  return (
    <div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
        
        {/* Status Display */}
        <Flow2ReviewStatus
          hasDocuments={hasDocuments}
          isOrchestrating={isOrchestrating}
          orchestrationResult={orchestrationResult}
          isDegraded={isDegraded}
          degradedReason={degradedReason}
        />

        {/* Primary Action Buttons */}
        <div className="space-y-3 mb-6">
          {isDegraded ? (
            <button
              onClick={onRetry}
              disabled={isOrchestrating}
              className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                isOrchestrating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
              }`}
            >
              {isOrchestrating ? '🔄 Running...' : '🔄 Retry Review'}
            </button>
          ) : (
            <button
              onClick={onRunReview}
              disabled={!canRunReview}
              data-testid="flow2-run-graph-review"
              className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                !canRunReview
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
              }`}
              title={!hasDocuments ? 'Load documents first' : ''}
            >
              {isOrchestrating ? '🔄 Running Review...' : '🕸️ Run Graph KYC Review'}
            </button>
          )}
          
          {/* Agents Button */}
          <button
            onClick={onOpenAgents}
            data-testid="agent-panel-button"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <span>🤖 Agents</span>
            {agentParticipants.length > 0 && (
              <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
                {agentParticipants.length}
              </span>
            )}
          </button>
        </div>

        {/* Info Panel */}
        <Flow2InfoPanel />

        {/* Results Summary (after review) */}
        {orchestrationResult && !isDegraded && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-bold text-green-800 text-sm">Review Complete</span>
            </div>
            <p className="text-xs text-green-700 mb-3">
              Graph execution successful. View detailed trace and issues in the Agents panel.
            </p>
            <button
              onClick={onOpenAgents}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
            >
              📊 View Trace & Results →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


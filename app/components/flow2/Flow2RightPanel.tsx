'use client';

import { useState, useCallback } from 'react';
import Flow2InfoPanel from './Flow2InfoPanel';
import Flow2ReviewStatus from './Flow2ReviewStatus';
import Flow2MonitorPanel, { type FlowStatus, type CheckpointMetadata, type RiskData } from './Flow2MonitorPanel';
// import Flow2LogicGraphPreview from './Flow2LogicGraphPreview'; // Hidden: info duplicates Flow Monitor
import Flow2EvidenceDashboard from './Flow2EvidenceDashboard';
import PostRejectAnalysisPanel, { type PostRejectAnalysisData } from './PostRejectAnalysisPanel';

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
  // IT Impact Review props
  onEnterITReview?: () => void;
  case4Active?: boolean;
  // Flow Monitor props
  flowMonitorRunId?: string | null;
  flowMonitorStatus?: FlowStatus;
  flowMonitorMetadata?: CheckpointMetadata | null;
  onFlowStatusChange?: (status: FlowStatus) => void;
  // Phase 8 props
  postRejectAnalysisData?: PostRejectAnalysisData | null;
  onPhase8Complete?: () => void; // Callback when Phase 8 findings should be appended
  onAnimationPlayed?: () => void; // NEW: Callback to mark animation as played
  // Case 3 props
  case3Active?: boolean;
  // Risk data for stage coloring
  riskData?: RiskData;
  // Workspace reset callback
  onStartNewReview?: () => void;
  // STRATEGIC: Case2 custom stages (no flow pollution)
  case2CustomStages?: Array<{ id: number; label: string; icon: string }> | null;
  case2CurrentStageIndex?: number;
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
  agentParticipants,
  onEnterITReview,
  flowMonitorRunId,
  flowMonitorStatus = 'idle',
  flowMonitorMetadata,
  onFlowStatusChange,
  postRejectAnalysisData,
  onPhase8Complete,
  onAnimationPlayed,
  case3Active = false,
  riskData,
  onStartNewReview,
  case2CustomStages,
  case2CurrentStageIndex,
}: Flow2RightPanelProps) {
  
  const hasDocuments = flow2Documents.length > 0;
  const canRunReview = hasDocuments && !isOrchestrating && !case3Active;
  
  // NEW: Track if Phase 8 animation is complete (controls Evidence Dashboard visibility)
  const [isPhase8AnimationComplete, setIsPhase8AnimationComplete] = useState(false);
  
  // NEW: Callback when Phase 8 animation completes or restarts
  const handlePhase8AnimationComplete = useCallback((isComplete: boolean) => {
    console.log(`[Flow2RightPanel] Phase 8 animation complete status: ${isComplete}`);
    setIsPhase8AnimationComplete(isComplete);
    
    // NEW: Trigger Phase 8 findings append when animation completes
    if (isComplete && onPhase8Complete) {
      console.log('[Flow2RightPanel] Triggering Phase 8 findings append');
      onPhase8Complete();
    }
  }, [onPhase8Complete]);
  
  // Demo EDD fields
  const isDemoEdd = flowMonitorMetadata?.demo_mode === 'edd_injection';
  const demoEvidence = (flowMonitorMetadata as any)?.demo_evidence;
  const demoInjectedNode = flowMonitorMetadata?.demo_injected_node;
  
  // Phase 8: Use post-reject analysis data if available, otherwise fallback to checkpoint metadata
  const phase8Evidence = postRejectAnalysisData?.evidence || demoEvidence;
  const phase8InjectedNode = postRejectAnalysisData?.graph_patch?.add_nodes?.[0] || demoInjectedNode;

  return (
    <div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
        
        {/* Flow Monitor - SSOT for runtime status */}
        <Flow2MonitorPanel
          runId={flowMonitorRunId || null}
          initialStatus={flowMonitorStatus}
          checkpointMetadata={flowMonitorMetadata}
          onStatusChange={onFlowStatusChange}
          riskData={riskData}
          onStartNewReview={onStartNewReview}
          customStages={case2CustomStages || undefined}
          customCurrentStageIndex={case2CurrentStageIndex}
        />
        
        {/* PHASE 8: Post-Reject Analysis (tasks, skills, findings) */}
        {postRejectAnalysisData && postRejectAnalysisData.triggered && (
          <PostRejectAnalysisPanel 
            data={postRejectAnalysisData}
            onAnimationComplete={handlePhase8AnimationComplete}
            onAnimationPlayed={onAnimationPlayed}
          />
        )}
        
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
            <>
              <button
                onClick={onRunReview}
                disabled={!canRunReview}
                data-testid="flow2-run-graph-review"
                className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                  !canRunReview
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                }`}
                title={
                  !hasDocuments 
                    ? 'Load documents first' 
                    : case3Active 
                    ? 'Review blocked - resolve guardrail alert first'
                    : ''
                }
              >
                {case3Active && '🚫 '}
                {isOrchestrating ? '🔄 Running Review...' : '🕸️ Run Process Review'}
              </button>
              
              {/* IT Impact Review Button */}
              {onEnterITReview && (
                <button
                  onClick={onEnterITReview}
                  disabled={!hasDocuments || case3Active || isOrchestrating}
                  className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                    !hasDocuments || case3Active || isOrchestrating
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                  }`}
                  title={
                    !hasDocuments 
                      ? 'Load documents first' 
                      : case3Active 
                      ? 'Review blocked - resolve guardrail alert first'
                      : isOrchestrating
                      ? 'KYC review in progress - please wait'
                      : ''
                  }
                >
                  🔧 Run IT Impact Review
                </button>
              )}
              
              {/* Case 3: Guardrail helper text */}
              {case3Active && (
                <p className="text-xs text-orange-600 mt-2 text-center">
                  ⚠️ Review blocked: Resolve the guardrail alert above to continue.
                </p>
              )}
            </>
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

        {/* Logic Graph Preview - HIDDEN: duplicates Flow Monitor's dynamic step info
        {flowMonitorRunId && (
          <div className="mb-6">
            <Flow2LogicGraphPreview injectedNode={phase8InjectedNode || null} />
          </div>
        )}
        */}

        {/* Evidence Dashboard (Phase 8 or demo fallback) */}
        {/* NEW LOGIC: Only show Evidence AFTER Phase 8 animation completes (or if demo EDD without animation) */}
        {((postRejectAnalysisData?.triggered && isPhase8AnimationComplete) || (isDemoEdd && !postRejectAnalysisData?.triggered)) && phase8Evidence && (
          <div className="mb-6" id="flow2-evidence">
            <Flow2EvidenceDashboard
              visible={true}
              rejectComment={flowMonitorMetadata?.decision_comment || postRejectAnalysisData?.reviewer_text || ''}
              pdfSnippetImageUrl={phase8Evidence.pdf_highlight_image_url || phase8Evidence.pdf_snippet_image}
              disclosureCurrent={phase8Evidence.disclosures?.current || phase8Evidence.disclosure_current}
              disclosureWealth={phase8Evidence.disclosures?.wealth || phase8Evidence.disclosure_wealth}
              regulationTitle={phase8Evidence.regulation?.title || phase8Evidence.regulation_title}
              regulationEffectiveDate={phase8Evidence.regulation?.effective_date || phase8Evidence.regulation_effective_date}
            />
          </div>
        )}

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


'use client';

import { useEffect, useState, useCallback } from 'react';
import { applyFlow2DemoNodeStatusPolicy, isFlow2DemoMode } from '@/app/lib/flow2/demoNodeStatusPolicy';

export type FlowStatus = 'idle' | 'running' | 'waiting_human' | 'resuming' | 'completed' | 'rejected' | 'error';

export interface CheckpointMetadata {
  approval_email_to?: string;
  approval_sent_at?: string;
  reminder_sent_at?: string;
  decision?: 'approve' | 'reject'; // NEW: Stage 1 decision
  decision_comment?: string;
  decided_by?: string;
  decided_at?: string;
  // Demo fields
  demo_mode?: 'edd_injection';
  demo_injected_node?: { id: string; label: string };
  // Restoration fields
  documents?: any[];
  graph_state?: any;
  // NEW: EDD stage and final decision
  edd_stage?: {
    status: string;
    approval_email_to?: string;
    approval_sent_at?: string;
    decision?: 'approve' | 'reject'; // EDD decision
    decided_at?: string;
    decided_by?: string;
  };
  final_decision?: string;
}

// NEW: Risk data for stage coloring
export interface RiskData {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  hasHighRisk?: boolean;
  warningsCount?: number;
  riskSignals?: any[];
}

interface Flow2MonitorPanelProps {
  runId: string | null;
  initialStatus?: FlowStatus;
  checkpointMetadata?: CheckpointMetadata | null;
  onStatusChange?: (status: FlowStatus) => void;
  riskData?: RiskData; // NEW: For stage coloring
  onStartNewReview?: () => void; // NEW: Callback to reset workspace
}

// Business stages (NOT node-level)
const BUSINESS_STAGES = [
  { id: 1, label: 'Document Analysis', icon: '📄' },
  { id: 2, label: 'Risk Assessment', icon: '⚠️' },
  { id: 3, label: 'Compliance Review', icon: '✓' },
  { id: 4, label: 'Human Review', icon: '👤' },
  { id: 5, label: 'EDD Review', icon: '🔍' },      // NEW
  { id: 6, label: 'Final Report', icon: '📊' },
];

function getCurrentStageIndex(status: FlowStatus, eddStage?: { status: string; decision?: string }): number {
  switch (status) {
    case 'idle': return 0;
    case 'running': return 2; // In progress at stages 2-3
    case 'waiting_human':
      // If EDD stage exists and is waiting, show stage 5
      if (eddStage && eddStage.status === 'waiting_edd_approval') {
        return 5;
      }
      return 4; // Stage 1 waiting
    case 'resuming': return eddStage ? 5 : 4;
    case 'completed': 
      // UNIVERSAL: If EDD approved, workflow is fully complete (stage 6)
      if (eddStage && eddStage.decision === 'approve') {
        return 6;
      }
      return 6; // All done
    case 'rejected':
      // UNIVERSAL: If EDD approved, workflow is fully complete (stage 6), not rejected
      if (eddStage && eddStage.decision === 'approve') {
        return 6;
      }
      // Show which stage was rejected (in progress, not complete)
      if (eddStage && eddStage.status === 'rejected') {
        return 5; // EDD rejected (in progress at stage 5)
      }
      return 4; // Stage 1 rejected (in progress at stage 4)
    case 'error': return 2;
    default: return 0;
  }
}

function formatTimeAgo(isoTimestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function Flow2MonitorPanel({
  runId,
  initialStatus = 'idle',
  checkpointMetadata,
  onStatusChange,
  riskData,
  onStartNewReview,
}: Flow2MonitorPanelProps) {
  const [status, setStatus] = useState<FlowStatus>(initialStatus);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [reminderDisabled, setReminderDisabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // DEMO-ONLY: Detect if we should apply historical node status policy
  const shouldApplyDemoPolicy = checkpointMetadata ? isFlow2DemoMode(checkpointMetadata) : false;
  
  // NEW: Detect if workflow is fully completed
  // UNIVERSAL RULE: If current stage reached the LAST stage (Final Report), it's fully completed
  const currentStageIndex = getCurrentStageIndex(status, checkpointMetadata?.edd_stage);
  const isFullyCompleted = currentStageIndex === BUSINESS_STAGES.length;
  
  // Helper: Get risk-based stage color
  const getRiskStageColor = (stageId: number): string => {
    if (stageId !== 2 || !riskData) return ''; // Only apply to Risk Assessment stage (id: 2)
    
    const { riskLevel, hasHighRisk, warningsCount = 0, riskSignals = [] } = riskData;
    
    // Critical or high risk = RED
    if (riskLevel === 'critical' || riskLevel === 'high' || hasHighRisk || riskSignals.some((s: any) => s.severity === 'high' || s.severity === 'critical')) {
      return 'bg-red-500 text-white';
    }
    
    // Medium risk or warnings = YELLOW
    if (riskLevel === 'medium' || warningsCount > 0 || riskSignals.some((s: any) => s.severity === 'medium')) {
      return 'bg-yellow-500 text-white';
    }
    
    // Otherwise GREEN (completed stage)
    return 'bg-green-500 text-white';
  };
  
  // Handler: Scroll to risk details
  const handleRiskStageClick = () => {
    const riskElement = document.getElementById('risk-details');
    if (riskElement) {
      // Get the element's position relative to viewport
      const rect = riskElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 100; // 100px offset from top
      
      // Scroll the window (not the container)
      window.scrollTo({ 
        top: targetY,
        behavior: 'smooth' 
      });
    } else {
      console.warn('[Flow Monitor] Risk details element not found (id="risk-details")');
    }
  };

  // Sync with prop changes
  useEffect(() => {
    if (initialStatus !== status) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  // Polling logic
  useEffect(() => {
    if (!runId) return;
    
    // Poll when waiting for stage 1 approval OR stage 2 EDD approval
    const shouldPoll = status === 'waiting_human' || 
                      status === 'resuming' || 
                      checkpointMetadata?.edd_stage?.status === 'waiting_edd_approval';
    
    if (!shouldPoll) return;

    let intervalId: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/flow2/approvals/poll?run_id=${runId}`);
        const data = await response.json();

        setLastCheckedAt(new Date().toISOString());

        if (data.status === 'approved') {
          setStatus('resuming');
          onStatusChange?.('resuming');
          showToast('✅ Workflow approved! Resuming...');
          // Continue polling to detect completion
        } else if (data.status === 'rejected') {
          setStatus('rejected');
          onStatusChange?.('rejected');
          showToast('❌ Workflow rejected');
          // Stop polling
          if (intervalId) clearInterval(intervalId);
        } else if (data.status === 'not_found') {
          setStatus('error');
          onStatusChange?.('error');
          if (intervalId) clearInterval(intervalId);
        }
        // If still waiting_human or waiting_edd_approval, continue polling
      } catch (error) {
        console.error('[Flow Monitor] Poll error:', error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 3 seconds
    intervalId = setInterval(poll, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [runId, status, checkpointMetadata?.edd_stage?.status, onStatusChange]);

  const handleSendReminder = useCallback(async () => {
    if (!runId) return;

    setReminderDisabled(true);

    try {
      const response = await fetch('/api/flow2/approvals/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('📧 Reminder email sent to approver');
        // Keep disabled for 5 minutes
        setTimeout(() => setReminderDisabled(false), 300000);
      } else {
        showToast(`❌ ${data.error || 'Failed to send reminder'}`);
        setReminderDisabled(false);
      }
    } catch (error) {
      console.error('[Flow Monitor] Remind error:', error);
      showToast('❌ Network error');
      setReminderDisabled(false);
    }
  }, [runId]);

  // Scroll to evidence section handler
  const handleScrollToEvidence = () => {
    const evidenceElement = document.getElementById('flow2-evidence');
    if (evidenceElement) {
      evidenceElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Check if reminder was sent recently (client-side cooldown)
  const isReminderRecentlySent = checkpointMetadata?.reminder_sent_at
    ? (Date.now() - new Date(checkpointMetadata.reminder_sent_at).getTime()) < 300000
    : false;

  return (
    <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          📊 Flow Monitor
        </h3>
        {lastCheckedAt && status !== 'idle' && (
          <span className="text-xs text-slate-500">
            Last checked {formatTimeAgo(lastCheckedAt)}
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        {status === 'idle' && (
          <div className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
            No active workflow
          </div>
        )}
        {status === 'running' && (
          <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-pulse">🔄</span> IN PROGRESS
          </div>
        )}
        {status === 'waiting_human' && (
          <div className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-pulse">⏳</span> AWAITING APPROVAL
          </div>
        )}
        {status === 'resuming' && (
          <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-pulse">🔄</span> IN PROGRESS
          </div>
        )}
        {isFullyCompleted && (
          <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            ✅ APPROVED & COMPLETED
          </div>
        )}
        {!isFullyCompleted && (status === 'completed' || status === 'rejected' || status === 'error') && (
          <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-pulse">🔄</span> IN PROGRESS
          </div>
        )}
      </div>

      {/* Business Stage Stepper */}
      {status !== 'idle' && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            {BUSINESS_STAGES.map((stage, idx) => {
              const currentStageIndex = getCurrentStageIndex(status, checkpointMetadata?.edd_stage);
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex - 1;
              const isPending = idx >= currentStageIndex;
              
              // Special case: Human Review (stage 4) rejected at stage 1
              const isRejectedAtHumanReview = status === 'rejected' && stage.id === 4 && !checkpointMetadata?.edd_stage;
              
              // Special case: Risk Assessment stage (stage 2) - use risk-based coloring when completed
              const isRiskStage = stage.id === 2;
              const riskStageColor = (isRiskStage && isCompleted) ? getRiskStageColor(stage.id) : '';
              
              // DEMO-ONLY: Apply historical status policy for Human Review stage
              const isHumanStage = stage.id === 4;
              let humanStageColor = '';
              let humanStageIcon = stage.icon;
              if (isHumanStage && shouldApplyDemoPolicy && isCompleted) {
                // Check if human ever rejected (which triggers EDD)
                const hadHumanRejection = !!(
                  checkpointMetadata?.decision === 'reject' ||
                  checkpointMetadata?.edd_stage // EDD only happens after rejection
                );
                if (hadHumanRejection) {
                  humanStageColor = 'bg-red-500 text-white'; // RED for historical rejection
                  humanStageIcon = '✗';
                  console.log('[Flow2Monitor DEMO] Human stage: detected rejection → RED');
                }
              }
              
              // Special case: Final Report (stage 6) - show as completed (green) when fully approved
              const isFinalReport = stage.id === 6;
              const finalReportCompleted = isFinalReport && isFullyCompleted;
              
              // Special case: EDD Review (stage 5) states
              let eddStepColor = '';
              let eddStepIcon = stage.icon;
              if (stage.id === 5 && checkpointMetadata?.edd_stage) {
                const eddStatus = checkpointMetadata.edd_stage.status;
                if (eddStatus === 'waiting_edd_approval') {
                  eddStepColor = 'bg-orange-500 text-white ring-4 ring-orange-200'; // Waiting (current)
                  eddStepIcon = '⏳';
                } else if (eddStatus === 'approved') {
                  eddStepColor = 'bg-green-500 text-white'; // Approved (completed)
                  eddStepIcon = '✓';
                } else if (eddStatus === 'rejected') {
                  eddStepColor = 'bg-red-500 text-white'; // Rejected
                  eddStepIcon = '✗';
                } else if (eddStatus === 'running') {
                  eddStepColor = 'bg-blue-500 text-white ring-4 ring-blue-200'; // Running
                  eddStepIcon = '⚙️';
                }
              }

              return (
                <div key={stage.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={isRiskStage && isCompleted ? handleRiskStageClick : undefined}
                      disabled={!isRiskStage || !isCompleted}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        eddStepColor || 
                        humanStageColor ||  // DEMO: Human rejection color (priority after EDD)
                        riskStageColor || 
                        (finalReportCompleted ? 'bg-green-500 text-white' : '') || // Final Report green when fully approved
                        (isRejectedAtHumanReview
                          ? 'bg-red-500 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                          : 'bg-slate-200 text-slate-500')
                      } ${isRiskStage && isCompleted ? 'cursor-pointer hover:ring-4 hover:ring-blue-200' : 'cursor-default'}`}
                      title={isRiskStage && isCompleted ? 'Click to view risk details' : stage.label}
                    >
                      {eddStepIcon || humanStageIcon || (isRejectedAtHumanReview ? '✗' : (isCompleted || finalReportCompleted) ? '✓' : stage.icon)}
                    </button>
                    <div
                      className={`mt-1 text-xs font-medium text-center ${
                        isRejectedAtHumanReview ? 'text-red-700' : isCurrent ? 'text-blue-700' : 'text-slate-600'
                      }`}
                      style={{ maxWidth: '80px' }}
                    >
                      {stage.label}
                    </div>
                  </div>
                  {idx < BUSINESS_STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting Human Details */}
      {status === 'waiting_human' && checkpointMetadata && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📧</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900 mb-1">
                Review Email Sent
              </p>
              <p className="text-xs text-orange-700 mb-1">
                <strong>To:</strong> {checkpointMetadata.approval_email_to || 'Unknown'}
              </p>
              {checkpointMetadata.approval_sent_at && (
                <p className="text-xs text-orange-600">
                  <strong>Sent:</strong> {formatTimeAgo(checkpointMetadata.approval_sent_at)}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSendReminder}
            disabled={reminderDisabled || isReminderRecentlySent}
            className={`mt-3 w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              reminderDisabled || isReminderRecentlySent
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isReminderRecentlySent
              ? '📨 Reminder Sent Recently'
              : reminderDisabled
              ? '⏳ Sending...'
              : '📨 Send Reminder'}
          </button>

          <p className="mt-2 text-xs text-center text-orange-600">
            Auto-checking for approval every 3 seconds...
          </p>
        </div>
      )}
      
      {/* Rejection Details */}
      {status === 'rejected' && checkpointMetadata?.decision_comment && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={handleScrollToEvidence}
          title="Click to view evidence details"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Rejection Reason
              </p>
              <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap bg-white border border-red-200 rounded p-3">
                {checkpointMetadata.decision_comment}
              </p>
              {checkpointMetadata.decided_by && (
                <p className="text-xs text-red-600 mt-2">
                  <strong>Rejected by:</strong> {checkpointMetadata.decided_by}
                </p>
              )}
              {checkpointMetadata.decided_at && (
                <p className="text-xs text-red-600 mt-1">
                  <strong>Date:</strong> {formatTimeAgo(checkpointMetadata.decided_at)}
                </p>
              )}
              <p className="text-xs text-red-700 mt-2 italic">
                💡 Click to view evidence details below
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* EDD Waiting State */}
      {checkpointMetadata?.edd_stage?.status === 'waiting_edd_approval' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900 mb-1">
                EDD Approval Email Sent
              </p>
              <p className="text-xs text-purple-700 mb-1">
                <strong>To:</strong> {checkpointMetadata.edd_stage.approval_email_to || 'Unknown'}
              </p>
              {checkpointMetadata.edd_stage.approval_sent_at && (
                <p className="text-xs text-purple-600">
                  <strong>Sent:</strong> {formatTimeAgo(checkpointMetadata.edd_stage.approval_sent_at)}
                </p>
              )}
              <p className="text-xs text-purple-600 mt-2">
                Auto-checking for EDD approval every 3 seconds...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EDD Approved State */}
      {checkpointMetadata?.edd_stage?.status === 'approved' && checkpointMetadata.final_decision === 'approved_with_edd' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900 mb-2">
                EDD Approved
              </p>
              {checkpointMetadata.edd_stage.decided_by && (
                <p className="text-xs text-green-700 mt-1">
                  <strong>Approved by:</strong> {checkpointMetadata.edd_stage.decided_by}
                </p>
              )}
              {checkpointMetadata.edd_stage.decided_at && (
                <p className="text-xs text-green-600 mt-1">
                  <strong>Date:</strong> {formatTimeAgo(checkpointMetadata.edd_stage.decided_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Details (Stage 1 approved, no EDD) */}
      {status === 'completed' && checkpointMetadata?.decided_by && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900 mb-1">
                Workflow Approved
              </p>
              <p className="text-xs text-green-700 mb-1">
                <strong>Approved by:</strong> {checkpointMetadata.decided_by}
              </p>
              {checkpointMetadata.decided_at && (
                <p className="text-xs text-green-600">
                  <strong>Date:</strong> {formatTimeAgo(checkpointMetadata.decided_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Start New Review Button (only when fully completed) */}
      {isFullyCompleted && onStartNewReview && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={onStartNewReview}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-lg">🔄</span>
            <span>Start New Review</span>
          </button>
          <p className="text-xs text-slate-500 text-center mt-2">
            Clear workspace and begin a fresh KYC review
          </p>
        </div>
      )}

      {/* Resuming Message */}
      {status === 'resuming' && checkpointMetadata?.decided_by && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800">
            ✅ Approved by <strong>{checkpointMetadata.decided_by}</strong>
          </p>
          <p className="text-xs text-green-600 mt-1">Continuing workflow...</p>
        </div>
      )}

      {/* Rejected Details */}
      {status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-red-800 mb-1">
            ✗ Workflow Rejected
          </p>
          {checkpointMetadata?.decided_by && (
            <p className="text-xs text-red-700 mb-1">
              <strong>By:</strong> {checkpointMetadata.decided_by}
            </p>
          )}
          {checkpointMetadata?.decision_comment && (
            <p className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded">
              <strong>Reason:</strong> {checkpointMetadata.decision_comment}
            </p>
          )}
          {/* Demo EDD injection hint */}
          {checkpointMetadata?.demo_mode === 'edd_injection' && checkpointMetadata.demo_injected_node && (
            <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded text-xs text-amber-900">
              <strong>🔄 Dynamic step added:</strong>{' '}
              {checkpointMetadata.demo_injected_node.label} — triggered by ambiguous rejection
            </div>
          )}
          {runId && (
            <p className="text-xs text-red-500 mt-2">
              Run ID: {runId.slice(0, 13)}...
            </p>
          )}
        </div>
      )}

      {/* Completed Details */}
      {status === 'completed' && runId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            All stages completed successfully
          </p>
          <p className="text-xs text-green-600 mt-1">
            Run ID: {runId.slice(0, 13)}...
          </p>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-up">
          {toastMessage}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}


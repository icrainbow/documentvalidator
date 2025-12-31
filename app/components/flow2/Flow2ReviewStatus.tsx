'use client';

interface Flow2ReviewStatusProps {
  hasDocuments: boolean;
  isOrchestrating: boolean;
  orchestrationResult: any | null;
  isDegraded: boolean;
  degradedReason?: string;
}

export default function Flow2ReviewStatus({
  hasDocuments,
  isOrchestrating,
  orchestrationResult,
  isDegraded,
  degradedReason
}: Flow2ReviewStatusProps) {
  
  // Determine status
  let statusText: string;
  let explanation: string;
  let badgeColor: string;

  if (isDegraded) {
    statusText = 'Review Failed';
    explanation = degradedReason || 'Graph execution encountered an error.';
    badgeColor = 'bg-red-600 text-white';
  } else if (isOrchestrating) {
    statusText = 'Review Running';
    explanation = 'Graph execution in progress...';
    badgeColor = 'bg-blue-600 text-white';
  } else if (orchestrationResult) {
    // Extract metadata from trace
    const trace = orchestrationResult.graphReviewTrace;
    const riskScore = trace?.events?.find((e: any) => e.nodeId === 'risk_triage')?.data?.riskScore;
    const path = trace?.events?.find((e: any) => e.nodeId === 'routing_decision')?.data?.selectedPath;
    const issueCount = (orchestrationResult.gaps?.length || 0) + (orchestrationResult.conflicts?.length || 0);
    
    statusText = 'Review Complete';
    explanation = riskScore !== undefined && path
      ? `Risk score: ${riskScore.toFixed(2)} (${getRiskLevel(riskScore)}). Path: ${path}. ${issueCount} issue${issueCount !== 1 ? 's' : ''} detected.`
      : `Graph execution successful. ${issueCount} issue${issueCount !== 1 ? 's' : ''} detected.`;
    badgeColor = 'bg-green-600 text-white';
  } else {
    statusText = 'Pending Review';
    explanation = hasDocuments 
      ? 'Documents loaded. Click "Run Graph KYC Review" to analyze.'
      : 'Load or upload KYC documents to begin.';
    badgeColor = 'bg-slate-600 text-white';
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${badgeColor}`}>
          {statusText}
        </span>
        {orchestrationResult && (
          <span className="text-xs text-slate-500 font-mono">
            Trace: {orchestrationResult.parent_trace_id?.substring(0, 8)}...
          </span>
        )}
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score < 0.3) return 'Low';
  if (score < 0.6) return 'Medium';
  return 'High';
}


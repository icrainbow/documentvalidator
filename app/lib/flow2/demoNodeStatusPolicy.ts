/**
 * DEMO-ONLY: Flow2 Node Status Policy
 * 
 * Preserves historical reject/warning semantics in node colors
 * even after final approval/completion.
 * 
 * CONSTRAINTS:
 * - Only applies to Flow2 demo mode
 * - Does not affect Flow1 or production paths
 * - Reads from existing graph_state/trace/issues data
 */

export type UiNodeStatus = 'executed' | 'skipped' | 'waiting' | 'failed';

export interface NodeStatusPolicyArgs {
  nodeId: string;
  nodeName: string;
  baseStatus: UiNodeStatus;
  graphState?: any;
  checkpointMetadata?: any;
  issues?: any[];
  trace?: any;
}

/**
 * Apply Flow2 demo node status policy
 * 
 * RULES (priority order):
 * 1. Human Gate/Review node + ever rejected → RED ('failed')
 * 2. Risk Assessment node + any warnings → YELLOW ('waiting') or RED if high
 * 3. Otherwise → keep baseStatus
 */
export function applyFlow2DemoNodeStatusPolicy(args: NodeStatusPolicyArgs): UiNodeStatus {
  const { nodeId, nodeName, baseStatus, checkpointMetadata, issues = [], graphState } = args;
  
  const normalizedNodeName = nodeName.toLowerCase().replace(/_/g, ' ');
  
  // RULE 1: Human Gate/Review node that was ever rejected → RED
  if (normalizedNodeName.includes('human') || normalizedNodeName.includes('gate') || normalizedNodeName.includes('review approval')) {
    // Check if there was ever a rejection
    const hadRejection = checkHumanRejection(checkpointMetadata, graphState, issues);
    if (hadRejection) {
      console.log(`[DemoNodePolicy] ${nodeName}: Human rejection detected → RED`);
      return 'failed'; // RED
    }
  }
  
  // RULE 2: Risk Assessment node with warnings → YELLOW or RED
  if (normalizedNodeName.includes('risk') || normalizedNodeName.includes('triage') || normalizedNodeName.includes('assessment')) {
    const riskLevel = checkRiskLevel(issues, graphState);
    if (riskLevel === 'high') {
      console.log(`[DemoNodePolicy] ${nodeName}: High risk detected → RED`);
      return 'failed'; // RED
    } else if (riskLevel === 'medium' || riskLevel === 'low') {
      console.log(`[DemoNodePolicy] ${nodeName}: Medium/Low risk detected → YELLOW`);
      return 'waiting'; // YELLOW
    }
  }
  
  // RULE 3: Keep base status for other nodes
  return baseStatus;
}

/**
 * Check if human review was ever rejected
 */
function checkHumanRejection(checkpointMetadata?: any, graphState?: any, issues?: any[]): boolean {
  // Check 1: checkpoint decision
  if (checkpointMetadata?.decision === 'reject' || checkpointMetadata?.decision === 'rejected') {
    return true;
  }
  
  // Check 2: EDD stage exists (only triggered after rejection)
  if (checkpointMetadata?.edd_stage) {
    return true; // EDD only happens after Stage 1 rejection
  }
  
  // Check 3: graph_state decision trace
  if (graphState?.decision_trace) {
    const hasReject = graphState.decision_trace.some((d: any) => 
      d.decision === 'reject' || d.decision === 'rejected' || d.action === 'reject'
    );
    if (hasReject) return true;
  }
  
  // Check 4: issues indicating human rejection
  if (issues && issues.length > 0) {
    const hasHumanRejectIssue = issues.some((issue: any) => 
      issue.agent?.includes('human') || 
      issue.agent?.includes('Human') ||
      issue.category?.includes('human_review') ||
      issue.source?.includes('human')
    );
    if (hasHumanRejectIssue) return true;
  }
  
  return false;
}

/**
 * Check risk level from issues
 * Returns: 'high' | 'medium' | 'low' | null
 */
function checkRiskLevel(issues?: any[], graphState?: any): 'high' | 'medium' | 'low' | null {
  if (!issues || issues.length === 0) return null;
  
  // Risk categories (KYC-related)
  const riskCategories = [
    'kyc_risk', 'sanctions', 'pep', 'aml', 'ubo', 'tax_evasion',
    'source_of_funds', 'source_of_wealth', 'ownership', 'jurisdiction',
    'adverse_media', 'politically_exposed'
  ];
  
  let highestSeverity: 'high' | 'medium' | 'low' | null = null;
  
  for (const issue of issues) {
    // Check if this is a risk-related issue
    const isRiskIssue = 
      riskCategories.some(cat => 
        issue.category?.toLowerCase().includes(cat) ||
        issue.type?.toLowerCase().includes(cat) ||
        issue.ruleRef?.toLowerCase().includes(cat)
      ) ||
      issue.severity; // If has severity, likely a risk issue
    
    if (!isRiskIssue) continue;
    
    // Normalize severity
    const severity = normalizeSeverity(issue.severity);
    
    if (severity === 'high' && !highestSeverity) {
      highestSeverity = 'high';
    } else if (severity === 'medium' && highestSeverity !== 'high') {
      highestSeverity = 'medium';
    } else if (severity === 'low' && !highestSeverity) {
      highestSeverity = 'low';
    }
  }
  
  return highestSeverity;
}

/**
 * Normalize severity from various formats to canonical
 */
function normalizeSeverity(severity?: string): 'high' | 'medium' | 'low' | null {
  if (!severity) return null;
  
  const s = severity.toLowerCase();
  
  if (s === 'high' || s === 'critical' || s === 'fail') {
    return 'high';
  } else if (s === 'medium' || s === 'warning' || s === 'warn') {
    return 'medium';
  } else if (s === 'low' || s === 'info' || s === 'minor') {
    return 'low';
  }
  
  return null;
}

/**
 * Helper to detect if this is Flow2 demo mode
 */
export function isFlow2DemoMode(checkpointMetadata?: any): boolean {
  // Check for demo indicators
  return !!(
    checkpointMetadata?.demo_mode ||
    checkpointMetadata?.demo_evidence ||
    checkpointMetadata?.edd_stage // EDD is demo-specific
  );
}


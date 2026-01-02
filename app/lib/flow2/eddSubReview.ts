/**
 * Flow2: EDD Sub-Review Starter (Stage 2)
 * 
 * Idempotent: Only starts EDD sub-review once per rejection.
 * Deterministic: Uses demo-only outputs, no external calls.
 */

import { randomBytes } from 'crypto';
import type { Flow2Checkpoint, EddStage } from './checkpointTypes';
import { sendEddApprovalEmail } from '../email/smtpAdapter';
import { saveCheckpoint } from './checkpointStore';

export interface StartEddSubReviewResult {
  ok: boolean;
  already_started?: boolean; // True if idempotency guard triggered
  updates?: Partial<Flow2Checkpoint>;
  errors?: string[];
}

/**
 * Start EDD sub-review with idempotency guarantee
 * 
 * IDEMPOTENCY: If checkpoint already has edd_stage.approval_token or approval_sent_at,
 * returns no-op without sending duplicate email.
 */
export async function startEddSubReview(
  checkpoint: Flow2Checkpoint,
  rejectionReason: string
): Promise<StartEddSubReviewResult> {
  // ========== IDEMPOTENCY GUARD ==========
  if (checkpoint.edd_stage?.approval_token || checkpoint.edd_stage?.approval_sent_at) {
    console.log('[EddSubReview] ⚠️ EDD sub-review already started (idempotent guard)');
    console.log('[EddSubReview] Existing token:', checkpoint.edd_stage.approval_token?.slice(0, 8) + '...');
    return {
      ok: true,
      already_started: true,
      updates: {}, // No changes
    };
  }
  
  // ========== GENERATE DETERMINISTIC EDD OUTPUTS ==========
  const eddFindings = [
    {
      severity: 'high',
      title: 'Source of Funds Mismatch',
      detail: 'Current disclosure: $5M from business sale | Wealth division record: $50M AUM (10x discrepancy)',
    },
    {
      severity: 'medium',
      title: 'Policy Change Triggers Additional Review',
      detail: 'Dec 1 2025 regulation: Offshore holding structures now require EDD',
    },
    {
      severity: 'medium',
      title: 'Complex Offshore Structure',
      detail: '3-layer chain (BVI → Cayman → Swiss trust) obscures ultimate beneficial owner',
    },
  ];
  
  const evidenceSummary = 'SOF mismatch: $5M disclosed vs $50M in Wealth report. 3-layer offshore structure detected. Policy update effective Dec 1 2025 requires EDD for offshore holdings.';
  
  const graphPatch = {
    add_nodes: [
      { id: 'edd', label: 'Enhanced Due Diligence (EDD)', type: 'review' }
    ],
    add_edges: [
      { from: 'human_review', to: 'edd', label: 'Route: EDD' },
      { from: 'edd', to: 'finalization', label: 'Complete' }
    ]
  };
  
  // ========== GENERATE NEW APPROVAL TOKEN ==========
  const eddToken = randomBytes(16).toString('hex'); // 32-char hex
  
  // ========== BUILD EDD STAGE OBJECT ==========
  const now = new Date().toISOString();
  const eddStage: EddStage = {
    status: 'waiting_edd_approval',
    started_at: now,
    approval_token: eddToken,
    approval_email_to: checkpoint.approval_email_to, // Reuse stage 1 approver
    approval_email_sent: false, // Will be set to true after email send
    approval_sent_at: undefined, // Will be set after email send
    demo_edd_outputs: {
      findings: eddFindings,
      evidence_summary: evidenceSummary,
      graph_patch: graphPatch,
    },
  };
  
  // ========== PREPARE CHECKPOINT UPDATES ==========
  const updates: Partial<Flow2Checkpoint> = {
    edd_stage: eddStage,
    event_log: [
      ...(checkpoint.event_log || []),
      {
        timestamp: now,
        event: 'edd_started',
        details: { rejection_reason: rejectionReason.slice(0, 100) },
      },
    ],
  };
  
  // ========== SAVE CHECKPOINT (BEFORE EMAIL) ==========
  // This ensures poll endpoint sees edd_stage state even if email fails
  const updatedCheckpoint = { ...checkpoint, ...updates };
  
  try {
    await saveCheckpoint(updatedCheckpoint);
    console.log('[EddSubReview] ✅ Checkpoint saved with EDD stage');
  } catch (error: any) {
    console.error('[EddSubReview] ❌ Failed to save checkpoint:', error.message);
    return {
      ok: false,
      errors: [`Failed to save checkpoint: ${error.message}`],
    };
  }
  
  // ========== SEND EMAIL #2 ==========
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    await sendEddApprovalEmail({
      run_id: checkpoint.run_id,
      approval_token: eddToken,
      recipient: checkpoint.approval_email_to!,
      checkpoint: updatedCheckpoint,
      edd_findings: eddFindings,
      base_url: baseUrl,
    });
    
    console.log('[EddSubReview] ✅ Email #2 sent successfully');
    
    // Update checkpoint: mark email as sent
    updatedCheckpoint.edd_stage!.approval_email_sent = true;
    updatedCheckpoint.edd_stage!.approval_sent_at = new Date().toISOString();
    updatedCheckpoint.event_log = [
      ...(updatedCheckpoint.event_log || []),
      {
        timestamp: new Date().toISOString(),
        event: 'edd_email_sent',
        details: { recipient: checkpoint.approval_email_to },
      },
    ];
    
    await saveCheckpoint(updatedCheckpoint);
    console.log('[EddSubReview] ✅ Checkpoint updated with email sent flag');
    
  } catch (error: any) {
    console.error('[EddSubReview] ❌ Failed to send Email #2:', error.message);
    // Non-critical: checkpoint is saved with edd_stage, manual retry possible
    return {
      ok: false,
      errors: [`Failed to send EDD approval email: ${error.message}`],
    };
  }
  
  // ========== RETURN SUCCESS ==========
  return {
    ok: true,
    already_started: false,
    updates: {
      edd_stage: updatedCheckpoint.edd_stage,
      event_log: updatedCheckpoint.event_log,
    },
  };
}



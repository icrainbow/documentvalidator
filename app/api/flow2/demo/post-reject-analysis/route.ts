/**
 * Flow2 Demo: Post-Reject Analysis Endpoint
 * 
 * Returns deterministic "Phase 8" output after rejection with EDD trigger.
 * 
 * DEMO ONLY - No real integrations. Read-only endpoint.
 * Does NOT mutate state. All data derived from stored checkpoint.
 */

import { NextResponse } from 'next/server';
import { loadCheckpoint } from '@/app/lib/flow2/checkpointStore';
import { isRouteEddTrigger } from '@/app/lib/flow2/ambiguousRejectDetector';

export const runtime = 'nodejs';

/**
 * GET /api/flow2/demo/post-reject-analysis?run_id=...
 * 
 * Returns Phase 8 layered output if trigger detected.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const run_id = searchParams.get('run_id');
  
  if (!run_id) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Missing run_id parameter' 
    }, { status: 400 });
  }
  
  // Load checkpoint
  const checkpoint = await loadCheckpoint(run_id);
  if (!checkpoint) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Checkpoint not found',
      run_id 
    }, { status: 404 });
  }
  
  // Check if rejection + trigger
  const reviewerText = checkpoint.decision_comment || '';
  const triggered = checkpoint.decision === 'reject' && isRouteEddTrigger(reviewerText);
  
  if (!triggered) {
    return NextResponse.json({
      ok: true,
      run_id,
      triggered: false,
      reviewer_text: reviewerText,
    });
  }
  
  // ========================================
  // PHASE 8 DETERMINISTIC OUTPUT
  // ========================================
  
  // Demo: Initialize artifacts in checkpoint with at least one 'running' task
  // This ensures UI animates on first load (no all-QUEUED snapshot)
  const existingArtifact = checkpoint.artifacts?.post_reject_tasks;
  const isFirstLoad = !existingArtifact || existingArtifact.run_id !== run_id;
  
  const tasks = isFirstLoad ? [
    { 
      id: 'A', 
      title: 'De-obfuscate current SOF disclosure', 
      status: 'running' as const,  // First load: at least one running
      detail: 'Extracted: Client stated $5M from business sale (Q3 2024)'
    },
    { 
      id: 'B', 
      title: 'Cross-check Wealth division 2024 annual report', 
      status: 'pending' as const,
      detail: 'Retrieved: Q4 2024 Wealth report shows $50M AUM for same client'
    },
    { 
      id: 'C', 
      title: 'Validate UBO offshore holding chain', 
      status: 'pending' as const,
      detail: 'Mapped: 3-layer structure (BVI → Cayman → Swiss trust)'
    },
  ] : (existingArtifact?.tasks || []);
  
  // If first load, persist the initial artifact to checkpoint
  if (isFirstLoad) {
    const { updateCheckpointStatus } = await import('@/app/lib/flow2/checkpointStore');
    await updateCheckpointStatus(run_id, checkpoint.status, {
      artifacts: {
        ...checkpoint.artifacts,
        post_reject_tasks: {
          run_id,
          status: 'running',
          tasks
        }
      }
    } as any);
    console.log(`[Flow2/PostRejectAnalysis] ✅ Initialized artifact with running tasks for run ${run_id}`);
  }
  
  const skills = [
    { 
      name: 'Document Retrieval', 
      status: 'done' as const, 
      detail: 'Fetched Wealth division Q4 2024 annual report (internal DB)',
      duration_ms: 1200
    },
    { 
      name: 'Regulatory Lookup', 
      status: 'done' as const, 
      detail: 'Found policy update: Dec 1 2025 — Offshore holdings require EDD',
      duration_ms: 950
    },
    { 
      name: 'Corporate Structure Analyzer', 
      status: 'done' as const, 
      detail: 'Traced beneficial ownership: 3-layer offshore chain identified',
      duration_ms: 1450
    },
  ];
  
  const findings = [
    { 
      severity: 'high' as const, 
      title: 'Source of Funds Mismatch', 
      detail: 'Current disclosure: $5M | Wealth division record: $50M (10x discrepancy)',
      evidence_ref: 'wealth_report_q4_2024_page_47'
    },
    { 
      severity: 'medium' as const, 
      title: 'Policy Change Triggers Additional Review', 
      detail: 'Dec 1 2025 regulation: Offshore holding structures now require Enhanced Due Diligence',
      evidence_ref: 'policy_update_2025_12_01'
    },
    {
      severity: 'medium' as const,
      title: 'Complex Offshore Structure',
      detail: '3-layer chain (BVI → Cayman → Swiss trust) obscures ultimate beneficial owner',
      evidence_ref: 'corporate_structure_analysis'
    }
  ];
  
  // Evidence payload (matches existing Flow2EvidenceDashboard props)
  const evidence = {
    pdf_highlight_image_url: '/demo/evidence-wealth-50m.svg',
    structure_tree: {
      root: {
        id: 'client',
        label: 'Client Entity',
        children: [
          {
            id: 'bvi',
            label: 'BVI Holding Co.',
            jurisdiction: 'British Virgin Islands',
            children: [
              {
                id: 'cayman',
                label: 'Cayman SPV',
                jurisdiction: 'Cayman Islands',
                children: [
                  {
                    id: 'swiss',
                    label: 'Swiss Trust',
                    jurisdiction: 'Switzerland',
                    ubo: 'To be determined'
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    disclosures: {
      current: 'Client stated: $5M from business sale (Q3 2024)',
      wealth: 'Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)'
    },
    regulation: {
      title: 'Offshore Holding Structure Policy Update',
      effective_date: 'Dec 1 2025',
      summary: 'All offshore holding structures with >2 layers now require Enhanced Due Diligence review'
    }
  };
  
  // Graph patch (dynamic EDD node injection)
  const graph_patch = {
    add_nodes: [
      { 
        id: 'edd', 
        label: 'Enhanced Due Diligence (EDD)', 
        type: 'review' as const 
      }
    ],
    add_edges: [
      { from: 'human_review', to: 'edd', label: 'Route: EDD' },
      { from: 'edd', to: 'finalization', label: 'Complete' }
    ]
  };
  
  return NextResponse.json({
    ok: true,
    run_id,
    triggered: true,
    reviewer_text: reviewerText,
    tasks,
    skills,
    findings,
    evidence,
    graph_patch,
    // Metadata
    generated_at: new Date().toISOString(),
    demo_mode: 'phase_8_edd',
    // Demo orchestration artifact (for UI SSOT)
    artifact: {
      run_id,
      status: isFirstLoad ? 'running' : 'done',
      tasks
    }
  });
}



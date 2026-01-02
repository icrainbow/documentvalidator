/**
 * Flow2 Demo: Enhanced Due Diligence (EDD) Metadata Generator
 * 
 * Generates deterministic demo metadata for the EDD injection feature.
 * This is DEMO ONLY - no real integrations.
 */

export interface DemoInjectedNode {
  id: string;
  label: string;
}

export interface DemoEvidence {
  pdf_snippet_image: string;
  disclosure_current: string;
  disclosure_wealth: string;
  regulation: {
    title: string;
    effective_date: string;
  };
}

export interface DemoTraceEvent {
  t: number; // Timestamp offset in ms
  kind: 'task' | 'skill' | 'finding' | 'action';
  title: string;
  detail?: string;
  status?: 'start' | 'running' | 'done';
  severity?: 'high' | 'medium' | 'low' | 'info';
}

export interface DemoEddBundle {
  demo_mode: 'edd_injection';
  demo_reject_comment: string;
  demo_injected_node: DemoInjectedNode;
  demo_evidence: DemoEvidence;
  demo_trace: DemoTraceEvent[];
}

/**
 * Generate the full demo EDD metadata bundle
 */
export function generateDemoEddBundle(rejectComment: string): DemoEddBundle {
  return {
    demo_mode: 'edd_injection',
    demo_reject_comment: rejectComment,
    
    demo_injected_node: {
      id: 'edd',
      label: 'Enhanced Due Diligence (EDD)',
    },
    
    demo_evidence: {
      pdf_snippet_image: '/demo/evidence-wealth-50m.svg',
      disclosure_current: '$5M',
      disclosure_wealth: '$50M',
      regulation: {
        title: 'Offshore Trust Look-through Supplementary Protocol',
        effective_date: '2025-12-01',
      },
    },
    
    demo_trace: [
      // Tasks start (t=0)
      {
        t: 0,
        kind: 'task',
        title: 'Task A',
        detail: 'Compare onboarding data vs Wealth historical disclosure',
        status: 'start',
      },
      {
        t: 0,
        kind: 'task',
        title: 'Task B',
        detail: 'Identify offshore holding UBO look-through risk',
        status: 'start',
      },
      {
        t: 0,
        kind: 'task',
        title: 'Task C',
        detail: 'Retrieve latest regulation effective Dec 2025',
        status: 'start',
      },
      
      // Skills start (t=200)
      {
        t: 200,
        kind: 'skill',
        title: 'Wealth_Report_Analyzer',
        status: 'running',
        detail: 'Parsing 2024 year-end PDF report...',
      },
      {
        t: 200,
        kind: 'skill',
        title: 'Policy_Vector_Search',
        status: 'running',
        detail: 'Searching internal RegDB for policy updated last month...',
      },
      {
        t: 200,
        kind: 'skill',
        title: 'Entity_Structure_Crawler',
        status: 'running',
        detail: 'Resolving shell entities / aliases...',
      },
      
      // Skills complete (t=1400-1800)
      {
        t: 1400,
        kind: 'skill',
        title: 'Wealth_Report_Analyzer',
        status: 'done',
        detail: 'Found offshore assets disclosure: $50M',
      },
      {
        t: 1600,
        kind: 'skill',
        title: 'Policy_Vector_Search',
        status: 'done',
        detail: 'Found regulation effective 2025-12-01',
      },
      {
        t: 1800,
        kind: 'skill',
        title: 'Entity_Structure_Crawler',
        status: 'done',
        detail: 'Detected multi-shell ownership chain',
      },
      
      // Findings (t=2200-2600)
      {
        t: 2200,
        kind: 'finding',
        severity: 'high',
        title: 'Disclosure Inconsistency',
        detail: 'SOF $5M vs Wealth $50M → High Risk - Disclosure Inconsistency',
      },
      {
        t: 2600,
        kind: 'finding',
        severity: 'info',
        title: 'New Regulation',
        detail: '2025-12-01 protocol requires extra layer of review',
      },
      
      // Action (t=3000)
      {
        t: 3000,
        kind: 'action',
        title: 'Route to EDD',
        detail: 'Workflow redirected to Enhanced Due Diligence (EDD)',
      },
    ],
  };
}





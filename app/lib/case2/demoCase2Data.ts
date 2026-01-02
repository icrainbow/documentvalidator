/**
 * Case 2 Demo Data: CS Integration Exception
 * 
 * Deterministic hardcoded data for the CS integration exception approval path demo.
 * No real integrations - all content is synthetic for demonstration purposes.
 */

export interface Case2Source {
  id: string;
  type: 'PPT' | 'Confluence' | 'Email-PDF';
  title: string;
  detail: string;
  retrieval_time_ms: number; // For animation timing
}

export interface Case2PathStep {
  id: string;
  label: string;
  type: 'data_gap' | 'validation' | 'bottleneck' | 'decision';
  detail: string;
  references: string[]; // e.g., ["Confluence Page ID: 8821", "PPT Slide 45"]
}

export interface Case2RequiredDocument {
  name: string;
  description: string;
}

export interface Case2DemoData {
  sources: Case2Source[];
  path_steps: Case2PathStep[];
  assistant_text: string;
  required_documents: Case2RequiredDocument[];
}

export const CASE2_DEMO_DATA: Case2DemoData = {
  sources: [
    {
      id: 'source_a',
      type: 'PPT',
      title: 'CS Integration: Wealth Management Market Strategy 2025',
      detail: 'Section 3.4 mentions "Exceptions to retain strategically valuable high-net-worth clients from legacy CS portfolio" with specific guidelines for restricted jurisdiction cases.',
      retrieval_time_ms: 1800
    },
    {
      id: 'source_b',
      type: 'Confluence',
      title: 'Legacy CS Risk Policy – Section 4.2',
      detail: 'Original Credit Suisse entry standards for high-net-worth clients from Middle Eastern regions, including enhanced due diligence requirements and regional risk classifications.',
      retrieval_time_ms: 2400
    },
    {
      id: 'source_c',
      type: 'Email-PDF',
      title: 'Policy Memo: Risk Alignment Post-Merger',
      detail: 'Internal guidance stating that conflicts between UBS and legacy CS risk appetites require escalation to the Joint Steering Committee for case-by-case approval decisions.',
      retrieval_time_ms: 2800
    }
  ],
  
  path_steps: [
    {
      id: 'step_1',
      label: 'Data Gap Remediation',
      type: 'data_gap',
      detail: 'Retrieve legacy CS client onboarding documentation and enhanced due diligence reports from CS archives.',
      references: ['Confluence Page ID: 8821', 'CS Archive Portal']
    },
    {
      id: 'step_2',
      label: 'LOD1 Validation',
      type: 'validation',
      detail: 'Relationship Manager must secure a "Strategic Value Waiver" with supporting business justification and pre-approval from Regional Group Head.',
      references: ['Integration PPT Slide 45', 'Waiver Form Template WM-2025-03']
    },
    {
      id: 'step_3',
      label: 'Joint Steering Committee Review',
      type: 'bottleneck',
      detail: 'Case must be escalated to the Joint Compliance & Steering Committee due to conflict between UBS standard risk appetite and legacy CS entry criteria.',
      references: ['Policy Memo X (Feb 2025)', 'Committee Terms of Reference']
    },
    {
      id: 'step_4',
      label: 'Group Head Final Approval',
      type: 'decision',
      detail: 'Due to "Restricted Jurisdiction" flag, final approval authority rests with Group Head for Wealth Management, requiring formal sign-off and documentation.',
      references: ['Risk Appetite Framework 2025', 'Delegation of Authority Matrix']
    }
  ],
  
  assistant_text: `Based on the integration guidelines and legacy CS risk policies, I've identified a specialized exception approval path for this scenario.

**Key Findings:**
The CS Integration Strategy (2025) explicitly allows for retention of strategically valuable HNW clients who fall outside current UBS risk appetite, provided specific controls are met. However, the restricted jurisdiction classification triggers mandatory escalation.

**Recommended Path:**
1) First, remediate data gaps by retrieving the client's original CS onboarding files and enhanced due diligence reports from the CS archive system (Confluence Page ID: 8821).

2) The Relationship Manager must complete a Strategic Value Waiver (template WM-2025-03) with business justification and secure pre-approval from the Regional Group Head.

3) Because this case involves a conflict between UBS and legacy CS risk appetites, the Policy Memo on Risk Alignment Post-Merger requires routing through the Joint Steering Committee for case-by-case review.

4) Final approval authority rests with the Group Head for Wealth Management due to the "Restricted Jurisdiction" designation.

This path ensures compliance while preserving strategic client relationships during the integration period.`,
  
  required_documents: [
    {
      name: 'CS Legacy Client Profile',
      description: 'Original CS onboarding documents and enhanced due diligence reports from Confluence (Page ID: 8821)'
    },
    {
      name: 'Strategic Value Waiver Form',
      description: 'Completed and signed by RM with Regional Group Head pre-approval (Template WM-2025-03, referencing PPT Slide 45)'
    },
    {
      name: 'Joint Committee Escalation Request',
      description: 'Formal memo documenting the risk appetite conflict and requesting Joint Steering Committee review'
    }
  ]
};


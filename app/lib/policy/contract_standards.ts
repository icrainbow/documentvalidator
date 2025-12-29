/**
 * Contract Standards Corpus
 * Agent-internal configuration for contract template matching
 * Used by agents when matchingStrategy: 'contract_template' hint is provided
 */

export interface ContractStandard {
  id: string;
  title: string;
  template_text: string;
  keywords: string[];
  risk_indicators: {
    acceptable: string[];
    high_risk: string[];
  };
}

export const CONTRACT_STANDARDS: ContractStandard[] = [
  {
    id: 'STD-001',
    title: 'Standard Indemnification Clause',
    template_text: 'Indemnification limited to direct damages up to contract value',
    keywords: ['indemnify', 'indemnification', 'liability', 'damages', 'hold harmless'],
    risk_indicators: {
      acceptable: ['limited to', 'direct damages', 'capped at', 'up to contract value', 'maximum liability'],
      high_risk: ['unlimited', 'consequential', 'indirect', 'punitive', 'all claims', 'any and all'],
    },
  },
  {
    id: 'STD-002',
    title: 'Standard Termination Clause',
    template_text: 'Either party may terminate with 60 days written notice',
    keywords: ['terminate', 'termination', 'cancel', 'end agreement', 'notice period'],
    risk_indicators: {
      acceptable: ['60 days', '90 days', 'written notice', 'mutual agreement'],
      high_risk: ['immediate', 'at will', 'no notice', 'unilateral', '7 days', '30 days'],
    },
  },
  {
    id: 'STD-003',
    title: 'Standard Payment Terms',
    template_text: 'Payment due net 30 days from invoice date',
    keywords: ['payment', 'invoice', 'fee', 'compensation', 'billing'],
    risk_indicators: {
      acceptable: ['net 30', 'net 45', 'net 60', 'upon receipt', 'milestone-based'],
      high_risk: ['upfront', 'advance payment', 'non-refundable', 'no invoice', 'immediate'],
    },
  },
  {
    id: 'STD-004',
    title: 'Standard Limitation of Liability',
    template_text: 'Total liability limited to amounts paid in preceding 12 months',
    keywords: ['limitation of liability', 'cap', 'maximum', 'aggregate liability'],
    risk_indicators: {
      acceptable: ['limited to', 'capped at', '12 months fees', 'aggregate cap', 'not exceed'],
      high_risk: ['no limit', 'unlimited', 'without cap', 'full liability', 'no maximum'],
    },
  },
  {
    id: 'STD-005',
    title: 'Standard Confidentiality Clause',
    template_text: 'Confidential information protected for 3 years post-termination',
    keywords: ['confidential', 'confidentiality', 'proprietary', 'trade secret', 'non-disclosure'],
    risk_indicators: {
      acceptable: ['3 years', '5 years', 'reasonable protection', 'industry standard'],
      high_risk: ['perpetual', 'indefinite', 'no limit', 'public disclosure allowed'],
    },
  },
  {
    id: 'STD-006',
    title: 'Standard Governing Law Clause',
    template_text: 'Governed by laws of jurisdiction where services are provided',
    keywords: ['governing law', 'jurisdiction', 'venue', 'dispute resolution', 'arbitration'],
    risk_indicators: {
      acceptable: ['mutual jurisdiction', 'local laws', 'arbitration', 'mediation first'],
      high_risk: ['foreign jurisdiction', 'one-sided venue', 'no arbitration', 'waive jury trial'],
    },
  },
  {
    id: 'STD-007',
    title: 'Standard Warranty Disclaimer',
    template_text: 'Services provided "as is" with limited warranty for material defects',
    keywords: ['warranty', 'guarantee', 'as is', 'disclaimer', 'representations'],
    risk_indicators: {
      acceptable: ['limited warranty', 'material defects', 'reasonable efforts', 'industry standard'],
      high_risk: ['no warranty', 'all warranties disclaimed', 'no recourse', 'no remedies'],
    },
  },
  {
    id: 'STD-008',
    title: 'Standard Intellectual Property Rights',
    template_text: 'Client retains ownership of pre-existing IP; vendor retains tool ownership',
    keywords: ['intellectual property', 'ownership', 'copyright', 'patent', 'ip rights'],
    risk_indicators: {
      acceptable: ['client owns deliverables', 'vendor owns tools', 'license granted', 'clearly defined'],
      high_risk: ['all rights to vendor', 'undefined ownership', 'perpetual assignment', 'no license'],
    },
  },
  {
    id: 'STD-009',
    title: 'Standard Force Majeure Clause',
    template_text: 'Parties excused for delays due to events beyond reasonable control',
    keywords: ['force majeure', 'act of god', 'unforeseeable', 'excused performance'],
    risk_indicators: {
      acceptable: ['beyond reasonable control', 'temporary suspension', 'notice required', 'mitigation efforts'],
      high_risk: ['one-sided', 'no termination right', 'indefinite suspension', 'no mitigation'],
    },
  },
  {
    id: 'STD-010',
    title: 'Standard Signature and Execution',
    template_text: 'Agreement effective when signed by authorized representatives of both parties',
    keywords: ['signature', 'execution', 'authorized', 'binding', 'effective date'],
    risk_indicators: {
      acceptable: ['both parties sign', 'authorized representative', 'written consent', 'dated'],
      high_risk: ['unsigned', 'oral agreement', 'implied consent', 'missing signatures'],
    },
  },
];


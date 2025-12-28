import { AgentHandler } from '../types';

interface ComplianceInput {
  sectionContent: string;
  sectionTitle: string;
  checkType?: 'full' | 'quick' | 'prohibited_only';
}

interface ComplianceOutput {
  is_compliant: boolean;
  violations: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    location?: string;
  }>;
  warnings: Array<{
    type: string;
    description: string;
  }>;
  summary: string;
}

export const complianceHandler: AgentHandler<ComplianceInput, ComplianceOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const content = input.sectionContent;
    const contentLower = content.toLowerCase();
    const violations: ComplianceOutput['violations'] = [];
    const warnings: ComplianceOutput['warnings'] = [];

    // Check for prohibited industries
    if (contentLower.includes('tobacco')) {
      violations.push({
        type: 'prohibited_industry',
        severity: 'critical',
        description: 'Reference to prohibited industry: tobacco',
        location: 'Section content',
      });
    }

    // Check for missing disclosures
    if (contentLower.includes('return') && !contentLower.includes('risk')) {
      warnings.push({
        type: 'missing_disclosure',
        description: 'Return projections mentioned without corresponding risk disclosure',
      });
    }

    // Check for regulatory keywords requiring special handling
    const regulatoryKeywords = ['offshore', 'tax haven', 'cryptocurrency', 'insider'];
    regulatoryKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        warnings.push({
          type: 'regulatory_review_required',
          description: `Content mentions "${keyword}" - may require additional regulatory review`,
        });
      }
    });

    const isCompliant = violations.length === 0;
    const summary = isCompliant
      ? `Section "${input.sectionTitle}" passed compliance check. ${warnings.length} warning(s) noted.`
      : `Section "${input.sectionTitle}" failed compliance check. ${violations.length} violation(s) detected.`;

    return {
      is_compliant: isCompliant,
      violations,
      warnings,
      summary,
    };
  }

  throw new Error('Real compliance check not implemented yet.');
};


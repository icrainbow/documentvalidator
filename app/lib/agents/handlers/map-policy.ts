import { AgentHandler } from '../types';
import { Fact, PolicyMapping } from '../domain';
import { findMatchingPolicies } from '../../policy/policy_corpus';

interface MapPolicyInput {
  facts: Fact[];
  documentType?: string;
}

interface MapPolicyOutput {
  mappings: PolicyMapping[];
  flagged_count: number;
  highest_risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export const mapPolicyHandler: AgentHandler<MapPolicyInput, MapPolicyOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const mappings: PolicyMapping[] = [];

    for (const fact of input.facts) {
      // Find policies matching this fact
      const matchedPolicies = findMatchingPolicies(fact.text + ' ' + fact.source.snippet);

      if (matchedPolicies.length > 0) {
        // Determine risk level based on fact category and matched policies
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        // Critical risks
        if (fact.category === 'risk' && matchedPolicies.some(p => p.severity === 'critical')) {
          riskLevel = 'critical';
        } else if (fact.text.toLowerCase().includes('tobacco')) {
          riskLevel = 'critical'; // Prohibited industry
        } else if (matchedPolicies.some(p => p.severity === 'critical')) {
          riskLevel = 'critical';
        } else if (matchedPolicies.some(p => p.severity === 'high')) {
          riskLevel = 'high';
        } else if (matchedPolicies.some(p => p.severity === 'medium')) {
          riskLevel = 'medium';
        }

        // Build reason
        const policyTitles = matchedPolicies.map(p => p.title).join(', ');
        const reason = `Fact "${fact.text}" matches policies: ${policyTitles}`;

        mappings.push({
          fact,
          policy_rules: matchedPolicies,
          risk_level: riskLevel,
          reason,
        });
      } else {
        // No policy match - still record it
        mappings.push({
          fact,
          policy_rules: [],
          risk_level: 'low',
          reason: 'No specific policy match, informational fact only',
        });
      }
    }

    // Count flagged items (medium or higher)
    const flaggedCount = mappings.filter(m => 
      m.risk_level === 'medium' || m.risk_level === 'high' || m.risk_level === 'critical'
    ).length;

    // Find highest risk level
    const riskLevels: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    let highestRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let highestRiskValue = 0;

    mappings.forEach(m => {
      const value = riskLevels[m.risk_level];
      if (value > highestRiskValue) {
        highestRiskValue = value;
        highestRiskLevel = m.risk_level;
      }
    });

    return {
      mappings,
      flagged_count: flaggedCount,
      highest_risk_level: highestRiskLevel,
    };
  }

  throw new Error('Real map-policy not implemented yet.');
};


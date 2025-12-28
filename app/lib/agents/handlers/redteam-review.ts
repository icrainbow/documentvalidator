import { AgentHandler } from '../types';
import { RedTeamIssue, PolicyMapping } from '../domain';

interface RedTeamReviewInput {
  sectionContent: string;
  sectionTitle: string;
  sectionId?: string;
  policyMappings: PolicyMapping[];
}

interface RedTeamReviewOutput {
  issues: RedTeamIssue[];
  overall_status: 'pass' | 'fail' | 'needs_review';
  critical_count: number;
  high_count: number;
}

export const redteamReviewHandler: AgentHandler<RedTeamReviewInput, RedTeamReviewOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const issues: RedTeamIssue[] = [];
    const content = input.sectionContent;
    const contentLower = content.toLowerCase();
    let issueIdCounter = 1;

    // Check for prohibited industry references
    if (contentLower.includes('tobacco')) {
      const match = content.match(/tobacco\s+industry/i);
      const startIdx = match ? content.indexOf(match[0]) : contentLower.indexOf('tobacco');
      
      issues.push({
        id: `RT-${issueIdCounter++}`,
        type: 'policy_violation',
        severity: 'critical',
        description: 'Prohibited industry reference detected: tobacco industry',
        affected_text: 'tobacco industry',
        suggested_fix: 'Remove reference to tobacco industry or seek executive approval per policy COND-008',
        policy_refs: ['COND-008'],
        source: {
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet: content.substring(Math.max(0, startIdx - 40), Math.min(content.length, startIdx + 60)),
          char_range: { start: startIdx, end: startIdx + 7 },
        },
      });
    }

    // Check for missing risk disclosure
    if (contentLower.includes('invest') && !contentLower.includes('risk')) {
      issues.push({
        id: `RT-${issueIdCounter++}`,
        type: 'missing_info',
        severity: 'high',
        description: 'Investment proposal lacks risk disclosure',
        suggested_fix: 'Add comprehensive risk assessment section per policy RISK-007',
        policy_refs: ['RISK-007', 'DISC-012'],
        source: {
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet: content.substring(0, 100),
        },
      });
    }

    // Check for amounts without context
    const amountPattern = /\$[\d,]+/g;
    const amounts = content.match(amountPattern);
    if (amounts && amounts.length > 0) {
      const hasContext = contentLower.includes('fee') || contentLower.includes('cost') || 
                         contentLower.includes('investment') || contentLower.includes('fund');
      
      if (!hasContext) {
        issues.push({
          id: `RT-${issueIdCounter++}`,
          type: 'missing_info',
          severity: 'medium',
          description: 'Financial amounts mentioned without sufficient context or disclosure',
          affected_text: amounts.join(', '),
          suggested_fix: 'Provide clear context for all financial amounts and include fee disclosures per DISC-012',
          policy_refs: ['DISC-012'],
          source: {
            section_id: input.sectionId,
            section_title: input.sectionTitle,
            snippet: content.substring(0, 150),
          },
        });
      }
    }

    // Check for informal tone in formal documents
    const informalWords = ['gonna', 'wanna', 'yeah', 'nope', 'cool', 'awesome'];
    const foundInformal = informalWords.filter(word => contentLower.includes(word));
    
    if (foundInformal.length > 0) {
      issues.push({
        id: `RT-${issueIdCounter++}`,
        type: 'tone',
        severity: 'low',
        description: 'Informal language detected in professional document',
        affected_text: foundInformal.join(', '),
        suggested_fix: 'Replace informal language with professional terminology',
        source: {
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet: content.substring(0, 100),
        },
      });
    }

    // Check policy mappings for high-risk items
    input.policyMappings.forEach((mapping, idx) => {
      if (mapping.risk_level === 'critical' || mapping.risk_level === 'high') {
        issues.push({
          id: `RT-${issueIdCounter++}`,
          type: 'policy_violation',
          severity: mapping.risk_level === 'critical' ? 'critical' : 'high',
          description: `Policy concern: ${mapping.reason}`,
          affected_text: mapping.fact.text,
          suggested_fix: `Address policy requirements: ${mapping.policy_rules.map(p => p.title).join(', ')}`,
          policy_refs: mapping.policy_rules.map(p => p.id),
          source: mapping.fact.source,
        });
      }
    });

    // Check for missing signature/acknowledgment
    if (!contentLower.includes('sign') && !contentLower.includes('acknowledge') && 
        (contentLower.includes('proposal') || contentLower.includes('agreement'))) {
      issues.push({
        id: `RT-${issueIdCounter++}`,
        type: 'missing_info',
        severity: 'high',
        description: 'Document appears to require client acknowledgment but signature/acknowledgment section is missing',
        suggested_fix: 'Add client signature and acknowledgment section per DOC-025',
        policy_refs: ['DOC-025'],
        source: {
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet: content.substring(0, 100),
        },
      });
    }

    // Determine overall status
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    
    let overallStatus: 'pass' | 'fail' | 'needs_review' = 'pass';
    if (criticalCount > 0) {
      overallStatus = 'fail';
    } else if (highCount > 0) {
      overallStatus = 'needs_review';
    }

    return {
      issues,
      overall_status: overallStatus,
      critical_count: criticalCount,
      high_count: highCount,
    };
  }

  throw new Error('Real redteam-review not implemented yet.');
};


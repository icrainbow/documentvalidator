import { AgentHandler } from '../types';

interface EvaluateInput {
  sectionContent: string;
  sectionTitle: string;
  criteria?: string[];
}

interface EvaluateOutput {
  status: 'pass' | 'fail' | 'needs_review';
  score: number; // 0-100
  findings: Array<{
    criterion: string;
    result: 'pass' | 'fail';
    comment: string;
  }>;
  summary: string;
}

export const evaluateHandler: AgentHandler<EvaluateInput, EvaluateOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const content = input.sectionContent;
    const contentLower = content.toLowerCase();
    const findings: EvaluateOutput['findings'] = [];
    let passCount = 0;
    let totalCriteria = 0;

    // Default criteria if none provided
    const criteria = input.criteria || [
      'Sufficient length',
      'Clear structure',
      'No prohibited content',
      'Professional tone',
    ];

    // Evaluate each criterion
    criteria.forEach(criterion => {
      totalCriteria++;
      let result: 'pass' | 'fail' = 'pass';
      let comment = '';

      switch (criterion) {
        case 'Sufficient length':
          if (content.length < 50) {
            result = 'fail';
            comment = 'Content is too short (minimum 50 characters required)';
          } else {
            result = 'pass';
            comment = `Content length is adequate (${content.length} characters)`;
            passCount++;
          }
          break;

        case 'Clear structure':
          if (!content.includes('.') && content.length > 100) {
            result = 'fail';
            comment = 'Content lacks proper sentence structure';
          } else {
            result = 'pass';
            comment = 'Content has clear structure';
            passCount++;
          }
          break;

        case 'No prohibited content':
          if (contentLower.includes('tobacco')) {
            result = 'fail';
            comment = 'Prohibited content detected: tobacco industry reference';
          } else {
            result = 'pass';
            comment = 'No prohibited content detected';
            passCount++;
          }
          break;

        case 'Professional tone':
          const unprofessional = ['gonna', 'wanna', 'yeah', 'nope'];
          const found = unprofessional.filter(word => contentLower.includes(word));
          if (found.length > 0) {
            result = 'fail';
            comment = `Unprofessional language detected: ${found.join(', ')}`;
          } else {
            result = 'pass';
            comment = 'Professional tone maintained';
            passCount++;
          }
          break;

        default:
          // Generic evaluation
          result = 'pass';
          comment = 'Criterion met';
          passCount++;
      }

      findings.push({ criterion, result, comment });
    });

    // Calculate score
    const score = totalCriteria > 0 ? Math.round((passCount / totalCriteria) * 100) : 0;

    // Determine status
    let status: 'pass' | 'fail' | 'needs_review';
    if (score >= 80) {
      status = 'pass';
    } else if (score >= 60) {
      status = 'needs_review';
    } else {
      status = 'fail';
    }

    const summary = `Section "${input.sectionTitle}" evaluated against ${totalCriteria} criteria. ` +
      `Score: ${score}/100. Status: ${status.toUpperCase()}. ` +
      `${passCount}/${totalCriteria} criteria passed.`;

    return {
      status,
      score,
      findings,
      summary,
    };
  }

  throw new Error('Real evaluation not implemented yet.');
};


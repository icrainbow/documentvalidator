/**
 * Flow2: Issue-to-Topic Mapping Helper
 * 
 * Maps issues to derived topics based on keywords or issue metadata.
 */

import type { TopicKey } from './derivedTopicsTypes';

export function mapIssueToTopic(issue: any): TopicKey {
  const text = ((issue.description || '') + (issue.title || '')).toLowerCase();
  
  // Check for identity-related keywords
  if (
    text.includes('identity') ||
    text.includes('passport') ||
    text.includes('kyc') ||
    text.includes('client name')
  ) {
    return 'client_identity';
  }
  
  // Check for wealth-related keywords
  if (
    text.includes('wealth') ||
    text.includes('financial') ||
    text.includes('bank') ||
    text.includes('income') ||
    text.includes('source of funds')
  ) {
    return 'source_of_wealth';
  }
  
  // Default to general
  return 'general';
}


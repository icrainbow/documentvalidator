/**
 * Flow2: Risk Triage
 * 
 * Computes risk score and decides graph execution path.
 * Deterministic rules based on coverage, conflicts, and keywords.
 */

import type { TopicSection, GraphPath, RiskBreakdown } from './types';
import { extractHighRiskKeywords } from './topicAssembler';

export interface TriageResult {
  riskScore: number; // 0-100
  triageReasons: string[];
  routePath: GraphPath;
  riskBreakdown: RiskBreakdown; // NEW: Breakdown for transparency
}

/**
 * Compute risk score and triage path
 * 
 * Risk scoring:
 * - Missing coverage: +15 per missing critical topic
 * - Partial coverage: +8 per partial topic
 * - High-risk keywords: +10 per keyword
 * - Conflicts (if detected): +20 per conflict
 * 
 * Path routing:
 * - 0-30: fast (low risk)
 * - 31-60: crosscheck (medium risk)
 * - 61-80: escalate (high risk)
 * - 81-100: human_gate (critical risk)
 */
export function triageRisk(topicSections: TopicSection[]): TriageResult {
  let coverageRiskScore = 0;
  let keywordRiskScore = 0;
  const triageReasons: string[] = [];
  
  // Critical topics that must have complete coverage
  const CRITICAL_TOPICS = ['client_identity', 'source_of_wealth', 'beneficial_ownership', 'sanctions_pep'];
  
  // Check coverage
  topicSections.forEach(section => {
    if (section.coverage === 'missing' && CRITICAL_TOPICS.includes(section.topicId)) {
      coverageRiskScore += 15;
      triageReasons.push(`Missing critical topic: ${section.topicId}`);
    } else if (section.coverage === 'partial') {
      coverageRiskScore += 8;
      triageReasons.push(`Partial coverage: ${section.topicId}`);
    }
  });
  
  // Check for high-risk keywords
  const allContent = topicSections.map(s => s.content).join(' ');
  const highRiskKeywords = extractHighRiskKeywords(allContent);
  
  if (highRiskKeywords.length > 0) {
    keywordRiskScore = highRiskKeywords.length * 10;
    triageReasons.push(`High-risk keywords detected: ${highRiskKeywords.join(', ')}`);
  }
  
  // Total risk score
  let riskScore = coverageRiskScore + keywordRiskScore;
  
  // Cap at 100
  riskScore = Math.min(riskScore, 100);
  
  // Build breakdown
  const riskBreakdown: RiskBreakdown = {
    coveragePoints: coverageRiskScore,
    keywordPoints: keywordRiskScore,
    totalPoints: riskScore
  };
  
  // Decide path
  let routePath: GraphPath;
  if (riskScore <= 30) {
    routePath = 'fast';
    triageReasons.push('Low risk → Fast path');
  } else if (riskScore <= 60) {
    routePath = 'crosscheck';
    triageReasons.push('Medium risk → Cross-check path');
  } else if (riskScore <= 80) {
    routePath = 'escalate';
    triageReasons.push('High risk → Escalate path');
  } else {
    routePath = 'human_gate';
    triageReasons.push('Critical risk → Human gate required');
  }
  
  return {
    riskScore,
    triageReasons,
    routePath,
    riskBreakdown
  };
}


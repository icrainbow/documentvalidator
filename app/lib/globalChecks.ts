/**
 * Global Document Checks
 * 
 * Deterministic, fast checks that can be run across entire document
 * or specific sections. All checks are agent-decided (optional).
 * 
 * Stage 2: Global Checks
 * Flow 1 Only - No Flow2, No LangGraph, No LLM
 */

import type { GlobalCheckResult } from './types/scopePlanning';

/**
 * Section structure for checks
 */
interface CheckSection {
  id: number;
  title: string;
  content: string;
}

/**
 * Required disclaimer keywords (case-insensitive)
 */
const DISCLAIMER_KEYWORDS = [
  'disclaimer',
  'liability',
  'warranty',
  'risk disclosure',
  'no guarantee',
  'not responsible',
];

/**
 * High-risk keywords that trigger warnings (case-insensitive)
 */
const HIGH_RISK_KEYWORDS = [
  'guaranteed returns',
  'no risk',
  'zero risk',
  'risk-free',
  'guaranteed profit',
  'cannot lose',
  'always profitable',
];

/**
 * Standard document section titles (for structural sanity)
 */
const REQUIRED_SECTION_PATTERNS = [
  /disclaimer/i,
  /risk/i,
  /liability/i,
  /terms.*conditions/i,
];

// ============================================================
// CHECK 1: Disclaimer Presence
// ============================================================

/**
 * Check if required disclaimers are present in the document
 * 
 * Fast: keyword/pattern matching
 * Returns: present/missing + locations
 */
export function checkDisclaimerPresence(sections: CheckSection[]): GlobalCheckResult {
  const foundDisclaimers: Array<{ sectionId: number; sectionTitle: string; keyword: string }> = [];
  const missingKeywords: string[] = [];
  
  // Check each disclaimer keyword
  DISCLAIMER_KEYWORDS.forEach(keyword => {
    let found = false;
    
    sections.forEach(section => {
      const lowerTitle = section.title.toLowerCase();
      const lowerContent = section.content.toLowerCase();
      
      if (lowerTitle.includes(keyword) || lowerContent.includes(keyword)) {
        foundDisclaimers.push({
          sectionId: section.id,
          sectionTitle: section.title,
          keyword,
        });
        found = true;
      }
    });
    
    if (!found) {
      missingKeywords.push(keyword);
    }
  });
  
  // Determine status
  let status: 'pass' | 'fail' | 'warning';
  let details: string;
  
  if (missingKeywords.length === 0) {
    status = 'pass';
    details = `All required disclaimer keywords found in ${foundDisclaimers.length} location(s).`;
  } else if (missingKeywords.length <= 2) {
    status = 'warning';
    details = `Some disclaimer keywords missing: ${missingKeywords.join(', ')}. Found: ${foundDisclaimers.length} disclaimer(s).`;
  } else {
    status = 'fail';
    details = `Multiple disclaimer keywords missing: ${missingKeywords.join(', ')}. Document may lack required disclaimers.`;
  }
  
  return {
    checkName: 'disclaimer_presence',
    status,
    details,
    affectedSections: foundDisclaimers.map(f => f.sectionId),
  };
}

// ============================================================
// CHECK 2: Cross-Section Contradiction Detection
// ============================================================

/**
 * Scan for potential contradictions between sections
 * 
 * Simple heuristic: Look for conflicting statements about same terms
 * (e.g., "fee: 1%" in one section, "fee: 2%" in another)
 * 
 * Medium speed: keyword overlap + conflict detection
 */
export function checkCrossSectionContradictions(sections: CheckSection[]): GlobalCheckResult {
  const contradictions: Array<{
    term: string;
    section1: { id: number; title: string; value: string };
    section2: { id: number; title: string; value: string };
  }> = [];
  
  // Common terms to check for contradictions
  const termsToCheck = [
    { term: 'fee', patterns: [/fee[s]?:?\s*(\d+\.?\d*%?)/gi, /(\d+\.?\d*%?)\s*fee/gi] },
    { term: 'rate', patterns: [/rate[s]?:?\s*(\d+\.?\d*%?)/gi, /(\d+\.?\d*%?)\s*rate/gi] },
    { term: 'percentage', patterns: [/percentage:?\s*(\d+\.?\d*%?)/gi] },
    { term: 'minimum', patterns: [/minimum:?\s*\$?(\d+[,\d]*)/gi, /min:?\s*\$?(\d+[,\d]*)/gi] },
    { term: 'maximum', patterns: [/maximum:?\s*\$?(\d+[,\d]*)/gi, /max:?\s*\$?(\d+[,\d]*)/gi] },
  ];
  
  // For each term, collect values from all sections
  termsToCheck.forEach(({ term, patterns }) => {
    const sectionValues: Array<{ sectionId: number; title: string; values: string[] }> = [];
    
    sections.forEach(section => {
      const values: string[] = [];
      
      patterns.forEach(pattern => {
        const matches = Array.from(section.content.matchAll(pattern));
        for (const match of matches) {
          if (match[1]) {
            values.push(match[1].trim());
          }
        }
      });
      
      if (values.length > 0) {
        sectionValues.push({
          sectionId: section.id,
          title: section.title,
          values,
        });
      }
    });
    
    // Check for contradictions (different values for same term)
    if (sectionValues.length >= 2) {
      for (let i = 0; i < sectionValues.length; i++) {
        for (let j = i + 1; j < sectionValues.length; j++) {
          const sec1 = sectionValues[i];
          const sec2 = sectionValues[j];
          
          // Compare values
          const val1Set = new Set(sec1.values);
          const val2Set = new Set(sec2.values);
          
          // Check if values are different
          const hasOverlap = sec1.values.some(v => val2Set.has(v));
          const hasDifference = sec1.values.some(v => !val2Set.has(v)) || 
                                sec2.values.some(v => !val1Set.has(v));
          
          if (hasDifference && !hasOverlap) {
            contradictions.push({
              term,
              section1: { id: sec1.sectionId, title: sec1.title, value: sec1.values[0] },
              section2: { id: sec2.sectionId, title: sec2.title, value: sec2.values[0] },
            });
          }
        }
      }
    }
  });
  
  // Determine status
  let status: 'pass' | 'fail' | 'warning';
  let details: string;
  
  if (contradictions.length === 0) {
    status = 'pass';
    details = 'No obvious contradictions detected between sections.';
  } else if (contradictions.length <= 2) {
    status = 'warning';
    details = `Potential contradiction(s) detected: ${contradictions.map(c => 
      `"${c.term}" differs between Section ${c.section1.id} (${c.section1.value}) and Section ${c.section2.id} (${c.section2.value})`
    ).join('; ')}.`;
  } else {
    status = 'fail';
    details = `Multiple contradictions detected (${contradictions.length} found). Review for consistency.`;
  }
  
  const affectedSections = Array.from(new Set(
    contradictions.flatMap(c => [c.section1.id, c.section2.id])
  )).sort((a, b) => a - b);
  
  return {
    checkName: 'cross_section_contradiction',
    status,
    details,
    affectedSections,
  };
}

// ============================================================
// CHECK 3: High-Risk Keyword Scan
// ============================================================

/**
 * Scan for high-risk keywords that should trigger warnings
 * (e.g., "guaranteed returns", "no risk", "risk-free")
 * 
 * Fast: regex matching
 */
export function checkHighRiskKeywords(sections: CheckSection[]): GlobalCheckResult {
  const findings: Array<{ sectionId: number; sectionTitle: string; keyword: string; context: string }> = [];
  
  sections.forEach(section => {
    const lowerContent = section.content.toLowerCase();
    
    HIGH_RISK_KEYWORDS.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        // Extract context (50 chars before and after)
        const index = lowerContent.indexOf(keyword);
        const start = Math.max(0, index - 50);
        const end = Math.min(section.content.length, index + keyword.length + 50);
        const context = section.content.substring(start, end).trim();
        
        findings.push({
          sectionId: section.id,
          sectionTitle: section.title,
          keyword,
          context,
        });
      }
    });
  });
  
  // Determine status
  let status: 'pass' | 'fail' | 'warning';
  let details: string;
  
  if (findings.length === 0) {
    status = 'pass';
    details = 'No high-risk keywords detected.';
  } else if (findings.length <= 2) {
    status = 'warning';
    details = `High-risk keyword(s) found: ${findings.map(f => 
      `"${f.keyword}" in Section ${f.sectionId} (${f.sectionTitle})`
    ).join('; ')}. Review for compliance.`;
  } else {
    status = 'fail';
    details = `Multiple high-risk keywords detected (${findings.length} instances). Document contains potentially non-compliant language.`;
  }
  
  return {
    checkName: 'high_risk_keyword_scan',
    status,
    details,
    affectedSections: findings.map(f => f.sectionId),
  };
}

// ============================================================
// CHECK 4: Structural Sanity Check
// ============================================================

/**
 * Verify document structure (required sections present)
 * 
 * Fast: section title matching
 */
export function checkStructuralSanity(sections: CheckSection[]): GlobalCheckResult {
  const foundSections: string[] = [];
  const missingSections: string[] = [];
  
  // Check for required section patterns
  REQUIRED_SECTION_PATTERNS.forEach((pattern, index) => {
    const found = sections.some(section => pattern.test(section.title));
    
    if (found) {
      foundSections.push(pattern.source);
    } else {
      missingSections.push(pattern.source);
    }
  });
  
  // Check for unexpected empty sections
  const emptySections = sections.filter(s => s.content.trim().length < 50);
  
  // Determine status
  let status: 'pass' | 'fail' | 'warning';
  let details: string;
  
  if (missingSections.length === 0 && emptySections.length === 0) {
    status = 'pass';
    details = `All required sections present. Document has ${sections.length} section(s).`;
  } else if (missingSections.length <= 1 && emptySections.length === 0) {
    status = 'warning';
    details = `Document structure mostly valid. Potentially missing section: ${missingSections.join(', ')}.`;
  } else {
    const issues = [];
    if (missingSections.length > 0) {
      issues.push(`Missing sections: ${missingSections.join(', ')}`);
    }
    if (emptySections.length > 0) {
      issues.push(`${emptySections.length} section(s) appear empty or very short`);
    }
    status = 'warning';
    details = issues.join('. ') + '.';
  }
  
  return {
    checkName: 'structural_sanity',
    status,
    details,
    affectedSections: emptySections.map(s => s.id),
  };
}

// ============================================================
// ORCHESTRATION
// ============================================================

/**
 * Run selected global checks
 * 
 * @param checkNames Array of check names to run
 * @param sections Document sections
 * @returns Object with results array and failed checks list
 */
export function runGlobalChecks(
  checkNames: string[],
  sections: CheckSection[]
): { results: GlobalCheckResult[]; failedChecks: string[] } {
  const results: GlobalCheckResult[] = [];
  const failedChecks: string[] = [];
  
  console.log('[GlobalChecks] Running', checkNames.length, 'check(s)');
  
  checkNames.forEach(checkName => {
    const startTime = Date.now();
    let result: GlobalCheckResult | null = null;
    
    try {
      switch (checkName) {
        case 'disclaimer_presence':
          result = checkDisclaimerPresence(sections);
          break;
        case 'cross_section_contradiction':
          result = checkCrossSectionContradictions(sections);
          break;
        case 'high_risk_keyword_scan':
          result = checkHighRiskKeywords(sections);
          break;
        case 'structural_sanity':
          result = checkStructuralSanity(sections);
          break;
        default:
          console.warn('[GlobalChecks] Unknown check:', checkName);
          failedChecks.push(checkName);
      }
      
      if (result) {
        const duration = Date.now() - startTime;
        console.log(`[GlobalChecks] ${checkName}: ${result.status} (${duration}ms)`);
        results.push(result);
      }
    } catch (error) {
      console.error(`[GlobalChecks] Error running ${checkName}:`, error);
      failedChecks.push(checkName);
      results.push({
        checkName,
        status: 'fail',
        details: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        affectedSections: [],
      });
    }
  });
  
  console.log('[GlobalChecks] ✓ Completed', results.length, 'check(s)');
  if (failedChecks.length > 0) {
    console.warn('[GlobalChecks] Failed checks:', failedChecks);
  }
  return { results, failedChecks };
}

/**
 * Get summary of global check results
 */
export function getGlobalChecksSummary(results: GlobalCheckResult[]): {
  totalChecks: number;
  passed: number;
  warnings: number;
  failed: number;
  overallStatus: 'pass' | 'warning' | 'fail';
} {
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  let overallStatus: 'pass' | 'warning' | 'fail';
  if (failed > 0) {
    overallStatus = 'fail';
  } else if (warnings > 0) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'pass';
  }
  
  return {
    totalChecks: results.length,
    passed,
    warnings,
    failed,
    overallStatus,
  };
}


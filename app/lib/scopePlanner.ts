/**
 * Review Scope Planner (Agent Component)
 * 
 * Decides review scope based on dirty sections queue:
 * - Section-only: Review only changed sections (isolated edits)
 * - Cross-section: Review changed + related sections (consistency check)
 * - Full-document: Re-review entire document (major changes)
 * 
 * DETERMINISTIC LOGIC ONLY - No LLM required for MVP
 * 
 * Stage 1: Core Infrastructure
 * Flow 1 Only - No Flow2, No LangGraph
 */

import type {
  DirtyQueue,
  ScopePlan,
  ScopePlannerInput,
  ScopePlanningResult,
  ReviewMode,
} from './types/scopePlanning';

/**
 * High-risk section keywords (case-insensitive)
 */
const HIGH_RISK_KEYWORDS = [
  'disclaimer',
  'liability',
  'risk',
  'termination',
  'governing law',
  'warranty',
  'indemnification',
];

/**
 * Check if section is high-risk based on title
 */
function isHighRiskSection(sectionTitle: string): boolean {
  const lowerTitle = sectionTitle.toLowerCase();
  return HIGH_RISK_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

/**
 * Find adjacent sections for cross-section consistency check
 */
function findAdjacentSections(
  dirtySectionIds: number[],
  allSectionIds: number[]
): number[] {
  const adjacent = new Set<number>();
  
  dirtySectionIds.forEach(dirtyId => {
    const index = allSectionIds.indexOf(dirtyId);
    if (index > 0) {
      adjacent.add(allSectionIds[index - 1]); // Previous section
    }
    if (index < allSectionIds.length - 1) {
      adjacent.add(allSectionIds[index + 1]); // Next section
    }
  });
  
  // Remove dirty sections from adjacent list (they'll be reviewed anyway)
  dirtySectionIds.forEach(id => adjacent.delete(id));
  
  return Array.from(adjacent).sort((a, b) => a - b);
}

/**
 * Select agents to invoke based on review scope
 */
function selectAgents(reviewMode: ReviewMode, hasHighRisk: boolean): string[] {
  if (reviewMode === 'full-document') {
    // Full document review: all agents
    return ['compliance', 'evaluation', 'rewrite'];
  }
  
  if (reviewMode === 'cross-section') {
    // Cross-section: always include compliance + evaluation
    return ['compliance', 'evaluation'];
  }
  
  // Section-only: at minimum compliance
  if (hasHighRisk) {
    return ['compliance', 'evaluation'];
  }
  
  return ['compliance'];
}

/**
 * Select global checks based on review scope
 */
function selectGlobalChecks(
  reviewMode: ReviewMode,
  dirtyCount: number,
  hasHighRisk: boolean
): string[] {
  const checks: string[] = [];
  
  if (reviewMode === 'full-document') {
    // Full document: all checks
    checks.push('disclaimer_presence', 'cross_section_contradiction', 'structural_sanity');
  } else if (reviewMode === 'cross-section') {
    // Cross-section: contradiction check
    checks.push('cross_section_contradiction');
    if (hasHighRisk) {
      checks.push('disclaimer_presence');
    }
  } else {
    // Section-only: minimal checks
    if (dirtyCount >= 2 || hasHighRisk) {
      checks.push('disclaimer_presence');
    }
  }
  
  return checks;
}

/**
 * Estimate review duration based on scope
 */
function estimateDuration(
  reviewMode: ReviewMode,
  sectionsToReview: number,
  agentCount: number
): string {
  // Rough estimates:
  // - Section-only: ~5-10s per section
  // - Cross-section: ~8-15s per section
  // - Full-document: ~30-60s total
  
  if (reviewMode === 'full-document') {
    return '30-60 seconds';
  }
  
  if (reviewMode === 'cross-section') {
    const min = sectionsToReview * 8;
    const max = sectionsToReview * 15;
    return `${min}-${max} seconds`;
  }
  
  // Section-only
  const min = sectionsToReview * 5;
  const max = sectionsToReview * 10;
  return `${min}-${max} seconds`;
}

/**
 * Main scope planner function
 * 
 * Decision Rules (from approved plan):
 * 
 * | Scenario | Review Mode | Agents | Global Check |
 * |----------|-------------|--------|--------------|
 * | 1 section, light edit | Section-Only | Compliance | None |
 * | 2-3 sections, light-moderate | Section-Only | Compliance + Evaluation | Disclaimer check |
 * | 2-3 sections, heavy edit | Cross-Section | All agents | Disclaimer + Contradiction |
 * | 4+ sections | Cross-Section | All agents | All checks |
 * | Any disclaimer/terms section | Full-Document | All agents | All checks |
 * | Heavy edit in high-risk section | Full-Document | All agents | All checks |
 */
export function planReviewScope(input: ScopePlannerInput): ScopePlanningResult {
  const { dirtyQueue, allSections } = input;
  const dirtyCount = dirtyQueue.totalDirtyCount;
  const dirtySectionIds = dirtyQueue.entries.map(e => e.sectionId);
  
  console.log('[ScopePlanner] Planning review for', dirtyCount, 'dirty sections');
  
  // ============================================================
  // ANALYSIS PHASE
  // ============================================================
  
  // Count edit magnitudes
  const heavyEdits = dirtyQueue.entries.filter(e => e.editMagnitude === 'heavy').length;
  const moderateEdits = dirtyQueue.entries.filter(e => e.editMagnitude === 'moderate').length;
  const lightEdits = dirtyQueue.entries.filter(e => e.editMagnitude === 'light').length;
  
  // Check for high-risk sections in dirty queue
  const highRiskDirtySections = dirtyQueue.entries.filter(entry => {
    const section = allSections.find(s => s.id === entry.sectionId);
    return section && isHighRiskSection(section.title);
  });
  const hasHighRiskEdits = highRiskDirtySections.length > 0;
  
  // Find adjacent sections
  const allSectionIds = allSections.map(s => s.id).sort((a, b) => a - b);
  const adjacentSections = findAdjacentSections(dirtySectionIds, allSectionIds);
  
  const analysis = {
    dirtyCount,
    heavyEdits,
    highRiskSections: hasHighRiskEdits,
    adjacentSections,
  };
  
  console.log('[ScopePlanner] Analysis:', analysis);
  
  // ============================================================
  // DECISION PHASE
  // ============================================================
  
  let reviewMode: ReviewMode;
  let reasoning: string;
  let sectionsToReview: number[];
  let relatedSectionsToCheck: number[];
  
  // RULE 1: Heavy edit in high-risk section → Full-Document
  if (heavyEdits > 0 && hasHighRiskEdits) {
    reviewMode = 'full-document';
    reasoning = `Heavy edit detected in high-risk section (${highRiskDirtySections.map(e => {
      const s = allSections.find(sec => sec.id === e.sectionId);
      return s?.title || `Section ${e.sectionId}`;
    }).join(', ')}); performing full document review to ensure consistency and compliance.`;
    sectionsToReview = allSectionIds;
    relatedSectionsToCheck = [];
    
  // RULE 2: Any disclaimer/liability/termination section edited → Full-Document
  } else if (hasHighRiskEdits) {
    reviewMode = 'full-document';
    reasoning = `High-risk section edited (${highRiskDirtySections.map(e => {
      const s = allSections.find(sec => sec.id === e.sectionId);
      return s?.title || `Section ${e.sectionId}`;
    }).join(', ')}); performing full document review to ensure all cross-references are valid.`;
    sectionsToReview = allSectionIds;
    relatedSectionsToCheck = [];
    
  // RULE 3: 4+ sections edited → Cross-Section
  } else if (dirtyCount >= 4) {
    reviewMode = 'cross-section';
    reasoning = `${dirtyCount} sections edited; reviewing changed sections plus adjacent sections (${adjacentSections.join(', ')}) for cross-section consistency.`;
    sectionsToReview = dirtySectionIds;
    relatedSectionsToCheck = adjacentSections;
    
  // RULE 4: 2-3 sections with heavy edits → Cross-Section
  } else if (dirtyCount >= 2 && heavyEdits > 0) {
    reviewMode = 'cross-section';
    reasoning = `${dirtyCount} sections edited with ${heavyEdits} heavy edit(s); checking adjacent sections (${adjacentSections.join(', ')}) for consistency.`;
    sectionsToReview = dirtySectionIds;
    relatedSectionsToCheck = adjacentSections;
    
  // RULE 5: 2-3 sections with light-moderate edits → Section-Only (with disclaimer check)
  } else if (dirtyCount >= 2) {
    reviewMode = 'section-only';
    reasoning = `${dirtyCount} sections edited with ${lightEdits} light and ${moderateEdits} moderate edits; reviewing changed sections only with disclaimer presence check.`;
    sectionsToReview = dirtySectionIds;
    relatedSectionsToCheck = [];
    
  // RULE 6: 1 section, any magnitude → Section-Only
  } else {
    reviewMode = 'section-only';
    const magnitude = dirtyQueue.entries[0]?.editMagnitude || 'unknown';
    reasoning = `Single section edited with ${magnitude} edit; reviewing changed section only.`;
    sectionsToReview = dirtySectionIds;
    relatedSectionsToCheck = [];
  }
  
  // ============================================================
  // AGENT & CHECK SELECTION
  // ============================================================
  
  const agentsToInvoke = selectAgents(reviewMode, hasHighRiskEdits);
  const globalChecks = selectGlobalChecks(reviewMode, dirtyCount, hasHighRiskEdits);
  const estimatedDuration = estimateDuration(
    reviewMode,
    sectionsToReview.length + relatedSectionsToCheck.length,
    agentsToInvoke.length
  );
  
  const scopePlan: ScopePlan = {
    reviewMode,
    reasoning,
    sectionsToReview: sectionsToReview.sort((a, b) => a - b),
    relatedSectionsToCheck: relatedSectionsToCheck.sort((a, b) => a - b),
    agentsToInvoke,
    globalChecks,
    estimatedDuration,
    confidence: 1.0, // Always 1.0 for deterministic planner
  };
  
  console.log('[ScopePlanner] ✓ Scope plan created:', scopePlan.reviewMode);
  console.log('[ScopePlanner] Sections to review:', scopePlan.sectionsToReview);
  console.log('[ScopePlanner] Agents:', scopePlan.agentsToInvoke);
  console.log('[ScopePlanner] Global checks:', scopePlan.globalChecks);
  
  return {
    scopePlan,
    analysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate scope plan (sanity checks)
 */
export function validateScopePlan(plan: ScopePlan, totalSections: number): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check sections to review are valid
  if (plan.sectionsToReview.length === 0) {
    errors.push('No sections to review');
  }
  
  if (plan.sectionsToReview.some(id => id < 1 || id > totalSections)) {
    errors.push('Invalid section IDs in sectionsToReview');
  }
  
  if (plan.relatedSectionsToCheck.some(id => id < 1 || id > totalSections)) {
    errors.push('Invalid section IDs in relatedSectionsToCheck');
  }
  
  // Check agents are specified
  if (plan.agentsToInvoke.length === 0) {
    errors.push('No agents specified');
  }
  
  // Check review mode is valid
  const validModes: ReviewMode[] = ['section-only', 'cross-section', 'full-document'];
  if (!validModes.includes(plan.reviewMode)) {
    errors.push('Invalid review mode');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable summary of scope plan
 */
export function getScopePlanSummary(plan: ScopePlan): string {
  const mode = plan.reviewMode === 'section-only' 
    ? 'Section-Only Review'
    : plan.reviewMode === 'cross-section'
    ? 'Cross-Section Review'
    : 'Full Document Review';
  
  const sectionCount = plan.sectionsToReview.length + plan.relatedSectionsToCheck.length;
  
  return `${mode} (${sectionCount} section${sectionCount !== 1 ? 's' : ''}, ${plan.agentsToInvoke.length} agent${plan.agentsToInvoke.length !== 1 ? 's' : ''})`;
}



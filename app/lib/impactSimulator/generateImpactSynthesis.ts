/**
 * Impact Simulator: Natural Language Synthesis Generator
 * 
 * Deterministic text generation for agentic review summary.
 * No LLM calls, no API requests, pure string interpolation.
 */

import { ConsumerSystem } from './demoImpactData';

export function generateImpactSynthesis(
  systems: ConsumerSystem[],
  scenarioTitle: string,
  scenarioId: string
): string {
  // ============================================================
  // DERIVED METRICS (Same as card component)
  // ============================================================
  
  const total = systems.length;
  const criticalCount = systems.filter(s => s.criticality === 'critical').length;
  const highCount = systems.filter(s => s.criticality === 'high').length;
  
  const riskVeto = criticalCount > 0;
  
  // Top 3 impacted systems (stable sort)
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const systemIndexMap = new Map(systems.map((s, idx) => [s.id, idx]));
  
  const topImpacted = [...systems]
    .sort((a, b) => {
      const rankDiff = severityRank[a.criticality] - severityRank[b.criticality];
      if (rankDiff !== 0) return rankDiff;
      return (systemIndexMap.get(a.id) || 0) - (systemIndexMap.get(b.id) || 0);
    })
    .slice(0, 3);
  
  const topNames = topImpacted.map(s => s.name).join(', ');
  
  // Critical system names (first 2)
  const criticalSystems = systems.filter(s => s.criticality === 'critical');
  const criticalNames = criticalSystems.slice(0, 2).map(s => s.name).join(', ');
  
  // ============================================================
  // SCENARIO-SPECIFIC LOGIC
  // ============================================================
  
  // Scenario 1: Full Decommission Immediately - NOT RECOMMENDED
  if (scenarioId === 'FULL_DECOM') {
    return `**Agentic IT Impact Review: Analysis Complete**

**Scenario Assessed:** ${scenarioTitle}

**Overall Assessment: NOT RECOMMENDED — HIGHLY RISKY**

**Executive Summary:**

The multi-agent impact analysis strongly advises against immediate full decommissioning without a migration window. While this approach would achieve the fastest technical debt reduction, it introduces unacceptable business continuity and regulatory compliance risks.

The review identified ${criticalCount === 1 ? 'one critical system' : `${criticalCount} critical systems`} with hard dependencies on the mailbox infrastructure: ${criticalNames}. These systems cannot be migrated instantly and require the current workflow architecture to maintain audit trails and regulatory compliance. Additionally, ${highCount} high-priority systems across compliance, reporting, and client-facing operations would experience immediate service disruption.

**Critical Risk Factors:**

Immediate decommissioning without a transition period would force all ${total} dependent systems to simultaneously fail over to alternative channels with no preparation time. The Risk and Compliance Agent's analysis identifies this as a severe regulatory exposure, as systems like ${criticalNames} maintain legally-required audit continuity that cannot be interrupted. The operational risk includes potential transaction processing failures, compliance violations, and client service disruptions across multiple business segments.

**Agent Consensus:**

All three agents—Change Interpreter, System Impact, and Risk & Compliance—unanimously recommend against this approach. The System Impact Agent notes that immediate cutover eliminates the possibility of parallel run validation. The Risk & Compliance Agent classifies this as a critical risk scenario requiring formal veto and escalation to executive leadership.

**Recommendation:**

This scenario is not viable for production deployment. Consider alternative scenarios with migration windows (12-month or phased approaches) that allow time for consumer readiness validation, parallel routing setup, and compliance continuity planning. The risk-reward profile of immediate decommissioning is strongly unfavorable given the presence of critical system dependencies.

---

You may type RESET to run another scenario analysis or EXIT to close this analyzer.`;
  }
  
  // Scenario 2: Decommission with 12-Month Migration Window - MEDIUM RISK
  if (scenarioId === 'DECOM_WITH_MIGRATION') {
    return `**Agentic IT Impact Review: Analysis Complete**

**Scenario Assessed:** ${scenarioTitle}

**Overall Assessment: MEDIUM BUSINESS RISK DETECTED — RISK LEVEL MEDIUM**

**Executive Summary:**

The multi-agent impact analysis indicates that a 12-month migration window provides a viable pathway for decommissioning, though significant coordination and risk management will be required throughout the transition period. This approach balances technical debt reduction goals with business continuity and regulatory compliance requirements.

The review identified ${criticalCount === 1 ? 'one critical system' : `${criticalCount} critical systems`} requiring migration support: ${criticalNames}. Additionally, ${highCount} high-priority systems will need structured transition planning. The 12-month window provides sufficient time for phased rollout, parallel routing validation, and consumer contract updates, though execution risk remains moderate due to the coordination complexity across multiple dependent systems.

**Risk Profile Analysis:**

The extended migration window mitigates the immediate cutover risks associated with instant decommissioning. However, the Risk and Compliance Agent notes that sustained dual-system operations over 12 months introduce operational overhead and potential audit complexity. Critical systems like ${criticalNames} will require explicit migration milestones and readiness gates to ensure compliance continuity is maintained throughout the transition.

The System Impact Agent's analysis confirms that 12 months is sufficient for most consumer systems to complete their contract updates and routing changes, assuming proactive coordination begins immediately. However, medium risk persists due to dependencies on external system upgrade timelines that may not align perfectly with the decommissioning schedule.

**Key Success Factors:**

Success requires establishing clear migration milestones at months 3, 6, 9, and 12, with mandatory readiness checkpoints for critical systems. The Change Interpreter Agent recommends immediate initiation of consumer outreach and contract amendment processes. Parallel routing infrastructure must be operational by month 2 to enable progressive consumer migration without service disruption.

**Recommendation:**

This scenario is conditionally approved for planning and execution, subject to establishing formal migration governance and achieving critical consumer commitment within the first quarter. The recommended sequencing involves: Phase 1 (Months 1-3) retention export validation and parallel routing setup; Phase 2 (Months 4-9) progressive consumer migration with priority focus on ${criticalNames}; Phase 3 (Months 10-12) final cutover and decommissioning after all critical consumers confirm readiness.

The medium risk level requires executive sponsorship and quarterly steering committee oversight to manage coordination dependencies and ensure timeline adherence. ${riskVeto ? `The risk veto mechanism requires explicit approval gates for critical system migrations before final decommissioning proceeds.` : ''}

---

You may type RESET to run another scenario analysis or EXIT to close this analyzer.`;
  }
  
  // Default for other scenarios (Scenarios 3 & 4)
  return `**Agentic IT Impact Review: Analysis Complete**

**Scenario Assessed:** ${scenarioTitle}

**Executive Summary:**

From a short-term technical debt reduction perspective, the proposed decommissioning is technically feasible and would reduce ongoing operational overhead. However, the multi-agent impact analysis reveals significant downstream dependencies that introduce substantial business continuity risk.

The review identified ${criticalCount === 1 ? 'one critical system' : `${criticalCount} critical systems`} currently reliant on the mailbox infrastructure: ${criticalNames}. Additionally, ${highCount} high-priority systems across compliance, reporting, and client-facing operations maintain dependencies on the current workflow patterns. These systems require mailbox-based audit trails and event continuity to meet regulatory and operational requirements.

**Key Conflict Identified:**

The System Impact Agent's technical assessment indicates that a phased rollout with parallel routing is operationally feasible. However, the Risk and Compliance Agent's analysis concludes that the presence of critical dependencies necessitates human oversight gates and blocks any automated deployment approach. This represents a fundamental tension between operational efficiency and regulatory control requirements.

**Recommendation:**

The synthesis supports a conditional approval pathway rather than proceeding with immediate full decommissioning. The recommended sequencing involves completing foundational preparatory work first—specifically, retention export validation and parallel routing infrastructure—followed by targeted consumer contract updates for the critical systems identified above. Final decommissioning should be deferred until those critical consumers complete their planned system upgrades and can confirm readiness for the transition.

This phased approach avoids creating compliance gaps or forcing dual remediation efforts across multiple dependent systems. ${riskVeto ? `The risk veto mechanism has been triggered due to the ${criticalCount} critical ${criticalCount === 1 ? 'dependency' : 'dependencies'} requiring explicit approval before proceeding.` : ''}

**Next Steps:**

Phase 1 focuses on retention export validation and establishing parallel routing capabilities. Phase 2 addresses consumer contract updates for ${criticalNames}. Phase 3 executes the final decommissioning only after critical consumer readiness confirmation is obtained.

---

You may type RESET to run another scenario analysis or EXIT to close this analyzer.`;
}


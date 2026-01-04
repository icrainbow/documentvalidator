/**
 * Impact Simulator: Deterministic Demo Data
 * 
 * Mailbox/API decommissioning what-if simulation.
 * All data is hardcoded for deterministic, time-sequenced animation.
 */

// ============================================================
// TYPES
// ============================================================

export interface ImpactScenario {
  id: string;
  label: string;
  description: string;
  impactMultiplier: number; // 0-1, how much of baseline is affected
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConsumerSystem {
  id: string;
  name: string;
  description: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface BusinessScenario {
  id: string;
  title: string;
  description: string;
  segmentWeight: Record<string, number>; // PB, PFA, WM, CIC, FIM
  regionWeight: Record<string, number>; // CH, APAC, EMEA
  linkedSystems: string[]; // system IDs
}

export interface BaseDistribution {
  totalMessages: number;
  segmentSplit: Record<string, number>; // PB=0.5, etc.
  regionSplit: Record<string, number>; // CH=0.6, etc.
}

export interface HeatmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  baseRisk: 'green' | 'yellow' | 'orange' | 'red';
  scenarioRiskDeltas: Record<string, 'green' | 'yellow' | 'orange' | 'red'>;
}

// ============================================================
// SCENARIOS (4 what-if options)
// ============================================================

export const SCENARIOS: ImpactScenario[] = [
  {
    id: 'FULL_DECOM',
    label: 'Full Decommission Immediately',
    description: 'Complete mailbox + SOAP API shutdown. All consumers must migrate to REST API or alternative channels.',
    impactMultiplier: 1.0,
    riskLevel: 'critical'
  },
  {
    id: 'DECOM_WITH_MIGRATION',
    label: 'Decommission with 12-Month Migration Window',
    description: 'Gradual shutdown with migration support. REST API provided, legacy clients given 12 months to transition.',
    impactMultiplier: 0.7,
    riskLevel: 'high'
  },
  {
    id: 'DECOM_SOAP_ONLY',
    label: 'SOAP API Decommission Only',
    description: 'Keep mailbox active, shutdown only SOAP endpoints. Mailbox consumers unaffected.',
    impactMultiplier: 0.3,
    riskLevel: 'medium'
  },
  {
    id: 'PROTOCOL_UPGRADE',
    label: 'Protocol Upgrade (Keep Mailbox)',
    description: 'Upgrade to TLS 1.3 + OAuth2, keep mailbox + SOAP. Legacy clients need auth update only.',
    impactMultiplier: 0.15,
    riskLevel: 'low'
  }
];

// ============================================================
// CONSUMER SYSTEMS (16 dependent systems)
// ============================================================

export const CONSUMER_SYSTEMS: ConsumerSystem[] = [
  { id: 'sys_01', name: 'Core Banking Engine', description: 'Transaction processing hub', criticality: 'critical' },
  { id: 'sys_02', name: 'Payment Gateway', description: 'Cross-border payment routing', criticality: 'critical' },
  { id: 'sys_03', name: 'Risk Management Platform', description: 'AML/KYC risk scoring', criticality: 'high' },
  { id: 'sys_04', name: 'CRM System', description: 'Client relationship data', criticality: 'high' },
  { id: 'sys_05', name: 'Reporting Engine', description: 'Regulatory reporting', criticality: 'high' },
  { id: 'sys_06', name: 'Trade Finance Platform', description: 'Letter of credit processing', criticality: 'medium' },
  { id: 'sys_07', name: 'Mobile Banking App', description: 'Retail mobile interface', criticality: 'high' },
  { id: 'sys_08', name: 'Wealth Management Portal', description: 'Investment tracking', criticality: 'medium' },
  { id: 'sys_09', name: 'Compliance Monitoring', description: 'Transaction surveillance', criticality: 'high' },
  { id: 'sys_10', name: 'Data Warehouse ETL', description: 'Analytics pipeline', criticality: 'medium' },
  { id: 'sys_11', name: 'External Partner API', description: '3rd party integrations', criticality: 'medium' },
  { id: 'sys_12', name: 'Notification Service', description: 'Email/SMS alerts', criticality: 'low' },
  { id: 'sys_13', name: 'Audit Logging System', description: 'Compliance audit trail', criticality: 'high' },
  { id: 'sys_14', name: 'Document Management', description: 'Contract storage', criticality: 'medium' },
  { id: 'sys_15', name: 'Treasury System', description: 'Liquidity management', criticality: 'high' },
  { id: 'sys_16', name: 'Legacy Batch Processor', description: 'Overnight reconciliation', criticality: 'low' }
];

// ============================================================
// BUSINESS SCENARIOS (16 high-value use cases)
// ============================================================

export const BUSINESS_SCENARIOS: BusinessScenario[] = [
  {
    id: 'biz_01',
    title: 'Private Banking Client Onboarding',
    description: 'KYC document submission + account setup workflow',
    segmentWeight: { PB: 0.6, PFA: 0.2, WM: 0.15, CIC: 0.03, FIM: 0.02 },
    regionWeight: { CH: 0.5, APAC: 0.3, EMEA: 0.2 },
    linkedSystems: ['sys_01', 'sys_03', 'sys_04', 'sys_13']
  },
  {
    id: 'biz_02',
    title: 'Cross-Border Wire Transfer',
    description: 'SWIFT message routing + FX conversion',
    segmentWeight: { PB: 0.4, PFA: 0.3, WM: 0.15, CIC: 0.1, FIM: 0.05 },
    regionWeight: { CH: 0.4, APAC: 0.35, EMEA: 0.25 },
    linkedSystems: ['sys_02', 'sys_09', 'sys_13', 'sys_15']
  },
  {
    id: 'biz_03',
    title: 'AML Risk Score Update',
    description: 'Transaction pattern analysis + risk recalculation',
    segmentWeight: { PB: 0.25, PFA: 0.25, WM: 0.2, CIC: 0.15, FIM: 0.15 },
    regionWeight: { CH: 0.5, APAC: 0.3, EMEA: 0.2 },
    linkedSystems: ['sys_03', 'sys_09', 'sys_13']
  },
  {
    id: 'biz_04',
    title: 'Regulatory Report Submission',
    description: 'Daily/monthly compliance reporting to authorities',
    segmentWeight: { PB: 0.2, PFA: 0.2, WM: 0.2, CIC: 0.2, FIM: 0.2 },
    regionWeight: { CH: 0.6, APAC: 0.2, EMEA: 0.2 },
    linkedSystems: ['sys_05', 'sys_13', 'sys_14']
  },
  {
    id: 'biz_05',
    title: 'Trade Finance Letter of Credit',
    description: 'L/C issuance + amendment + payment',
    segmentWeight: { PB: 0.1, PFA: 0.3, WM: 0.05, CIC: 0.45, FIM: 0.1 },
    regionWeight: { CH: 0.3, APAC: 0.5, EMEA: 0.2 },
    linkedSystems: ['sys_06', 'sys_02', 'sys_13']
  },
  {
    id: 'biz_06',
    title: 'Mobile App Balance Inquiry',
    description: 'Real-time account balance + recent transactions',
    segmentWeight: { PB: 0.5, PFA: 0.25, WM: 0.2, CIC: 0.03, FIM: 0.02 },
    regionWeight: { CH: 0.45, APAC: 0.35, EMEA: 0.2 },
    linkedSystems: ['sys_07', 'sys_01']
  },
  {
    id: 'biz_07',
    title: 'Investment Portfolio Rebalancing',
    description: 'Asset allocation adjustment + trade execution',
    segmentWeight: { PB: 0.3, PFA: 0.2, WM: 0.45, CIC: 0.03, FIM: 0.02 },
    regionWeight: { CH: 0.55, APAC: 0.25, EMEA: 0.2 },
    linkedSystems: ['sys_08', 'sys_15', 'sys_01']
  },
  {
    id: 'biz_08',
    title: 'Transaction Surveillance Alert',
    description: 'Suspicious activity detection + case creation',
    segmentWeight: { PB: 0.2, PFA: 0.25, WM: 0.2, CIC: 0.2, FIM: 0.15 },
    regionWeight: { CH: 0.5, APAC: 0.3, EMEA: 0.2 },
    linkedSystems: ['sys_09', 'sys_03', 'sys_13']
  },
  {
    id: 'biz_09',
    title: 'End-of-Day Analytics Pipeline',
    description: 'Data extraction + warehouse load + report generation',
    segmentWeight: { PB: 0.2, PFA: 0.2, WM: 0.2, CIC: 0.2, FIM: 0.2 },
    regionWeight: { CH: 0.6, APAC: 0.25, EMEA: 0.15 },
    linkedSystems: ['sys_10', 'sys_05', 'sys_01']
  },
  {
    id: 'biz_10',
    title: 'Partner Bank Integration Sync',
    description: 'Third-party data exchange + reconciliation',
    segmentWeight: { PB: 0.15, PFA: 0.3, WM: 0.15, CIC: 0.25, FIM: 0.15 },
    regionWeight: { CH: 0.4, APAC: 0.35, EMEA: 0.25 },
    linkedSystems: ['sys_11', 'sys_02', 'sys_13']
  },
  {
    id: 'biz_11',
    title: 'Client Notification Dispatch',
    description: 'Email/SMS alerts for transactions + statements',
    segmentWeight: { PB: 0.35, PFA: 0.3, WM: 0.25, CIC: 0.05, FIM: 0.05 },
    regionWeight: { CH: 0.5, APAC: 0.3, EMEA: 0.2 },
    linkedSystems: ['sys_12', 'sys_07', 'sys_01']
  },
  {
    id: 'biz_12',
    title: 'Audit Trail Export',
    description: 'Compliance audit log extraction + archival',
    segmentWeight: { PB: 0.2, PFA: 0.2, WM: 0.2, CIC: 0.2, FIM: 0.2 },
    regionWeight: { CH: 0.6, APAC: 0.2, EMEA: 0.2 },
    linkedSystems: ['sys_13', 'sys_14', 'sys_05']
  },
  {
    id: 'biz_13',
    title: 'Contract Document Retrieval',
    description: 'Client agreement + amendment history lookup',
    segmentWeight: { PB: 0.25, PFA: 0.25, WM: 0.25, CIC: 0.15, FIM: 0.1 },
    regionWeight: { CH: 0.5, APAC: 0.3, EMEA: 0.2 },
    linkedSystems: ['sys_14', 'sys_04']
  },
  {
    id: 'biz_14',
    title: 'Liquidity Forecasting Update',
    description: 'Treasury cash position + reserve calculation',
    segmentWeight: { PB: 0.1, PFA: 0.2, WM: 0.1, CIC: 0.3, FIM: 0.3 },
    regionWeight: { CH: 0.6, APAC: 0.25, EMEA: 0.15 },
    linkedSystems: ['sys_15', 'sys_01', 'sys_02']
  },
  {
    id: 'biz_15',
    title: 'Overnight Batch Reconciliation',
    description: 'Legacy system end-of-day balance matching',
    segmentWeight: { PB: 0.2, PFA: 0.2, WM: 0.2, CIC: 0.2, FIM: 0.2 },
    regionWeight: { CH: 0.65, APAC: 0.2, EMEA: 0.15 },
    linkedSystems: ['sys_16', 'sys_01', 'sys_10']
  },
  {
    id: 'biz_16',
    title: 'Client Data Privacy Request',
    description: 'GDPR/CCPA data export + deletion workflow',
    segmentWeight: { PB: 0.3, PFA: 0.25, WM: 0.25, CIC: 0.1, FIM: 0.1 },
    regionWeight: { CH: 0.4, APAC: 0.25, EMEA: 0.35 },
    linkedSystems: ['sys_04', 'sys_13', 'sys_14']
  }
];

// ============================================================
// BASE DISTRIBUTION (message volume baseline)
// ============================================================

export const BASE_DISTRIBUTION: BaseDistribution = {
  totalMessages: 1_500_000, // monthly volume
  segmentSplit: {
    PB: 0.50,   // Private Banking
    PFA: 0.125, // Private Family Advisors
    WM: 0.125,  // Wealth Management
    CIC: 0.125, // Corporate & Institutional Clients
    FIM: 0.125  // Financial Institutions Management
  },
  regionSplit: {
    CH: 0.60,   // Switzerland
    APAC: 0.25, // Asia-Pacific
    EMEA: 0.15  // Europe/Middle East/Africa
  }
};

// ============================================================
// HEATMAP NODES (for visual dependency map)
// ============================================================

export const HEATMAP_NODES: HeatmapNode[] = [
  {
    id: 'mailbox_core',
    label: 'Mailbox Core',
    x: 400,
    y: 100,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'red',
      DECOM_WITH_MIGRATION: 'orange',
      DECOM_SOAP_ONLY: 'green',
      PROTOCOL_UPGRADE: 'yellow'
    }
  },
  {
    id: 'soap_api',
    label: 'SOAP API',
    x: 250,
    y: 200,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'red',
      DECOM_WITH_MIGRATION: 'orange',
      DECOM_SOAP_ONLY: 'red',
      PROTOCOL_UPGRADE: 'yellow'
    }
  },
  {
    id: 'rest_api',
    label: 'REST API',
    x: 550,
    y: 200,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'yellow',
      DECOM_WITH_MIGRATION: 'yellow',
      DECOM_SOAP_ONLY: 'green',
      PROTOCOL_UPGRADE: 'green'
    }
  },
  {
    id: 'auth_layer',
    label: 'Auth Layer',
    x: 400,
    y: 300,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'orange',
      DECOM_WITH_MIGRATION: 'yellow',
      DECOM_SOAP_ONLY: 'green',
      PROTOCOL_UPGRADE: 'orange'
    }
  },
  {
    id: 'core_systems',
    label: 'Core Systems',
    x: 200,
    y: 400,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'red',
      DECOM_WITH_MIGRATION: 'orange',
      DECOM_SOAP_ONLY: 'yellow',
      PROTOCOL_UPGRADE: 'yellow'
    }
  },
  {
    id: 'reporting',
    label: 'Reporting',
    x: 400,
    y: 400,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'orange',
      DECOM_WITH_MIGRATION: 'yellow',
      DECOM_SOAP_ONLY: 'yellow',
      PROTOCOL_UPGRADE: 'green'
    }
  },
  {
    id: 'external_partners',
    label: 'Ext Partners',
    x: 600,
    y: 400,
    baseRisk: 'green',
    scenarioRiskDeltas: {
      FULL_DECOM: 'red',
      DECOM_WITH_MIGRATION: 'orange',
      DECOM_SOAP_ONLY: 'orange',
      PROTOCOL_UPGRADE: 'yellow'
    }
  }
];

// ============================================================
// PURE COMPUTATION: Impact Stats
// ============================================================

export interface ImpactStats {
  scenario: ImpactScenario;
  totalMessagesAffected: number;
  bySegment: Record<string, number>;
  byRegion: Record<string, number>;
  topAffectedScenarios: Array<{
    scenario: BusinessScenario;
    estimatedImpact: number;
  }>;
}

export function computeImpactStats(scenarioId: string): ImpactStats {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  
  const totalAffected = Math.round(
    BASE_DISTRIBUTION.totalMessages * scenario.impactMultiplier
  );
  
  const bySegment: Record<string, number> = {};
  Object.entries(BASE_DISTRIBUTION.segmentSplit).forEach(([seg, weight]) => {
    bySegment[seg] = Math.round(totalAffected * weight);
  });
  
  const byRegion: Record<string, number> = {};
  Object.entries(BASE_DISTRIBUTION.regionSplit).forEach(([reg, weight]) => {
    byRegion[reg] = Math.round(totalAffected * weight);
  });
  
  // Score each business scenario by relevance
  const scoredScenarios = BUSINESS_SCENARIOS.map(biz => {
    let score = 0;
    // Weight by segment importance
    Object.entries(biz.segmentWeight).forEach(([seg, w]) => {
      score += w * (BASE_DISTRIBUTION.segmentSplit[seg] || 0);
    });
    // Weight by region importance
    Object.entries(biz.regionWeight).forEach(([reg, w]) => {
      score += w * (BASE_DISTRIBUTION.regionSplit[reg] || 0);
    });
    // Multiply by scenario impact
    const impact = Math.round(score * totalAffected * scenario.impactMultiplier);
    return { scenario: biz, estimatedImpact: impact };
  });
  
  // Top 5 by impact
  const topAffectedScenarios = scoredScenarios
    .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
    .slice(0, 5);
  
  return {
    scenario,
    totalMessagesAffected: totalAffected,
    bySegment,
    byRegion,
    topAffectedScenarios
  };
}


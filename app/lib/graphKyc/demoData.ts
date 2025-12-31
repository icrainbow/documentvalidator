/**
 * Flow2: Demo KYC Scenarios
 * 
 * Provides repeatable test data for Flow2 Graph KYC review.
 * ISOLATED: Never used by Flow1.
 */

import type { Flow2Document, Flow2DocTypeHint } from '../flow2/types';

export type { Flow2Document };

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  documents: Flow2Document[];
  expected: {
    path: 'fast' | 'crosscheck' | 'escalate' | 'human_gate';
    minRiskScore: number;
    maxRiskScore: number;
  };
}

/**
 * Demo Scenario 1: Fast Path (Low Risk)
 * Complete coverage, no high-risk keywords, risk < 30
 */
const SCENARIO_FAST: DemoScenario = {
  id: 'fast',
  name: 'Fast Path - Low Risk',
  description: 'Complete KYC documentation with no red flags. Expected to route through fast path.',
  expected: {
    path: 'fast',
    minRiskScore: 10,
    maxRiskScore: 30
  },
  documents: [
    {
      doc_id: 'fast-001',
      filename: 'Client_Identity_John_Smith.pdf',
      text: `CLIENT IDENTIFICATION DOCUMENT
      
Full Name: John Michael Smith
Date of Birth: March 15, 1978
Nationality: United States
Passport Number: US-789456123
Residential Address: 123 Main Street, New York, NY 10001, United States
Employment: Senior Software Engineer at TechCorp Inc.
Annual Income: USD 180,000

This document confirms the identity of the above-named individual based on government-issued identification documents verified on January 15, 2024. The client has provided proof of address through utility bills dated within the last 3 months. Employment verification has been completed through direct contact with the employer's HR department.`,
      doc_type_hint: 'Client Identity' as Flow2DocTypeHint
    },
    {
      doc_id: 'fast-002',
      filename: 'Source_of_Wealth_Statement.pdf',
      text: `SOURCE OF WEALTH DECLARATION

Client Name: John Michael Smith
Date: January 15, 2024

Primary Source of Wealth:
Employment income as Senior Software Engineer at TechCorp Inc. (2015-present). Annual salary: USD 180,000. Total accumulated wealth from employment: approximately USD 900,000.

Secondary Sources:
- Investment portfolio (stocks and bonds): USD 250,000, accumulated through systematic savings and investment over 9 years
- Inheritance from late father (2019): USD 150,000, documented through estate settlement records
- Real estate property (primary residence): Purchased in 2018 for USD 450,000, current value approximately USD 600,000

Total Estimated Net Worth: USD 1.9 million

All sources are legitimate, documented, and verifiable. No business ownership or complex financial structures involved. The client maintains a standard risk profile consistent with professional employment in the technology sector.`,
      doc_type_hint: 'Source of Wealth' as Flow2DocTypeHint
    },
    {
      doc_id: 'fast-003',
      filename: 'Account_Purpose_Statement.pdf',
      text: `BUSINESS RELATIONSHIP PURPOSE

Client: John Michael Smith
Account Type: Individual Investment Account
Date: January 15, 2024

Purpose of Account:
To invest personal savings for long-term wealth accumulation and retirement planning. The client seeks a diversified portfolio of low to medium risk investments including equities, bonds, and mutual funds.

Expected Activity:
- Initial deposit: USD 200,000
- Monthly contributions: USD 3,000-5,000
- Investment horizon: 20+ years until retirement
- Expected annual transactions: 12-24 (monthly deposits plus occasional rebalancing)
- Geographic focus: United States and developed markets

Risk Appetite: Medium
Investment Objectives: Capital growth with moderate risk tolerance
No exposure to derivatives, commodities, or alternative investments requested.

The client has confirmed understanding of investment risks and has completed suitability assessment indicating appropriate risk tolerance for proposed investment strategy.`,
      doc_type_hint: 'General Document' as Flow2DocTypeHint
    }
  ]
};

/**
 * Demo Scenario 2: Crosscheck Path (Medium Risk)
 * Partial coverage, mild keywords, risk 31-60
 */
const SCENARIO_CROSSCHECK: DemoScenario = {
  id: 'crosscheck',
  name: 'Crosscheck Path - Medium Risk',
  description: 'Partial documentation with some complexity. Expected to route through crosscheck path.',
  expected: {
    path: 'crosscheck',
    minRiskScore: 35,
    maxRiskScore: 60
  },
  documents: [
    {
      doc_id: 'cross-001',
      filename: 'Client_Profile_Maria_Lopez.pdf',
      text: `CLIENT PROFILE SUMMARY

Name: Maria Elena Lopez
Date of Birth: June 8, 1975
Nationality: Argentina (dual citizenship with Spain)
Passport: AR-456123789
Current Residence: Dubai, United Arab Emirates

Business Activities:
Maria is the founder and CEO of GlobalTrade Consulting LLC, a consulting firm specializing in international trade advisory services. The company operates in multiple jurisdictions including Argentina, Spain, and UAE. The firm has been operational since 2012 and provides advisory services to import-export businesses.

Source of Wealth:
Primary income derived from consulting fees and business profits. The client has provided partial financial statements for the last 2 years. Additional documentation regarding offshore company structure in Dubai has been requested but not yet received.`,
      doc_type_hint: 'Client Identity' as Flow2DocTypeHint
    },
    {
      doc_id: 'cross-002',
      filename: 'Wealth_Declaration_Partial.pdf',
      text: `WEALTH DECLARATION (PARTIAL)

Client: Maria Elena Lopez
Submitted: January 20, 2024

Declared Assets:
- Business equity (GlobalTrade Consulting LLC): Estimated USD 800,000
- Investment properties in Buenos Aires: USD 450,000
- Liquid assets (bank accounts): USD 320,000
- Securities portfolio: Information pending

Total Declared Wealth: USD 1.57 million (partial)

Note: Client has indicated additional assets held through offshore company structure in Dubai. Full documentation of this structure has been requested. Client states the offshore entity is used for tax-efficient business operations and is fully compliant with local regulations. Verification pending.

The client's business operates across multiple jurisdictions which requires enhanced due diligence procedures.`,
      doc_type_hint: 'Source of Wealth' as Flow2DocTypeHint
    },
    {
      doc_id: 'cross-003',
      filename: 'Investment_Objectives.pdf',
      text: `INVESTMENT ACCOUNT OBJECTIVES

Client: Maria Elena Lopez
Account Purpose: Diversified investment for business proceeds and personal wealth management

Intended Use:
- Invest business profits into diversified portfolio
- Currency hedging for multi-jurisdiction business operations
- Exposure to emerging markets including Latin America and Middle East
- Expected transactions: 20-40 per year including forex and equity trades

Risk Profile: Medium to High
The client has experience with international investments and understands cross-border risks. Beneficial ownership structure for the offshore company has been partially documented. Full transparency documentation is in progress.

Account opening approved pending receipt of complete beneficial ownership documentation.`,
      doc_type_hint: 'General Document' as Flow2DocTypeHint
    }
  ]
};

/**
 * Demo Scenario 3: Escalate Path (High Risk)
 * Missing critical info, multiple high-risk keywords, risk 61-80
 */
const SCENARIO_ESCALATE: DemoScenario = {
  id: 'escalate',
  name: 'Escalate Path - High Risk',
  description: 'Missing documentation with high-risk indicators. Expected to route through escalate path.',
  expected: {
    path: 'escalate',
    minRiskScore: 65,
    maxRiskScore: 80
  },
  documents: [
    {
      doc_id: 'esc-001',
      filename: 'Client_Information_Victor_Chen.pdf',
      text: `CLIENT INFORMATION FORM

Name: Victor Chen
Date of Birth: November 2, 1968
Nationality: Hong Kong SAR (China)
Current Location: Monaco

Business Background:
Victor is a businessman with interests in international trade, particularly focusing on commodities trading and import-export operations between Asia and Europe. He has business relationships in multiple high-risk jurisdictions including some markets with complex regulatory environments.

Politically Exposed Person (PEP) Screening:
Initial screening indicates possible distant family connection to government officials in region of origin. Client states this is a distant relative and he has no direct political involvement. Additional verification required.`,
      doc_type_hint: 'General Document' as Flow2DocTypeHint
    },
    {
      doc_id: 'esc-002',
      filename: 'Business_Structure_Overview.pdf',
      text: `BUSINESS STRUCTURE DOCUMENTATION

Client: Victor Chen
Business Entities: Multiple holding companies registered in offshore jurisdictions including British Virgin Islands and Panama.

Structure Overview:
The client operates through a complex network of shell companies used for international trade operations. The stated purpose is tax efficiency and asset protection. The ultimate beneficial ownership structure spans multiple layers across several jurisdictions.

Cash-Intensive Operations:
The client's businesses involve significant cash transactions particularly in emerging markets with limited banking infrastructure. Annual cash handling is estimated at USD 5-10 million.

High-Risk Jurisdiction Exposure:
Operations include countries with elevated financial crime risk ratings. Client confirms all activities are legitimate trade operations.

NOTE: Enhanced Due Diligence required. Full beneficial ownership documentation is incomplete. Additional information about source of initial capital and business partner identities has been requested.`,
      doc_type_hint: 'Beneficial Ownership' as Flow2DocTypeHint
    },
    {
      doc_id: 'esc-003',
      filename: 'Account_Application_Notes.pdf',
      text: `ACCOUNT APPLICATION - INTERNAL NOTES

Applicant: Victor Chen
Risk Rating: HIGH - Requires Senior Management Approval

Concerns Identified:
- Incomplete beneficial ownership documentation
- Multiple offshore entities with complex structure
- Operations in high-risk jurisdictions
- Significant cash-handling activities
- Possible PEP connection (unverified)
- Source of initial wealth not fully documented

Client has been requested to provide:
1. Complete beneficial ownership chart
2. Source of funds documentation for initial capital
3. Business partner due diligence reports
4. Proof of regulatory compliance in operating jurisdictions
5. Clear explanation of offshore structure necessity

Relationship Manager Notes: Client is cooperative but documentation gathering is slow. Stated business complexity makes full transparency challenging. Recommend proceed with caution pending completion of enhanced due diligence checklist.`,
      doc_type_hint: 'General Document' as Flow2DocTypeHint
    }
  ]
};

/**
 * Demo Scenario 4: Human Gate (Critical Risk)
 * Multiple missing topics, critical keywords, risk > 80
 */
const SCENARIO_HUMAN_GATE: DemoScenario = {
  id: 'human_gate',
  name: 'Human Gate - Critical Risk',
  description: 'Critical risk indicators requiring human decision. Expected to trigger human gate.',
  expected: {
    path: 'human_gate',
    minRiskScore: 85,
    maxRiskScore: 100
  },
  documents: [
    {
      doc_id: 'hg-001',
      filename: 'Applicant_Profile_Minimal.pdf',
      text: `APPLICANT PROFILE

Name: Alexander Volkov
Age: 52
Nationality: Multiple (Details not disclosed)
Current Residence: Cyprus

Limited Information Provided:
The applicant has submitted minimal documentation. Identity verification is pending receipt of certified passport copies. Current residence address has been provided but not yet verified through independent sources.

Screening Alerts:
Initial name screening has flagged potential matches on sanctions lists. Client states these are different individuals with similar names. Verification in progress with compliance team.

Politically Exposed Person (PEP) Status: POSITIVE
The applicant has confirmed holding a senior government advisory position in country of origin from 2010-2015. Current political involvement status unclear. Enhanced due diligence mandatory.`,
      doc_type_hint: 'Client Identity' as Flow2DocTypeHint
    },
    {
      doc_id: 'hg-002',
      filename: 'Source_of_Wealth_Undocumented.pdf',
      text: `SOURCE OF WEALTH INQUIRY

Applicant: Alexander Volkov
Status: INCOMPLETE

The applicant has declared significant wealth (estimated USD 15-20 million) but has not provided comprehensive documentation of wealth origin. Client states wealth is derived from "business investments" and "advisory services" but specific details are vague.

Red Flags Identified:
- No tax returns or financial statements provided
- Business entity names not disclosed
- No employment records or proof of income
- Vague references to "government advisory work" during PEP period
- Reluctance to provide detailed source of funds documentation

The client has been informed that the account application cannot proceed without complete source of wealth documentation. This is a mandatory requirement for all clients, especially those with PEP status.

COMPLIANCE NOTE: This case requires immediate escalation to senior compliance officer. Do not proceed with account opening without explicit approval from Chief Compliance Officer.`,
      doc_type_hint: 'Source of Wealth' as Flow2DocTypeHint
    },
    {
      doc_id: 'hg-003',
      filename: 'Transaction_Expectations_Concerning.pdf',
      text: `EXPECTED ACCOUNT ACTIVITY

Applicant: Alexander Volkov
Stated Purpose: "International investment and wealth management"

Expected Transaction Profile:
- Large incoming wire transfers from multiple jurisdictions (stated: USD 2-5 million per quarter)
- Origins include several shell companies in offshore jurisdictions
- Frequent cross-border transactions
- Stated need for "privacy and discretion"
- Some counterparties may be in sanctioned regions (client states only pre-sanctions historical relationships)

Risk Assessment:
This transaction profile combined with incomplete due diligence documentation and PEP status creates CRITICAL risk exposure.

Additional Concerns:
- Client reluctant to disclose full business partner network
- Vague explanations for use of multiple shell companies
- References to "sensitive business relationships" without details
- No clear legitimate business purpose articulated

MANDATORY HUMAN DECISION POINT:
This application cannot proceed through automated approval. Requires:
1. Senior management review
2. Legal counsel consultation  
3. Explicit risk acceptance decision
4. Board-level notification if proceeding

Recommendation: DECLINE APPLICATION unless client provides complete, satisfactory documentation addressing all identified gaps and concerns.`,
      doc_type_hint: 'General Document' as Flow2DocTypeHint
    },
    {
      doc_id: 'hg-004',
      filename: 'Sanctions_Screening_Alert.pdf',
      text: `SANCTIONS SCREENING REPORT

Subject: Alexander Volkov
Screening Date: January 25, 2024

ALERT: POTENTIAL MATCH

The applicant's name and profile show potential matches on the following watchlists:
- OFAC SDN List: Possible name match (95% similarity)
- EU Sanctions List: Possible indirect association through business entities
- UK Sanctions List: Historical business relationship with designated person

Client's Explanation:
The applicant states these are cases of mistaken identity and that he has "no connection to sanctioned individuals or entities." He claims the matches are due to common names and coincidental business overlap.

Verification Status: IN PROGRESS
The compliance team is conducting enhanced verification including:
- Independent background checks
- Law enforcement database queries
- International PEP and sanctions database searches
- Third-party due diligence firm engagement

CRITICAL: Account opening SUSPENDED pending completion of sanctions verification. This case has been escalated to the Chief Compliance Officer and external legal counsel.

Under no circumstances should this account be opened or any transactions processed until explicit written clearance is received from senior management and legal department.

Shell company structures and reluctance to provide transparent documentation combined with sanctions screening alerts create unacceptable risk profile without comprehensive resolution of all identified concerns.`,
      doc_type_hint: 'Sanctions Screening' as Flow2DocTypeHint
    }
  ]
};

/**
 * All demo scenarios
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  SCENARIO_FAST,
  SCENARIO_CROSSCHECK,
  SCENARIO_ESCALATE,
  SCENARIO_HUMAN_GATE
];

/**
 * Get demo scenario by ID
 */
export function getDemoScenario(id: string): DemoScenario | null {
  return DEMO_SCENARIOS.find(s => s.id === id) || null;
}


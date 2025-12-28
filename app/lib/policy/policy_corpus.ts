/**
 * Hardcoded Policy Corpus for Compliance Demo
 * In production, this would be loaded from a database or policy management system
 */

import { PolicyRule } from '../agents/domain';

export const POLICY_CORPUS: PolicyRule[] = [
  {
    id: 'KYC-001',
    title: 'Client Identity Verification',
    category: 'kyc',
    requirement_text: 'All clients must provide government-issued identification and proof of address before account opening.',
    keywords: ['identity', 'verification', 'kyc', 'identification', 'passport', 'id card'],
    severity: 'critical',
  },
  {
    id: 'AML-003',
    title: 'Source of Funds Declaration',
    category: 'aml',
    requirement_text: 'Clients must declare the source of funds for investments exceeding $100,000 USD.',
    keywords: ['source of funds', 'money laundering', 'aml', 'funds origin', 'wealth source'],
    severity: 'critical',
  },
  {
    id: 'RISK-007',
    title: 'Risk Assessment Completion',
    category: 'risk',
    requirement_text: 'A comprehensive risk assessment must be completed and documented for all investment proposals.',
    keywords: ['risk assessment', 'risk profile', 'risk tolerance', 'investment risk'],
    severity: 'high',
  },
  {
    id: 'DISC-012',
    title: 'Material Information Disclosure',
    category: 'disclosure',
    requirement_text: 'All material risks, fees, and potential conflicts of interest must be disclosed to clients in writing.',
    keywords: ['disclosure', 'transparency', 'material information', 'conflicts of interest', 'fees'],
    severity: 'high',
  },
  {
    id: 'COND-008',
    title: 'Prohibited Industry Restrictions',
    category: 'conduct',
    requirement_text: 'Investments in tobacco, weapons manufacturing, and certain restricted industries require special approval.',
    keywords: ['tobacco', 'weapons', 'restricted industries', 'prohibited sectors', 'sanctioned'],
    severity: 'critical',
  },
  {
    id: 'DOC-015',
    title: 'Investment Proposal Documentation',
    category: 'documentation',
    requirement_text: 'Investment proposals must include: objectives, time horizon, instruments, risk assessment, and client acknowledgment.',
    keywords: ['documentation', 'proposal', 'investment plan', 'objectives', 'time horizon'],
    severity: 'medium',
  },
  {
    id: 'RISK-019',
    title: 'High-Risk Client Review',
    category: 'risk',
    requirement_text: 'Clients classified as high-risk must undergo enhanced due diligence and quarterly review.',
    keywords: ['high risk', 'enhanced due diligence', 'quarterly review', 'risk classification'],
    severity: 'high',
  },
  {
    id: 'COND-022',
    title: 'Insider Trading Prevention',
    category: 'conduct',
    requirement_text: 'All trades must be screened for potential insider trading violations. Material non-public information must not be used.',
    keywords: ['insider trading', 'mnpi', 'material non-public information', 'trading restrictions'],
    severity: 'critical',
  },
  {
    id: 'DOC-025',
    title: 'Client Acknowledgment Signature',
    category: 'documentation',
    requirement_text: 'All investment proposals and risk disclosures must be signed by the client before execution.',
    keywords: ['signature', 'client acknowledgment', 'signed agreement', 'client consent'],
    severity: 'high',
  },
  {
    id: 'DISC-030',
    title: 'Performance Projection Disclaimer',
    category: 'disclosure',
    requirement_text: 'Any performance projections or historical returns must include disclaimers that past performance does not guarantee future results.',
    keywords: ['performance', 'projections', 'disclaimer', 'past performance', 'returns'],
    severity: 'medium',
  },
];

/**
 * Find policies matching given keywords or text
 */
export function findMatchingPolicies(text: string): PolicyRule[] {
  const lowerText = text.toLowerCase();
  return POLICY_CORPUS.filter(policy =>
    policy.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  );
}

/**
 * Get policy by ID
 */
export function getPolicyById(id: string): PolicyRule | undefined {
  return POLICY_CORPUS.find(policy => policy.id === id);
}

/**
 * Get policies by category
 */
export function getPoliciesByCategory(category: PolicyRule['category']): PolicyRule[] {
  return POLICY_CORPUS.filter(policy => policy.category === category);
}


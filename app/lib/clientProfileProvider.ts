/**
 * Client Profile Provider (Front-end Mock)
 * Maps contract numbers to client context for demo purposes
 */

import type { ClientContext } from './reviewProfiles';

/**
 * Demo contract profiles (EXACT mapping for demo)
 */
const CONTRACT_PROFILES: Record<string, Omit<ClientContext, 'notes'> & { contractNumber: string; productScope: string[] }> = {
  '12345678': {
    contractNumber: '12345678',
    clientSegment: 'UHNW',
    jurisdiction: 'SG',
    riskAppetite: 'High',
    productScope: ['Derivatives', 'Structured Products']
  },
  '87654321': {
    contractNumber: '87654321',
    clientSegment: 'CIC' as any, // CIC to be added to type
    jurisdiction: 'CH',
    riskAppetite: 'High',
    productScope: ['Derivatives', 'Structured Products']
  }
};

/**
 * Pull client profile by contract number
 * Returns demo mock data for known contracts, fallback for unknown
 * 
 * @param contractNumber - 8-digit contract identifier
 * @returns ClientContext with contract details
 */
export function pullClientProfile(contractNumber: string): ClientContext & { contractNumber: string; productScope: string[] } {
  // Check for exact match in demo profiles
  const profile = CONTRACT_PROFILES[contractNumber];
  
  if (profile) {
    return { ...profile };
  }
  
  // Fallback for unknown contracts
  return {
    contractNumber,
    clientSegment: 'HNW',
    jurisdiction: 'SG',
    riskAppetite: 'Medium',
    productScope: ['Equities']
  };
}

/**
 * Validate contract number format
 * @param contractNumber - Contract number to validate
 * @returns true if valid (exactly 8 digits)
 */
export function validateContractNumber(contractNumber: string): boolean {
  return /^\d{8}$/.test(contractNumber);
}


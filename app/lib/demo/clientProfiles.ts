/**
 * Demo Client Profiles for Contract ID Mapping
 * Hard-coded profiles for demo purposes
 */

export interface ClientProfile {
  contractId: string;
  clientSegment: 'Retail' | 'HNW' | 'UHNW' | 'CIC' | 'Institutional';
  jurisdiction: 'SG' | 'EU' | 'CH' | 'UK' | 'US';
  riskAppetite: 'Low' | 'Medium' | 'High';
  productScope: string;
  notes: string;
}

export const DEFAULT_CLIENT_PROFILE: ClientProfile = {
  contractId: '',
  clientSegment: 'HNW',
  jurisdiction: 'SG',
  riskAppetite: 'Medium',
  productScope: 'Equities',
  notes: 'Default profile for high net worth clients in Singapore with moderate risk appetite.'
};

export const CLIENT_PROFILE_BY_CONTRACT_ID: Record<string, ClientProfile> = {
  '12345678': {
    contractId: '12345678',
    clientSegment: 'UHNW',
    jurisdiction: 'SG',
    riskAppetite: 'High',
    productScope: 'Derivatives, Structured Products',
    notes: 'Ultra high net worth client profile with high risk tolerance and exposure to complex derivatives.'
  },
  '87654321': {
    contractId: '87654321',
    clientSegment: 'CIC',
    jurisdiction: 'CH',
    riskAppetite: 'High',
    productScope: 'Derivatives, Structured Products, Alternatives',
    notes: 'Corporate Investment Committee profile for Swiss jurisdiction requiring enhanced compliance.'
  }
};

/**
 * Get client profile by contract ID
 * @param contractId - The contract identifier
 * @returns Profile and whether it was found in the mapping
 */
export function getClientProfile(contractId: string): { profile: ClientProfile; found: boolean } {
  const trimmedId = contractId.trim();
  
  if (trimmedId && CLIENT_PROFILE_BY_CONTRACT_ID[trimmedId]) {
    return {
      profile: CLIENT_PROFILE_BY_CONTRACT_ID[trimmedId],
      found: true
    };
  }
  
  return {
    profile: { ...DEFAULT_CLIENT_PROFILE, contractId: trimmedId },
    found: false
  };
}


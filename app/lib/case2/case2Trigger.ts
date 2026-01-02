/**
 * Case 2 Trigger Detection
 * 
 * Detects the specific chat message pattern that triggers the CS Integration Exception demo.
 * 
 * Required keyword groups (ALL must be present):
 * 1) CS integration
 * 2) High-net-worth (HNW)
 * 3) Restricted jurisdiction
 * 4) UBS + risk appetite
 */

export function detectCase2Trigger(input: string): boolean {
  // Normalize input: lowercase, trim whitespace
  const normalized = input.toLowerCase().trim();
  
  // Define required keyword groups
  // Each group contains alternative phrasings
  const keywordGroups = [
    // Group 1: CS integration
    ['cs integration', 'cs-integration', 'credit suisse integration'],
    
    // Group 2: High-net-worth
    ['high-net-worth', 'high net worth', 'hnw', 'high net-worth'],
    
    // Group 3: Restricted jurisdiction
    ['restricted jurisdiction', 'restricted-jurisdiction', 'restricted region'],
    
    // Group 4: UBS + risk appetite (both concepts must be present)
    ['ubs', 'united bank']
  ];
  
  // Additional check: "risk appetite" must also be present
  const hasRiskAppetite = normalized.includes('risk appetite') || normalized.includes('risk-appetite');
  
  // Check if ALL keyword groups are present
  const allGroupsPresent = keywordGroups.every(group => 
    group.some(keyword => normalized.includes(keyword))
  );
  
  return allGroupsPresent && hasRiskAppetite;
}



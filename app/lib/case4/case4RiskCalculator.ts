/**
 * Case 4: Risk Calculator
 * 
 * Pure deterministic functions for risk calculations.
 * No randomness, no side effects.
 */

import { ITBulletin } from './demoCase4Data';

/**
 * Calculate cumulative latency impact from all bulletins.
 */
export function calculateCumulativeLatency(bulletins: ITBulletin[]): number {
  return bulletins.reduce((sum, bulletin) => {
    // Extract numeric latency from string like "+50ms" or "+300ms"
    const match = bulletin.latency_impact.match(/\+(\d+)ms/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);
}

/**
 * Detect if bulletin time windows overlap.
 */
export function detectTimeWindowOverlap(bulletins: ITBulletin[]): boolean {
  // For demo: Oracle (02:00-06:00) overlaps with Azure (22:00-06:00)
  // Simplified: just check if any contain "2026-01-15" in their window
  const hasOverlap = bulletins.filter(b => 
    b.time_window.includes('2026-01-15') && 
    b.time_window.includes('UTC')
  ).length >= 2;
  
  return hasOverlap;
}

/**
 * Estimate SLA breach probability (demo calculation).
 * 
 * @param cumLatency - Cumulative latency in ms
 * @param retryAmplification - Retry multiplier (e.g., 3x)
 * @param timeoutThreshold - Service timeout threshold in ms
 * @returns Probability as percentage (0-100)
 */
export function estimateSLABreach(
  cumLatency: number,
  retryAmplification: number,
  timeoutThreshold: number
): number {
  // Simple deterministic model:
  // If cumLatency exceeds threshold, base probability is high
  // Retry amplification increases probability
  
  const effectiveLatency = cumLatency * (1 + (retryAmplification - 1) * 0.1);
  
  if (effectiveLatency < timeoutThreshold * 0.8) {
    return 15; // Low risk
  } else if (effectiveLatency < timeoutThreshold) {
    return 45; // Moderate risk
  } else if (effectiveLatency < timeoutThreshold * 1.2) {
    return 85; // High risk (demo value)
  } else {
    return 95; // Critical risk
  }
}



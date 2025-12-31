/**
 * Remote Skills Server - Executor
 * 
 * Routes skill execution to real implementation or mocks.
 */

import { getMockResponse } from './mocks.js';

// Import skill implementations from parent app
// Note: Using relative imports to avoid Next.js path aliases
import { assembleTopics } from '../app/lib/graphKyc/topicAssembler.js';
import { triageRisk } from '../app/lib/graphKyc/riskTriage.js';

/**
 * Check if input is in summary mode (missing actual data)
 */
function isSummaryMode(input: any): boolean {
  // Summary mode: input has metadata but not actual content
  // Full content mode: input has documents[].content or topicSections[].content
  
  if (input.documents) {
    // Check if documents have actual text content
    const hasContent = input.documents.some((doc: any) => 
      doc.content && typeof doc.content === 'string' && doc.content.length > 50
    );
    return !hasContent;
  }
  
  if (input.topicSections) {
    // Check if topic sections have actual content
    const hasContent = input.topicSections.some((sec: any) =>
      sec.content && typeof sec.content === 'string' && sec.content.length > 20
    );
    return !hasContent;
  }
  
  // Default to summary if we can't determine
  return true;
}

/**
 * Execute skill with real implementation
 */
async function executeRealSkill(skillName: string, input: any): Promise<any> {
  switch (skillName) {
    case 'kyc.topic_assemble': {
      // Expects: { documents: [{ name, content }] }
      if (!input.documents || !Array.isArray(input.documents)) {
        throw new Error('Invalid input: missing documents array');
      }
      const result = assembleTopics(input.documents);
      return { topicSections: result };
    }
    
    case 'risk.triage': {
      // Expects: { topicSections: [...] }
      if (!input.topicSections || !Array.isArray(input.topicSections)) {
        throw new Error('Invalid input: missing topicSections array');
      }
      const result = triageRisk(input.topicSections);
      return result; // Returns { riskScore, triageReasons, routePath, riskBreakdown }
    }
    
    default:
      throw new Error(`Unknown skill: ${skillName}`);
  }
}

/**
 * Execute skill (routes to real or mock based on mode)
 */
export async function executeSkill(
  skillName: string, 
  inputSummary: any, 
  testMode: string,
  correlationId: string
): Promise<any> {
  // Determine mode
  const useMock = testMode === 'summary' || isSummaryMode(inputSummary);
  
  if (useMock) {
    console.log(`[RemoteServer] ${skillName} - Summary mode: returning mock (correlationId: ${correlationId})`);
    return getMockResponse(skillName);
  } else {
    console.log(`[RemoteServer] ${skillName} - Full content mode: executing real skill (correlationId: ${correlationId})`);
    return await executeRealSkill(skillName, inputSummary);
  }
}


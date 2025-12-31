/**
 * Remote Skills Server - Mock Responses
 * 
 * Deterministic mock responses for summary mode (PII-safe).
 */

export const MOCK_RESPONSES: Record<string, any> = {
  'kyc.topic_assemble': {
    topicSections: [
      { 
        id: 'topic-1', 
        title: 'Client Identity', 
        content: '[REDACTED - Summary Mode]', 
        docId: 'doc1', 
        sectionId: 'section-1' 
      },
      { 
        id: 'topic-2', 
        title: 'Financial Profile', 
        content: '[REDACTED - Summary Mode]', 
        docId: 'doc2', 
        sectionId: 'section-2' 
      }
    ]
  },
  'risk.triage': {
    routePath: 'fast',
    reasoning: 'Mock response for summary mode (PII-safe)',
    confidence: 0.95
  }
};

/**
 * Get mock response for a skill
 */
export function getMockResponse(skillName: string): any {
  const mock = MOCK_RESPONSES[skillName];
  if (!mock) {
    return { error: `Mock not defined for skill: ${skillName}` };
  }
  return mock;
}


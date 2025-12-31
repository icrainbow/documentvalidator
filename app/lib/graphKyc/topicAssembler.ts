/**
 * Flow2: Topic Assembler
 * 
 * Extracts KYC topics from uploaded documents using deterministic rules.
 * No LLM calls in MVP (can add later for quality).
 */

import type { TopicSection, TopicId, EvidenceRef } from './types';

const TOPIC_KEYWORDS: Record<TopicId, string[]> = {
  client_identity: ['name', 'identity', 'passport', 'id number', 'date of birth', 'nationality'],
  source_of_wealth: ['wealth', 'income', 'salary', 'inheritance', 'business', 'employment'],
  business_relationship: ['relationship', 'purpose', 'account', 'services', 'products'],
  beneficial_ownership: ['beneficial owner', 'ownership', 'shareholder', 'director', 'ubo'],
  risk_profile: ['risk', 'appetite', 'tolerance', 'aml', 'rating'],
  sanctions_pep: ['sanctions', 'pep', 'politically exposed', 'watchlist', 'screening'],
  transaction_patterns: ['transaction', 'volume', 'frequency', 'pattern', 'activity'],
  other: []
};

/**
 * Assemble topics from raw document text
 * 
 * Algorithm:
 * 1. Split documents into paragraphs
 * 2. For each paragraph, match against topic keywords
 * 3. Assign to best-matching topic
 * 4. Assess coverage based on content length and keyword density
 */
export function assembleTopics(documents: { name: string; content: string }[]): TopicSection[] {
  const topicSections: Record<TopicId, TopicSection> = {} as any;
  
  // Initialize all topics
  const allTopics: TopicId[] = [
    'client_identity',
    'source_of_wealth',
    'business_relationship',
    'beneficial_ownership',
    'risk_profile',
    'sanctions_pep',
    'transaction_patterns'
  ];
  
  allTopics.forEach(topicId => {
    topicSections[topicId] = {
      topicId,
      content: '',
      evidenceRefs: [],
      coverage: 'missing'
    };
  });
  
  // Process each document
  documents.forEach(doc => {
    const paragraphs = doc.content.split('\n\n').filter(p => p.trim().length > 20);
    
    paragraphs.forEach((para, idx) => {
      const paraLower = para.toLowerCase();
      
      // Find best matching topic
      let bestTopic: TopicId = 'other';
      let bestScore = 0;
      
      allTopics.forEach(topicId => {
        const keywords = TOPIC_KEYWORDS[topicId];
        const matches = keywords.filter(kw => paraLower.includes(kw.toLowerCase())).length;
        if (matches > bestScore) {
          bestScore = matches;
          bestTopic = topicId;
        }
      });
      
      // Add to topic section if match found
      if (bestScore > 0) {
        const section = topicSections[bestTopic];
        section.content += (section.content ? '\n\n' : '') + para;
        section.evidenceRefs.push({
          docName: doc.name,
          pageOrSection: `Para ${idx + 1}`,
          snippet: para.substring(0, 100) + (para.length > 100 ? '...' : '')
        });
      }
    });
  });
  
  // Assess coverage
  allTopics.forEach(topicId => {
    const section = topicSections[topicId];
    const contentLength = section.content.length;
    
    if (contentLength === 0) {
      section.coverage = 'missing';
    } else if (contentLength < 200) {
      section.coverage = 'partial';
    } else {
      section.coverage = 'complete';
    }
  });
  
  return Object.values(topicSections);
}

/**
 * Extract high-risk keywords for policy flags
 */
export function extractHighRiskKeywords(content: string): string[] {
  const HIGH_RISK_KEYWORDS = [
    'sanctions',
    'pep',
    'politically exposed',
    'high risk',
    'shell company',
    'offshore',
    'cash intensive',
    'cryptocurrency',
    'gambling',
    'arms',
    'tobacco'
  ];
  
  const contentLower = content.toLowerCase();
  return HIGH_RISK_KEYWORDS.filter(kw => contentLower.includes(kw));
}



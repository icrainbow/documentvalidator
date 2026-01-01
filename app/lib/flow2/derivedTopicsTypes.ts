/**
 * Flow2: Derived Topics Types
 * 
 * Represents topic-based document grouping for Flow2.
 */

export type TopicKey = 'client_identity' | 'source_of_wealth' | 'general';

export interface TopicSource {
  filename: string;
  doc_type_hint?: string;
}

export interface TopicSnippet {
  filename: string;
  text: string;
  relevance?: string;
}

export interface DerivedTopic {
  topic_key: TopicKey;
  title: string;
  summary: string;
  sources: TopicSource[];
  snippets: TopicSnippet[];
}

/**
 * Fallback builder: groups Flow2 documents by doc_type_hint into topics.
 */
export function buildDerivedTopicsFallback(documents: any[]): DerivedTopic[] {
  const topics: Record<TopicKey, DerivedTopic> = {
    client_identity: {
      topic_key: 'client_identity',
      title: 'Client Identity',
      summary: 'Identity verification documents and information',
      sources: [],
      snippets: []
    },
    source_of_wealth: {
      topic_key: 'source_of_wealth',
      title: 'Source of Wealth',
      summary: 'Financial background and wealth sources',
      sources: [],
      snippets: []
    },
    general: {
      topic_key: 'general',
      title: 'General Documents',
      summary: 'Supporting documentation and other materials',
      sources: [],
      snippets: []
    }
  };

  for (const doc of documents) {
    let topicKey: TopicKey = 'general';
    const hint = (doc.doc_type_hint || '').toLowerCase();
    
    if (hint.includes('passport') || hint.includes('identity') || hint.includes('kyc_form')) {
      topicKey = 'client_identity';
    } else if (hint.includes('wealth') || hint.includes('bank') || hint.includes('financial')) {
      topicKey = 'source_of_wealth';
    }

    topics[topicKey].sources.push({
      filename: doc.filename,
      doc_type_hint: doc.doc_type_hint
    });

    // Add snippet (first 200 chars)
    const snippet = doc.text?.substring(0, 200) || '';
    if (snippet) {
      topics[topicKey].snippets.push({
        filename: doc.filename,
        text: snippet + (doc.text?.length > 200 ? '...' : ''),
        relevance: 'Document content'
      });
    }
  }

  // Return only topics with sources
  return Object.values(topics).filter(t => t.sources.length > 0);
}


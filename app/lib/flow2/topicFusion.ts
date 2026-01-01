/**
 * Flow2: Topic Fusion Logic
 * 
 * Handles incremental and full rebuild topic updates.
 */

import type { DerivedTopic, TopicKey } from './derivedTopicsTypes';
import { buildDerivedTopicsFallback } from './derivedTopicsTypes';

export interface FusionRequest {
  mode: 'incremental' | 'full_rebuild';
  topic_key: TopicKey;
  existing_topic?: DerivedTopic;
  new_docs: Array<{ filename: string; text: string; doc_type_hint?: string }>;
  existing_docs?: Array<{ filename: string; text: string; doc_type_hint?: string }>;
}

export interface FusionResult {
  ok: true;
  topic?: DerivedTopic; // For incremental
  derived_topics?: DerivedTopic[]; // For full rebuild
}

/**
 * Incremental: merge new docs into a specific topic.
 */
export function fuseIncremental(request: FusionRequest): FusionResult {
  const { topic_key, existing_topic, new_docs } = request;
  
  if (!existing_topic) {
    throw new Error('existing_topic is required for incremental mode');
  }

  // Add new sources
  const newSources = new_docs.map(doc => ({
    filename: doc.filename,
    doc_type_hint: doc.doc_type_hint
  }));

  // Add new snippets
  const newSnippets = new_docs.map(doc => ({
    filename: doc.filename,
    text: doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : ''),
    relevance: 'New upload'
  }));

  const updatedTopic: DerivedTopic = {
    ...existing_topic,
    sources: [...existing_topic.sources, ...newSources],
    snippets: [...existing_topic.snippets, ...newSnippets]
  };

  return { ok: true, topic: updatedTopic };
}

/**
 * Full rebuild: re-analyze all documents and generate fresh topic list.
 */
export function fuseFullRebuild(request: FusionRequest): FusionResult {
  const { new_docs, existing_docs } = request;
  
  if (!existing_docs) {
    throw new Error('existing_docs is required for full_rebuild mode');
  }

  const allDocs = [...existing_docs, ...new_docs];
  const derivedTopics = buildDerivedTopicsFallback(allDocs);

  return { ok: true, derived_topics: derivedTopics };
}


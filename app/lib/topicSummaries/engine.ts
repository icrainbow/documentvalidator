/**
 * Generic Topic Summaries Engine - Core Logic
 * 
 * Config-driven LLM-based topic summarization:
 * 1. Build mode-specific prompt from config
 * 2. Call LLM (Anthropic Claude)
 * 3. Parse and validate output
 * 4. Normalize to always return ALL configured topics
 * 5. Inject titles from config
 */

import type { TopicSummaryConfig, GenericTopicSummary, EngineInput, EngineOutput } from './types';
import { createLLMTopicSummarySchema } from './schemas';

/**
 * Build LLM prompt from config and documents
 */
export function buildPrompt(config: TopicSummaryConfig, documents: any[]): string {
  const documentsText = documents
    .map((doc, idx) => {
      return `### Document ${idx + 1}: ${doc.filename} (ID: ${doc.doc_id})\n\n${doc.text.substring(0, 8000)}\n`;
    })
    .join('\n---\n\n');

  const topicsInstruction = config.topic_ids
    .map((topicId, idx) => `${idx + 1}. **${topicId}** (${config.topic_titles[topicId]})`)
    .join('\n');

  return `You are a ${config.prompt_role} summarizing information from multiple documents.

**YOUR TASK:**
${config.prompt_instructions}

**CRITICAL RULES:**
1. You MUST output exactly ${config.topic_ids.length} topic summaries (one per topic_id listed below)
2. For EACH topic, determine:
   - coverage: "PRESENT" (clearly addressed), "WEAK" (partially/vaguely mentioned), or "MISSING" (not found)
   - bullets: Up to ${config.max_bullets} bullet points summarizing WHAT THE DOCUMENTS SAY (not risk assessment)
   - evidence: Up to ${config.max_evidence} short verbatim quotes from the documents (max 150 chars each) with doc_id attribution
     * If a document contains "IMAGE_EVIDENCE: <url>", extract the URL and include it in the evidence object as "image_url"
3. If a topic is not addressed in ANY document, return coverage="MISSING" with bullets=["This topic is not addressed in the provided documents."]
4. Your summaries must be CONTENT SUMMARIES (what the documents say), NOT risk judgments
5. Aggregate information across ALL documents for each topic (don't treat them separately)
6. Output ONLY valid JSON (no markdown wrapper, no extra text)

**${config.topic_ids.length} REQUIRED TOPICS:**
${topicsInstruction}

**DOCUMENTS TO ANALYZE:**

${documentsText}

**OUTPUT FORMAT (JSON ONLY):**
\`\`\`json
[
  {
    "topic_id": "${config.topic_ids[0]}",
    "coverage": "PRESENT" | "WEAK" | "MISSING",
    "bullets": ["bullet 1", "bullet 2", ...],
    "evidence": [
      {"quote": "verbatim snippet max 150 chars", "doc_id": "doc-123", "image_url": "optional-url-if-found"},
      ...
    ]
  },
  ...
]
\`\`\`

Output the JSON array now (all ${config.topic_ids.length} topics):`;
}

/**
 * Extract JSON array from LLM response (handles markdown wrappers)
 */
function extractJSON(text: string): string {
  // Try to find JSON array in markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  
  // Return as-is if no wrapper found
  return text;
}

/**
 * Call Generic Topic Summaries Engine
 * 
 * @param input - Config + documents + optional risks
 * @param apiKey - Anthropic API key
 * @returns Normalized topic summaries (always ALL configured topics)
 */
export async function callTopicSummariesEngine(
  input: EngineInput,
  apiKey: string
): Promise<EngineOutput> {
  const startTime = Date.now();
  const { config, documents } = input;

  console.log(`[TopicEngine/${config.template_id}] Starting with ${documents.length} document(s)`);

  // Build prompt
  const prompt = buildPrompt(config, documents);

  // Call Anthropic Claude API (reuse existing pattern)
  console.log(`[TopicEngine/${config.template_id}] Calling Anthropic LLM...`);

  const llmResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60000), // 60s timeout (increased from 30s for multi-document processing)
  });

  if (!llmResponse.ok) {
    const errorData = await llmResponse.json().catch(() => ({ error: 'Unknown' }));
    console.error(`[TopicEngine/${config.template_id}] LLM API error:`, errorData);
    throw new Error(`LLM API error: ${llmResponse.status} ${llmResponse.statusText}`);
  }

  const llmData = await llmResponse.json();
  const llmText = llmData.content[0].text.trim();

  console.log(`[TopicEngine/${config.template_id}] LLM response received (${llmText.length} chars)`);

  // Parse JSON
  const jsonText = extractJSON(llmText);
  const parsed = JSON.parse(jsonText);
  const llmTopics = Array.isArray(parsed) ? parsed : [];

  // Validate with dynamic schema
  const LLMSchema = createLLMTopicSummarySchema(config.topic_ids);
  const validatedTopics: any[] = [];

  for (const topic of llmTopics) {
    try {
      const validated = LLMSchema.parse(topic);
      validatedTopics.push(validated);
    } catch (zodError) {
      console.warn(`[TopicEngine/${config.template_id}] Invalid topic from LLM:`, topic);
    }
  }

  console.log(`[TopicEngine/${config.template_id}] Validated ${validatedTopics.length}/${config.topic_ids.length} topics`);

  // Normalize: always return ALL topics from config (fill missing ones)
  const normalizedTopics: GenericTopicSummary[] = config.topic_ids.map((topicId) => {
    const llmTopic = validatedTopics.find((t) => t.topic_id === topicId);

    if (llmTopic) {
      // LLM provided this topic - enforce limits
      const bullets = llmTopic.bullets.slice(0, config.max_bullets);
      if (bullets.length === 0) {
        bullets.push('Information not available in the provided documents.');
      }

      return {
        topic_id: topicId,
        title: config.topic_titles[topicId], // Server-injected title
        coverage: llmTopic.coverage,
        bullets,
        evidence: llmTopic.evidence?.slice(0, config.max_evidence),
        linked_risks: [], // Will be populated by caller if needed
      };
    } else {
      // LLM omitted this topic - inject placeholder
      console.warn(`[TopicEngine/${config.template_id}] Topic missing from LLM output: ${topicId}`);

      return {
        topic_id: topicId,
        title: config.topic_titles[topicId],
        coverage: 'MISSING',
        bullets: ['This topic is not addressed in the provided documents.'],
        evidence: [],
        linked_risks: [],
      };
    }
  });

  const duration = Date.now() - startTime;
  console.log(`[TopicEngine/${config.template_id}] ✓ Complete: ${normalizedTopics.length} topics in ${duration}ms`);

  return {
    topic_summaries: normalizedTopics,
    model_used: 'claude-sonnet-4-20250514',
    duration_ms: duration,
  };
}


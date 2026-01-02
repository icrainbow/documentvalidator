/**
 * Flow2: KYC Topics Summary API Route
 * 
 * POST /api/flow2/topic-summaries
 * 
 * Generates LLM-based multi-document KYC topic summaries with risk linking.
 * Always returns exactly 8 canonical topic summaries (server-side normalization).
 * 
 * FEATURES:
 * - Multi-document aggregation (treats uploads as a document set)
 * - Real LLM call (Anthropic Claude Sonnet 4)
 * - Server-side title injection (SSOT enforcement)
 * - Risk-to-topic linking for UI highlighting
 * - Graceful degradation on LLM failure
 * 
 * PATCHES APPLIED:
 * - PATCH 1: Optional risks[] in request
 * - PATCH 2: Union response (Success | Error)
 * - PATCH 3: Canonical severity in linked_risks
 * - PATCH 4: Repo-accurate issue mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  RequestSchema,
  TopicSummariesSuccessSchema,
  TopicSummariesErrorSchema,
  LLMTopicSummarySchema,
  KYC_TOPIC_IDS,
  KYC_TOPIC_TITLES,
  type KYCTopicId,
  type LLMTopicSummary,
  type TopicSummary,
} from '@/app/lib/flow2/kycTopicsSchema';
import { buildTopicRiskLinks } from '@/app/lib/flow2/riskTopicMapper';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: VALIDATE REQUEST
    // ═══════════════════════════════════════════════════════════════════════
    
    const body = await request.json();
    const validated = RequestSchema.parse(body);
    
    console.log(`[Flow2/TopicSummaries] Request validated: run_id=${validated.run_id}, docs=${validated.documents.length}, risks=${validated.risks?.length || 0}`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: CHECK API KEY
    // ═══════════════════════════════════════════════════════════════════════
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('[Flow2/TopicSummaries] ANTHROPIC_API_KEY not configured');
      
      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.run_id,
        error: 'LLM provider not configured (ANTHROPIC_API_KEY missing)',
        fallback: true,
      });
      
      return NextResponse.json(errorResponse, { status: 503 });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: BUILD MULTI-DOCUMENT PROMPT
    // ═══════════════════════════════════════════════════════════════════════
    
    const documentsText = validated.documents
      .map((doc, idx) => {
        return `### Document ${idx + 1}: ${doc.filename} (ID: ${doc.doc_id})\n\n${doc.text.substring(0, 8000)}\n`;
      })
      .join('\n---\n\n');
    
    const topicsInstruction = validated.topics
      .map((topicId, idx) => `${idx + 1}. **${topicId}** (${KYC_TOPIC_TITLES[topicId]})`)
      .join('\n');
    
    const prompt = `You are a KYC analyst summarizing customer information from multiple documents.

**YOUR TASK:**
Analyze ALL documents below as a SET and produce a consolidated content summary for EACH of the 8 KYC topics.

**CRITICAL RULES:**
1. You MUST output exactly 8 topic summaries (one per topic_id listed below)
2. For EACH topic, determine:
   - coverage: "PRESENT" (clearly addressed), "WEAK" (partially/vaguely mentioned), or "MISSING" (not found)
   - bullets: 3-6 bullet points summarizing WHAT THE DOCUMENTS SAY (not risk assessment)
   - evidence: Up to 2 short verbatim quotes from the documents (max 150 chars each) with doc_id attribution
3. If a topic is not addressed in ANY document, return coverage="MISSING" with bullets=["This topic is not addressed in the provided documents."]
4. Your summaries must be CONTENT SUMMARIES (what the documents say), NOT risk judgments
5. Aggregate information across ALL documents for each topic (don't treat them separately)
6. Output ONLY valid JSON (no markdown, no extra text)

**8 REQUIRED TOPICS:**
${topicsInstruction}

**DOCUMENTS TO ANALYZE:**

${documentsText}

**OUTPUT FORMAT (JSON ONLY):**
\`\`\`json
[
  {
    "topic_id": "customer_identity_profile",
    "coverage": "PRESENT" | "WEAK" | "MISSING",
    "bullets": ["bullet 1", "bullet 2", ...],
    "evidence": [
      {"quote": "verbatim snippet max 150 chars", "doc_id": "doc-123"},
      ...
    ]
  },
  ...
]
\`\`\`

Output the JSON array now (all 8 topics):`;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: CALL ANTHROPIC CLAUDE API
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('[Flow2/TopicSummaries] Calling Anthropic Claude API...');
    
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
        temperature: 0.3, // Lower temperature for more consistent output
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });
    
    if (!llmResponse.ok) {
      const errorData = await llmResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Flow2/TopicSummaries] Claude API error:', errorData);
      
      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.run_id,
        error: `LLM API error: ${llmResponse.status} ${llmResponse.statusText}`,
        fallback: true,
      });
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
    
    const llmData = await llmResponse.json();
    const llmText = llmData.content[0].text.trim();
    
    console.log('[Flow2/TopicSummaries] LLM response received:', llmText.substring(0, 200));
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: PARSE AND VALIDATE LLM OUTPUT
    // ═══════════════════════════════════════════════════════════════════════
    
    // Extract JSON from potential markdown wrapper
    let jsonText = llmText;
    const jsonMatch = llmText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    
    let llmTopics: LLMTopicSummary[];
    try {
      const parsed = JSON.parse(jsonText);
      llmTopics = Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('[Flow2/TopicSummaries] JSON parse error:', parseError);
      
      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.run_id,
        error: 'LLM returned invalid JSON',
        fallback: true,
      });
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
    
    // Validate each topic with Zod
    const validatedTopics: LLMTopicSummary[] = [];
    for (const topic of llmTopics) {
      try {
        const validated = LLMTopicSummarySchema.parse(topic);
        validatedTopics.push(validated);
      } catch (zodError) {
        console.warn('[Flow2/TopicSummaries] Invalid topic from LLM, skipping:', topic);
      }
    }
    
    console.log(`[Flow2/TopicSummaries] Validated ${validatedTopics.length} topics from LLM`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: SERVER-SIDE NORMALIZATION (ALWAYS RETURN 8 TOPICS)
    // ═══════════════════════════════════════════════════════════════════════
    
    const normalizedTopics: TopicSummary[] = KYC_TOPIC_IDS.map((topicId) => {
      // Find LLM-generated summary for this topic
      const llmTopic = validatedTopics.find(t => t.topic_id === topicId);
      
      if (llmTopic) {
        // Enforce bullet limits (1-6)
        const bullets = llmTopic.bullets.slice(0, 6);
        if (bullets.length === 0) {
          bullets.push('Information not available in the provided documents.');
        }
        
        // Enforce evidence limits (max 2)
        const evidence = llmTopic.evidence?.slice(0, 2);
        
        return {
          topic_id: topicId,
          title: KYC_TOPIC_TITLES[topicId], // ✅ Server-injected title (SSOT)
          coverage: llmTopic.coverage,
          bullets,
          evidence,
          linked_risks: [], // Will be populated in next step
        };
      } else {
        // LLM omitted this topic - inject placeholder
        console.warn(`[Flow2/TopicSummaries] Topic missing from LLM output: ${topicId}`);
        
        return {
          topic_id: topicId,
          title: KYC_TOPIC_TITLES[topicId],
          coverage: 'MISSING',
          bullets: ['This topic is not addressed in the provided documents.'],
          evidence: [],
          linked_risks: [],
        };
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: RISK LINKING (IF RISKS PROVIDED)
    // ═══════════════════════════════════════════════════════════════════════
    
    if (validated.risks && validated.risks.length > 0) {
      console.log(`[Flow2/TopicSummaries] Building risk links from ${validated.risks.length} risk(s)`);
      
      const riskLinkMap = buildTopicRiskLinks(validated.risks);
      
      // Attach linked_risks to each topic
      normalizedTopics.forEach(topic => {
        const linkedRisks = riskLinkMap.get(topic.topic_id as KYCTopicId) || [];
        topic.linked_risks = linkedRisks.slice(0, 5); // Max 5 linked risks per topic
      });
      
      console.log(`[Flow2/TopicSummaries] Risk linking complete: ${riskLinkMap.size} topic(s) have linked risks`);
    } else {
      console.log('[Flow2/TopicSummaries] No risks provided, skipping risk linking');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 8: VALIDATE AND RETURN SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════════
    
    const duration = Date.now() - startTime;
    
    const successResponse = TopicSummariesSuccessSchema.parse({
      ok: true,
      run_id: validated.run_id,
      topic_summaries: normalizedTopics,
      model_used: 'claude-sonnet-4-20250514',
      duration_ms: duration,
    });
    
    console.log(`[Flow2/TopicSummaries] ✓ Success: 8 topics returned in ${duration}ms`);
    
    return NextResponse.json(successResponse);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Flow2/TopicSummaries] Unexpected error:', error);
    
    // Try to extract run_id from body if available
    let runId: string | undefined;
    try {
      const body = await request.json();
      runId = body.run_id;
    } catch {
      // Ignore if body can't be parsed again
    }
    
    const errorResponse = TopicSummariesErrorSchema.parse({
      ok: false,
      run_id: runId,
      error: error.message || 'Internal server error',
      fallback: true,
    });
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


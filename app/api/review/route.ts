import { NextRequest, NextResponse } from 'next/server';
import type { ReviewRequest, ReviewResult, Issue, Remediation, Section } from '../../lib/types/review';
import type { ReviewConfig } from '../../lib/reviewConfig';
import { getAgentVariant } from '../../lib/agentVariants';

/**
 * REAL LLM-Backed Review API - NO FAKE/DEMO LOGIC
 * All decisions come from Claude AI with structured JSON validation
 */

interface AgentResult {
  issues: Issue[];
  remediations?: Remediation[];
}

/**
 * Call Claude API with structured output enforcement
 */
async function callClaudeForReview(
  sections: Section[],
  mode: 'section' | 'document',
  targetSectionId?: string,
  config?: ReviewConfig
): Promise<AgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const targetSections = mode === 'section' && targetSectionId
    ? sections.filter(s => s.id === targetSectionId)
    : sections;

  if (targetSections.length === 0) {
    throw new Error('No sections to review');
  }

  // Get prohibited terms from config (if provided)
  let prohibitedTerms = ['tobacco', 'weapons', 'adult entertainment', 'gambling']; // Default
  let complianceLevel = 'Standard'; // Default
  
  if (config?.selectedAgents?.compliance) {
    const complianceAgent = getAgentVariant(config.selectedAgents.compliance);
    if (complianceAgent?.prohibitedTerms) {
      prohibitedTerms = complianceAgent.prohibitedTerms;
      complianceLevel = complianceAgent.name;
    }
  }
  
  // Build the review prompt
  const sectionsText = targetSections
    .map(s => `### Section ${s.order}: ${s.title}\n${s.content}`)
    .join('\n\n');

  const prompt = `You are a compliance and investment document review agent (${complianceLevel}). Your task is to review the following document section(s) for compliance issues.

**SECTIONS TO REVIEW:**
${sectionsText}

**COMPLIANCE REQUIREMENTS:**

CRITICAL (FAIL - blocks submission):
- NO prohibited industries/terms: ${prohibitedTerms.join(', ')}
- NO misleading or fraudulent statements

IMPORTANT (WARNING - needs sign-off):
- Investment/strategy sections should include risk disclosures or regulatory compliance language
- Substantial content (not overly brief)

**EVALUATION APPROACH:**
- Be REASONABLE and PRACTICAL in your assessment
- If a section includes compliance language like "regulatory restrictions", "compliance requirements", "risk tolerance", "applicable regulations" - this is COMPLIANT
- If a section explicitly excludes restricted sectors - this is COMPLIANT
- Focus on identifying ACTUAL violations, not theoretical improvements
- Default to PASS if no clear violations exist

**YOUR TASK:**
1. Check for prohibited content (tobacco, weapons, etc.) → FAIL if found
2. Check if investment/strategy sections lack ANY compliance/risk language → WARNING if completely missing
3. Otherwise → PASS (no issues)

**OUTPUT FORMAT (strict JSON):**
{
  "issues": [
    {
      "sectionId": "section-id",
      "severity": "FAIL" | "WARNING" | "INFO",
      "title": "Brief issue title",
      "message": "Detailed explanation",
      "evidence": "Quote from section",
      "rationale": "Why this violates policy"
    }
  ],
  "remediations": [
    {
      "sectionId": "section-id",
      "proposedText": "Rewritten compliant text (only if FAIL or WARNING)"
    }
  ]
}

**IMPORTANT:** If a section contains compliance language and no prohibited content, return {"issues": [], "remediations": []}

Return ONLY valid JSON, no other text.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0, // Deterministic for auditability
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Claude API error:', errorData);
    throw new Error(`Claude API failed: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const responseText = data.content[0].text;

  // Parse and validate JSON
  let parsedResult: any;
  try {
    parsedResult = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse Claude response as JSON:', responseText);
    throw new Error('LLM returned invalid JSON. Review failed.');
  }

  // Validate structure
  if (!parsedResult || typeof parsedResult !== 'object') {
    throw new Error('LLM response is not a valid object');
  }

  if (!Array.isArray(parsedResult.issues)) {
    throw new Error('LLM response missing valid issues array');
  }

  // Transform to our Issue type with proper IDs and agent info
  const issues: Issue[] = parsedResult.issues.map((issue: any, index: number) => ({
    id: `issue-${Date.now()}-${index}`,
    sectionId: issue.sectionId || targetSections[0].id,
    severity: issue.severity || 'WARNING',
    title: issue.title || 'Issue detected',
    message: issue.message || '',
    evidence: issue.evidence,
    rationale: issue.rationale,
    ruleRef: issue.ruleRef,
    agent: {
      id: 'compliance-agent',
      name: 'Compliance Agent (Claude)'
    }
  }));

  // Transform remediations if present
  const remediations: Remediation[] = Array.isArray(parsedResult.remediations)
    ? parsedResult.remediations.map((rem: any) => ({
        sectionId: rem.sectionId || targetSections[0].id,
        proposedText: rem.proposedText,
        agent: {
          id: 'rewrite-agent',
          name: 'Rewrite Agent (Claude)'
        }
      }))
    : [];

  return { issues, remediations };
}

export async function POST(request: NextRequest) {
  try {
    const body: ReviewRequest = await request.json();

    // Validate input
    if (!body.documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json(
        { error: 'sections array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (body.mode === 'section' && !body.sectionId) {
      return NextResponse.json(
        { error: 'sectionId is required when mode is "section"' },
        { status: 400 }
      );
    }

    console.log(`[review] Starting ${body.mode} review for document ${body.documentId}`);
    
    // Call real LLM-backed agents
    const agentResult = await callClaudeForReview(
      body.sections,
      body.mode,
      body.sectionId,
      body.config
    );

    const result: ReviewResult = {
      issues: agentResult.issues,
      remediations: agentResult.remediations,
      reviewedAt: new Date().toISOString(),
      runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    console.log(`[review] Completed: ${result.issues.length} issues found`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[review] Error:', error);
    return NextResponse.json(
      {
        error: 'Review failed',
        details: error.message || 'Unknown error',
        issues: [], // Return empty on error - fail closed
        remediations: [],
        reviewedAt: new Date().toISOString(),
        runId: `error-${Date.now()}`
      },
      { status: 500 }
    );
  }
}


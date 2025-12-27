import { NextRequest, NextResponse } from 'next/server';

const TOPIC_CONTEXT = {
  investment_background: {
    name: 'Investment Background',
    description: 'Experience with investing, time horizons, investment instruments, financial goals, and portfolio history.'
  },
  risk_assessment: {
    name: 'Risk Assessment',
    description: 'Risk tolerance, comfort with volatility, attitudes toward drawdowns, risk management preferences, and downside concerns.'
  },
  technical_strategy: {
    name: 'Technical Strategy',
    description: 'Investment approach, technical indicators, asset allocation methods, rebalancing strategies, and execution processes.'
  }
};

export async function POST(request: NextRequest) {
  try {
    const { topic, userMessage, existingContent } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const topicInfo = TOPIC_CONTEXT[topic as keyof typeof TOPIC_CONTEXT];

    const prompt = `You are analyzing a user's response for a specific investment profile section.

**Current Section:** ${topicInfo.name}
**Section Description:** ${topicInfo.description}

**Existing Content Collected:** ${existingContent || 'None yet'}

**User's Latest Message:** "${userMessage}"

**Your Task:**
1. Determine if the user's message is relevant to "${topicInfo.name}"
2. If relevant, extract the key information
3. If not relevant, provide a guided follow-up question with 1-2 brief examples

**Response Format (JSON only):**
{
  "is_relevant": true or false,
  "content_fragment": "Brief extracted insight if relevant, or null",
  "follow_up_question": "Specific question if not relevant, or null",
  "examples": ["Example 1", "Example 2"] (only if not relevant, otherwise empty array)
}

**Guidelines:**
- Be strict but fair about relevance
- Follow-up questions should be calm, clear, and specific
- Examples should be brief (one sentence each)
- Do NOT be overly generous - if the response is vague or off-topic, mark it as not relevant`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
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
      return NextResponse.json(
        { error: 'Failed to call Claude API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const resultText = data.content[0].text;
    
    // Parse JSON from Claude's response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse Claude response' },
        { status: 500 }
      );
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in validate-topic API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


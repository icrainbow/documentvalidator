import { NextRequest, NextResponse } from 'next/server';

const TOPIC_NAMES = {
  investment_background: 'Investment Background',
  risk_assessment: 'Risk Assessment',
  technical_strategy: 'Technical Strategy'
};

export async function POST(request: NextRequest) {
  try {
    const { topic, contentFragments, language = 'english' } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const topicName = TOPIC_NAMES[topic as keyof typeof TOPIC_NAMES];
    const allContent = contentFragments.join('\n\n');

    const languageInstruction = language !== 'english' 
      ? `\n**CRITICAL:** The user's input is in ${language}. You MUST synthesize and respond in ${language}. The entire output paragraph must be in ${language}.`
      : '';

    const prompt = `You are synthesizing multiple user responses into a single, coherent professional paragraph.${languageInstruction}

**Section:** ${topicName}

**User's Responses (collected over multiple messages):**
${allContent}

**Your Task:**
Synthesize ALL of the above into ONE well-written paragraph that:
- Captures the user's overall intent and key points
- Is written in clear, professional language${language !== 'english' ? ` IN ${language.toUpperCase()}` : ''}
- Flows naturally as a single coherent statement
- Removes redundancy and repetition
- Does NOT use verbatim quotes
- Maintains a neutral, professional tone
- Is approximately 3-5 sentences long
- **CORRECTS any spelling errors or typos in the user's input**
${language !== 'english' ? `- MUST be written entirely in ${language}` : ''}

**Output Format:**
Return ONLY the synthesized paragraph as plain text, without any JSON wrapper or metadata.${language !== 'english' ? ` ALL TEXT MUST BE IN ${language.toUpperCase()}.` : ''}`;

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
    const synthesizedParagraph = data.content[0].text.trim();

    return NextResponse.json({ synthesizedParagraph });
  } catch (error) {
    console.error('Error in synthesize-topic API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


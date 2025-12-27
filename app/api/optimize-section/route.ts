import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sectionContent, sectionTitle, userPrompt, language = 'english' } = await request.json();

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const languageInstruction = language !== 'english' 
      ? `\n**CRITICAL:** The user is communicating in ${language}. You MUST respond in ${language}. The revised content MUST be entirely in ${language}.`
      : '';

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are an AI investment document assistant.${languageInstruction}

Current Section: ${sectionTitle}
Current Content:
${sectionContent}

User Request:
${userPrompt}

Please revise the section content based on the user's request. Return ONLY the revised section content, without any additional explanation or meta-commentary. Keep the tone professional and appropriate for investment documentation.${language !== 'english' ? ` ALL REVISED CONTENT MUST BE IN ${language.toUpperCase()}.` : ''}`
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
    const revisedContent = data.content[0].text;

    return NextResponse.json({ revisedContent });
  } catch (error) {
    console.error('Error in optimize-section API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


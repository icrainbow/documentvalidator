import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chatContent, documentName } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Extract the three topics from chat content
    const { investmentBackground, riskAssessment, technicalStrategy } = chatContent;

    const prompt = `You are helping to enrich an investment document by intelligently combining user-provided profile information with an uploaded document.

**User's Profile Information (from conversation):**

Investment Background:
${investmentBackground || 'Not provided'}

Risk Assessment:
${riskAssessment || 'Not provided'}

Technical Strategy:
${technicalStrategy || 'Not provided'}

**Uploaded Document:**
"${documentName}"

**Your Task:**
Create THREE enriched sections that intelligently combine the user's conversational input with the context of their uploaded document. Each section should:
1. Start with the user's conversational input as the foundation
2. Reference or acknowledge the uploaded document context
3. Maintain professional investment documentation tone
4. Be coherent and well-integrated (not just concatenated)
5. Be 3-5 sentences each

**Output Format (JSON only):**
{
  "section1_title": "Investment Background",
  "section1_content": "Enriched paragraph combining user input with document context",
  "section2_title": "Risk Assessment", 
  "section2_content": "Enriched paragraph combining user input with document context",
  "section3_title": "Technical Strategy",
  "section3_content": "Enriched paragraph combining user input with document context"
}

Make it sound like a unified, professionally written investment profile that acknowledges both the conversation and the document.`;

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
    console.error('Error in merge-content API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


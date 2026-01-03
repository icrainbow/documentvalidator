/**
 * General Chat API - Anthropic LLM Integration
 * 
 * Handles general user queries in Flow2 mode that don't trigger specific workflows.
 * Uses Anthropic Claude for intelligent responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

interface ChatRequest {
  message: string;
  context?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, context = 'general' } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Invalid message'
      }, { status: 400 });
    }
    
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[ChatGeneral] ANTHROPIC_API_KEY not configured');
      
      // Fallback response when API key is missing
      return NextResponse.json({
        ok: true,
        response: `I understand you're asking about: "${message}"\n\nI'm currently operating in limited mode. To get AI-powered responses, please configure the ANTHROPIC_API_KEY environment variable.\n\nFor KYC-related questions, you can trigger Case 2 analysis by asking about CS integration, restricted jurisdictions, or high-net-worth client exceptions.`,
        fallback: true
      });
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    // Build system prompt based on context
    let systemPrompt = 'You are a helpful AI assistant for a KYC (Know Your Customer) compliance review system.';
    
    if (context === 'flow2_kyc_review') {
      systemPrompt = `You are a knowledgeable AI assistant specializing in KYC (Know Your Customer) compliance, 
financial regulations, and customer due diligence processes. 

You help compliance officers and analysts with questions about:
- KYC regulations and requirements
- Customer risk assessment
- Enhanced Due Diligence (EDD)
- Sanctions screening
- Beneficial ownership verification
- Source of funds/wealth verification
- Jurisdiction-specific compliance requirements
- Cross-border transaction regulations

Provide clear, professional, and accurate information. If you're unsure about specific regulatory details, 
acknowledge the limitation and suggest consulting official regulatory sources.`;
    }
    
    console.log('[ChatGeneral] Calling Anthropic with message:', message.substring(0, 100) + '...');
    
    // Call Anthropic API
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: message
      }]
    });
    
    // Extract response
    const responseText = completion.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
    
    console.log('[ChatGeneral] ✓ Response generated:', responseText.substring(0, 100) + '...');
    
    return NextResponse.json({
      ok: true,
      response: responseText,
      model: completion.model,
      usage: {
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens
      }
    });
    
  } catch (error: any) {
    console.error('[ChatGeneral] Error:', error);
    console.error('[ChatGeneral] Error details:', error.message, error.status, error.type);
    
    // Provide helpful fallback based on error type
    let fallbackMessage = 'I apologize, but I encountered an error processing your request.';
    
    if (error.status === 401) {
      fallbackMessage = 'Authentication error: The API key may be invalid. Please check your ANTHROPIC_API_KEY configuration.';
    } else if (error.status === 429) {
      fallbackMessage = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('API key')) {
      fallbackMessage = 'API key configuration error. Please verify your ANTHROPIC_API_KEY is set correctly.';
    }
    
    return NextResponse.json({
      ok: true, // Return ok=true so UI shows the message instead of generic error
      response: `${fallbackMessage}\n\nFor KYC-related questions, you can trigger Case 2 analysis by asking about CS integration, restricted jurisdictions, or high-net-worth client exceptions.`,
      error: error.message,
      fallback: true
    });
  }
}


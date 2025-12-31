/**
 * Phase 4: Save Draft API
 * 
 * POST /api/graphs/save-draft
 * Validates and saves a graph draft to file system
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { SaveDraftRequestSchema } from '../../../lib/graphs/schemas';
import { validateGraphDefinition } from '../../../lib/graphs/validation';
import { saveDraft } from '../../../lib/graphs/draftStore';

// Required for file system operations
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request structure
    const requestValidation = SaveDraftRequestSchema.safeParse(body);
    if (!requestValidation.success) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid request body'
      }, { status: 400 });
    }
    
    const { graphDraft, base } = requestValidation.data;
    
    // Validate graph definition
    const validation = validateGraphDefinition(graphDraft);
    if (!validation.ok) {
      return NextResponse.json({
        ok: false,
        errors: validation.errors,
        error: 'Graph validation failed'
      }, { status: 400 });
    }
    
    // Generate draftId (server-side only, security: no client input)
    const draftId = randomUUID();
    
    // Save to file system
    const filePath = saveDraft(draftId, validation.parsed!, base);
    
    return NextResponse.json({
      ok: true,
      draftId,
      savedAt: new Date().toISOString(),
      filePath
    }, { status: 200 });
    
  } catch (error) {
    // File system or unexpected errors -> 500
    console.error('[save-draft] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save draft'
    }, { status: 500 });
  }
}


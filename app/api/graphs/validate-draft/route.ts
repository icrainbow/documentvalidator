/**
 * Phase 4: Validate Draft API
 * 
 * POST /api/graphs/validate-draft
 * Validates a graph draft using Zod schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidateDraftRequestSchema } from '../../../lib/graphs/schemas';
import { validateGraphDefinition } from '../../../lib/graphs/validation';

// Required for file system operations
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request structure
    const requestValidation = ValidateDraftRequestSchema.safeParse(body);
    if (!requestValidation.success) {
      return NextResponse.json({
        ok: false,
        errors: [{ path: 'request', message: 'Invalid request body' }]
      }, { status: 200 }); // Return 200 with ok:false (never 500)
    }
    
    // Validate graph definition
    const result = validateGraphDefinition(requestValidation.data.graphDraft);
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    // Catch-all: return 200 with ok:false
    return NextResponse.json({
      ok: false,
      errors: [{
        path: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }]
    }, { status: 200 });
  }
}


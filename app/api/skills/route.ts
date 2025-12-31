/**
 * Skills API - GET /api/skills
 * 
 * Returns the global skill catalog.
 */

import { NextResponse } from 'next/server';
import { SKILL_CATALOG } from '../../lib/skills/skillCatalog';

export async function GET() {
  return NextResponse.json({
    skills: SKILL_CATALOG,
  });
}


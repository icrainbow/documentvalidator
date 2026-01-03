/**
 * Diagnostic middleware to log update-checkpoint-topics calls
 * Add this to middleware.ts temporarily
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;
  
  // Log all API calls to update-checkpoint-topics
  if (url.includes('/api/flow2/update-checkpoint-topics')) {
    const referer = request.headers.get('referer') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log(`\n[DIAGNOSTIC] /api/flow2/update-checkpoint-topics called`);
    console.log(`  Time: ${timestamp}`);
    console.log(`  Referer: ${referer}`);
    console.log(`  User-Agent: ${userAgent.substring(0, 50)}...`);
    console.log(`  Stack trace (use browser devtools to see actual caller)\n`);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};


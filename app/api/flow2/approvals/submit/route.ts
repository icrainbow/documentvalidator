/**
 * Flow2: Submit Decision Endpoint
 * 
 * Handles approval/rejection decisions via GET (approve) or POST (approve/reject with reason).
 * 
 * GET /api/flow2/approvals/submit?token=...&action=approve[&redirect=1]
 * - One-click approve via email link
 * - Returns JSON by default
 * - Optional: redirect=1 for future web UI redirect
 * 
 * POST /api/flow2/approvals/submit
 * - Body: { token, action: 'approve'|'reject', reason?, signer? }
 * - Used by reject form
 */

import { NextRequest, NextResponse } from 'next/server';
import { finalizeDecision, type DecisionMetadata } from '@/app/lib/flow2/submitDecision';

export const runtime = 'nodejs'; // Required for fs operations

// ========================================
// GET: One-click approve (email link)
// ========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  const redirect = searchParams.get('redirect');
  
  // Validate required parameters
  if (!token) {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'MISSING_TOKEN',
      message: 'Missing required parameter: token',
    }, { status: 400 });
  }
  
  if (!action) {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'MISSING_ACTION',
      message: 'Missing required parameter: action',
    }, { status: 400 });
  }
  
  // Only 'approve' is allowed for GET (reject requires reason via POST)
  if (action !== 'approve') {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'INVALID_ACTION',
      message: 'GET only supports action=approve. Use POST for reject.',
    }, { status: 400 });
  }
  
  // Prepare metadata
  const metadata: DecisionMetadata = {
    decided_by: 'email_link',
    finalized_via: 'email_link',
    token_hint: token.trim().slice(-8),
  };
  
  // Finalize decision
  const result = await finalizeDecision(token, 'approve', undefined, metadata);
  
  // Map result to HTTP status
  let httpStatus = 200;
  let errorCode: string | undefined;
  
  if (!result.ok) {
    switch (result.status) {
      case 'not_found':
        httpStatus = 404;
        errorCode = 'NOT_FOUND';
        break;
      case 'conflict':
        httpStatus = 409;
        errorCode = 'CONFLICT';
        break;
      case 'concurrent_modification':
        httpStatus = 409;
        errorCode = 'CONCURRENT_MODIFICATION';
        break;
      case 'validation_failed':
        httpStatus = 400;
        errorCode = 'VALIDATION_FAILED';
        break;
      case 'write_failed':
        httpStatus = 500;
        errorCode = 'WRITE_FAILED';
        break;
      default:
        httpStatus = 500;
        errorCode = 'UNKNOWN_ERROR';
    }
  } else if (result.status === 'already_finalized' && result.concurrent) {
    // Same decision but concurrent write - still ok=true but with warning
    errorCode = 'CONCURRENT_WRITE';
  }
  
  // Build response JSON
  const responseJson: any = {
    ok: result.ok,
    status: result.status,
    run_id: result.run_id,
    decision: result.decision,
    message: result.message,
  };
  
  if (errorCode) {
    responseJson.error_code = errorCode;
  }
  
  if (result.status === 'conflict' || result.status === 'concurrent_modification') {
    responseJson.current_decision = result.current_decision;
    responseJson.requested_decision = result.requested_decision;
  }
  
  if (result.errors) {
    responseJson.errors = result.errors;
  }
  
  if (result.concurrent) {
    responseJson.concurrent = true;
  }
  
  // TODO (Phase 7): If redirect=1, redirect to success page
  // For now, always return JSON
  
  return NextResponse.json(responseJson, { status: httpStatus });
}

// ========================================
// POST: Approve or Reject with reason
// ========================================

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'INVALID_JSON',
      message: 'Request body must be valid JSON',
    }, { status: 400 });
  }
  
  const { token, action, reason, signer } = body;
  
  // Validate required fields
  if (!token || typeof token !== 'string') {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'MISSING_TOKEN',
      message: 'Missing or invalid field: token',
    }, { status: 400 });
  }
  
  if (!action || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({
      ok: false,
      status: 'validation_failed',
      error_code: 'INVALID_ACTION',
      message: 'action must be "approve" or "reject"',
    }, { status: 400 });
  }
  
  // Validate reason for reject
  if (action === 'reject') {
    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({
        ok: false,
        status: 'validation_failed',
        error_code: 'MISSING_REASON',
        message: 'reason is required for reject action',
      }, { status: 400 });
    }
    
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      return NextResponse.json({
        ok: false,
        status: 'validation_failed',
        error_code: 'INVALID_REASON',
        message: 'reason must be at least 10 characters',
      }, { status: 400 });
    }
  }
  
  // Prepare metadata
  const metadata: DecisionMetadata = {
    decided_by: signer || 'web_form',
    finalized_via: 'web_form',
    token_hint: token.trim().slice(-8),
  };
  
  // Finalize decision
  const result = await finalizeDecision(token, action, reason, metadata);
  
  // Map result to HTTP status
  let httpStatus = 200;
  let errorCode: string | undefined;
  
  if (!result.ok) {
    switch (result.status) {
      case 'not_found':
        httpStatus = 404;
        errorCode = 'NOT_FOUND';
        break;
      case 'conflict':
        httpStatus = 409;
        errorCode = 'CONFLICT';
        break;
      case 'concurrent_modification':
        httpStatus = 409;
        errorCode = 'CONCURRENT_MODIFICATION';
        break;
      case 'validation_failed':
        httpStatus = 400;
        errorCode = 'VALIDATION_FAILED';
        break;
      case 'write_failed':
        httpStatus = 500;
        errorCode = 'WRITE_FAILED';
        break;
      default:
        httpStatus = 500;
        errorCode = 'UNKNOWN_ERROR';
    }
  } else if (result.status === 'already_finalized' && result.concurrent) {
    errorCode = 'CONCURRENT_WRITE';
  }
  
  // Build response JSON
  const responseJson: any = {
    ok: result.ok,
    status: result.status,
    run_id: result.run_id,
    decision: result.decision,
    message: result.message,
  };
  
  if (errorCode) {
    responseJson.error_code = errorCode;
  }
  
  if (result.status === 'conflict' || result.status === 'concurrent_modification') {
    responseJson.current_decision = result.current_decision;
    responseJson.requested_decision = result.requested_decision;
  }
  
  if (result.errors) {
    responseJson.errors = result.errors;
  }
  
  if (result.concurrent) {
    responseJson.concurrent = true;
  }
  
  return NextResponse.json(responseJson, { status: httpStatus });
}


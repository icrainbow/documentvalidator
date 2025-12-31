# Stage 3.5 Implementation Summary

## Overview
Successfully implemented hardening pass for Agent-Driven Batch Re-Review with Scope Planning.

## Files Created (2 new files)

### 1. `app/lib/llmReviewExecutor.ts` (~200 lines)
- **Purpose**: Extracted LLM review executor to avoid hardcoded URLs
- **Exports**: `callClaudeForReview()`, `AgentResult` interface
- **Key Features**:
  - Direct Anthropic API calls (no hardcoded localhost)
  - Reusable by both `/api/review` and `/api/orchestrate`
  - Supports section/document modes
  - Structured JSON validation with error handling

### 2. `app/lib/sectionIdNormalizer.ts` (~120 lines)
- **Purpose**: Centralized section ID conversion utilities
- **Exports**: 
  - `parseApiSectionId()`: "section-N" → N
  - `toApiSectionId()`: N → "section-N"
  - `validateSectionIds()`: Validates and sanitizes dirtyQueue
  - `sectionsToScopePlannerFormat()`: API → Internal format
  - `normalizeScopePlanForApi()`: Internal → API format
  - `ScopePlanApi` interface
- **Key Features**:
  - Tolerates both "section-3" and "3" formats
  - Sanitizes invalid section IDs (removes, doesn't fail)
  - Provides clean separation between internal (number) and API (string) formats

## Files Modified (4 files)

### 3. `app/lib/types/scopePlanning.ts`
- **Changes**:
  - Added comment to `ScopePlan` documenting numeric ID format
  - Added `ScopePlanApi` interface for API representation
  - Added timing fields: `llmAttempted`, `llmSucceeded`
  - Added `fallbacks` and `degraded` fields to response types

### 4. `app/lib/globalChecks.ts`
- **Changes**:
  - Updated `runGlobalChecks()` return signature: `{ results, failedChecks }`
  - Added try-catch wrapping for each check function
  - Fixed iterator issue with `Array.from(matchAll())`
  - Enhanced error logging for failed checks

### 5. `app/api/review/route.ts` (simplified, ~150 lines removed)
- **Changes**:
  - Removed `callClaudeForReview` function (now imported from `llmReviewExecutor`)
  - Removed all batch_review mode handling
  - Removed imports for scope planning and global checks
  - Now rejects `batch_review` mode with 400 error
  - Pure executor for `section` and `document` modes only

### 6. `app/api/orchestrate/route.ts` (enhanced, ~250 lines added)
- **Changes**:
  - Added `handleBatchReview()` function (~200 lines)
  - Added `createFallbackScopePlan()` helper
  - Added `BatchReviewRequest` and `BatchReviewResponse` interfaces
  - Integrated section ID validation and sanitization
  - Implemented deterministic fallback handling:
    - Invalid section IDs → sanitize queue
    - Scope planning failure → minimal conservative plan
    - LLM failure → empty issues, still run global checks
    - Global check failures → recorded in fallbacks
  - Explicit executor mode selection:
    - `section-only` → mode='section'
    - `cross-section` or `full-document` → mode='document'
  - Enhanced timing metadata with `llmAttempted`/`llmSucceeded`

## Constraint Compliance

✅ **All mandatory constraints satisfied**:

1. ✅ Extracted `callClaudeForReview` to `llmReviewExecutor.ts` (no hardcoded URLs)
2. ✅ Separated `ScopePlan` (internal number IDs) and `ScopePlanApi` (string IDs)
3. ✅ `runGlobalChecks` returns `{ results, failedChecks }` and all call sites updated
4. ✅ `/api/review` rejects `batch_review` with 400
5. ✅ Validated `dirtyQueue` section IDs against sections with sanitization
6. ✅ Orchestrator chooses LLM executor mode explicitly
7. ✅ DirtyQueue sanitization named `validateSectionIds` (not `scopePlanFallback`)
8. ✅ ScopePlan fallback is minimal and conservative (never escalates)
9. ✅ LLM timing records attempted vs succeeded
10. ✅ No UI file changes
11. ✅ No hardcoded localhost URLs
12. ✅ No executor logic semantics changes

## Type Safety

- ✅ All new files pass TypeScript type checking
- ✅ All modified files pass TypeScript type checking
- ✅ No linter errors introduced
- ⚠️ Pre-existing type errors in `evaluate_structure/route.ts` and `ReviewConfigDrawer.tsx` (not part of Stage 3.5)

## Verification

- ✅ No hardcoded `localhost:3000` URLs found in `/app` directory
- ✅ TypeScript compilation successful for all Stage 3.5 files
- ✅ All imports resolved correctly
- ✅ `runGlobalChecks` return signature updated at all call sites

## Fallback Behavior

The implementation includes robust fallback handling at multiple levels:

1. **Section ID Validation**: Invalid IDs are removed from queue (sanitized)
2. **Scope Planning**: Falls back to minimal `section-only` plan with compliance agent only
3. **LLM Review**: Falls back to empty issues (fail-safe), still runs global checks
4. **Global Checks**: Individual check failures recorded, don't block overall response
5. **Never Escalates**: Fallback always chooses minimal scope (never full-document)

All fallbacks are:
- Logged with clear reasons
- Recorded in `response.fallbacks` array
- Flagged with `response.degraded: true`
- Deterministic and conservative

## API Contract

### New Endpoint: `POST /api/orchestrate` with `mode: "batch_review"`

**Request**:
```json
{
  "mode": "batch_review",
  "documentId": "doc-123",
  "dirtyQueue": { ... },
  "sections": [ ... ],
  "config": { ... }
}
```

**Response**:
```json
{
  "issues": [...],
  "remediations": [...],
  "reviewedAt": "2025-01-01T00:00:00Z",
  "runId": "batch-...",
  "scopePlan": {
    "reviewMode": "section-only",
    "sectionsToReview": ["section-1", "section-3"],
    "relatedSectionsToCheck": [],
    ...
  },
  "globalCheckResults": [...],
  "timing": {
    "scopePlanningMs": 5,
    "reviewMs": 1200,
    "globalChecksMs": 50,
    "totalMs": 1255,
    "llmAttempted": true,
    "llmSucceeded": true
  },
  "fallbacks": ["..."],
  "degraded": false
}
```

## Next Steps (Future UI Integration)

1. Update UI to call `/api/orchestrate` with `mode: "batch_review"` for batch re-review
2. Display `scopePlan.reasoning` to user (explain why this scope was chosen)
3. Show `timing` metadata for transparency
4. Display `fallbacks` if `degraded: true` (warn user of degraded behavior)
5. Use `llmAttempted`/`llmSucceeded` for debugging and monitoring

## Rollback Plan

If issues arise:
1. Revert `/api/orchestrate/route.ts` to previous version
2. Restore `callClaudeForReview` to `/api/review/route.ts`
3. Delete `llmReviewExecutor.ts` and `sectionIdNormalizer.ts`
4. Revert `globalChecks.ts` return signature
5. Remove changes to `types/scopePlanning.ts`

---

**Implementation completed successfully** ✅
**All Stage 3.5 requirements satisfied** ✅
**Ready for UI integration** ✅

# Testing Guide

## Overview

This test suite ensures Flow1 (Agentic Batch Review) and Flow2 (LangGraph KYC) work correctly and prevents regressions like "homepage cannot load" errors.

## Test Categories

### 1. **Preflight Checks** (Fast)
- **Lint**: Code style and basic syntax
- **TypeScript**: Type checking without running code
- **Build**: Production build succeeds

### 2. **API Contract Tests** (Fast)
- Validates `/api/orchestrate` endpoints return expected shapes
- Tests `batch_review` mode (Flow1)
- Tests `langgraph_kyc` mode (Flow2)
- Tests error cases (unknown modes, missing fields)

### 3. **E2E Tests** (Slow)
- **Flow1**: Page loads, no Flow2 elements visible, agent drawer works
- **Flow2**: Demo loader works, graph trace appears, conflicts/gaps tabs conditional
- **Regression Guards**: No console errors, no Next.js error overlay, no unhandled rejections

---

## Running Tests

### Quick Start (All Tests)
```bash
npm run test:all
```

### Individual Test Suites

#### Lint
```bash
npm run lint
```

#### Type Check
```bash
npm run typecheck
```

#### Build
```bash
npm run build
```

#### API Contract Tests
```bash
npm run test:api
```

#### E2E Tests (Playwright)
```bash
npm run test:e2e
```

#### E2E Tests (Headed Mode - See Browser)
```bash
npm run test:e2e:headed
```

#### E2E Tests (UI Mode - Interactive)
```bash
npm run test:e2e:ui
```

---

## Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

3. **Build the app** (E2E tests run against production build):
   ```bash
   npm run build
   ```

---

## Test Output

### Success
```
✓ All tests passed!
```

### Failure
Tests will show:
- Which test failed
- Error message
- Screenshot (E2E tests only, in `test-results/`)
- Trace file (E2E tests only, in `test-results/`)

### Viewing Playwright Results
```bash
npx playwright show-report test-results/html
```

---

## Troubleshooting

### "Server did not start in time"

**Cause**: Next.js server failed to boot or port 3000 is blocked.

**Fix**:
1. Check if another process is using port 3000:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```
2. Try running tests again
3. If issue persists, check `.next` build output:
   ```bash
   rm -rf .next && npm run build
   ```

### "Cannot find module" or "Module not found"

**Cause**: Dependencies not installed or corrupted `node_modules`.

**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
npx playwright install
```

### E2E Tests Timeout

**Cause**: Page takes too long to load or element not found.

**Fix**:
1. Run in headed mode to see what's happening:
   ```bash
   npm run test:e2e:headed
   ```
2. Check `test-results/` for screenshots and traces
3. Increase timeout in `playwright.config.ts` if needed

### "Selector not found"

**Cause**: UI element changed or not rendered.

**Fix**:
1. Check if element exists in browser manually
2. Update selector in test file (`tests/e2e/*.spec.ts`)
3. Ensure page fully loads before asserting

### API Contract Tests Fail

**Cause**: API response shape changed.

**Fix**:
1. Check error message for which field is missing/wrong
2. Update zod schema in `tests/api/orchestrate.contract.test.ts`
3. If API intentionally changed, update test expectations

### Build Fails

**Cause**: TypeScript errors or Next.js compilation issues.

**Fix**:
1. Run typecheck separately:
   ```bash
   npm run typecheck
   ```
2. Fix reported errors
3. Clear cache and rebuild:
   ```bash
   rm -rf .next && npm run build
   ```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:all
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

---

## Test Maintenance

### Adding New Tests

1. **E2E Test**:
   - Create new file in `tests/e2e/`
   - Follow pattern from existing tests
   - Use `test.describe()` and `test()`

2. **API Contract Test**:
   - Add new `describe()` block in `tests/api/orchestrate.contract.test.ts`
   - Create zod schema for validation
   - Use `expect()` assertions

### Updating Tests for UI Changes

If UI changes break tests:
1. Identify which selector changed
2. Update selector in test file
3. Re-run tests to verify fix

### Keeping Tests Fast

- Use `page.waitForLoadState('networkidle')` instead of arbitrary sleeps
- Use `waitForRequest/waitForResponse` for API calls
- Mock external services if they slow tests down
- Run tests in parallel (Playwright default)

---

## What This Suite Guarantees

✅ **Homepage loads without errors**
✅ **Flow1 and Flow2 pages load and render correctly**
✅ **API endpoints return expected shapes**
✅ **No console errors on critical pages**
✅ **No Next.js error overlays**
✅ **Production build succeeds**
✅ **TypeScript compiles without errors**
✅ **Flow1 and Flow2 remain isolated (no cross-contamination)**

## What This Suite Does NOT Guarantee

❌ **Complete functional correctness** (would need more exhaustive tests)
❌ **LLM output quality** (LLM calls are black-box)
❌ **Performance benchmarks** (no load testing)
❌ **Accessibility compliance** (no a11y tests yet)
❌ **Cross-browser compatibility** (only tests Chromium)
❌ **Mobile responsiveness** (only tests desktop viewport)

---

## Getting Help

- Check test output for specific error messages
- Look at screenshots in `test-results/` directory
- View Playwright trace: `npx playwright show-trace test-results/.../trace.zip`
- Review logs in `test-results/` directory
- Ensure server is running: `curl http://localhost:3000`

For persistent issues, check:
1. Node.js version (20+)
2. Available disk space (builds need space)
3. Port 3000 availability
4. `.next` build cache is not corrupted



#!/bin/bash

# Test Suite Runner
# Runs all checks: build, lint, typecheck, API tests, E2E tests

set -e  # Exit on first error

echo "======================================"
echo "🧪 Running Full Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED_TESTS=""

# Helper function
run_test() {
  local name=$1
  local command=$2
  
  echo "--------------------------------------"
  echo "Running: $name"
  echo "--------------------------------------"
  
  if eval "$command"; then
    echo -e "${GREEN}✓ $name passed${NC}"
  else
    echo -e "${RED}✗ $name failed${NC}"
    FAILED_TESTS="${FAILED_TESTS}\n  - $name"
    return 1
  fi
  echo ""
}

# 1. Lint
run_test "Lint" "npm run lint" || true

# 2. Type Check
run_test "TypeScript Check" "npx tsc --noEmit" || true

# 3. Build
run_test "Production Build" "npm run build" || true

# 4. API Contract Tests
if [ -f "tests/api/orchestrate.contract.test.ts" ]; then
  run_test "API Contract Tests" "npm run test:api" || true
else
  echo -e "${YELLOW}⊘ API tests not found, skipping${NC}"
  echo ""
fi

# 5. E2E Tests
if [ -f "tests/e2e/flow1.spec.ts" ]; then
  run_test "E2E Tests (Playwright)" "npm run test:e2e" || true
else
  echo -e "${YELLOW}⊘ E2E tests not found, skipping${NC}"
  echo ""
fi

# Summary
echo "======================================"
echo "📊 Test Suite Summary"
echo "======================================"

if [ -z "$FAILED_TESTS" ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed:${NC}"
  echo -e "$FAILED_TESTS"
  exit 1
fi



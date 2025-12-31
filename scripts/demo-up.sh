#!/bin/bash

###############################################################################
# Demo Startup Script
# Purpose: Clean start of dev server with demo-friendly environment
###############################################################################

set -e

echo "🎬 Demo Startup Script"
echo "======================"
echo ""

# Step 1: Kill any existing process on port 3000
echo "Step 1: Checking port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "  ⚠️  Port 3000 in use. Killing process..."
  lsof -ti:3000 | xargs kill -9
  sleep 1
  echo "  ✅ Port 3000 freed"
else
  echo "  ✅ Port 3000 available"
fi

# Step 2: Set demo-friendly environment variables
echo ""
echo "Step 2: Setting environment variables..."
export REFLECTION_PROVIDER=mock
export REFLECTION_TEST_MODE=rerun
export NODE_ENV=development

echo "  ✅ REFLECTION_PROVIDER=mock"
echo "  ✅ REFLECTION_TEST_MODE=rerun"
echo "  ✅ NODE_ENV=development"

# Step 3: Start Next.js dev server
echo ""
echo "Step 3: Starting Next.js dev server..."
echo "  📡 Server will run on http://localhost:3000"
echo "  ⏳ Wait for '✓ Ready' message (~3-5 seconds)"
echo ""
echo "Demo URLs:"
echo "  Flow1: http://localhost:3000/document?flow=1"
echo "  Flow2: http://localhost:3000/document?flow=2&scenario=crosscheck"
echo ""
echo "Press Ctrl+C to stop server"
echo "----------------------------------------------------------------------"
echo ""

npm run dev


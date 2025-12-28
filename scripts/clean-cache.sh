#!/bin/bash

# Clean Next.js Cache Script
# Run this script if you encounter "Cannot find module" errors

echo "🧹 Cleaning Next.js cache..."

# Stop any running dev servers
pkill -f "next dev" 2>/dev/null && echo "✓ Stopped running dev servers" || echo "ℹ No dev servers running"

# Wait for processes to fully stop
sleep 2

# Remove Next.js build cache
if [ -d ".next" ]; then
  rm -rf .next
  echo "✓ Removed .next directory"
else
  echo "ℹ .next directory not found"
fi

# Remove node_modules cache
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✓ Removed node_modules/.cache"
else
  echo "ℹ node_modules/.cache not found"
fi

echo ""
echo "✅ Cache cleaned successfully!"
echo ""
echo "To restart the dev server, run:"
echo "  npm run dev"


#!/bin/bash

# Smart dev script that checks for cache corruption and auto-cleans
NEXT_DIR=".next"
CACHE_DIR="node_modules/.cache"
TIMESTAMP_FILE=".next/.last-clean"

# Function to check if cache is stale (older than 1 hour)
is_cache_stale() {
  if [ -f "$TIMESTAMP_FILE" ]; then
    last_clean=$(cat "$TIMESTAMP_FILE")
    current_time=$(date +%s)
    time_diff=$((current_time - last_clean))
    
    # If more than 1 hour (3600 seconds), cache is stale
    if [ $time_diff -gt 3600 ]; then
      return 0
    else
      return 1
    fi
  else
    return 0
  fi
}

# Function to clean cache
clean_cache() {
  echo "🧹 Auto-cleaning stale cache..."
  rm -rf "$NEXT_DIR" 2>/dev/null || true
  rm -rf "$CACHE_DIR" 2>/dev/null || true
  echo "✓ Cache cleaned"
}

# Function to mark clean timestamp
mark_clean() {
  mkdir -p "$(dirname "$TIMESTAMP_FILE")"
  date +%s > "$TIMESTAMP_FILE"
}

# Main logic
echo "🚀 Starting smart dev server..."

# Check if this is first run or cache is stale
if [ ! -d "$NEXT_DIR" ] || is_cache_stale; then
  clean_cache
  mark_clean
fi

# Start dev server directly (don't call npm run dev to avoid recursion)
echo "▶ Starting Next.js..."
npx next dev


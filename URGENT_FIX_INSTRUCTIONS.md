# 🚨 IMMEDIATE ACTION REQUIRED

## Problem: Infinite API Calls (404 Loop)

The browser has pages open that are continuously retrying failed API calls.

## ROOT CAUSE
- API file was missing from filesystem (now restored ✅)
- But browser pages are ALREADY running with old cached code
- They keep retrying the 404 API calls in a loop

## SOLUTION (3 STEPS)

### Step 1: Close ALL Browser Tabs
**Action**: Close EVERY tab/window related to `localhost:3000`
- Don't just refresh - CLOSE completely
- Check all browser windows
- Check if any are minimized

### Step 2: Kill Dev Server
```bash
# In terminal, press Ctrl+C to stop npm run dev
# Wait for clean shutdown
```

### Step 3: Fresh Start
```bash
# Clear Next.js cache
rm -rf .next

# Start dev server
npm run dev

# Wait for "Ready" message

# Open browser in PRIVATE/INCOGNITO mode
# Navigate to: http://localhost:3000/document?flow=2
```

## Why This Happens

```
Browser loads page (API missing)
     ↓
fetch() call returns 404
     ↓
No error handler with exponential backoff
     ↓
React component re-renders (useEffect trigger)
     ↓
fetch() called again immediately
     ↓
INFINITE LOOP ❌
```

## Files Fixed
✅ API route restored: `app/api/flow2/update-checkpoint-topics/route.ts`
✅ Dependency cycle removed: `handlePhase8Complete` won't recreate
✅ Guards added: prevent duplicate execution

## What to Check After Fresh Start

1. Server logs should be QUIET (no spam)
2. Only see API calls when you actually trigger actions
3. No 404 errors
4. No infinite loops

## If Problem Persists

Check browser DevTools:
1. Open Console (F12)
2. Look for error in red
3. Click on the error stack trace
4. Find which component/useEffect is calling the API

Then tell me EXACTLY:
- Which file
- Which line number
- Which function name

## Emergency Stop

If loop continues:
```bash
# Kill all node processes
pkill -9 node

# Clear everything
rm -rf .next node_modules/.cache

# Reinstall
npm install

# Restart
npm run dev
```


# Claude AI Integration Setup Guide

## Overview

This application now uses **real Claude Sonnet 4.5** AI to optimize document sections based on user chat input.

## Setup Instructions

### 1. Get Your Anthropic API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Create the file
touch .env.local
```

Add your API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

⚠️ **Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

### 3. Restart Development Server

After adding the API key:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## How It Works

### Chat-Triggered AI Optimization

When you mention a section in your chat message, the app:

1. **Detects section mention**: Looks for "section 1", "section 2", "section 3" or section titles
2. **Calls Claude API**: Sends current content + your request to Claude Sonnet 4.5
3. **Updates content**: Replaces section content with AI-optimized version
4. **Logs action**: Adds entry to decision log

### Example Usage

In the chat panel on the document page, type:

```
"Make section 1 more concise, around 50 words"
```

```
"Rewrite section 2 to emphasize long-term risk management"
```

```
"Simplify section 3 and add more specific examples"
```

```
"For section 1, change the tone to be more confident and professional"
```

### What Happens:

1. You type message mentioning a section
2. Click **Send** (or press Enter)
3. **"AI Processing..."** indicator appears
4. Claude analyzes current content + your request
5. Section content updates automatically
6. Success message confirms the change
7. Decision log shows: `[Optimize] AI-optimized content based on user request`

## Command Priority

The system distinguishes between different command types:

1. **AI Optimization** (NEW - Real Claude)
   - Triggered: Message mentions section but is NOT "global evaluate" or "fix"
   - Example: `"Make section 2 shorter"`
   - Uses: Real Claude Sonnet 4.5 API

2. **Global Evaluate** (Mock)
   - Triggered: `"global evaluate"`
   - Mock behavior: Sets section statuses

3. **Fix Command** (Mock)
   - Triggered: `"fix section X"`
   - Mock behavior: Changes status to PASS

4. **Modify Command** (Mock)
   - Triggered: `"modify section X"`
   - Mock behavior: Enters edit mode

## API Endpoint Details

**Endpoint:** `/api/optimize-section`

**Method:** POST

**Request Body:**
```json
{
  "sectionContent": "Current section content...",
  "sectionTitle": "Investment Background",
  "userPrompt": "Make it more concise"
}
```

**Response:**
```json
{
  "revisedContent": "AI-optimized content..."
}
```

**Error Response:**
```json
{
  "error": "Error description",
  "details": "Additional error info"
}
```

## Model Used

- **Model:** `claude-sonnet-4-20250514` (Claude Sonnet 4.5)
- **Max Tokens:** 1024
- **Purpose:** Investment document content optimization
- **Tone:** Professional, appropriate for financial documentation

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"

**Solution:** 
- Check `.env.local` file exists in project root
- Verify API key is correctly set
- Restart dev server

### Error: "Failed to call Claude API"

**Possible causes:**
- Invalid API key
- API key lacks credits/quota
- Network connectivity issues
- Anthropic API service issues

**Solution:**
- Verify API key in console.anthropic.com
- Check account has available credits
- Try again in a few moments

### Error: "Rate limit exceeded"

**Solution:**
- Wait a few seconds between requests
- Claude has rate limits on API calls

### AI not responding

**Checklist:**
1. `.env.local` file exists? ✓
2. API key starts with `sk-ant-`? ✓
3. Dev server restarted after adding key? ✓
4. Section mentioned in message? ✓
5. Browser console shows errors? Check DevTools

## Cost Considerations

Claude API charges per token:
- **Input tokens:** ~$3 per million tokens
- **Output tokens:** ~$15 per million tokens

For this demo:
- Each optimization: ~200-500 input tokens + 200-500 output tokens
- Cost per request: ~$0.001-0.003 (about 0.1-0.3 cents)
- Very affordable for demo purposes

## Security Notes

✅ **Do:**
- Keep API key in `.env.local`
- Never commit `.env.local` to git
- Rotate keys if exposed

❌ **Don't:**
- Put API key in frontend code
- Commit API key to repository
- Share API key publicly

## Demo vs Production

**Current Implementation (Demo):**
- API calls from Next.js API route
- Simple error handling
- No caching or rate limiting
- Suitable for demonstration

**For Production, Add:**
- Request caching
- Rate limiting per user
- More sophisticated error handling
- Cost tracking and alerts
- User authentication
- Request logging

## Testing the Integration

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Navigate to document page:**
   - Answer questions, OR
   - Upload document, OR
   - Upload `badformat.word` → manual sectioning

3. **Test AI optimization:**
   ```
   Chat input: "Make section 1 shorter, focus on key points only"
   Result: Section 1 content replaced with AI-optimized version
   ```

4. **Verify in Decision Log:**
   - Check section shows: `[Optimize] AI-optimized content based on user request`

5. **Try different sections:**
   ```
   "Rewrite section 2 to sound more confident"
   "Add specific examples to section 3"
   "Make section 1 more formal and professional"
   ```

## Example Prompts

### For Section 1 (Investment Background):
```
"Make section 1 more concise, around 75 words"
"Rewrite section 1 to emphasize long-term growth mindset"
"Add mention of retirement planning goals to section 1"
```

### For Section 2 (Risk Assessment):
```
"Make section 2 clearer about risk tolerance levels"
"Simplify the language in section 2 for better readability"
"Add specific risk mitigation strategies to section 2"
```

### For Section 3 (Technical Strategy):
```
"Make section 3 more specific with actual indicators"
"Rewrite section 3 to focus on passive investment approach"
"Add automation and technology aspects to section 3"
```

## Success!

If everything is working:
- ✅ Type message mentioning a section
- ✅ See "AI Processing..." indicator
- ✅ Watch content update in real-time
- ✅ See success message from Optimize Agent
- ✅ Decision log shows AI optimization entry

You now have a **real multi-agent system** with Claude AI! 🎉


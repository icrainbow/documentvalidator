# AI Investment Assistant - Demo Deployment

## Vercel Deployment Guide

This Next.js application is ready for deployment on Vercel.

### Prerequisites
- GitHub account
- Vercel account (free tier is sufficient)
- Claude API key (optional - for AI features)

### Deployment Steps

#### 1. Push to GitHub
The repository is already pushed to: `https://github.com/icrainbow/documentvalidator.git`

#### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub: `icrainbow/documentvalidator`
4. Configure Project:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Environment Variables** (Optional):
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Claude API key from [console.anthropic.com](https://console.anthropic.com)
   - **Note**: AI optimization features require this key. Without it, basic demo features still work.

6. Click **Deploy**

#### 3. Expected Deployment URL
- Production: `https://documentvalidator.vercel.app` (or similar)
- Preview: `https://documentvalidator-[hash].vercel.app`

### Features That Work Without API Key
- ✅ Chat interface and profile intake
- ✅ Document upload and manual segmentation
- ✅ Section merging and editing
- ✅ Manual section modifications
- ✅ Voice input (Talk) and voice playback (Listen)
- ✅ Quick reply buttons
- ✅ Global evaluate command
- ✅ Manual fix commands
- ✅ Agent Dashboard visualization
- ✅ Multi-language support
- ✅ Download functionality

### Features That Require API Key
- ⚠️ AI-powered content optimization (e.g., "make section 1 more concise")
- ⚠️ Smart content synthesis from chat
- ⚠️ Topic validation via LLM

### Post-Deployment Configuration

#### Add API Key After Deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your key
3. Redeploy (click "Redeploy" button)

### Demo Limitations
- No database (all data is client-side/session-based)
- No authentication
- No persistence (refresh clears data)
- Uses browser APIs for speech (Chrome/Safari/Edge recommended)

### Browser Compatibility
- **Best**: Chrome, Edge, Safari (full speech support)
- **Partial**: Firefox (no voice input, but voice playback works)
- **Mobile**: iOS Safari and Chrome Android supported

### Support
For issues or questions, refer to:
- [README.md](./README.md) - Full feature documentation
- [CLAUDE_SETUP.md](./CLAUDE_SETUP.md) - API setup guide

---

**Live Demo**: Once deployed, share the Vercel URL for product demos!


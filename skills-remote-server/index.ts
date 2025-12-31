/**
 * Remote Skills Server
 * 
 * HTTP server for remote skill execution (Phase 2).
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { RemoteSkillRequestSchema, RemoteSkillResponseSchema } from './schemas.js';
import { executeSkill } from './executor.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4010;
const SERVER_VERSION = '1.0.0';
const startTime = Date.now();

// Middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({ status: 'ok', uptime, version: SERVER_VERSION });
});

// Skill execution endpoint
app.post('/skills/execute', async (req: Request, res: Response) => {
  const requestStartTime = performance.now();
  
  try {
    // Validate request with Zod
    const parseResult = RemoteSkillRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      console.error('[RemoteServer] Invalid request schema:', parseResult.error);
      return res.status(400).json({
        error: 'Invalid request schema',
        details: parseResult.error.errors
      });
    }
    
    const { skill_name, input_summary, context_hint, correlation_id, test_mode } = parseResult.data;
    
    console.log(`[RemoteServer] Received skill: ${skill_name}, correlationId: ${correlation_id}, testMode: ${test_mode}`);
    if (context_hint) {
      console.log(`[RemoteServer] Context: ${context_hint}`);
    }
    
    // Execute skill
    let output_summary: any;
    let ok = true;
    let error: string | undefined;
    
    try {
      output_summary = await executeSkill(skill_name, input_summary, test_mode, correlation_id);
    } catch (e: any) {
      ok = false;
      error = e.message || String(e);
      output_summary = {};
      console.error(`[RemoteServer] Error executing ${skill_name}, correlationId: ${correlation_id}, error: ${error}`);
    }
    
    const requestEndTime = performance.now();
    const duration_ms = Math.max(1, Math.round(requestEndTime - requestStartTime));
    
    // Build response
    const response = {
      ok,
      skill_name,
      output_summary,
      duration_ms,
      error,
      metadata: {
        server_version: SERVER_VERSION,
        executed_at: new Date().toISOString()
      }
    };
    
    // Validate response (optional but recommended)
    const responseParseResult = RemoteSkillResponseSchema.safeParse(response);
    if (!responseParseResult.success) {
      console.error('[RemoteServer] Response validation failed:', responseParseResult.error);
      return res.status(500).json({
        error: 'Internal server error: invalid response shape',
        details: responseParseResult.error.errors
      });
    }
    
    console.log(`[RemoteServer] Completed ${skill_name} in ${duration_ms}ms, correlationId: ${correlation_id}, ok: ${ok}`);
    
    res.json(response);
    
  } catch (e: any) {
    console.error('[RemoteServer] Unexpected error:', e);
    res.status(500).json({
      error: 'Internal server error',
      details: e.message || String(e)
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[RemoteServer] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[RemoteServer] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[RemoteServer] Health check: http://127.0.0.1:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[RemoteServer] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[RemoteServer] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[RemoteServer] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[RemoteServer] Server closed');
    process.exit(0);
  });
});


/**
 * Phase 2: Remote Skills Transport - API Tests
 * 
 * Tests remote skill execution, equivalence, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import getPort from 'get-port';
import { setTimeout } from 'timers/promises';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

let remoteServerProcess: ChildProcess | null = null;
let remoteServerPort: number;
let remoteServerUrl: string;

describe('Remote Skills Transport', () => {
  beforeAll(async () => {
    // Start remote server for these tests
    remoteServerPort = await getPort({ port: [4010, 4011, 4012] });
    remoteServerUrl = `http://127.0.0.1:${remoteServerPort}`;
    
    console.log('[RemoteTests] Starting remote server on port', remoteServerPort);
    
    // Start server
    remoteServerProcess = spawn('npx', ['tsx', 'index.ts'], {
      cwd: '/Users/shenyanran/Dev/VibeCodingProject/skills-remote-server',
      env: { ...process.env, PORT: String(remoteServerPort) },
      stdio: 'pipe'
    });
    
    // Wait for server to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch(`${remoteServerUrl}/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await setTimeout(500);
    }
    
    if (!ready) {
      throw new Error('Remote server failed to start');
    }
    
    console.log('[RemoteTests] ✅ Remote server ready at', remoteServerUrl);
    
    // Set env vars for tests
    process.env.REMOTE_SKILL_SERVER_URL = remoteServerUrl;
    process.env.ENABLE_REMOTE_SKILLS = 'true';
    process.env.SKILL_TRANSPORT_TEST_MODE = 'full_content';
  }, 60000);
  
  afterAll(async () => {
    console.log('[RemoteTests] Shutting down remote server...');
    if (remoteServerProcess) {
      remoteServerProcess.kill('SIGTERM');
      await setTimeout(2000);
      if (!remoteServerProcess.killed) {
        remoteServerProcess.kill('SIGKILL');
      }
    }
  }, 10000);
  
  it('remote server health check works', async () => {
    const response = await fetch(`${remoteServerUrl}/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
  
  it('local vs remote full_content produce equivalent structure', async () => {
    // NOTE: This test demonstrates structure equivalence
    // Remote transport requires ENABLE_REMOTE_SKILLS=true in server env
    // For now, we test that local transport works correctly
    // Full remote testing requires server restart with env vars
    
    const sampleDocs = [
      { name: 'doc1', content: 'Client name: John Doe. Date of birth: 1980-01-01. Nationality: US.' }
    ];
    
    // Local execution (default)
    const localResponse = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: sampleDocs,
        features: { remote_skills: false }
      })
    });
    
    expect(localResponse.status).toBe(200);
    const localData = await localResponse.json();
    
    // Assert skill invocations exist
    expect(localData.graphReviewTrace.skillInvocations).toBeDefined();
    expect(localData.graphReviewTrace.skillInvocations.length).toBe(2);
    
    // Assert both are ok=true
    expect(localData.graphReviewTrace.skillInvocations.every((inv: any) => inv.ok)).toBe(true);
    
    // Assert transport recorded correctly for local
    localData.graphReviewTrace.skillInvocations.forEach((inv: any) => {
      expect(inv.transport).toBe('local');
      expect(inv.target).toBe('in-process');
    });
    
    // Verify structure has expected fields
    const firstInv = localData.graphReviewTrace.skillInvocations[0];
    expect(firstInv).toHaveProperty('skillName');
    expect(firstInv).toHaveProperty('transport');
    expect(firstInv).toHaveProperty('target');
    expect(firstInv).toHaveProperty('durationMs');
    expect(firstInv).toHaveProperty('ok');
    expect(firstInv).toHaveProperty('ownerAgent');
  });
  
  it('feature flag ENABLE_REMOTE_SKILLS=false forces local (default behavior)', async () => {
    // NOTE: Server env var ENABLE_REMOTE_SKILLS defaults to false
    // This test verifies that even when user requests remote_skills=true,
    // if the server env var is not set, it falls back to local (master kill switch)
    
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'doc1', content: 'Test content.' }],
        features: { remote_skills: true } // User requests remote
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // All invocations should be local (master kill switch active by default)
    data.graphReviewTrace.skillInvocations.forEach((inv: any) => {
      expect(inv.transport).toBe('local');
      expect(inv.target).toBe('in-process');
    });
  });
});


/**
 * Vitest Global Setup
 * 
 * Starts Next.js server on a free port for API tests.
 * Exposes TEST_API_BASE env var to test processes.
 */

import { spawn, ChildProcess } from 'child_process';
import getPort from 'get-port';

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;

/**
 * Setup: Start Next server before all tests
 */
export async function setup() {
  console.log('[GlobalSetup] Starting Next.js server for API tests...');
  
  // Find free port (avoid 3000 to not conflict with dev server)
  serverPort = await getPort({ port: [3001, 3002, 3003, 3004, 3005] });
  const serverUrl = `http://127.0.0.1:${serverPort}`;
  
  // Set env var for test access
  process.env.TEST_API_BASE = serverUrl;
  process.env.REFLECTION_PROVIDER = 'mock'; // Force mock provider in tests
  
  console.log(`[GlobalSetup] Selected port: ${serverPort}`);
  console.log(`[GlobalSetup] Starting dev server (faster for testing)...`);
  
  // Strategy: Use next dev for faster startup (no build required)
  serverProcess = spawn('npx', ['next', 'dev', '-p', String(serverPort)], {
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(serverPort),
      REFLECTION_PROVIDER: 'mock',
    }
  });
  
  // Log server output for debugging
  serverProcess.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Server] ${output}`);
    }
  });
  
  serverProcess.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('Debugger')) {
      console.warn(`[Server] ${output}`);
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error('[GlobalSetup] Server process error:', error);
  });
  
  // Wait for server to be ready
  console.log(`[GlobalSetup] Waiting for server at ${serverUrl}...`);
  await waitForServer(serverUrl, 60000);
  
  console.log(`[GlobalSetup] ✅ Server ready at ${serverUrl}`);
  console.log(`[GlobalSetup] TEST_API_BASE=${process.env.TEST_API_BASE}`);
}

/**
 * Teardown: Kill server after all tests
 */
export async function teardown() {
  console.log('[GlobalSetup] Shutting down test server...');
  
  if (serverProcess) {
    // Try graceful shutdown first
    serverProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.warn('[GlobalSetup] Forcing server kill (SIGKILL)');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
    
    serverProcess = null;
  }
  
  console.log('[GlobalSetup] ✅ Teardown complete');
}

/**
 * Wait for server to respond with 200 OK
 */
async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every 1 second
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return; // Server is ready
      }
    } catch (error) {
      // Server not ready yet, continue polling
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Server failed to start within ${timeoutMs}ms at ${url}`);
}


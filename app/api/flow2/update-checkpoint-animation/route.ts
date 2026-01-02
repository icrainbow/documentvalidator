/**
 * API endpoint to update animation_played flag in checkpoint metadata
 * Used to prevent Phase 8 animation from replaying on subsequent page loads
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHECKPOINTS_DIR = path.join(process.cwd(), 'data', 'flow2_checkpoints');

export async function POST(req: NextRequest) {
  try {
    const { run_id, animation_played } = await req.json();

    // Validate input
    if (!run_id || typeof run_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid run_id' },
        { status: 400 }
      );
    }

    if (typeof animation_played !== 'boolean') {
      return NextResponse.json(
        { error: 'animation_played must be a boolean' },
        { status: 400 }
      );
    }

    // Ensure checkpoints directory exists
    if (!fs.existsSync(CHECKPOINTS_DIR)) {
      fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
    }

    const checkpointPath = path.join(CHECKPOINTS_DIR, `${run_id}.json`);

    // Check if checkpoint exists
    if (!fs.existsSync(checkpointPath)) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }

    // Read existing checkpoint
    const checkpointData = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));

    // Update animation_played flag in checkpoint_metadata
    if (!checkpointData.checkpoint_metadata) {
      checkpointData.checkpoint_metadata = {};
    }
    checkpointData.checkpoint_metadata.animation_played = animation_played;

    // Write updated checkpoint back to disk
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpointData, null, 2), 'utf-8');

    console.log(`[Flow2] ✓ Updated animation_played=${animation_played} for run_id=${run_id}`);

    return NextResponse.json({
      success: true,
      run_id,
      animation_played,
    });

  } catch (error: any) {
    console.error('[Flow2] Error updating animation_played flag:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

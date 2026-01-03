/**
 * useCase4Timeline Hook
 * 
 * Manages the Case4 timeline state machine with strict determinism.
 * - Schedules all events via setTimeout (not requestAnimationFrame)
 * - Cleanup guaranteed on unmount
 * - React Strict Mode safe (useRef guard)
 */

import { useReducer, useRef, useEffect, useCallback, useState } from 'react';
import {
  Case4TimelineState,
  case4InitialState,
  applyCase4Event,
  CASE4_TIMELINE_EVENTS
} from '@/app/lib/case4/case4TimelineV2';

interface UseCase4TimelineOptions {
  enabled: boolean;
}

interface UseCase4TimelineReturn {
  timelineState: Case4TimelineState;
  elapsedMs: number;
  restart: () => void;
}

export function useCase4Timeline(
  { enabled }: UseCase4TimelineOptions
): UseCase4TimelineReturn {
  
  // State management via reducer
  const [timelineState, dispatch] = useReducer(
    (state: Case4TimelineState, event: any) => {
      if (event.type === 'RESET') {
        return case4InitialState();
      }
      return applyCase4Event(state, event);
    },
    case4InitialState()
  );
  
  // Track elapsed time for UI display
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  
  // Guards & refs
  const hasStartedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const timerIdsRef = useRef<NodeJS.Timeout[]>([]);
  const rafIdRef = useRef<number | null>(null);
  
  // Restart function
  const restart = useCallback(() => {
    // Clear existing timers
    timerIdsRef.current.forEach(clearTimeout);
    timerIdsRef.current = [];
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Reset state
    dispatch({ type: 'RESET' });
    setElapsedMs(0);
    
    // Allow restart
    hasStartedRef.current = false;
  }, []);
  
  // Timeline orchestration
  useEffect(() => {
    if (!enabled) return;
    
    // Strict Mode guard: prevent double-start
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    console.log('[Case4Timeline] Starting timeline orchestration');
    
    // Record start time
    startTimeRef.current = Date.now();
    
    // Schedule all events
    CASE4_TIMELINE_EVENTS.forEach(event => {
      const timerId = setTimeout(() => {
        console.log(`[Case4Timeline] Event at t=${event.atMs}ms:`, event.type, event.payload);
        dispatch(event);
      }, event.atMs);
      
      timerIdsRef.current.push(timerId);
    });
    
    // Update elapsed time via RAF for smooth UI
    const updateElapsed = () => {
      if (startTimeRef.current === null) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
      
      // Continue until briefings ready (6500ms + buffer)
      if (elapsed < 7000) {
        rafIdRef.current = requestAnimationFrame(updateElapsed);
      }
    };
    
    rafIdRef.current = requestAnimationFrame(updateElapsed);
    
    // Cleanup on unmount or when enabled changes
    return () => {
      console.log('[Case4Timeline] Cleaning up timers');
      
      timerIdsRef.current.forEach(clearTimeout);
      timerIdsRef.current = [];
      
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      hasStartedRef.current = false;
      startTimeRef.current = null;
    };
  }, [enabled]);
  
  return {
    timelineState,
    elapsedMs,
    restart
  };
}


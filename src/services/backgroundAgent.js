import { useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';

/**
 * Background hooks that run periodic analytics, pattern detection,
 * baseline checks, or subtle UI nudges.  Runs inside a setInterval
 * and should avoid long blocking operations.
 */
export function useBackgroundAgent() {
  useEffect(() => {
    const id = setInterval(() => {
      const { threads, markFocus } = useTaskStore.getState();
      // Ensure at least one thread is focused so Today is not empty.
      if (threads.length && !threads.some((t) => t.focus)) {
        markFocus(threads[0].id, true);
      }
      // Future: detect stale tasks, offer insights, compute health
      // baselines, surface reminders, or nudge user to add logs.
    }, 8000);
    return () => clearInterval(id);
  }, []);
}
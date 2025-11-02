// hooks/useThreadsPersistence.js
// Minimal, drop-in persistence hook for You 2.0 TaskApp.
// Keeps your existing storage keys and behavior.
// Usage inside screens/index.js:
//   useThreadsPersistence({
//     threads, focusedItems, expandedThreads, collapsedSteps,
//     setThreads, setFocusedItems, setExpandedThreads, setCollapsedSteps
//   });

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THREADS_KEY = 'you2_threads';
const FOCUS_KEY   = 'you2_focus';
const UI_KEY      = 'you2_ui';

export default function useThreadsPersistence({
  threads,
  focusedItems,
  expandedThreads,
  collapsedSteps,
  setThreads,
  setFocusedItems,
  setExpandedThreads,
  setCollapsedSteps
}) {
  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stored, storedFocus, ui] = await Promise.all([
          AsyncStorage.getItem(THREADS_KEY),
          AsyncStorage.getItem(FOCUS_KEY),
          AsyncStorage.getItem(UI_KEY),
        ]);
        if (cancelled) return;
        if (stored) setThreads(JSON.parse(stored));
        if (storedFocus) setFocusedItems(JSON.parse(storedFocus));
        if (ui) {
          const { expandedThreads: et, collapsedSteps: cs } = JSON.parse(ui);
          if (et) setExpandedThreads(et);
          if (cs) setCollapsedSteps(cs);
        }
      } catch (e) {
        console.log('useThreadsPersistence load error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save on change
  useEffect(() => {
    AsyncStorage.setItem(THREADS_KEY, JSON.stringify(threads)).catch(e => {
      console.log('Persist threads failed:', e);
    });
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem(FOCUS_KEY, JSON.stringify(focusedItems)).catch(e => {
      console.log('Persist focus failed:', e);
    });
  }, [focusedItems]);

  useEffect(() => {
    AsyncStorage.setItem(UI_KEY, JSON.stringify({ expandedThreads, collapsedSteps })).catch(e => {
      console.log('Persist UI failed:', e);
    });
  }, [expandedThreads, collapsedSteps]);
}
// useLogs.js
// Custom hook for managing simple logs (food, supplements, gym, sleep,
// walk, mood, dreams, events, insights).  Extracted from the
// monolithic TaskScreen to encapsulate state logic and persistence.

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default structure for logs.  You can add additional categories by
// extending this object; the hook will persist whatever keys it finds.
const DEFAULT_LOGS = {
  food: [],
  supplements: [],
  gym: [],
  sleep: [],
  walk: [],
  mood: [],
  dreams: [],
  events: [],
  insights: [],
};

/**
 * Hook to manage logs.  It loads from AsyncStorage on mount and
 * persists whenever the logs change.  Provides an append function
 * that will insert into the specified category or fallback to the
 * first category when none is provided.
 */
export default function useLogs() {
  const [logs, setLogs] = useState(DEFAULT_LOGS);

  // Load persisted logs on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('you2_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') setLogs({ ...DEFAULT_LOGS, ...parsed });
        }
      } catch {
        // ignore errors
      }
    })();
  }, []);

  // Persist to storage when logs change
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('you2_logs', JSON.stringify(logs));
      } catch {
        // ignore errors
      }
    })();
  }, [logs]);

  /**
   * Append a new log entry.  If the category does not exist, the
   * entry will be placed into the first defined category.
   *
   * @param {string} category - category key
   * @param {string} text - free text for the log
   * @param {number} [timestamp] - optional timestamp, defaults to now
   */
  function appendLog(category, text, timestamp = Date.now()) {
    if (!text || !String(text).trim()) return;
    setLogs((prev) => {
      const next = { ...prev };
      const cat = category && next[category] ? category : Object.keys(next)[0];
      if (!next[cat]) next[cat] = [];
      next[cat] = [{ text: String(text).trim(), timestamp }].concat(next[cat]);
      return next;
    });
  }

  /**
   * Replace the entire logs object.  Use with caution; primarily for
   * resetting all categories to empty.
   */
  function setAllLogs(newLogs) {
    setLogs({ ...DEFAULT_LOGS, ...newLogs });
  }

  return { logs, appendLog, setLogs: setAllLogs };
}
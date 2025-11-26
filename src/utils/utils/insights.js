// utils/insights.js
export function analyzeThreads(threads) {
  // Dumb, deterministic insights for now. Plug your real model later.
  const alerts = [];
  ['baseline','execution','creative'].forEach(level => {
    threads[level].forEach((t, i) => {
      const age = Date.now() - (t.timestamp || 0);
      if (!t.completed && age > 1000 * 60 * 60 * 24) {
        alerts.push({ level, path:[i], kind:'stale', text:`"${t.text}" looks stale. Nudge.` });
      }
      if ((t.steps?.length || 0) >= 7) {
        alerts.push({ level, path:[i], kind:'bulky', text:`"${t.text}" has many steps. Consider splitting.` });
      }
    });
  });
  return alerts;
}

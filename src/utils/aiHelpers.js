// aiHelpers.js
// Utilities for manipulating the thread tree based on AI instructions.  These
// functions were extracted from the monolithic TaskApp component to allow
// reuse and testing in isolation.

// Normalize a string to lower case and trim whitespace.  Safe for null/undefined.
const _lc = (s) => (s || '').trim().toLowerCase();

/**
 * Find a thread within a level by its exact text (case-insensitive).
 * Returns the first matching thread object or undefined.
 * @param {Array} arr - array of threads in the level
 * @param {string} title - thread title to search for
 */
export function findThreadByText(arr, title) {
  const t = (title || '').trim().toLowerCase();
  return arr.find(x => (x.text || '').trim().toLowerCase() === t);
}

/**
 * Ensure a thread exists at a given level with a given title.  If it does not
 * exist, it is created at the top of the level.  Returns the updated
 * threads object and the found/created thread.
 *
 * @param {Object} stateThreads - object keyed by level (baseline, execution, creative)
 * @param {string} level - the level to operate on
 * @param {string} title - the title to find or create
 */
export function ensureThreadInLevel(stateThreads, level, title) {
  const t = title?.trim(); if (!t) return { threads: stateThreads, thread: null };
  const arr = stateThreads[level] || [];
  const existing = arr.find(x => _lc(x.text) === _lc(t));
  if (existing) return { threads: stateThreads, thread: existing };
  const node = {
    text: t,
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: null,
  };
  const next = { ...stateThreads, [level]: [node, ...arr] };
  return { threads: next, thread: node };
}

/**
 * Ensure a step exists under a given thread.  Creates the thread if necessary.
 * If the step exists, returns it unchanged.  Otherwise creates it at the end
 * of the thread's steps.  Returns the updated threads, the thread, and the
 * step.
 *
 * @param {Object} stateThreads - the full threads object
 * @param {string} level - level key
 * @param {string} parentTitle - thread title
 * @param {string} stepTitle - step title
 */
export function ensureStepUnderThread(stateThreads, level, parentTitle, stepTitle) {
  const { threads: s1, thread } = ensureThreadInLevel(stateThreads, level, parentTitle);
  if (!thread) return { threads: s1, thread: null, step: null };
  const steps = thread.steps || [];
  const hit = steps.find(x => _lc(x.text) === _lc(stepTitle));
  if (hit) return { threads: s1, thread, step: hit };
  const step = {
    text: stepTitle?.trim() || 'Step',
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: null,
  };
  const newThread = { ...thread, steps: [...steps, step] };
  const arr = s1[level].map(x => (x === thread ? newThread : x));
  return { threads: { ...s1, [level]: arr }, thread: newThread, step };
}

/**
 * Add a substep under an existing step.  Ensures the parent thread and step
 * exist, then checks for an existing substep by title before appending a
 * new one.  Returns the updated threads object.
 *
 * @param {Object} stateThreads - the full threads object
 * @param {string} level - level key
 * @param {string} parentTitle - thread title
 * @param {string} stepTitle - step title under that thread
 * @param {string} subTitle - title for the substep
 */
export function addSubstepUnder(stateThreads, level, parentTitle, stepTitle, subTitle) {
  const { threads: s2, thread, step } = ensureStepUnderThread(stateThreads, level, parentTitle, stepTitle);
  if (!step) return s2;
  const subs = step.steps || [];
  if (subs.find(x => _lc(x.text) === _lc(subTitle))) return s2;
  const sub = {
    text: subTitle?.trim() || 'Detail',
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: null,
  };
  const newStep = { ...step, steps: [...subs, sub] };
  const newThread = {
    ...thread,
    steps: (thread.steps || []).map(x => (x === step ? newStep : x)),
  };
  const arr = s2[level].map(x => (x === thread ? newThread : x));
  return { ...s2, [level]: arr };
}
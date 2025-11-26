// utils/taskActions.js
//
// Pure helper functions for manipulating the task tree.  These helpers
// accept the current `threads` object and return a new mutated copy
// without changing the original.  They consolidate logic for
// completion toggling, setting target dates, adding new items,
// renaming, deleting and promoting tasks.  Using these functions
// inside `setThreads(prev => fn(prev, ...args))` keeps the state
// updates clear and centralized.  They rely on other helpers from
// `treeUtils` and `dateUtils`.

import { getNodeRef, getParentRef, promoteToThread } from './treeUtils';
import { inferTargetDateFromText } from './dateUtils';

/**
 * Toggle completion on a node at the given level/path.  If the node
 * defines a `repeat` schedule, it will reschedule the next
 * occurrence instead of marking as completed.  Otherwise it flips
 * the `completed` boolean.  Returns a new threads object.
 *
 * @param {Object} threads Current threads by level
 * @param {string} level Level key (baseline/execution/creative)
 * @param {number[]} path Index path into the level array
 */
export function toggleCompletion(threads, level, path) {
  const updated = JSON.parse(JSON.stringify(threads));
  if (!updated[level]) return threads;
  let node;
  if (path.length === 1) {
    node = updated[level][path[0]];
  } else {
    node = getNodeRef(updated, level, path);
  }
  if (!node) return threads;
  // If this node has a repeat schedule, schedule the next
  // occurrence on the same weekday at the specified time.  If
  // repeating weekly, handle wrap-around to the following week if
  // necessary.
  if (node.repeat) {
    const { weekday, hour, minute } = node.repeat;
    const now = new Date();
    const next = new Date(now);
    let delta = (weekday - now.getDay() + 7) % 7;
    // If the target time already passed today, bump to next week
    if (
      delta === 0 &&
      (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute))
    ) {
      delta += 7;
    }
    next.setDate(now.getDate() + delta);
    next.setHours(hour, minute, 0, 0);
    node.targetDate = next.getTime();
    node.completed = false;
  } else {
    node.completed = !node.completed;
  }
  return updated;
}

/**
 * Set or clear a target date on the node at the given level/path.
 * If `ts` is null the target is cleared; otherwise `allDayFlag`
 * controls the `allDay` property.  Returns a new threads object.
 */
export function setTargetDate(threads, level, path, ts, allDayFlag) {
  const updated = JSON.parse(JSON.stringify(threads));
  const node = getNodeRef(updated, level, path);
  if (node) {
    node.targetDate = ts;
    if (ts != null) node.allDay = !!allDayFlag;
    else node.allDay = undefined;
  }
  return updated;
}

/**
 * Add a new item either as a top level thread (default) or as a
 * subtask under an existing node if `targetLevel` and `targetPath`
 * are provided.  The new item has its `targetDate` and `allDay`
 * inferred from the free-text using `inferTargetDateFromText`.  Returns
 * a new threads object.
 */
export function addItem(threads, text, targetLevel, targetPath) {
  const t = String(text || '').trim();
  if (!t) return threads;
  const { ts, allDay } = inferTargetDateFromText(t);
  const updated = JSON.parse(JSON.stringify(threads));
  const newItem = {
    text: t,
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: ts,
    allDay: allDay ?? undefined,
  };
  if (targetLevel && targetPath) {
    const parent = getNodeRef(updated, targetLevel, targetPath);
    if (parent) {
      parent.steps = parent.steps || [];
      parent.steps.unshift(newItem);
    } else {
      updated.execution = updated.execution || [];
      updated.execution.unshift(newItem);
    }
  } else {
    updated.execution = updated.execution || [];
    updated.execution.unshift(newItem);
  }
  return updated;
}

/**
 * Rename a node at the given level/path.  Leading/trailing
 * whitespace will be trimmed.  If the text is empty, no change is
 * applied.  Returns a new threads object.
 */
export function renameItem(threads, level, path, newText) {
  const t = String(newText || '').trim();
  if (!t) return threads;
  const updated = JSON.parse(JSON.stringify(threads));
  const node = getNodeRef(updated, level, path);
  if (node) node.text = t;
  return updated;
}

/**
 * Delete a node at the given level/path.  If the path is invalid,
 * returns the original threads object.
 */
export function deleteItem(threads, level, path) {
  const updated = JSON.parse(JSON.stringify(threads));
  const parent = getParentRef(updated, level, path);
  if (parent) {
    parent.arr.splice(parent.index, 1);
    return updated;
  }
  return threads;
}

/**
 * Promote a subtask into a top-level thread (inserted at top).  If
 * the path length is <=1 (already a top-level thread), no change is
 * applied.  Returns a new threads object.
 */
export function promoteItem(threads, level, path) {
  if (!Array.isArray(path) || path.length <= 1) return threads;
  return promoteToThread(JSON.parse(JSON.stringify(threads)), level, path);
}
// treeUtils.js
// Utility functions for navigating and manipulating the nested task
// tree.  These helpers were pulled out of the monolithic TaskScreen to
// simplify reasoning about reordering and promotion logic.  All
// functions are pure: they return a new copy of the threads object
// rather than mutating the original.  Callers are responsible for
// updating state.

/**
 * Given a threads object keyed by level and a path, return the node
 * at that path.  Paths are arrays of indices (e.g. [0,2] for the
 * third substep under the first thread).
 *
 * @param {Object} threads - The full threads state
 * @param {string} level - One of 'baseline','execution','creative'
 * @param {number[]} path - Array of indices to locate the node
 * @returns {Object|null} The node at the path or null if not found
 */
export function getNodeRef(threads, level, path) {
  try {
    let node = threads[level];
    for (let i = 0; i < path.length; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    return node;
  } catch {
    return null;
  }
}

/**
 * Return a reference to the parent array and index of the given
 * path.  Useful for splice-based mutations.  If the path is empty
 * or invalid the function returns null.
 *
 * @param {Object} threads - The full threads state
 * @param {string} level - Level key
 * @param {number[]} path - Array of indices
 * @returns {Object|null} { arr, index } or null
 */
export function getParentRef(threads, level, path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  if (path.length === 1) {
    return { arr: threads[level], index: path[0] };
  }
  let node = threads[level];
  for (let i = 0; i < path.length - 1; i++) {
    node = i === 0 ? node[path[i]] : node.steps[path[i]];
    if (!node) return null;
  }
  const arr = node.steps;
  const index = path[path.length - 1];
  if (!arr || index < 0 || index >= arr.length) return null;
  return { arr, index };
}

/**
 * Determine whether an item at the given path can move up within its
 * parent array.  Returns false when already at the top or when the
 * path is invalid.
 */
export function canMoveUp(threads, level, path) {
  const parent = getParentRef(threads, level, path);
  return parent ? parent.index > 0 : false;
}

/**
 * Determine whether an item at the given path can move down within
 * its parent array.  Returns false when already at the bottom or
 * when the path is invalid.
 */
export function canMoveDown(threads, level, path) {
  const parent = getParentRef(threads, level, path);
  return parent ? parent.index < parent.arr.length - 1 : false;
}

/**
 * Move an item up or down within its parent array by one position.
 * Returns a new threads object with the updated ordering.
 *
 * @param {Object} threads - The current threads state
 * @param {string} level - Level key
 * @param {number[]} path - Path to the item
 * @param {('up'|'down')} direction - Direction to move
 */
export function moveBy(threads, level, path, direction) {
  const updated = JSON.parse(JSON.stringify(threads));
  const parent = getParentRef(updated, level, path);
  if (!parent) return threads;
  const { arr, index } = parent;
  const delta = direction === 'up' ? -1 : 1;
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= arr.length) return threads;
  const [item] = arr.splice(index, 1);
  arr.splice(newIndex, 0, item);
  return updated;
}

/**
 * Move an item to the start of its parent array.
 */
export function moveToTop(threads, level, path) {
  const updated = JSON.parse(JSON.stringify(threads));
  const parent = getParentRef(updated, level, path);
  if (!parent) return threads;
  const { arr, index } = parent;
  const [item] = arr.splice(index, 1);
  arr.unshift(item);
  return updated;
}

/**
 * Move an item to the end of its parent array.
 */
export function moveToBottom(threads, level, path) {
  const updated = JSON.parse(JSON.stringify(threads));
  const parent = getParentRef(updated, level, path);
  if (!parent) return threads;
  const { arr, index } = parent;
  const [item] = arr.splice(index, 1);
  arr.push(item);
  return updated;
}

/**
 * Promote a nested item to a top-level thread within the same level.
 * Does nothing for root-level items or invalid paths.
 */
export function promoteToThread(threads, level, path) {
  if (!Array.isArray(path) || path.length <= 1) return threads;
  const updated = JSON.parse(JSON.stringify(threads));
  // Traverse down to the parent steps array
  let parent = updated[level];
  for (let i = 0; i < path.length - 1; i++) {
    parent = i === 0 ? parent[path[i]] : parent.steps[path[i]];
    if (!parent) return threads;
  }
  const idx = path[path.length - 1];
  if (!Array.isArray(parent.steps) || !parent.steps[idx]) return threads;
  const [node] = parent.steps.splice(idx, 1);
  updated[level].unshift(node);
  return updated;
}
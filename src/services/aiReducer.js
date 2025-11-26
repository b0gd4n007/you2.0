// aiReducerHelpers.js
// Map high-level AI instructions into low-level edit operations
// on the nested task tree.
//
// threads shape:
//   { baseline: Thread[], execution: Thread[], creative: Thread[] }
//
// Thread:
//   { text, timestamp, completed, steps?, targetDate?, allDay? }
//
// Paths are arrays of indices: [0] = first thread, [0,2] = third substep of first thread.

function cloneThreads(threads) {
  const base = threads || { baseline: [], execution: [], creative: [] };
  return JSON.parse(JSON.stringify(base));
}

function makeNode(text, ts) {
  const t = String(text || "").trim();
  return {
    text: t || "Untitled",
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: ts ?? null,
  };
}

function getNodeAtPath(levelArr, path) {
  if (!Array.isArray(levelArr) || !Array.isArray(path) || path.length === 0) return null;
  let node = levelArr[path[0]];
  if (!node) return null;
  for (let i = 1; i < path.length; i++) {
    const idx = path[i];
    if (!Array.isArray(node.steps) || idx < 0 || idx >= node.steps.length) return null;
    node = node.steps[idx];
  }
  return node;
}

function getParentRef(levelArr, path) {
  if (!Array.isArray(levelArr) || !Array.isArray(path) || path.length === 0) return null;
  if (path.length === 1) {
    const index = path[0];
    if (index < 0 || index >= levelArr.length) return null;
    return { arr: levelArr, index };
  }
  let node = levelArr[path[0]];
  if (!node) return null;
  for (let i = 1; i < path.length - 1; i++) {
    const idx = path[i];
    if (!Array.isArray(node.steps) || idx < 0 || idx >= node.steps.length) return null;
    node = node.steps[idx];
  }
  const arr = node.steps || [];
  const index = path[path.length - 1];
  if (index < 0 || index >= arr.length) return null;
  return { arr, index };
}

/**
 * Apply a single low-level edit instruction to the threads tree.
 *
 * instr = {
 *   action: "add" | "delete" | "edit",
 *   level: "baseline" | "execution" | "creative",
 *   path: number[],
 *   mode?: "thread" | "child",
 *   text?: string,
 *   targetDate?: number | null
 * }
 */
export function applyEditInstructionToThreads(instr, threads, fallbackTargetDate = null) {
  const updated = cloneThreads(threads);
  const level = instr.level || "execution";
  const path = Array.isArray(instr.path) ? instr.path : [];
  const mode = instr.mode || "thread";

  if (!updated[level]) updated[level] = [];

  // ADD
  if (instr.action === "add") {
    const ts = instr.targetDate ?? fallbackTargetDate ?? null;
    if (mode === "thread") {
      updated[level].unshift(makeNode(instr.text, ts));
      return updated;
    }
    if (mode === "child") {
      if (!Array.isArray(path) || path.length === 0) return updated;
      let parent = getNodeAtPath(updated[level], path);
      if (!parent) return updated;
      if (!Array.isArray(parent.steps)) parent.steps = [];
      parent.steps.unshift(makeNode(instr.text, ts));
      return updated;
    }
    return updated;
  }

  // DELETE
  if (instr.action === "delete") {
    if (!Array.isArray(path) || path.length === 0) return updated;
    if (path.length === 1) {
      const idx = path[0];
      if (idx >= 0 && idx < updated[level].length) {
        updated[level].splice(idx, 1);
      }
      return updated;
    }
    const parentRef = getParentRef(updated[level], path);
    if (parentRef) {
      parentRef.arr.splice(parentRef.index, 1);
    }
    return updated;
  }

  // EDIT (rename)
  if (instr.action === "edit") {
    if (!Array.isArray(path) || path.length === 0) return updated;
    const node = getNodeAtPath(updated[level], path);
    if (node && typeof instr.text === "string" && instr.text.trim()) {
      node.text = instr.text.trim();
    }
    return updated;
  }

  // Fallback: unknown action → no change
  return updated;
}

// ---------- Helpers for adapting AImagic instructions ----------

const __norm = (s) => (s ? String(s).trim().toLowerCase() : "");

function __findThreadIndexByTitle(arr, title) {
  if (!Array.isArray(arr)) return -1;
  const t = __norm(title);
  if (!t) return -1;
  return arr.findIndex((thread) => __norm(thread?.text) === t);
}

function __findAnyNodePathByTitle(state, title) {
  const t = __norm(title);
  if (!t) return null;
  for (const lvl of ["baseline", "execution", "creative"]) {
    const arr = state[lvl] || [];
    const stack = arr.map((n, i) => ({ level: lvl, path: [i], node: n }));
    while (stack.length) {
      const { level, path, node } = stack.pop();
      if (__norm(node?.text) === t) return { level, path };
      const kids = Array.isArray(node?.steps) ? node.steps : [];
      for (let i = 0; i < kids.length; i++) {
        stack.push({ level, path: path.concat(i), node: kids[i] });
      }
    }
  }
  return null;
}

/**
 * Map high-level instructions from AImagic into low-level reducer
 * operations that `applyEditInstructionToThreads` can handle.
 *
 * High-level instruction (from askAIToEdit):
 *   {
 *     action: "add" | "delete" | "edit",
 *     type: "thread" | "step" | "substep",
 *     title: string,
 *     old_title: string|null,
 *     parent_title: string|null,
 *     targetDate: number|null
 *   }
 */
// Map high-level AImagic instructions into reducer instructions that
// applyEditInstructionToThreads understands.
//
// High-level (from AImagic):
//   {
//     action: "add" | "delete" | "edit",
//     type: "thread" | "step" | "substep",
//     title: string,
//     old_title: string | null,
//     parent_title: string | null,
//     targetDate: number | null
//   }
//
// Low-level (to reducer):
//   {
//     action: "add" | "delete" | "edit",
//     level: "baseline" | "execution" | "creative",
//     path: number[],
//     mode?: "thread" | "child" | "sibling",
//     text?: string,
//     targetDate?: number | null
//   }

export function adaptAIMagicToReducer(state, ins) {
  const out = [];
  const DEFAULT_LEVEL = 'execution';

  const safeState =
    state && typeof state === 'object'
      ? state
      : { baseline: [], execution: [], creative: [] };

  if (!ins || !ins.action) return out;

  // ---------- ADD ----------
  if (ins.action === 'add') {
    const title = ins.title || '';
    const targetDate = ins.targetDate ?? null;

    // New top-level thread
    if (ins.type === 'thread') {
      out.push({
        action: 'add',
        level: DEFAULT_LEVEL,
        path: [],
        mode: 'thread',
        text: title,
        targetDate,
      });
      return out;
    }

    // Step under a thread
    if (ins.type === 'step') {
      const parentTitle = ins.parent_title || '';
      let ti = __findThreadIndexByTitle(safeState[DEFAULT_LEVEL], parentTitle);

      // If parent thread doesn't exist yet, create it first
      if (ti === -1 && parentTitle) {
        out.push({
          action: 'add',
          level: DEFAULT_LEVEL,
          path: [],
          mode: 'thread',
          text: parentTitle,
          targetDate: null,
        });
        // new thread goes at index 0 because we unshift
        ti = 0;
      }

      if (ti >= 0) {
        out.push({
          action: 'add',
          level: DEFAULT_LEVEL,
          path: [ti],
          mode: 'child',
          text: title,
          targetDate,
        });
      }
      return out;
    }

    // Substep under an existing step
    if (ins.type === 'substep') {
      const parentTitle = ins.parent_title || '';
      const parent = __findAnyNodePathByTitle(safeState, parentTitle);

      if (parent) {
        out.push({
          action: 'add',
          level: parent.level,
          path: parent.path,
          mode: 'child',
          text: title,
          targetDate,
        });
      } else {
        // Fallback: create as its own thread rather than losing it
        out.push({
          action: 'add',
          level: DEFAULT_LEVEL,
          path: [],
          mode: 'thread',
          text: title,
          targetDate,
        });
      }
      return out;
    }

    return out;
  }

  // ---------- DELETE (by title) ----------
  if (ins.action === 'delete') {
    const title = ins.title || ins.old_title || '';
    const node = __findAnyNodePathByTitle(safeState, title);
    if (node) {
      out.push({
        action: 'delete',
        level: node.level,
        path: node.path,
      });
    }
    return out;
  }

  // ---------- EDIT / RENAME ----------
  if (ins.action === 'edit') {
    const oldTitle = ins.old_title || '';
    const newTitle = ins.title || '';

    if (!newTitle.trim()) return out;

    const node = __findAnyNodePathByTitle(safeState, oldTitle || newTitle);
    if (node) {
      out.push({
        action: 'edit',
        level: node.level,
        path: node.path,
        text: newTitle,
      });
    }
    return out;
  }

  // Unknown action → no reducer ops
  return out;
}


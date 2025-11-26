// aiReducerHelpers.js
// Helpers for mapping AI instructions into reducer operations and
// applying them to the nested threads state.  Extracted from the
// monolithic TaskScreen file so they can be imported where needed.

/**
 * Deep copy a threads object.  Many of these operations rely on
 * structured cloning to avoid mutating the original state.
 *
 * @param {Object} threads - object keyed by level
 * @returns {Object} a deep clone
 */
function cloneThreads(threads) {
  return JSON.parse(JSON.stringify(threads));
}

/**
 * Apply a single edit instruction returned by the AI to the threads
 * state.  The instruction must have the shape produced by the
 * adaptAIMagicToReducer function (see below): { action, level, path,
 * mode, text, targetDate }.  Returns a new threads object with the
 * applied changes.  Unknown actions are ignored.
 *
 * @param {Object} instr - instruction from AI
 * @param {Object} threads0 - current threads state
 * @param {number|null} inferredTargetDate - optional timestamp from NL parsing
 */
export function applyEditInstructionToThreads(instr, threads0, inferredTargetDate) {
  if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path)) return threads0;
  const updated = cloneThreads(threads0);
  const { level, path, mode } = instr;

  function getNodeAtPath(levelArr, fullPath) {
    if (!levelArr) return null;
    if (!fullPath || fullPath.length === 0) return null;
    let node = levelArr[fullPath[0]];
    if (!node) return null;
    for (let i = 1; i < fullPath.length; i++) {
      if (!node.steps || !node.steps[fullPath[i]]) return null;
      node = node.steps[fullPath[i]];
    }
    return node;
  }
  function getParentRefLocal(levelArr, fullPath) {
    if (!fullPath || fullPath.length === 0) return null;
    if (fullPath.length === 1) return { arr: levelArr, index: fullPath[0] };
    let node = levelArr[fullPath[0]];
    if (!node) return null;
    for (let i = 1; i < fullPath.length - 1; i++) {
      if (!node.steps || !node.steps[fullPath[i]]) return null;
      node = node.steps[fullPath[i]];
    }
    if (!node.steps) return null;
    return { arr: node.steps, index: fullPath[fullPath.length - 1] };
  }

  // DELETE
  if (instr.action === 'delete') {
    const parentRef = getParentRefLocal(updated[level], path);
    if (parentRef && parentRef.arr && parentRef.index >= 0 && parentRef.index < parentRef.arr.length) {
      parentRef.arr.splice(parentRef.index, 1);
    }
    return updated;
  }

  // COMPLETE
  if (instr.action === 'complete') {
    const node = getNodeAtPath(updated[level], path);
    if (node) node.completed = true;
    return updated;
  }

  // EDIT (keep targetDate as-is)
  if (instr.action === 'edit') {
    const node = getNodeAtPath(updated[level], path);
    if (node && typeof instr.text === 'string' && instr.text.trim()) node.text = instr.text.trim();
    return updated;
  }

  // SET_TARGET (explicit from AI)
  if (instr.action === 'set_target') {
    const node = getNodeAtPath(updated[level], path);
    if (node) node.targetDate = instr.targetDate ?? null;
    return updated;
  }

  // Utility to build a new task node
  const makeNode = (text) => ({
    text: text || 'New Task',
    timestamp: Date.now(),
    completed: false,
    steps: [],
    targetDate: instr.targetDate ?? inferredTargetDate ?? null,
  });

  // ADD (thread/child/sibling)
  if (instr.action === 'add' && mode === 'thread') {
    updated[level].unshift(makeNode(instr.text));
    return updated;
  }
  if (instr.action === 'add' && mode === 'child') {
    let parentNode = updated[level][path[0]];
    if (!parentNode) return updated;
    for (let i = 1; i < path.length; i++) {
      parentNode.steps = parentNode.steps || [];
      if (!parentNode.steps[path[i]]) return updated;
      parentNode = parentNode.steps[path[i]];
    }
    parentNode.steps = parentNode.steps || [];
    parentNode.steps.unshift(makeNode(instr.text));
    return updated;
  }
  if (instr.action === 'add' && mode === 'sibling') {
    const parentRef = getParentRefLocal(updated[level], path);
    if (!parentRef) return updated;
    parentRef.arr.splice(parentRef.index + 1, 0, makeNode(instr.text));
    return updated;
  }

  // PROMOTE
  if (instr.action === 'promote') {
    if (!updated[level] || !Array.isArray(path) || path.length <= 1) return updated;
    let parent = updated[level][path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      parent = parent?.steps?.[path[i]];
      if (!parent) return updated;
    }
    if (!parent?.steps?.[path[path.length - 1]]) return updated;
    const [node] = parent.steps.splice(path[path.length - 1], 1);
    updated[level].unshift(node);
    return updated;
  }

  // REORDER
  if (instr.action === 'reorder') {
    const direction = instr.direction || 'up';
    const parentRef = getParentRefLocal(updated[level], path);
    if (!parentRef) return updated;
    const { arr, index } = parentRef;
    const [item] = arr.splice(index, 1);
    if (direction === 'top') arr.unshift(item);
    else if (direction === 'bottom') arr.push(item);
    else {
      const newIndex = direction === 'down' ? Math.min(index + 1, arr.length) : Math.max(index - 1, 0);
      arr.splice(newIndex, 0, item);
    }
    return updated;
  }

  return updated;
}

// ---- helpers for adapting AImagic instructions into reducer ops ----

// Normalize a string to lower case and trim whitespace.  Safe for null/undefined.
const __norm = (s) => (s ? String(s).trim().toLowerCase() : '');

function __findThreadIndexByTitle(arr, title) {
  if (!Array.isArray(arr)) return -1;
  const t = __norm(title);
  return arr.findIndex((x) => __norm(x?.text) === t);
}

function __findAnyNodePathByTitle(state, title) {
  const t = __norm(title);
  for (const lvl of ['baseline', 'execution', 'creative']) {
    const arr = state[lvl] || [];
    const stack = arr.map((n, i) => ({ level: lvl, path: [i], node: n }));
    while (stack.length) {
      const { level, path, node } = stack.pop();
      if (__norm(node?.text) === t) return { level, path };
      const kids = Array.isArray(node?.steps) ? node.steps : [];
      for (let i = 0; i < kids.length; i++) stack.push({ level, path: path.concat(i), node: kids[i] });
    }
  }
  return null;
}

/**
 * Map high-level AImagic instructions into a series of reducer actions.  The
 * incoming instructions describe adding threads/steps/substeps by
 * title; this function translates them into the { action, level, path,
 * mode, text, targetDate } objects expected by applyEditInstructionToThreads.
 *
 * @param {Object} state - Current threads state
 * @param {Object} ins - instruction from the AI: { action:'add', type:'thread'|'step'|'substep', title, parent_title, targetDate }
 * @returns {Array} A list of reducer instructions
 */
export function adaptAIMagicToReducer(state, ins) {
  const out = [];
  const DEFAULT_LEVEL = 'execution';
  const safeState = state || { baseline: [], execution: [], creative: [] };
  if (!ins || ins.action !== 'add') return out;
  if (ins.type === 'thread') {
    out.push({ action: 'add', level: DEFAULT_LEVEL, path: [], mode: 'thread', text: ins.title, targetDate: ins.targetDate ?? null });
    return out;
  }
  if (ins.type === 'step') {
    let ti = __findThreadIndexByTitle(safeState[DEFAULT_LEVEL], ins.parent_title);
    if (ti === -1) {
      // create parent thread first
      out.push({ action: 'add', level: DEFAULT_LEVEL, path: [], mode: 'thread', text: ins.parent_title || 'New' });
      // then add step under the new thread at index 0 (unshift behavior)
      out.push({ action: 'add', level: DEFAULT_LEVEL, path: [0], mode: 'child', text: ins.title, targetDate: ins.targetDate ?? null });
    } else {
      out.push({ action: 'add', level: DEFAULT_LEVEL, path: [ti], mode: 'child', text: ins.title, targetDate: ins.targetDate ?? null });
    }
    return out;
  }
  if (ins.type === 'substep') {
    const parent = __findAnyNodePathByTitle(safeState, ins.parent_title);
    if (parent) {
      out.push({ action: 'add', level: parent.level, path: parent.path, mode: 'child', text: ins.title, targetDate: ins.targetDate ?? null });
    } else {
      // fallback: create a thread to avoid losing data
      out.push({ action: 'add', level: DEFAULT_LEVEL, path: [], mode: 'thread', text: ins.title });
    }
    return out;
  }
  return out;
}
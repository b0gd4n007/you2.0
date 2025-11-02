// ai/aiReducer.js
// Pure function: nextState = aiReducer(state, instruction)
// Copies your existing "applyEditInstructionToThreads" logic so we can unit-test it later.

export function aiReducer(currentThreads, instr) {
  if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path)) return currentThreads;

  const updated = JSON.parse(JSON.stringify(currentThreads));
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

  // EDIT
  if (instr.action === 'edit') {
    if (typeof instr.text !== 'string' || !instr.text.trim()) return updated;
    const node = getNodeAtPath(updated[level], path);
    if (node) node.text = instr.text.trim();
    return updated;
  }

  // ADD
  if (instr.action === 'add') {
    const newNode = { text: instr.text || 'New Task', timestamp: Date.now(), completed: false, steps: [] };
    if (mode === 'thread') {
      if (updated[level]) updated[level].push(newNode);
      return updated;
    }
    if (!updated[level]) return updated;
    let parentNode = updated[level][path[0]];
    if (!parentNode) return updated;
    for (let i = 1; i < path.length; i++) {
      parentNode.steps = parentNode.steps || [];
      if (!parentNode.steps[path[i]]) return updated;
      parentNode = parentNode.steps[path[i]];
    }
    parentNode.steps = parentNode.steps || [];
    parentNode.steps.push(newNode);
    return updated;
  }

  // NONE / unknown -> return unchanged
  return updated;
}
// utils/tree.js
export const formatTime = (ts) => {
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const getNodeRef = (obj, level, path) => {
  let node = obj[level];
  for (let i = 0; i < path.length; i++) {
    node = i === 0 ? node[path[i]] : node.steps[path[i]];
  }
  return node;
};

export const getParentRef = (obj, level, path) => {
  if (!path?.length) return null;
  if (path.length === 1) return { arr: obj[level], index: path[0] };
  let node = obj[level];
  for (let i = 0; i < path.length - 1; i++) {
    node = i === 0 ? node[path[i]] : node.steps[path[i]];
  }
  return { arr: node.steps, index: path[path.length - 1] };
};

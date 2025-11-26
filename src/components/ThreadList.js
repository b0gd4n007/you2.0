// components/ThreadList.js
//
// A presentational component that renders the list of thread cards
// for a given page.  It abstracts away the mapping over levels and
// the optional filtering used for the Today view.

import React from 'react';
import { Text } from 'react-native';
import ThreadCard from './ThreadCard';
import { isToday } from '../utils/dateUtils';

/**
 * Determine whether a thread matches the Today filter.  A thread
 * matches if its own targetDate or any nested step's targetDate
 * falls on today.
 */
function threadMatchesToday(thread) {
  if (thread.targetDate && isToday(thread.targetDate)) return true;
  const stack = (thread.steps || []).slice();
  while (stack.length) {
    const s = stack.pop();
    if (s.targetDate && isToday(s.targetDate)) return true;
    if (Array.isArray(s.steps)) stack.push(...s.steps);
  }
  return false;
}

export default function ThreadList({
  threads,
  pageIndex,
  expandedThreads,
  collapsedSteps,
  toggleExpand,
  setCollapsedSteps,
  toggleCheckbox,
  openMenu,
  setTargetPath,
  setTargetLevel,
  promoteToThread,
  moveMode,
  canMoveUp,
  canMoveDown,
  moveBy,
  moveToTop,
  moveToBottom,
}) {
  const levels = ['baseline', 'execution', 'creative'];
  const items = [];
  levels.forEach((level) => {
    const arr = threads[level] || [];
    let list = arr;
    if (pageIndex === 0) {
      list = arr.filter(threadMatchesToday);
    }
    list.forEach((thread, index) => {
      const key = `${level}-${index}`;
      const isOpen = !!expandedThreads[key];
      items.push(
        <ThreadCard
          key={key}
          thread={thread}
          level={level}
          index={index}
          isOpen={isOpen}
          toggleExpand={toggleExpand}
          collapsedSteps={collapsedSteps}
          setCollapsedSteps={setCollapsedSteps}
          toggleCheckbox={toggleCheckbox}
          openMenu={openMenu}
          setTargetPath={setTargetPath}
          setTargetLevel={setTargetLevel}
          promoteToThread={promoteToThread}
          moveMode={moveMode}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          moveBy={moveBy}
          moveToTop={moveToTop}
          moveToBottom={moveToBottom}
        />,
      );
    });
  });
  if (items.length === 0) {
    return <Text style={{ padding: 16, color: '#777' }}>Nothing here yet. Add a target date or create something new.</Text>;
  }
  return items;
}
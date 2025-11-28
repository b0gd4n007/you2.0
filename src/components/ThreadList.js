
import React from 'react';
import { Text } from 'react-native';
import ThreadCard from './ThreadCard';

function isOnOrBeforeToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return dateOnly.getTime() <= todayOnly.getTime();
}

function threadMatchesTodayOrOverdue(thread) {
  if (thread.targetDate && isOnOrBeforeToday(thread.targetDate)) {
    return true;
  }
  const stack = Array.isArray(thread.steps) ? [...thread.steps] : [];
  while (stack.length) {
    const s = stack.pop();
    if (s.targetDate && isOnOrBeforeToday(s.targetDate)) return true;
    if (Array.isArray(s.steps)) {
      stack.push(...s.steps);
    }
  }
  return false;
}

export default function ThreadList({
  threads,
  expandedThreads,
  pageIndex,
  ...rest
}) {
  const levels = ['baseline', 'execution', 'creative'];
  const items = [];

  levels.forEach((level) => {
    const arr = threads[level] || [];
    arr.forEach((thread, realIndex) => {
      if (pageIndex === 0 && !threadMatchesTodayOrOverdue(thread)) {
        return;
      }
      const key = `${level}-${realIndex}`;
      const isOpen = !!expandedThreads[key];
      items.push(
        <ThreadCard
          key={key}
          thread={thread}
          level={level}
          index={realIndex}
          isOpen={isOpen}
          {...rest}
        />
      );
    });
  });

  if (!items.length) {
    return (
      <Text style={{ padding: 16, color: '#777' }}>
        Nothing here yet. Add a target date or set one overdue.
      </Text>
    );
  }

  return items;
}

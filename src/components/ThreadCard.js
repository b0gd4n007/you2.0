// ThreadCard.js
// Presentational component for rendering a top‑level thread.  Shows a
// collapsible card with its title, timestamps, target date chip, move
// controls, and nested steps rendered via StepsList.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import StepsList from './StepsList';
import MoveArrows from './MoveArrows';
import styles from '../styles';
import { formatDate } from '../utils/dateUtils';

export default function ThreadCard({
  thread,
  level,
  index,
  isOpen,
  toggleExpand,
  collapsedSteps,
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
  const currentPath = [index];
  return (
    <View key={`${level}-${index}`} style={styles.threadBlock}>
      <View style={[styles.threadHeader, { alignItems: 'center' }]}> 
        {/* Expand/collapse button */}
        <TouchableOpacity onPress={() => toggleExpand(level, index)}>
          <Text style={styles.plusButton}>{isOpen ? '-' : '+'}</Text>
        </TouchableOpacity>
        {/* Thread title and metadata */}
        <TouchableOpacity
          onPress={() => { setTargetPath(currentPath); setTargetLevel(level); }}
          onLongPress={(e) => openMenu(e, level, currentPath)}
          delayLongPress={250}
          style={{ flex: 1 }}
        >
          <Text style={styles.threadTitle}>• {thread.text}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={styles.timestamp}>created {formatDate(thread.timestamp)}</Text>
            {!!thread.targetDate && (
              <View style={styles.dateChip}>
                <Text style={styles.dateChipText}>
                  {(!thread.allDay && (new Date(thread.targetDate).getHours() !== 0 || new Date(thread.targetDate).getMinutes() !== 0))
                    ? `🕒 ${new Date(thread.targetDate).toLocaleDateString(undefined,{ weekday:'short' })} · ${new Date(thread.targetDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`
                    : `📅 ${formatDate(thread.targetDate)} · All-day`}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* Move buttons when moveMode is active */}
        {moveMode && (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => moveBy(level, currentPath, 'up')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▲</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => moveBy(level, currentPath, 'down')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▼</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => moveToTop(level, currentPath)} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤒</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => moveToBottom(level, currentPath)} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤓</Text></TouchableOpacity>
          </View>
        )}
      </View>
      {/* Nested steps */}
      {isOpen && (
        <StepsList
          steps={thread.steps || []}
          level={level}
          path={currentPath}
          depth={1}
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
        />
      )}
    </View>
  );
}
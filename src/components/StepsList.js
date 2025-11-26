// StepsList.js
// Recursively renders a list of steps and their substeps.  Each row is
// swipeable to complete or promote, can be collapsed/expanded, and shows
// move arrows when move mode is enabled.  Extracted from the original
// TaskApp to separate presentational logic from state management.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Checkbox } from 'react-native-paper';
import MoveArrows from './MoveArrows';
import styles from '../styles';
import { formatDate } from '../utils/dateUtils';

/**
 * StepsList recursively renders steps and substeps for a given thread.  It
 * relies on callbacks from its parent to mutate state (e.g. toggling
 * completion, collapsing, promotion) so that it remains stateless.
 *
 * Props:
 * - steps: array of step objects
 * - level: string (baseline/execution/creative)
 * - path: array (default []) representing the current location in the tree
 * - depth: number (default 1) controlling indentation
 * - collapsedSteps: object keyed by path string -> boolean
 * - setCollapsedSteps: function to update collapsedSteps
 * - toggleCheckbox: function(level, path) toggles completion
 * - openMenu: function(event, level, path) shows context menu
 * - setTargetPath: function(path) records where to add a subtask
 * - setTargetLevel: function(level) records which level to add under
 * - promoteToThread: function(level, path) promotes a nested step to a top thread
 * - moveMode: boolean controlling whether move arrows show
 * - canMoveUp/canMoveDown/moveBy: functions for reordering
 */
export default function StepsList({
  steps,
  level,
  path = [],
  depth = 1,
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
}) {
  // Render a single row with swipe actions and nested arrows
  const StepRow = ({ step, currentPath, depth }) => {
    const isNested = currentPath.length > 1;
    // Swipeable renderers
    const renderLeft = () => (
      <View style={styles.swipeLeft}><Text style={styles.swipeLeftText}>{isNested ? 'Promote' : ''}</Text></View>
    );
    const renderRight = () => (
      <View style={styles.swipeRight}><Text style={styles.swipeRightText}>{step.completed ? 'Uncomplete' : 'Complete'}</Text></View>
    );
    const onSwipeLeft = () => { if (isNested) promoteToThread(level, currentPath); };
    const onSwipeRight = () => toggleCheckbox(level, currentPath);

    return (
      <Swipeable
        renderLeftActions={isNested ? renderLeft : undefined}
        renderRightActions={renderRight}
        onSwipeableLeftOpen={onSwipeLeft}
        onSwipeableRightOpen={onSwipeRight}
      >
        <View style={[styles.stepBlock, { marginLeft: depth * 10 }]}> 
          <View style={styles.stepRow}>
            {/* Disclosure chevron to collapse/expand */}
            <TouchableOpacity
              onPress={() => step.steps?.length && setCollapsedSteps((prev) => ({ ...prev, [currentPath.join('-')]: !prev[currentPath.join('-')] }))}
              style={styles.disclosureBtn}
            >
              <Text style={styles.disclosureText}>
                {step.steps?.length
                  ? (collapsedSteps[currentPath.join('-')] ? '▶' : '▼')
                  : '–'}
              </Text>
            </TouchableOpacity>
            {/* Main touch area: select item, open menu on long press */}
            <TouchableOpacity
              onPress={() => { setTargetPath(currentPath); setTargetLevel(level); }}
              onLongPress={(e) => openMenu(e, level, currentPath)}
              delayLongPress={250}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Checkbox
                  status={step.completed ? 'checked' : 'unchecked'}
                  onPress={() => toggleCheckbox(level, currentPath)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepText}>{step.text}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={styles.timestamp}>created {formatDate(step.timestamp)}</Text>
                    {!!step.targetDate && (
                      <View style={styles.dateChip}>
                        <Text style={styles.dateChipText}>
                          {(!step.allDay && (new Date(step.targetDate).getHours() !== 0 || new Date(step.targetDate).getMinutes() !== 0))
                            ? `🕒 ${new Date(step.targetDate).toLocaleDateString(undefined,{ weekday:'short' })} · ${new Date(step.targetDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`
                            : `📅 ${formatDate(step.targetDate)} · All-day`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            {/* Move arrows */}
            <MoveArrows
              moveMode={moveMode}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              moveBy={moveBy}
              level={level}
              path={currentPath}
            />
            {/* More menu trigger */}
            <TouchableOpacity
              onLongPress={(e) => openMenu(e, level, currentPath)}
              delayLongPress={250}
              style={{ padding: 6, marginLeft: 4 }}
            >
              <Text style={{ fontSize: 16 }}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    );
  };

  // Recursive renderer for nested steps
  const renderSteps = (stepsArr, basePath = [], depthLevel = depth) => {
    return stepsArr.map((s, idx) => {
      const currentPath = [...basePath, idx];
      const id = currentPath.join('-');
      const isCollapsed = !!collapsedSteps[id];
      return (
        <View key={id}>
          <StepRow step={s} currentPath={currentPath} depth={depthLevel} />
          {!isCollapsed && s.steps?.length > 0 && renderSteps(s.steps, currentPath, depthLevel + 1)}
        </View>
      );
    });
  };

  return <>{renderSteps(steps, path, depth)}</>;
}
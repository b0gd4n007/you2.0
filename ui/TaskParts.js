// ui/TaskParts.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { styles } from '../styles';

// ── Arrows ──────────────────────────────────────────────────────────────
export function MoveArrows({ moveMode, canMoveUp, canMoveDown, moveBy, level, path }) {
  if (!moveMode) return null;
  const upDisabled = !canMoveUp(level, path);
  const downDisabled = !canMoveDown(level, path);

  return (
    <View style={styles.moveBtns}>
      <TouchableOpacity
        disabled={upDisabled}
        onPress={() => moveBy(level, path, 'up')}
        style={[styles.moveBtn, upDisabled && styles.moveBtnDisabled]}
      >
        <Text style={styles.moveBtnText}>▲</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={downDisabled}
        onPress={() => moveBy(level, path, 'down')}
        style={[styles.moveBtn, downDisabled && styles.moveBtnDisabled]}
      >
        <Text style={styles.moveBtnText}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Recursive steps ─────────────────────────────────────────────────────
export function RenderSteps({
  steps,
  level,
  path = [],
  depth = 1,
  collapsedSteps,
  toggleCollapsed,
  setTargetPath,
  setTargetLevel,
  toggleCheckbox,
  formatTime,
  moveMode,
  canMoveUp,
  canMoveDown,
  moveBy,
  openMenu
}) {
  return steps.map((step, idx) => {
    const currentPath = [...path, idx];
    const id = currentPath.join('-');
    const isCollapsed = !!collapsedSteps[id];

    return (
      <View key={id} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
        <View style={styles.stepRow}>
          <TouchableOpacity
            onPress={() => step.steps?.length && toggleCollapsed(id)}
            style={styles.disclosureBtn}
          >
            <Text style={styles.disclosureText}>
              {step.steps?.length ? (isCollapsed ? '▶' : '▼') : '–'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setTargetPath(currentPath); setTargetLevel(level); }}
            style={{ flex: 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Checkbox
                status={step.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleCheckbox(level, currentPath)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{step.text}</Text>
                <Text style={styles.timestamp}>{formatTime(step.timestamp)}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <MoveArrows
            moveMode={moveMode}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            moveBy={moveBy}
            level={level}
            path={currentPath}
          />

          <TouchableOpacity
            onLongPress={(e) => openMenu(e, level, currentPath)}
            style={{ padding: 6, marginLeft: 4 }}
          >
            <Text style={{ fontSize: 16 }}>⋮</Text>
          </TouchableOpacity>
        </View>

        {!isCollapsed && step.steps?.length > 0 && (
          <RenderSteps
            steps={step.steps}
            level={level}
            path={currentPath}
            depth={depth + 1}
            collapsedSteps={collapsedSteps}
            toggleCollapsed={toggleCollapsed}
            setTargetPath={setTargetPath}
            setTargetLevel={setTargetLevel}
            toggleCheckbox={toggleCheckbox}
            formatTime={formatTime}
            moveMode={moveMode}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            moveBy={moveBy}
            openMenu={openMenu}
          />
        )}
      </View>
    );
  });
}

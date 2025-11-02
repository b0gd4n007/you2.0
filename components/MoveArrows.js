import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles';

export default function MoveArrows({ moveMode, canMoveUp, canMoveDown, moveBy, level, path }) {
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

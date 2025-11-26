import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * A single row representing a step within a thread.  Includes a
 * custom checkbox, the step text, and an icon to promote the step to
 * its own thread.  Pressing the checkbox toggles completion.
 *
 * Props:
 *  - step: the Step object to render
 *  - onToggle: callback to toggle the done state
 *  - onElevate: callback to elevate the step to a new thread
 */
export default function StepRow({ step, onToggle, onElevate }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onToggle}
        style={[styles.checkbox, step.done ? styles.checkboxOn : null]}
      />
      <Text style={[styles.text, step.done ? styles.done : null]}>{step.title}</Text>
      <TouchableOpacity onPress={onElevate} style={styles.lift}>
        <Text style={styles.liftText}>↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#88A2B8',
    marginRight: 10,
  },
  checkboxOn: {
    backgroundColor: '#1A88FF',
    borderColor: '#1A88FF',
  },
  text: {
    color: '#DCE9F7',
    flex: 1,
    fontSize: 15,
  },
  done: {
    textDecorationLine: 'line-through',
    color: '#7C95AB',
  },
  lift: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3A4C',
  },
  liftText: {
    color: '#9AB0C3',
    fontWeight: '700',
  },
});
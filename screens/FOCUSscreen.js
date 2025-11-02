// screens/FocusScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { styles } from '../styles';

export default function FocusScreen({ route }) {
  const { index, all, threads, update, removeFocus } = route.params;
  const [currentIndex, setCurrentIndex] = useState(index);
  const [newStep, setNewStep] = useState('');

  const getTarget = () => {
    const { level, path } = all[currentIndex];
    let node = threads[level];
    for (let i = 0; i < path.length; i++) {
      node = node[path[i]]?.steps ?? node[path[i]];
    }
    return node;
  };

  const addStep = () => {
    const { level, path } = all[currentIndex];
    const updated = JSON.parse(JSON.stringify(threads));
    let node = updated[level];
    for (let i = 0; i < path.length; i++) {
      node = node[path[i]]?.steps ?? node[path[i]];
    }
    node.steps = node.steps || [];
    const t = newStep.trim();
    if (!t) return;
    node.steps.unshift({ text: t, completed: false, timestamp: Date.now(), steps: [] }); // PREPEND
    update(updated);
    setNewStep('');
  };

  const toggle = (stepPath) => {
    const { level, path } = all[currentIndex];
    const updated = JSON.parse(JSON.stringify(threads));
    let node = updated[level];
    const full = [...path, ...stepPath];
    for (let i = 0; i < full.length - 1; i++) {
      node = node[full[i]].steps;
    }
    node[full.at(-1)].completed = !node[full.at(-1)].completed;
    update(updated);
  };

  const render = (steps, base = []) =>
    steps.map((s, idx) => {
      const full = [...base, idx];
      return (
        <View key={idx} style={[styles.stepBlock, { marginLeft: full.length * 10 }]}>
          <View style={styles.stepRow}>
            <Checkbox status={s.completed ? 'checked' : 'unchecked'} onPress={() => toggle(full)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepText}>{s.text}</Text>
              <Text style={styles.timestamp}>
                {new Date(s.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          {s.steps?.length > 0 && render(s.steps, full)}
        </View>
      );
    });

  const target = getTarget();

  return (
    <ScrollView contentContainerStyle={styles.focusContainer}>
      <Text style={styles.focusTitle}>🎯 Focus</Text>
      <Text style={styles.threadTitle}>{target.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(target.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
      {target.steps?.length > 0 && render(target.steps)}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={newStep}
          onChangeText={setNewStep}
          placeholder="Add subtask..."
          onSubmitEditing={addStep}
        />
        <TouchableOpacity onPress={addStep} style={styles.sendButton}>
          <Text style={styles.sendText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
        <TouchableOpacity onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
          <Text>⬅️ Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFocus(currentIndex)}>
          <Text>🗑 Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentIndex((i) => Math.min(all.length - 1, i + 1))}>
          <Text>Next ➡️</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
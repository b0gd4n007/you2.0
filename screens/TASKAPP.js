import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { styles } from '../styles';
import { askAIToEdit } from '../AiBar';

export default function TaskApp() {
  const [threads, setThreads] = useState({
    baseline: [],
    execution: [],
    creative: [],
  });

  const [collapsedSteps, setCollapsedSteps] = useState({});
  const [expandedThreads, setExpandedThreads] = useState({});
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const [inputText, setInputText] = useState('');
  const [expandedLevel, setExpandedLevel] = useState('baseline');


  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('you2_threads');
      if (stored) setThreads(JSON.parse(stored));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
  }, [threads]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return isNaN(d)
      ? ''
      : `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
  };

  const toggleCollapsed = (id) => {
    setCollapsedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleCheckbox = (level, path) => {
    const updated = { ...threads };
    let node = updated[level];
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
    node[path.at(-1)].completed = !node[path.at(-1)].completed;
    setThreads(updated);
  };

  const openMenu = (e, level, path) => {
    const { pageX: x, pageY: y } = e.nativeEvent;
    setSelectedItemPath(path);
    setSelectedLevel(level);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  const handleSend = () => {
  if (!inputText.trim() || !expandedLevel) return;
  
  const updated = { ...threads };
  const threadIndex = threads[expandedLevel].findIndex((_, i) => expandedThreads[i]);
  const newItem = { 
    text: inputText.trim(), 
    timestamp: Date.now(), 
    completed: false, 
    steps: [] 
  };

  if (threadIndex !== -1) {
    updated[expandedLevel][threadIndex].steps.push(newItem);
  } else {
    updated[expandedLevel].push(newItem);
  }

  setThreads(updated);
  setInputText('');
};


  async function handleAIApply() {
    if (!aiText.trim() || aiBusy) return;
    setAiBusy(true);
    try {
      const instr = await askAIToEdit({ threads, instruction: aiText.trim() });
      applyEditInstruction(instr);
      setAiText('');
    } catch (e) {
      console.log('AI error', e);
    }
    setAiBusy(false);
  }

  function applyEditInstruction(instr) {
    if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path))
      return;

    const updated = JSON.parse(JSON.stringify(threads));
    const level = instr.level || targetLevel || expandedLevel || 'baseline';
    const path = instr.path;

    function getParentRefLocal(arr, p) {
      if (p.length === 1) return { arr, index: p[0] };
      let node = arr[p[0]];
      for (let i = 1; i < p.length - 1; i++) node = node.steps[p[i]];
      return { arr: node.steps, index: p[p.length - 1] };
    }

    if (instr.action === 'delete') {
      const ref = getParentRefLocal(updated[level], path);
      if (ref) ref.arr.splice(ref.index, 1);
    }

    if (instr.action === 'add') {
      const ref = getParentRefLocal(updated[level], path);
      ref.arr.push({
        text: instr.text || 'New Task',
        timestamp: Date.now(),
        completed: false,
        steps: [],
      });
    }

    setThreads(updated);
  }

  function MoveArrows({ level, path }) {
    const arr = (() => {
      let node = threads[level];
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
      return node;
    })();

    const idx = path.at(-1);
    const upDisabled = idx === 0;
    const downDisabled = idx === arr.length - 1;

    const move = (dir) => {
      const updated = JSON.parse(JSON.stringify(threads));
      let node = updated[level];
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      [node[idx], node[swapIdx]] = [node[swapIdx], node[idx]];
      setThreads(updated);
    };

    return (
      <View style={styles.moveContainer}>
        <TouchableOpacity disabled={upDisabled} onPress={() => move('up')}>
          <Text style={[styles.moveBtnText, upDisabled && styles.disabledMove]}>
            ↑
          </Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={downDisabled} onPress={() => move('down')}>
          <Text
            style={[styles.moveBtnText, downDisabled && styles.disabledMove]}
          >
            ↓
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const RenderSteps = ({ steps, level, path = [], depth = 1 }) =>
    steps.map((step, idx) => {
      const currentPath = [...path, idx];
      const id = currentPath.join('-');
      const isCollapsed = !!collapsedSteps[id];

      return (
        <View key={id} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
          <View style={styles.stepRow}>
            <TouchableOpacity
              onPress={() => step.steps?.length && toggleCollapsed(id)}
            >
              <Text style={{ width: 18 }}>
                {step.steps?.length ? (isCollapsed ? '▶' : '▼') : '•'}
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onLongPress={(e) => openMenu(e, level, currentPath)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    value={step.completed}
                    onValueChange={() => toggleCheckbox(level, currentPath)}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.stepText,
                        depth === 1 && styles.sectionTitle,
                      ]}
                    >
                      {step.text}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatTime(step.timestamp)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <MoveArrows level={level} path={currentPath} />
          </View>

          {!isCollapsed && step.steps?.length > 0 && (
            <RenderSteps
              steps={step.steps}
              level={level}
              path={currentPath}
              depth={depth + 1}
            />
          )}
        </View>
      );
    });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={{ marginBottom: 14 }}>
            {threads[level].map((root, index) => (
              <RenderSteps
                key={index}
                steps={[root]}
                level={level}
                path={[index]}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.aiBar}>
        <TextInput
          style={styles.aiInput}
          value={aiText}
          onChangeText={setAiText}
          placeholder="AI edit: 'add fix heater'"
        />
        <TouchableOpacity
          style={styles.aiButton}
          onPress={handleAIApply}
          disabled={aiBusy}
        >
          <Text style={styles.aiButtonText}>{aiBusy ? '...' : 'AI'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Add item..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>+</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

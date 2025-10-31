// App.js
import React, { useState, useEffect } from 'react';

import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider, Checkbox, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { askAIToEdit } from './AImagic';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={TaskApp} />
              <Stack.Screen name="Focus" component={FocusScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

function TaskApp({ navigation }) {
  const [editVisible, setEditVisible] = useState(false);
  const [editText, setEditText] = useState('');
  const [inputText, setInputText] = useState('');
  const [expandedLevel, setExpandedLevel] = useState(null); // 'baseline' | 'execution' | 'creative'
  const [expandedThreads, setExpandedThreads] = useState({}); // index:boolean
  const [collapsedSteps, setCollapsedSteps] = useState({}); // "0-2-1":boolean
  const [threads, setThreads] = useState({
    baseline: [],
    execution: [],
    creative: [],
  });

  const [menuVisible, setMenuVisible] = useState(false);
  const [overlayMenuVisible, setOverlayMenuVisible] = useState(false);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [baselineLevel, setBaselineLevel] = useState('Medium');
  const [focusedItems, setFocusedItems] = useState([]);

  // targeting for where to add new substeps
  const [targetPath, setTargetPath] = useState(null); // [threadIdx, stepIdx,...]
  const [targetLevel, setTargetLevel] = useState(null); // 'baseline' | 'execution' | 'creative'

  // move mode for reordering arrows
  const [moveMode, setMoveMode] = useState(false);

  // AI state
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  function openEditFor(level, path) {
  try {
    const node = getNodeRef(threads, level, path);
    if (!node) return;
    setSelectedLevel(level);
    setSelectedItemPath(path);
    setEditText(node.text || '');
    setEditVisible(true);
  } catch (e) {
    console.log('openEditFor failed:', e);
  }
}

function saveEdit() {
  const t = editText.trim();
  if (!t || !selectedLevel || !selectedItemPath) {
    setEditVisible(false);
    return;
  }
  const updated = JSON.parse(JSON.stringify(threads));
  try {
    const node = getNodeRef(updated, selectedLevel, selectedItemPath);
    if (node) node.text = t;
    setThreads(updated);
  } catch (e) {
    console.log('saveEdit failed:', e);
  }
  setEditVisible(false);
}

  // ---------- boot: load state from AsyncStorage ----------
  useEffect(() => {
    const load = async () => {
      const [stored, storedFocus, ui] = await Promise.all([
        AsyncStorage.getItem('you2_threads'),
        AsyncStorage.getItem('you2_focus'),
        AsyncStorage.getItem('you2_ui'),
      ]);

      if (stored) setThreads(JSON.parse(stored));
      if (storedFocus) setFocusedItems(JSON.parse(storedFocus));
      if (ui) {
        const { expandedThreads: et, collapsedSteps: cs } = JSON.parse(ui);
        if (et) setExpandedThreads(et);
        if (cs) setCollapsedSteps(cs);
      }
    };
    load();
  }, []);

  // persist data
  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem('you2_focus', JSON.stringify(focusedItems));
  }, [focusedItems]);

  // persist UI state (expanded/collapsed map)
  useEffect(() => {
    AsyncStorage.setItem(
      'you2_ui',
      JSON.stringify({
        expandedThreads,
        collapsedSteps,
      }),
    );
  }, [expandedThreads, collapsedSteps]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return isNaN(d)
      ? ''
      : `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
  };

  // ---------- helpers ----------
  const getNodeRef = (obj, level, path) => {
    let node = obj[level];
    for (let i = 0; i < path.length; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    return node;
  };

  const getParentRef = (obj, level, path) => {
    if (!path || path.length === 0) return null;
    if (path.length === 1) return { arr: obj[level], index: path[0] };

    let node = obj[level];
    for (let i = 0; i < path.length - 1; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    return { arr: node.steps, index: path[path.length - 1] };
  };

  const canMoveUp = (level, path) => {
    const p = getParentRef(threads, level, path);
    if (!p) return false;
    return p.index > 0;
  };

  const canMoveDown = (level, path) => {
    const p = getParentRef(threads, level, path);
    if (!p) return false;
    return p.index < p.arr.length - 1;
  };

  const moveBy = (level, path, direction) => {
    const updated = { ...threads };
    const p = getParentRef(updated, level, path);
    if (!p) return;

    const { arr, index } = p;
    const delta = direction === 'up' ? -1 : 1;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= arr.length) return;

    const [item] = arr.splice(index, 1);
    arr.splice(newIndex, 0, item);

    // if we were targeting this exact node for adding substeps, update the pointer
    if (
      targetPath &&
      targetLevel === level &&
      targetPath.length === path.length &&
      targetPath.slice(0, -1).every((v, i) => v === path[i])
    ) {
      const t = [...targetPath];
      if (t[t.length - 1] === index) t[t.length - 1] = newIndex;
      setTargetPath(t);
    }

    setThreads(updated);
  };

  const toggleCollapsed = (id) => {
    setCollapsedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ---------- actions ----------
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !expandedLevel) return;

    const updated = { ...threads };
    const newItem = {
      text,
      timestamp: Date.now(),
      completed: false,
      steps: [],
    };

    if (targetPath && targetLevel === expandedLevel) {
      // we're adding under a specific subnode
      const parent = getNodeRef(updated, expandedLevel, targetPath);
      parent.steps = parent.steps || [];
      parent.steps.push(newItem);
    } else {
      // add to current thread or create a new thread
      const threadIndex = threads[expandedLevel].findIndex(
        (_, i) => expandedThreads[i],
      );
      if (threadIndex !== -1) {
        updated[expandedLevel][threadIndex].steps.push(newItem);
      } else {
        updated[expandedLevel].push(newItem);
      }
    }

    setThreads(updated);
    setInputText('');
    setTargetPath(null);
    setTargetLevel(null);
  };

  const toggleCheckbox = (level, path) => {
  // Make a deep clone of threads so we can safely mutate
  const updated = JSON.parse(JSON.stringify(threads));

  // Sanity: does this level exist at all?
  if (!updated[level]) {
    console.log('toggleCheckbox: invalid level', level);
    return;
  }

  // Case 1: path length === 1
  // We're toggling a top-level thread in baseline/execution/creative
  if (path.length === 1) {
    const idx = path[0];

    if (!updated[level][idx]) {
      console.log('toggleCheckbox: no top-level item at index', idx, 'in', level);
      return;
    }

    // flip completed
    updated[level][idx].completed = !updated[level][idx].completed;

    setThreads(updated);
    return;
  }

  // Case 2: nested item (subtask or sub-subtask etc)
  // We need to walk down through .steps arrays

  // We'll walk every part of the path EXCEPT the last one,
  // so we land on the parent array that actually holds the final node.
  // Example:
  // path [2,0,1]
  //  - 2      -> threads[level][2]
  //  - 0      -> .steps[0]
  // Final target is index 1 in that .steps array.

  let cursorArray = updated[level]; // at first this is the array of threads
  let parentArray = null;
  let finalIndex = path[path.length - 1];

  // We'll track down the chain:
  for (let depth = 0; depth < path.length - 1; depth++) {
    const idxAtDepth = path[depth];

    // cursorArray should be an array at this point
    if (!cursorArray || !cursorArray[idxAtDepth]) {
      console.log('toggleCheckbox: missing node at depth', depth, 'index', idxAtDepth);
      return;
    }

    const node = cursorArray[idxAtDepth];

    // If this is the last hop before finalIndex,
    // that means node.steps should be the array holding the final target.
    if (depth === path.length - 2) {
      // The parent array that contains the target item
      parentArray = node.steps;
      break;
    }

    // otherwise, go deeper
    if (!node.steps || !Array.isArray(node.steps)) {
      console.log('toggleCheckbox: node at depth', depth, 'has no steps array');
      return;
    }

    cursorArray = node.steps;
  }

  if (!parentArray || !parentArray[finalIndex]) {
    console.log('toggleCheckbox: final target missing at index', finalIndex);
    return;
  }

  parentArray[finalIndex].completed = !parentArray[finalIndex].completed;

  setThreads(updated);
};


  const toggleLevel = (level) => {
    setExpandedLevel((prev) => (prev === level ? null : level));
    setTargetPath(null);
    setTargetLevel(null);
  };

  const toggleThread = (index) => {
    setExpandedThreads((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const openMenu = (event, level, path) => {
    const { pageX: x, pageY: y } = event.nativeEvent;
    setSelectedItemPath(path);
    setSelectedLevel(level);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  const focusItem = (level, path) => {
    const deepCopy = JSON.parse(JSON.stringify(threads));
    let node = deepCopy[level];
    for (let i = 0; i < path.length; i++) {
      node = node[path[i]]?.steps ?? node[path[i]];
    }
    const target = node;
    const newFocus = {
      level,
      path,
      text: target.text,
      timestamp: target.timestamp,
    };
    setFocusedItems((prev) => [...prev, newFocus]);
    navigation.navigate('Focus', {
      index: focusedItems.length,
      all: [...focusedItems, newFocus],
      threads,
      update: setThreads,
      removeFocus: (i) =>
        setFocusedItems((prev) => prev.filter((_, j) => j !== i)),
    });
  };

  const deleteItem = () => {
    if (!selectedItemPath) return;
    const updated = { ...threads };
    const parent = getParentRef(updated, selectedLevel, selectedItemPath);
    if (!parent) return;

    const { arr, index } = parent;
    arr.splice(index, 1);
    setThreads(updated);
    setMenuVisible(false);

    // if we were targeting under something that got deleted, clear it
    if (
      targetPath &&
      targetLevel === selectedLevel &&
      targetPath.join('-').startsWith(selectedItemPath.join('-'))
    ) {
      setTargetPath(null);
      setTargetLevel(null);
    }
  };

  // ---------- AI integration ----------
  function applyEditInstruction(instr) {
  if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path)) return;

  const updated = JSON.parse(JSON.stringify(threads));
  const { level, path } = instr;

  // Walk to node
  let node = updated[level][path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!node.steps) return;
    node = node.steps[path[i]];
  }

  if (!node) return;

  switch (instr.action) {
    case 'edit':
      if (instr.text) node.text = instr.text;
      break;
    case 'delete':
      const parent = path.length === 1
        ? updated[level]
        : path.slice(0, -1).reduce((acc, idx) => acc[idx].steps, updated[level]);

      parent.splice(path.at(-1), 1);
      break;
    case 'complete':
      node.completed = true;
      break;
    case 'add':
      node.steps = node.steps || [];
      node.steps.push({
        text: instr.text || 'New Task',
        timestamp: Date.now(),
        completed: false,
        steps: []
      });
      break;
    default:
      return;
  }

  setThreads(updated);
}


function applyEditInstructionToThreads(instr, threads) {
  if (
    !instr ||
    !instr.action ||
    !instr.level ||
    !Array.isArray(instr.path)
  ) {
    console.log('Bad instruction from AI:', instr);
    return threads; // no change
  }

  const updated = JSON.parse(JSON.stringify(threads));
  const { level, path, mode } = instr;

  function getNodeAtPath(levelArr, fullPath) {
    if (!levelArr) return null;
    if (!fullPath || fullPath.length === 0) return null;
    let node = levelArr[fullPath[0]];
    if (!node) return null;
    for (let i = 1; i < fullPath.length; i++) {
      if (!node.steps || !node.steps[fullPath[i]]) return null;
      node = node.steps[fullPath[i]];
    }
    return node;
  }

  function getParentRefLocal(levelArr, fullPath) {
    if (!fullPath || fullPath.length === 0) return null;
    if (fullPath.length === 1) {
      return { arr: levelArr, index: fullPath[0] };
    }
    let node = levelArr[fullPath[0]];
    if (!node) return null;
    for (let i = 1; i < fullPath.length - 1; i++) {
      if (!node.steps || !node.steps[fullPath[i]]) {
        return null;
      }
      node = node.steps[fullPath[i]];
    }
    if (!node.steps) return null;
    return {
      arr: node.steps,
      index: fullPath[fullPath.length - 1],
    };
  }

  // DELETE
  if (instr.action === 'delete') {
    const parentRef = getParentRefLocal(updated[level], path);
    if (
      parentRef &&
      parentRef.arr &&
      parentRef.index >= 0 &&
      parentRef.index < parentRef.arr.length
    ) {
      parentRef.arr.splice(parentRef.index, 1);
    } else {
      console.log('AI delete path invalid, ignoring:', path);
    }
    return updated;
  }

  // COMPLETE
  if (instr.action === 'complete') {
    const node = getNodeAtPath(updated[level], path);
    if (node) {
      node.completed = true;
    } else {
      console.log('AI complete path invalid, ignoring:', path);
    }
    return updated;
  }

  // EDIT (rename text)
  if (instr.action === 'edit') {
    if (typeof instr.text !== 'string' || !instr.text.trim()) {
      console.log('AI edit missing new text');
      return updated;
    }
    const node = getNodeAtPath(updated[level], path);
    if (node) {
      node.text = instr.text.trim();
    } else {
      console.log('AI edit path invalid, ignoring:', path);
    }
    return updated;
  }

  // ADD
  if (instr.action === 'add') {
    const newNode = {
      text: instr.text || 'New Task',
      timestamp: Date.now(),
      completed: false,
      steps: [],
    };

    // Case: add as a new thread at this level
    if (mode === 'thread') {
      if (!updated[level]) {
        console.log('AI add invalid level for thread:', level);
      } else {
        updated[level].push(newNode);
      }
      return updated;
    }

    // Case: add as a child under an existing node
    if (!updated[level]) {
      console.log('AI add invalid level for child:', level);
      return updated;
    }

    let parentNode = updated[level][path[0]];
    if (!parentNode) {
      console.log('AI add invalid root index:', path[0], 'in level', level);
      return updated;
    }

    for (let i = 1; i < path.length; i++) {
      parentNode.steps = parentNode.steps || [];
      if (!parentNode.steps[path[i]]) {
        console.log(
          'AI add invalid sub-index:',
          path[i],
          'at depth',
          i,
          'for path',
          path
        );
        return updated;
      }
      parentNode = parentNode.steps[path[i]];
    }

    parentNode.steps = parentNode.steps || [];
    parentNode.steps.push(newNode);

    return updated;
  }

  // NONE / UNKNOWN
  if (instr.action === 'none') {
    // "none" means ignore / no change
    return updated;
  }

  console.log('Unknown instr.action from AI:', instr.action);
  return updated;
}


  async function handleAIApply() {
  if (!aiText.trim() || aiBusy) return;
  setAiBusy(true);

  try {
    const instrList = await askAIToEdit({
      threads,
      instruction: aiText.trim(),
    });

    console.log('AI returned normalized list:', instrList);

    if (!Array.isArray(instrList) || instrList.length === 0) {
      setAiText('');
      setAiBusy(false);
      return;
    }

    let nextThreads = threads;

    for (const instr of instrList) {
      if (!instr || instr.action === 'none') continue;
      nextThreads = applyEditInstructionToThreads(instr, nextThreads);
    }

    setThreads(nextThreads);
    setAiText('');
  } catch (err) {
    console.log('AI error:', err);
  } finally {
    setAiBusy(false);
  }
}



  // ---------- UI subcomponents ----------
  const MoveArrows = ({ level, path }) => {
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
  };

  const RenderSteps = ({ steps, level, path = [], depth = 1 }) =>
  steps.map((step, idx) => {
    const currentPath = [...path, idx];
    const id = currentPath.join('-');
    const isCollapsed = !!collapsedSteps[id];

    return (
      <View
        key={id}
        style={[styles.stepBlock, { marginLeft: depth * 10 }]}
      >
        <View style={styles.stepRow}>
          {/* collapse/expand caret */}
          <TouchableOpacity
            onPress={() => step.steps?.length && toggleCollapsed(id)}
            style={styles.disclosureBtn}
          >
            <Text style={styles.disclosureText}>
              {step.steps?.length ? (isCollapsed ? '▶' : '▼') : '–'}
            </Text>
          </TouchableOpacity>

          {/* select target for adding */}
          <TouchableOpacity
            onPress={() => {
              setTargetPath(currentPath);
              setTargetLevel(level);
            }}
            style={{ flex: 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Checkbox
                status={step.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleCheckbox(level, currentPath)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{step.text}</Text>
                <Text style={styles.timestamp}>
                  {formatTime(step.timestamp)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* reorder arrows */}
          <MoveArrows level={level} path={currentPath} />

          {/* context menu */}
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
          />
        )}
      </View>
    );
  });


  // ---------- render ----------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => setOverlayMenuVisible(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>



        {/* Move mode toggle */}
        <TouchableOpacity
          onPress={() => setMoveMode((m) => !m)}
          style={[styles.moveToggle, moveMode && styles.moveToggleOn]}
        >
          <Text
            style={[
              styles.moveToggleText,
              moveMode && styles.moveToggleTextOn,
            ]}
          >
            {moveMode ? 'Move: ON' : 'Move: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* popup menu */}
<Menu
  visible={menuVisible}
  onDismiss={() => setMenuVisible(false)}
  anchor={{ x: menuPosition.x, y: menuPosition.y }}
>
  <Menu.Item
    title="➕ Add subtask here"
    onPress={() => {
      setTargetPath(selectedItemPath);
      setTargetLevel(selectedLevel);
      setMenuVisible(false);
    }}
  />

  {/* ✏️ NEW EDIT BUTTON */}
  <Menu.Item
    title="✏️ Edit"
    onPress={() => {
      setMenuVisible(false);
      openEditFor(selectedLevel, selectedItemPath);
    }}
  />

  <Menu.Item title="🗑 Delete" onPress={deleteItem} />
  <Menu.Item
    title="🎯 Focus"
    onPress={() => {
      setMenuVisible(false);
      focusItem(selectedLevel, selectedItemPath);
    }}
  />
  <Menu.Item
    title="🗂 Archive (todo)"
    onPress={() => setMenuVisible(false)}
  />
</Menu>


      {/* target banner */}
      {targetPath && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: '#666' }}>
              Adding subtask under: {targetLevel} /{' '}
              {targetPath.join(' › ')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTargetPath(null);
                setTargetLevel(null);
              }}
            >
              <Text style={{ fontSize: 16, color: '#c33' }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* main list (flat, no section headers) */}
<ScrollView
  contentContainerStyle={styles.scroll}
  keyboardShouldPersistTaps="handled"
>
  {['baseline', 'execution', 'creative'].flatMap((level) =>
    threads[level].map((thread, index) => {
      const key = `${level}-${index}`;
      const isOpen = !!expandedThreads[key];

      return (
        <View key={key} style={styles.threadBlock}>
          <View style={[styles.threadHeader, { alignItems: 'center' }]}>
            {/* expand/collapse this thread */}
            <TouchableOpacity
              onPress={() =>
                setExpandedThreads((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            >
              <Text style={styles.plusButton}>{isOpen ? '-' : '+'}</Text>
            </TouchableOpacity>

            {/* title + long-press menu */}
            <TouchableOpacity
              onPress={() => {
                setTargetPath([index]);
                setTargetLevel(level);
              }}
              onLongPress={(e) => openMenu(e, level, [index])}
              style={{ flex: 1 }}
            >
              <Text style={styles.threadTitle}>• {thread.text}</Text>
              <Text style={styles.timestamp}>{formatTime(thread.timestamp)}</Text>
            </TouchableOpacity>

            {/* reorder arrows on thread root */}
            <MoveArrows level={level} path={[index]} />
          </View>

          {isOpen && (
            <RenderSteps steps={thread.steps} level={level} path={[index]} />
          )}
        </View>
      );
    })
  )}
</ScrollView>


      {/* AI bar */}
      <View style={styles.aiBar}>
        <TextInput
          style={styles.aiInput}
          value={aiText}
          onChangeText={setAiText}
          placeholder={
            aiBusy
              ? 'Working...'
              : "AI: e.g. 'add fix heater under baseline'"
          }
          editable={!aiBusy}
          onSubmitEditing={handleAIApply}
        />
        <TouchableOpacity
          style={[
            styles.aiButton,
            aiBusy && { opacity: 0.4 },
          ]}
          disabled={aiBusy}
          onPress={handleAIApply}
        >
          <Text style={styles.aiButtonText}>
            {aiBusy ? '...' : 'AI Apply'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* manual input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          autoCapitalize="sentences"
          onChangeText={setInputText}
          placeholder={
            !expandedLevel
              ? 'Tap a section to begin...'
              : targetPath
              ? 'Add subtask...'
              : Object.values(expandedThreads).includes(true)
              ? 'Add step...'
              : 'Add new thread...'
          }
          editable={!!expandedLevel}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* overlay menu drawer */}
      <Modal
        visible={overlayMenuVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.overlay}>
          <View style={styles.overlayMenu}>
            <Text style={styles.overlayTitle}>Menu</Text>
            <TouchableOpacity>
              <Text style={styles.overlayItem}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.overlayItem}>FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.overlayItem}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOverlayMenuVisible(false)}
            >
              <Text style={styles.overlayItem}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit/Rename Modal */}
<Modal visible={editVisible} transparent animationType="fade">
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <View style={{
      width: '88%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16
    }}>
      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
        Rename item
      </Text>
      <TextInput
        value={editText}
        onChangeText={setEditText}
        placeholder="New text…"
        style={{
          backgroundColor: '#f2f2f2',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 12
        }}
        autoFocus
        onSubmitEditing={saveEdit}
        autoCapitalize="sentences"

      />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
        <TouchableOpacity onPress={() => setEditVisible(false)}>
          <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveEdit}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b5ed7' }}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </KeyboardAvoidingView>
  );
}

// Focus screen
function FocusScreen({ route }) {
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

    node.steps.push({
      text: t,
      completed: false,
      timestamp: Date.now(),
      steps: [],
    });

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
        <View
  key={idx}
  style={[
    styles.stepBlock,
    { marginLeft: full.length * 10 },
  ]}
>

  <Pressable
    style={styles.stepRow}
    onLongPress={(e) => openMenu(e, level, currentPath)}
    delayLongPress={250}
  >
    <Checkbox
      status={s.completed ? 'checked' : 'unchecked'}
      onPress={() => toggle(full)}
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.stepText}>{s.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(s.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  </Pressable>

  {/* nested children */}
  {s.steps?.length > 0 && render(s.steps, full)}

</View>

      );
    });

  const target = getTarget();

  return (
    <ScrollView contentContainerStyle={styles.focusContainer}>
      <Text style={styles.focusTitle}>🎯 Focus</Text>
      <Text style={styles.threadText}>{target.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(target.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
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

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 10,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            setCurrentIndex((i) => Math.max(0, i - 1))
          }
        >
          <Text>⬅️ Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => removeFocus(currentIndex)}
        >
          <Text>🗑 Remove</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setCurrentIndex((i) =>
              Math.min(all.length - 1, i + 1),
            )
          }
        >
          <Text>Next ➡️</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 140 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  menuButton: { padding: 10 },
  menuButtonText: { fontSize: 24 },

  gaugeContainer: { flexDirection: 'row', gap: 6 },
  gaugeBlock: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  gaugeText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

  moveToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#f0f0f0',
  },
  moveToggleOn: { backgroundColor: '#d0ebff', borderColor: '#3b82f6' },
  moveToggleText: { fontWeight: '700', color: '#333' },
  moveToggleTextOn: { color: '#0b5ed7' },

  // Card wrapper for each top-level thread (cleaner look)
  threadBlock: {
    marginTop: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  threadHeader: { flexDirection: 'row', gap: 8 },

  // Bigger title look for threads
  threadTitle: { fontSize: 18, fontWeight: '700', color: '#222' },

  // Child step rows
  stepBlock: {
    marginTop: 8,
    backgroundColor: '#f8f8f8', // was #e0e0e0
    padding: 10,
    borderRadius: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepText: { fontSize: 15 },
  timestamp: { fontSize: 11, color: '#888', marginTop: 2 },

  disclosureBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    minWidth: 18,
  },
  disclosureText: { fontSize: 14, fontWeight: '800' },

  moveBtns: { flexDirection: 'row', gap: 4, marginLeft: 6 },
  moveBtn: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.4 },
  moveBtnText: { fontWeight: '800' },

  aiBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  aiButton: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  aiButtonText: { color: '#fff', fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: 'bold' },

  focusContainer: {
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 80,
  },
  focusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
  },
  overlayMenu: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    width: '100%',
  },
  overlayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  overlayItem: { fontSize: 16, marginBottom: 10 },
});


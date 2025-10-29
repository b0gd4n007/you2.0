// App.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider, Checkbox, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
  const [inputText, setInputText] = useState('');
  const [expandedLevel, setExpandedLevel] = useState(null); // 'baseline' | 'execution' | 'creative'
  const [expandedThreads, setExpandedThreads] = useState({}); // index:boolean
  const [collapsedSteps, setCollapsedSteps] = useState({}); // "pathId":boolean
  const [threads, setThreads] = useState({ baseline: [], execution: [], creative: [] });
  const [menuVisible, setMenuVisible] = useState(false);
  const [overlayMenuVisible, setOverlayMenuVisible] = useState(false);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [baselineLevel, setBaselineLevel] = useState('Medium');
  const [focusedItems, setFocusedItems] = useState([]);

  // targeting to add substeps anywhere
  const [targetPath, setTargetPath] = useState(null);     // e.g. [threadIdx, stepIdx, ...]
  const [targetLevel, setTargetLevel] = useState(null);   // 'baseline' | 'execution' | 'creative'

  // Move mode toggle to show inline arrows
  const [moveMode, setMoveMode] = useState(false);

  // ---------- boot: load data + UI fold state ----------
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

  // NEW: persist UI fold state
  useEffect(() => {
    AsyncStorage.setItem('you2_ui', JSON.stringify({
      expandedThreads,
      collapsedSteps,
    }));
  }, [expandedThreads, collapsedSteps]);

const formatTime = (ts) => {
  const d = new Date(ts);
  return isNaN(d)
    ? ''
    : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
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

  // collapse/expand a step subtree by id
  const toggleCollapsed = (id) => {
    setCollapsedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ---------- actions ----------
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !expandedLevel) return;

    const updated = { ...threads };
    const newItem = { text, timestamp: Date.now(), completed: false, steps: [] };

    if (targetPath && targetLevel === expandedLevel) {
      const parent = getNodeRef(updated, expandedLevel, targetPath);
      parent.steps = parent.steps || [];
      parent.steps.push(newItem);
    } else {
      const threadIndex = threads[expandedLevel].findIndex((_, i) => expandedThreads[i]);
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
    const updated = { ...threads };
    let node = updated[level];
    for (let i = 0; i < path.length - 1; i++) node = i === 0 ? node[path[i]] : node.steps[path[i]];
    node[path.at(-1)].completed = !node[path.at(-1)].completed;
    setThreads(updated);
  };

  const toggleLevel = (level) => {
    setExpandedLevel(prev => (prev === level ? null : level));
    setTargetPath(null);
    setTargetLevel(null);
  };

  const toggleThread = (index) => {
    setExpandedThreads(prev => ({ ...prev, [index]: !prev[index] }));
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
    for (let i = 0; i < path.length; i++) node = node[path[i]]?.steps ?? node[path[i]];
    const target = node;
    const newFocus = { level, path, text: target.text, timestamp: target.timestamp };
    setFocusedItems(prev => [...prev, newFocus]);
    navigation.navigate('Focus', {
      index: focusedItems.length,
      all: [...focusedItems, newFocus],
      threads,
      update: setThreads,
      removeFocus: (i) => setFocusedItems(prev => prev.filter((_, j) => j !== i))
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

    if (targetPath && targetLevel === selectedLevel && targetPath.join('-').startsWith(selectedItemPath.join('-'))) {
      setTargetPath(null);
      setTargetLevel(null);
    }
  };

  // ---------- UI pieces ----------
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
        <View key={id} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
          <View style={styles.stepRow}>
            {/* disclosure for step subtree */}
            <TouchableOpacity
              onPress={() => step.steps?.length && toggleCollapsed(id)}
              style={styles.disclosureBtn}
            >
              <Text style={styles.disclosureText}>
                {step.steps?.length ? (isCollapsed ? '▶' : '▼') : '•'}
              </Text>
            </TouchableOpacity>

            {/* main tap selects target */}
            <TouchableOpacity onPress={() => { setTargetPath(currentPath); setTargetLevel(level); }} style={{ flex: 1 }}>
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

            {/* inline move arrows */}
            <MoveArrows level={level} path={currentPath} />

            {/* long-press menu */}
            <TouchableOpacity
              onLongPress={(e) => openMenu(e, level, currentPath)}
              style={{ padding: 6, marginLeft: 4 }}
            >
              <Text style={{ fontSize: 16 }}>⋮</Text>
            </TouchableOpacity>
          </View>

          {!isCollapsed && step.steps?.length > 0 && (
            <RenderSteps steps={step.steps} level={level} path={currentPath} depth={depth + 1} />
          )}
        </View>
      );
    });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setOverlayMenuVisible(true)} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>

        <View style={styles.gaugeContainer}>
          {['Low', 'Medium', 'High'].map(level => (
            <TouchableOpacity
              key={level}
              onPress={() => setBaselineLevel(level)}
              style={[
                styles.gaugeBlock,
                {
                  backgroundColor:
                    level === 'Low' ? '#f99' :
                    level === 'Medium' ? '#ff9' : '#9f9',
                  opacity: baselineLevel === level ? 1 : 0.4,
                }
              ]}
            >
              <Text style={styles.gaugeText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Move mode toggle */}
        <TouchableOpacity
          onPress={() => setMoveMode(m => !m)}
          style={[styles.moveToggle, moveMode && styles.moveToggleOn]}
        >
          <Text style={[styles.moveToggleText, moveMode && styles.moveToggleTextOn]}>
            {moveMode ? 'Move: ON' : 'Move: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* context menu */}
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
        <Menu.Item title="🗑 Delete" onPress={deleteItem} />
        <Menu.Item
          title="🎯 Focus"
          onPress={() => {
            setMenuVisible(false);
            focusItem(selectedLevel, selectedItemPath);
          }}
        />
        <Menu.Item title="🗂 Archive (todo)" onPress={() => setMenuVisible(false)} />
      </Menu>

      {/* target banner */}
      {targetPath && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Adding subtask under: {targetLevel} / {targetPath.join(' › ')}
            </Text>
            <TouchableOpacity onPress={() => { setTargetPath(null); setTargetLevel(null); }}>
              <Text style={{ fontSize: 16, color: '#c33' }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* main list */}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleLevel(level)}>
              <Text style={styles.title}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
            </TouchableOpacity>

            {expandedLevel === level &&
              threads[level].map((thread, index) => {
                const isOpen = !!expandedThreads[index];
                return (
                  <View key={index} style={styles.threadBlock}>
                    <View style={[styles.threadHeader, { alignItems: 'center' }]}>
                      <TouchableOpacity onPress={() => toggleThread(index)}>
                        <Text style={styles.plusButton}>{isOpen ? '-' : '+'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => { setTargetPath([index]); setTargetLevel(level); }}
                        onLongPress={(e) => openMenu(e, level, [index])}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.threadText}>• {thread.text}</Text>
                        <Text style={styles.timestamp}>{formatTime(thread.timestamp)}</Text>
                      </TouchableOpacity>

                      {/* inline move arrows for thread */}
                      <MoveArrows level={level} path={[index]} />
                    </View>

                    {isOpen && (
                      <RenderSteps steps={thread.steps} level={level} path={[index]} />
                    )}
                  </View>
                );
              })}
          </View>
        ))}
      </ScrollView>

      {/* input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
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
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* overlay menu */}
      <Modal visible={overlayMenuVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.overlayMenu}>
            <Text style={styles.overlayTitle}>Menu</Text>
            <TouchableOpacity><Text style={styles.overlayItem}>Settings</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.overlayItem}>FAQ</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.overlayItem}>Connect</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setOverlayMenuVisible(false)}>
              <Text style={styles.overlayItem}>Close</Text>
            </TouchableOpacity>
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
    for (let i = 0; i < path.length; i++) node = node[path[i]]?.steps ?? node[path[i]];
    return node;
  };

  const addStep = () => {
    const { level, path } = all[currentIndex];
    const updated = JSON.parse(JSON.stringify(threads));
    let node = updated[level];
    for (let i = 0; i < path.length; i++) node = node[path[i]]?.steps ?? node[path[i]];
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
    for (let i = 0; i < full.length - 1; i++) node = node[full[i]].steps;
    node[full.at(-1)].completed = !node[full.at(-1)].completed;
    update(updated);
  };

  const render = (steps, base = []) =>
    steps.map((s, idx) => {
      const full = [...base, idx];
      return (
        <View key={idx} style={[styles.stepBlock, { marginLeft: full.length * 10 }]}>
          <View style={styles.stepRow}>
            <Checkbox
              status={s.completed ? 'checked' : 'unchecked'}
              onPress={() => toggle(full)}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepText}>{s.text}</Text>
              <Text style={styles.timestamp}>
                {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      <Text style={styles.threadText}>{target.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(target.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <Text>⬅ Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFocus(currentIndex)}>
          <Text>🗑 Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentIndex((i) => Math.min(all.length - 1, i + 1))}>
          <Text>Next ➡</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 80 },

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
  gaugeBlock: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
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

  block: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  threadBlock: { marginTop: 12, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8 },
  threadHeader: { flexDirection: 'row', gap: 8 },
  plusButton: { fontSize: 20, marginRight: 8, paddingHorizontal: 6, fontWeight: 'bold' },
  threadText: { fontSize: 16 },

  stepBlock: { marginTop: 8, backgroundColor: '#e0e0e0', padding: 8, borderRadius: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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

  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: 'bold' },

  focusContainer: { padding: 20, backgroundColor: '#fff', paddingBottom: 80 },
  focusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start' },
  overlayMenu: { backgroundColor: 'white', padding: 24, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, width: '100%' },
  overlayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  overlayItem: { fontSize: 16, marginBottom: 10 },
});
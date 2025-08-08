import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider, Checkbox, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [collapsedSteps, setCollapsedSteps] = useState({});
  const [threads, setThreads] = useState({ baseline: [], execution: [], creative: [] });
  const [menuVisible, setMenuVisible] = useState(false);
  const [overlayMenuVisible, setOverlayMenuVisible] = useState(false);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [baselineLevel, setBaselineLevel] = useState('Medium');
  const [focusedItems, setFocusedItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('you2_threads');
      const storedFocus = await AsyncStorage.getItem('you2_focus');
      if (stored) setThreads(JSON.parse(stored));
      if (storedFocus) setFocusedItems(JSON.parse(storedFocus));
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem('you2_focus', JSON.stringify(focusedItems));
  }, [focusedItems]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return isNaN(d) ? '' : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!inputText.trim() || !expandedLevel) return;
    const updated = { ...threads };
    const threadIndex = threads[expandedLevel].findIndex((_, i) => expandedThreads[i]);
    const newItem = { text: inputText.trim(), timestamp: Date.now(), completed: false, steps: [] };

    if (threadIndex !== -1) {
      updated[expandedLevel][threadIndex].steps.push(newItem);
    } else {
      updated[expandedLevel].push(newItem);
    }

    setThreads(updated);
    setInputText('');
  };

  const toggleCheckbox = (level, path) => {
    const updated = { ...threads };
    let node = updated[level];
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
    node[path.at(-1)].completed = !node[path.at(-1)].completed;
    setThreads(updated);
  };

  const toggleLevel = (level) => {
    setExpandedLevel((prev) => (prev === level ? null : level));
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
    for (let i = 0; i < path.length; i++) node = node[path[i]]?.steps ?? node[path[i]];
    const target = node;
    const newFocus = { level, path, text: target.text, timestamp: target.timestamp };
    setFocusedItems((prev) => [...prev, newFocus]);
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
    let node = updated[selectedLevel];
    for (let i = 0; i < selectedItemPath.length - 1; i++) node = node[selectedItemPath[i]].steps;
    node.splice(selectedItemPath.at(-1), 1);
    setThreads(updated);
    setMenuVisible(false);
  };

  const RenderSteps = ({ steps, level, path = [], depth = 1 }) =>
    steps.map((step, idx) => {
      const currentPath = [...path, idx];
      const id = currentPath.join('-');
      const isCollapsed = collapsedSteps[id];

      return (
        <TouchableOpacity key={id} onLongPress={(e) => openMenu(e, level, currentPath)}>
          <View style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
            <View style={styles.stepRow}>
              <Checkbox
                status={step.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleCheckbox(level, currentPath)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{step.text}</Text>
                <Text style={styles.timestamp}>{formatTime(step.timestamp)}</Text>
              </View>
            </View>
            {step.steps?.length > 0 && !isCollapsed && (
              <RenderSteps steps={step.steps} level={level} path={currentPath} depth={depth + 1} />
            )}
          </View>
        </TouchableOpacity>
      );
    });
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
      </View>

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: menuPosition.x, y: menuPosition.y }}
      >
        <Menu.Item title="🗂 Archive (todo)" onPress={() => setMenuVisible(false)} />
        <Menu.Item title="🗑 Delete" onPress={deleteItem} />
        <Menu.Item title="🎯 Focus" onPress={() => {
          setMenuVisible(false);
          focusItem(selectedLevel, selectedItemPath);
        }} />
      </Menu>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleLevel(level)}>
              <Text style={styles.title}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
            </TouchableOpacity>
            {expandedLevel === level &&
              threads[level].map((thread, index) => (
                <View key={index} style={styles.threadBlock}>
                  <View style={styles.threadHeader}>
                    <TouchableOpacity onPress={() => toggleThread(index)}>
                      <Text style={styles.plusButton}>{expandedThreads[index] ? '-' : '+'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onLongPress={(e) => openMenu(e, level, [index])}>
                      <Text style={styles.threadText}>• {thread.text}</Text>
                      <Text style={styles.timestamp}>{formatTime(thread.timestamp)}</Text>
                    </TouchableOpacity>
                  </View>
                  {expandedThreads[index] && (
                    <RenderSteps steps={thread.steps} level={level} path={[index]} />
                  )}
                </View>
              ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            !expandedLevel
              ? 'Tap a section to begin...'
              : Object.values(expandedThreads).includes(true)
              ? 'Add step...'
              : 'Add new thread...'
          }
          editable={!!expandedLevel}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

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

// FocusScreen for swiping between items
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
    node.steps.push({
      text: newStep.trim(),
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 80 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  menuButton: { padding: 10 },
  menuButtonText: { fontSize: 24 },
  gaugeContainer: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  gaugeBlock: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  gaugeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  threadBlock: {
    marginTop: 12,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  plusButton: {
    fontSize: 20,
    marginRight: 8,
    paddingHorizontal: 6,
    fontWeight: 'bold',
  },
  threadText: { fontSize: 16 },
  stepBlock: {
    marginTop: 8,
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepText: { fontSize: 15 },
  timestamp: { fontSize: 11, color: '#888', marginTop: 2 },
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
  focusContainer: { padding: 20, backgroundColor: '#fff', paddingBottom: 80 },
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

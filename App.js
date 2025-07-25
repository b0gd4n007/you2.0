import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider, Checkbox, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const SCREEN_WIDTH = Dimensions.get('window').width;
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
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
  const [archived, setArchived] = useState({ baseline: [], execution: [], creative: [] });
  const [hideCompleted, setHideCompleted] = useState({ baseline: false, execution: false, creative: false });
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedThread, setSelectedThread] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const stored = await AsyncStorage.getItem('you2_threads');
      const archivedStored = await AsyncStorage.getItem('you2_archived');
      if (stored) setThreads(JSON.parse(stored));
      if (archivedStored) setArchived(JSON.parse(archivedStored));
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
    AsyncStorage.setItem('you2_archived', JSON.stringify(archived));
  }, [threads, archived]);

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const toggleLevel = (level) => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  const toggleThread = (index) => {
    setExpandedThreads((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleHideCompleted = (level) => {
    setHideCompleted((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const handleSend = () => {
    if (!inputText.trim() || !expandedLevel) return;
    const updated = { ...threads };
    const threadIndex = threads[expandedLevel].findIndex((_, i) => expandedThreads[i]);
    const newItem = { text: inputText.trim(), timestamp: Date.now(), steps: [], completed: false };

    if (threadIndex !== -1) {
      updated[expandedLevel][threadIndex].steps.push(newItem);
    } else {
      updated[expandedLevel].push(newItem);
    }

    setThreads(updated);
    setInputText('');
  };

  const toggleCollapse = (pathString) => {
    setCollapsedSteps((prev) => ({ ...prev, [pathString]: !prev[pathString] }));
  };

  const toggleCheckbox = (path) => {
    const updated = { ...threads };
    let node = updated[expandedLevel];
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
    const step = node[path[path.length - 1]];
    step.completed = !step.completed;
    setThreads(updated);
  };

  const archiveThread = () => {
    if (!selectedThread) return;
    const { level, index } = selectedThread;
    const updated = { ...threads };
    const archivedCopy = { ...archived };
    const [thread] = updated[level].splice(index, 1);
    archivedCopy[level].push(thread);
    setThreads(updated);
    setArchived(archivedCopy);
    setMenuVisible(false);
  };

  const deleteThread = () => {
    if (!selectedThread) return;
    const { level, index } = selectedThread;
    const updated = { ...threads };
    updated[level].splice(index, 1);
    setThreads(updated);
    setMenuVisible(false);
  };

  const openMenu = (event, level, index) => {
    setSelectedThread({ level, index });
    const { pageX: x, pageY: y } = event.nativeEvent;
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  const focusThread = () => {
    if (!selectedThread) return;
    const { level, index } = selectedThread;
    const thread = threads[level][index];
    setMenuVisible(false);
    navigation.navigate('Focus', { item: thread });
  };
  const RenderSteps = ({ steps, path = [], depth = 1 }) =>
    steps.map((step, idx) => {
      const currentPath = [...path, idx];
      const pathString = currentPath.join('-');
      const isCollapsed = collapsedSteps[pathString];

      return (
        <View key={idx} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
          <View style={styles.stepHeader}>
            {step.steps.length > 0 && (
              <TouchableOpacity onPress={() => toggleCollapse(pathString)} style={styles.collapseToggle}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{isCollapsed ? '+' : '-'}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.stepRow}>
              <Checkbox
                status={step.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleCheckbox(currentPath)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{step.text}</Text>
                <Text style={styles.timestamp}>{formatTime(step.timestamp)}</Text>
              </View>
            </View>
          </View>

          {!isCollapsed && step.steps?.length > 0 && (
            <RenderSteps steps={step.steps} path={currentPath} depth={depth + 1} />
          )}
        </View>
      );
    });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: menuPosition.x, y: menuPosition.y }}
      >
        <Menu.Item onPress={archiveThread} title="🗂 Archive" />
        <Menu.Item onPress={deleteThread} title="🗑 Delete" />
        <Menu.Item onPress={focusThread} title="🎯 Focus" />
      </Menu>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleLevel(level)}>
              <Text style={styles.title}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
            </TouchableOpacity>

            {expandedLevel === level && (
              <>
                <TouchableOpacity onPress={() => toggleHideCompleted(level)} style={{ marginTop: 6 }}>
                  <Text style={{ color: '#007AFF' }}>
                    {hideCompleted[level] ? 'Show Completed' : 'Hide Completed'}
                  </Text>
                </TouchableOpacity>

                {threads[level].map((thread, index) => (
                  <TouchableOpacity
                    key={index}
                    onLongPress={(e) => openMenu(e, level, index)}
                    activeOpacity={1}
                  >
                    <View style={styles.threadBlock}>
                      <View style={styles.threadHeader}>
                        <TouchableOpacity onPress={() => toggleThread(index)}>
                          <Text style={styles.plusButton}>
                            {expandedThreads[index] ? '-' : '+'}
                          </Text>
                        </TouchableOpacity>
                        <View>
                          <Text style={styles.threadText}>• {thread.text}</Text>
                          <Text style={styles.timestamp}>{formatTime(thread.timestamp)}</Text>
                        </View>
                      </View>
                      {expandedThreads[index] && (
                        <RenderSteps steps={thread.steps} path={[index]} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
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
    </KeyboardAvoidingView>
  );
}

function FocusScreen({ route }) {
  const { item } = route.params;

  const renderSteps = (steps, depth = 1) =>
    steps.map((step, idx) => (
      <View key={idx} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
        <Text style={styles.stepText}>- {step.text}</Text>
        <Text style={styles.timestamp}>{new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        {step.steps?.length > 0 && renderSteps(step.steps, depth + 1)}
      </View>
    ));

  return (
    <ScrollView contentContainerStyle={styles.focusContainer}>
      <Text style={styles.focusTitle}>🎯 Focus</Text>
      <Text style={styles.threadText}>{item.text}</Text>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      {item.steps?.length > 0 && renderSteps(item.steps)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 80 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  collapseToggle: {
    marginRight: 6,
    paddingHorizontal: 4,
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
  focusContainer: { padding: 20, backgroundColor: '#fff' },
  focusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});

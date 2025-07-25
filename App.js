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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [threads, setThreads] = useState({
    baseline: [],
    execution: [],
    creative: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem('you2_threads');
        if (stored) {
          setThreads(JSON.parse(stored));
        }
      } catch (e) {
        console.log('Error loading threads:', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
  }, [threads]);

  const toggleLevel = (level) => {
    setExpandedLevel((prev) => (prev === level ? null : level));
  };

  const toggleThread = (index) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleSend = () => {
    if (!inputText.trim() || !expandedLevel) return;

    const updated = { ...threads };
    const threadIndex = threads[expandedLevel].findIndex(
      (_, i) => expandedThreads[i]
    );

    if (threadIndex !== -1) {
      updated[expandedLevel][threadIndex].steps.push({
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString(),
        steps: [],
      });
    } else {
      updated[expandedLevel].push({
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString(),
        steps: [],
      });
    }

    setThreads(updated);
    setInputText('');
  };

  const addSubstep = (path, newText) => {
    const updated = { ...threads };
    let node = updated[expandedLevel];

    for (let i = 0; i < path.length - 1; i++) {
      node = node[path[i]].steps;
    }

    node[path[path.length - 1]].steps.push({
      text: newText,
      timestamp: new Date().toLocaleTimeString(),
      steps: [],
    });

    setThreads(updated);
  };

  const RenderSteps = ({ steps, path = [], depth = 1 }) => {
    const [activeInput, setActiveInput] = useState(null);
    const [subInputText, setSubInputText] = useState('');

    return steps.map((step, idx) => {
      const currentPath = [...path, idx];
      return (
        <View key={idx} style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
          <Text style={styles.stepText}>- {step.text}</Text>
          <Text style={styles.timestamp}>{step.timestamp}</Text>

          {/* Add substep button */}
          <TouchableOpacity
            onPress={() =>
              setActiveInput((prev) =>
                prev === idx ? null : idx
              )
            }
          >
            <Text style={styles.subAdd}>＋ Add substep</Text>
          </TouchableOpacity>

          {/* Substep input */}
          {activeInput === idx && (
            <View style={styles.subInputRow}>
              <TextInput
                value={subInputText}
                onChangeText={setSubInputText}
                placeholder="Substep..."
                style={styles.subInput}
              />
              <TouchableOpacity
                onPress={() => {
                  if (subInputText.trim()) {
                    addSubstep(currentPath, subInputText.trim());
                    setSubInputText('');
                    setActiveInput(null);
                  }
                }}
                style={styles.subSendButton}
              >
                <Text style={styles.sendText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {step.steps && step.steps.length > 0 && (
            <RenderSteps steps={step.steps} path={currentPath} depth={depth + 1} />
          )}
        </View>
      );
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleLevel(level)}>
              <Text style={styles.title}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>

            {expandedLevel === level &&
              threads[level].map((thread, index) => (
                <View key={index} style={styles.threadBlock}>
                  <View style={styles.threadHeader}>
                    <TouchableOpacity onPress={() => toggleThread(index)}>
                      <Text style={styles.plusButton}>
                        {expandedThreads[index] ? '-' : '+'}
                      </Text>
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.threadText}>• {thread.text}</Text>
                      <Text style={styles.timestamp}>{thread.timestamp}</Text>
                    </View>
                  </View>

                  {expandedThreads[index] && (
                    <RenderSteps steps={thread.steps} path={[index]} />
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
    </KeyboardAvoidingView>
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
  subAdd: {
    marginTop: 6,
    color: '#007AFF',
    fontSize: 13,
  },
  subInputRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  subInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  subSendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
  },
});

import React, { useState } from 'react';
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
  const [expanded, setExpanded] = useState(null);
  const [threads, setThreads] = useState({
    baseline: [],
    execution: [],
    creative: [],
  });

  const toggleExpand = (level) => {
    setExpanded(expanded === level ? null : level);
  };

  const handleSend = () => {
    if (!inputText.trim() || !expanded) return;
    const newEntry = {
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };
    const updated = {
      ...threads,
      [expanded]: [...threads[expanded], newEntry],
    };
    setThreads(updated);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleExpand(level)}>
              <Text style={styles.title}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
{expanded === level && Array.isArray(threads[level]) &&
  threads[level].map((entry, idx) => (
                <View key={idx} style={styles.entryBlock}>
                  <Text style={styles.entryText}>{entry.text}</Text>
                  <Text style={styles.timestamp}>{entry.timestamp}</Text>
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
            expanded
              ? `Write in ${expanded.charAt(0).toUpperCase() + expanded.slice(1)}...`
              : 'Tap a section to write...'
          }
          editable={!!expanded}
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
  entryBlock: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  entryText: { fontSize: 16 },
  timestamp: { fontSize: 12, color: '#888', marginTop: 4 },
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
});

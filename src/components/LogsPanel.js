// LogsPanel.js
// Presentational component for displaying and adding simple logs.  This
// component mirrors the MVP logs implementation from the original
// TaskScreen but has been isolated for clarity.  It relies on the
// caller to supply the current logs state and handlers for adding
// logs and resetting the logs.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles';
import { formatDate } from '../utils/dateUtils';

export default function LogsPanel({ logs, appendLog, setLogs }) {
  const categories = Object.keys(logs);
  const [newLogCat, setNewLogCat] = useState(categories[0] || 'mood');
  const [newLogText, setNewLogText] = useState('');

  function handleAdd() {
    appendLog(newLogCat, newLogText);
    setNewLogText('');
  }

  function handleClear() {
    // Clear each category to an empty array
    const empty = Object.fromEntries(categories.map((k) => [k, []]));
    setLogs(empty);
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Logs</Text>
      {/* Quick add section */}
      <View style={{ marginTop: 8, backgroundColor: '#f7f9ff', borderWidth: 1, borderColor: '#dbe3ff', borderRadius: 12, padding: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: '#555' }}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setNewLogCat(cat)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: newLogCat === cat ? '#0b5ed7' : '#ccd8ff',
                  backgroundColor: newLogCat === cat ? '#e7f1ff' : '#fff',
                }}
              >
                <Text style={{ fontSize: 12, color: newLogCat === cat ? '#0b5ed7' : '#333' }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Write a quick log..."
            value={newLogText}
            onChangeText={setNewLogText}
            style={{ flex: 1, borderWidth: 1, borderColor: '#dbe3ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' }}
          />
          <TouchableOpacity onPress={handleAdd} style={{ paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#0b5ed7' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleClear}>
          <Text style={{ textAlign: 'right', fontSize: 12, color: '#c33' }}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* Logs list by category */}
      {categories.map((k) => (
        <View key={k} style={styles.threadBlock}>
          <Text style={styles.threadTitle}>{k.toUpperCase()}</Text>
          {logs[k].length === 0 ? (
            <Text style={{ color: '#777', marginTop: 6 }}>— empty —</Text>
          ) : (
            logs[k].map((it, i) => (
              <View key={i} style={[styles.stepBlock, { marginTop: 8 }]}>
                <Text style={styles.stepText}>{it.text}</Text>
                <Text style={styles.timestamp}>{formatDate(it.timestamp)}</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}
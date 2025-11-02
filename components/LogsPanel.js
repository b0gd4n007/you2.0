// components/LogsPanel.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles';

const CATS = ['food','supplements','gym','sleep','walk','mood','dreams','events','insights'];

export default function LogsPanel() {
  const [logs, setLogs] = useState({
    food: [], supplements: [], gym: [], sleep: [],
    walk: [], mood: [], dreams: [], events: [], insights: []
  });
  const [draft, setDraft] = useState({ cat: 'insights', text: '' });

  useEffect(() => {
    AsyncStorage.getItem('you2_logs').then(s => {
      if (s) setLogs(JSON.parse(s));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = () => {
    const t = draft.text.trim();
    if (!t) return;
    setLogs(prev => ({
      ...prev,
      [draft.cat]: [...prev[draft.cat], { text: t, ts: Date.now() }]
    }));
    setDraft(d => ({ ...d, text: '' }));
  };

  const removeLog = (cat, idx) => {
    setLogs(prev => {
      const copy = { ...prev };
      copy[cat] = copy[cat].filter((_, i) => i !== idx);
      return copy;
    });
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.focusTitle}>🧭 Logs</Text>

      {/* category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CATS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setDraft(d => ({ ...d, cat: c }))}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: draft.cat === c ? '#111' : '#eee'
              }}
            >
              <Text style={{ color: draft.cat === c ? '#fff' : '#111', fontWeight: '600' }}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* quick add */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={draft.text}
          onChangeText={t => setDraft(d => ({ ...d, text: t }))}
          placeholder={`Add to ${draft.cat}…`}
          onSubmitEditing={addLog}
        />
        <TouchableOpacity onPress={addLog} style={styles.sendButton}>
          <Text style={styles.sendText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* lists */}
      <ScrollView style={{ marginTop: 8 }}>
        {CATS.map(cat => (
          <View key={cat} style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '700', marginBottom: 6 }}>{cat.toUpperCase()}</Text>
            {logs[cat].length === 0 ? (
              <Text style={{ color: '#777' }}>—</Text>
            ) : (
              logs[cat].map((item, idx) => (
                <View key={idx} style={styles.stepBlock}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.stepText}>{item.text}</Text>
                      <Text style={styles.timestamp}>
                        {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeLog(cat, idx)}>
                      <Text style={{ color: '#c33', fontWeight: '700' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

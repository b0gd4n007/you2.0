// screens/LogsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../utils/storageKeys';
import { styles } from '../styles';

const CATS = ['food','supplements','gym','sleep','walk','mood','dreams','events','insights'];

export default function LogsScreen() {
  const [logs, setLogs] = useState(Object.fromEntries(CATS.map(c => [c, []])));
  const [draft, setDraft] = useState(Object.fromEntries(CATS.map(c => [c, ''])));

  useEffect(() => { (async () => {
    const stored = await AsyncStorage.getItem(KEYS.logs);
    if (stored) setLogs(JSON.parse(stored));
  })(); }, []);

  useEffect(() => { AsyncStorage.setItem(KEYS.logs, JSON.stringify(logs)); }, [logs]);

  const add = (c) => {
    const text = draft[c].trim(); if (!text) return;
    setLogs(prev => ({ ...prev, [c]: [{ text, ts: Date.now() }, ...prev[c]] }));
    setDraft(prev => ({ ...prev, [c]: '' }));
  };
  const del = (c, i) => setLogs(prev => ({ ...prev, [c]: prev[c].filter((_,idx)=>idx!==i) }));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, backgroundColor:'#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Logs</Text>
      {CATS.map(cat => (
        <View key={cat} style={{ marginBottom: 18, backgroundColor:'#f8f8f8', borderRadius:12, padding:12, borderWidth:1, borderColor:'#eee' }}>
          <Text style={{ fontWeight: '800', marginBottom: 8 }}>{cat.toUpperCase()}</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            <TextInput
              style={[styles.input, { flex:1 }]}
              value={draft[cat]}
              onChangeText={t => setDraft(prev => ({ ...prev, [cat]: t }))}
              placeholder={`Add ${cat}…`}
              onSubmitEditing={() => add(cat)}
            />
            <TouchableOpacity onPress={() => add(cat)} style={styles.sendButton}><Text style={styles.sendText}>Add</Text></TouchableOpacity>
          </View>
          {logs[cat].length === 0 ? (
            <Text style={{ color:'#888', marginTop:8 }}>No items yet.</Text>
          ) : (
            logs[cat].map((item, i) => (
              <View key={i} style={[styles.stepBlock, { marginTop:8 }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={{ flex:1 }}>{item.text}</Text>
                  <TouchableOpacity onPress={() => del(cat, i)}><Text style={{ color:'#c33' }}>Delete</Text></TouchableOpacity>
                </View>
                <Text style={styles.timestamp}>{new Date(item.ts).toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

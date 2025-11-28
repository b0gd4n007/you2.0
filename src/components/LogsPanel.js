// LogsPanel.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const saved = await AsyncStorage.getItem('logs');
    if (saved) setLogs(JSON.parse(saved));
  };

  const saveLogs = async (newLogs) => {
    setLogs(newLogs);
    await AsyncStorage.setItem('logs', JSON.stringify(newLogs));
  };

  const saveLog = () => {
    if (!title.trim() && !body.trim()) return;
    const newLog = { title, body };
    const updated = editingIndex !== null ? [...logs.slice(0, editingIndex), newLog, ...logs.slice(editingIndex + 1)] : [newLog, ...logs];
    saveLogs(updated);
    resetEditor();
  };

  const resetEditor = () => {
    setShowEditor(false);
    setTitle('');
    setBody('');
    setEditingIndex(null);
  };

  const deleteLog = (index) => {
    Alert.alert('Delete this log?', '', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = [...logs];
          updated.splice(index, 1);
          saveLogs(updated);
        }
      }
    ]);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => {
        setTitle(item.title);
        setBody(item.body);
        setEditingIndex(index);
        setShowEditor(true);
      }}
      onLongPress={() => deleteLog(index)}
      style={styles.card}
    >
      <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
      <Text numberOfLines={1} style={styles.cardBody}>{item.body}</Text>
    </TouchableOpacity>
  );

  if (showEditor) {
    return (
      <View style={styles.container}>
        <TextInput
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.inputTitle}
        />
        <TextInput
          placeholder="Write something..."
          value={body}
          onChangeText={setBody}
          style={styles.inputBody}
          multiline
        />
        <TouchableOpacity onPress={saveLog} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {logs.length === 0 ? (
        <TouchableOpacity style={styles.addLogBtn} onPress={() => setShowEditor(true)}>
          <Text style={styles.addLogText}>+ Add Log</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={styles.addLogBtn} onPress={() => setShowEditor(true)}>
            <Text style={styles.addLogText}>+ Add Log</Text>
          </TouchableOpacity>
          <FlatList
            data={logs}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addLogBtn: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  addLogText: { fontSize: 16, color: '#333' },
  inputTitle: {
    fontSize: 18,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    padding: 8
  },
  inputBody: {
    fontSize: 16,
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  saveBtn: {
    backgroundColor: '#1877f2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  listContainer: { gap: 10 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#f9f9f9'
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#666' }
});

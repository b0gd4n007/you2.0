// AIBottomBar.js
// Composite component that renders the AI text input bar and the manual input
// bar used in the main task screen.  Extracted from TaskApp so that the
// surrounding screen can focus on state management.

import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles';

export default function AIBottomBar({
  aiText,
  setAiText,
  aiBusy,
  onAiSend,
  manualText,
  setManualText,
  onManualAdd,
}) {
  return (
    <>
      <View style={styles.aiBar}>
        <TextInput
          value={aiText}
          onChangeText={setAiText}
          placeholder="Let me help…"
          placeholderTextColor="#6B7280"
          style={styles.aiInput}
        />
        <TouchableOpacity
          disabled={aiBusy || !aiText.trim()}
          onPress={onAiSend}
          style={[styles.aiButton, aiBusy && { opacity: 0.6 }]}
        >
          <Text style={styles.aiButtonText}>{aiBusy ? 'Thinking…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputBar}>
        <TextInput
          value={manualText}
          onChangeText={setManualText}
          placeholder="Add quick item…"
          placeholderTextColor="#6B7280"
          style={styles.input}
          onSubmitEditing={onManualAdd}
        />
        <TouchableOpacity onPress={onManualAdd} style={styles.sendButton}>
          <Text style={styles.sendText}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
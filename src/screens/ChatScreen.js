import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MicButton from '../components/MicButton';
import { useSpeech } from '../services/speech';
import { chatAndMaybeAct } from '../services/aiRouter';

/**
 * ChatScreen provides an interface to converse with the AI.  It logs
 * user and assistant messages, supports voice input via the mic
 * button, and routes messages through the AI router which may
 * update the task store silently.
 */
export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);
  const { recording, text, start, stop } = useSpeech();

  const send = async (txt) => {
    const message = (txt ?? input).trim();
    if (!message) return;
    setInput('');
    setLog((prev) => [...prev, { role: 'user', text: message }]);
    const { reply, actions } = await chatAndMaybeAct(message);
    const suffix = actions.length ? `\n\nDone: ${actions.join(', ')}` : '';
    setLog((prev) => [...prev, { role: 'assistant', text: reply + suffix }]);
  };

  // When speech recognition stops, send the captured text automatically.
  useEffect(() => {
    if (!recording && text) {
      send(text);
    }
  }, [recording]);

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.chat} contentContainerStyle={{ padding: 16 }}>
        {log.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === 'user' ? styles.user : styles.ai]}
          >
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          placeholder="Talk to You 2.0…"
          placeholderTextColor="#6E7F90"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          style={styles.input}
          autoCapitalize="sentences"
        />
        <MicButton recording={recording} onPress={() => (recording ? stop() : start())} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  chat: {
    flex: 1,
  },
  bubble: {
    maxWidth: '85%',
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A88FF22',
    borderColor: '#1A88FF55',
  },
  ai: {
    alignSelf: 'flex-start',
    backgroundColor: '#121826',
    borderColor: '#1E2A3A',
  },
  bubbleText: {
    color: '#EAF2FF',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopColor: '#1E2A3A',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#121826',
    borderColor: '#1E2A3A',
    borderWidth: 1,
    borderRadius: 12,
    color: '#EAF2FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import ThreadCard from '../components/ThreadCard';
import { useNavigation } from '@react-navigation/native';

/**
 * TodayScreen shows threads that are marked as focus at the top,
 * followed by the rest.  Users can quickly add a new thread or
 * navigate to the AI chat from here.
 */
export default function TodayScreen() {
  const navigation = useNavigation();
  const threads = useTaskStore((s) => s.threads);
  const addStepTop = useTaskStore((s) => s.addStepTop);
  const markFocus = useTaskStore((s) => s.markFocus);
  const upsertThread = useTaskStore((s) => s.upsertThread);

  // Partition threads into focused and others.  Keep the original order.
  const focused = threads.filter((t) => t.focus);
  const others = threads.filter((t) => !t.focus);
  const ordered = [...focused, ...others];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Text style={styles.h1}>Today</Text>
        <TouchableOpacity onPress={() => upsertThread('New Thread')} style={styles.add}>
          <Text style={styles.addText}>+ Thread</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Chat')} style={styles.chat}>
          <Text style={styles.addText}>AI</Text>
        </TouchableOpacity>
      </View>
      {ordered.map((t) => (
        <ThreadCard
          key={t.id}
          thread={t}
          onAddStep={() => addStepTop(t.id, 'New step')}
          onToggleFocus={() => markFocus(t.id, !t.focus)}
          onPress={() => navigation.navigate('All', { focusId: t.id })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1220',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  h1: {
    color: 'white',
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
  },
  add: {
    backgroundColor: '#152338',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#203147',
  },
  chat: {
    backgroundColor: '#1A88FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addText: {
    color: '#EAF2FF',
    fontWeight: '700',
  },
});
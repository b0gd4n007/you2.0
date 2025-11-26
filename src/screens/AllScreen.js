import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import ThreadCard from '../components/ThreadCard';

/**
 * The All screen lists every thread regardless of focus.  Users can
 * toggle focus or add steps from here, but threads remain in the
 * same order as they were created unless reordered via drag-and-drop
 * features (not yet implemented).
 */
export default function AllScreen() {
  const threads = useTaskStore((s) => s.threads);
  const addStepTop = useTaskStore((s) => s.addStepTop);
  const markFocus = useTaskStore((s) => s.markFocus);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>All Threads</Text>
      {threads.map((t) => (
        <ThreadCard
          key={t.id}
          thread={t}
          onAddStep={() => addStepTop(t.id, 'New step')}
          onToggleFocus={() => markFocus(t.id, !t.focus)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1220',
  },
  h1: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
});
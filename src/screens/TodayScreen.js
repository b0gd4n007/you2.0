import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles';

export default function TodayScreen({ navigation }) {
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadThreads();
    });
    return unsubscribe;
  }, [navigation]);

  const loadThreads = async () => {
    const data = await AsyncStorage.getItem('threads');
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date();
      const updated = parsed.filter(thread => {
        if (!thread.targetDate) return false;
        const date = new Date(thread.targetDate);
        // Keep if date is today or overdue
        return (
          date.toDateString() === today.toDateString() ||
          (date < today && !thread.completed)
        );
      });
      setThreads(updated);
    }
  };

  const renderTask = (task) => {
    const now = new Date();
    const target = new Date(task.targetDate);
    const isOverdue = target < now && !task.completed;
    const isCompleted = task.completed;

    let backgroundColor = '#fff';
    if (isOverdue) backgroundColor = '#ffe6e6'; // Light red
    if (isCompleted) backgroundColor = '#e6ffe6'; // Light green

    return (
      <TouchableOpacity
        key={task.id}
        onPress={() => navigation.navigate('Focus', { taskId: task.id })}
        style={[styles.taskBox, { backgroundColor }]}
      >
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskTime}>{target.toLocaleString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Today</Text>
      {threads.map(renderTask)}
    </ScrollView>
  );
}
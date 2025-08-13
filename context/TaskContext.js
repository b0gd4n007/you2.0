// FocusScreen.js
import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { TaskContext } from '../context/TaskContext';

export default function FocusScreen({ route }) {
  const { updateTask } = useContext(TaskContext);
  const { task } = route.params;

  // Example usage:
  const onSave = () => {
    const updated = { ...task, completed: true };
    updateTask(updated);
  };

  return (
    <View>
      <Text>{task.title}</Text>
      {/* Add a save button or trigger onSave as needed */}
    </View>
  );
}

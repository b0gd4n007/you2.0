import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { TaskContext } from '../context/TaskContext';

const FocusScreen = ({ route }) => {
  const { task } = route.params;
  const { update } = useContext(TaskContext);

  const handleUpdate = () => {
    update(task.id, { ...task, done: true });
  };

  return (
    <View style={styles.container}>
      <Text>{task.title}</Text>
      <Button title="Mark as done" onPress={handleUpdate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});

export default FocusScreen;

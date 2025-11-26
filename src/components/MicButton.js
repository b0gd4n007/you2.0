import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * A pill button that shows whether voice recording is active.  When
 * recording, the background darkens and the label changes to
 * “Listening…”.  Use this with a speech hook to record voice
 * commands.
 *
 * Props:
 *  - recording: boolean indicating if speech recognition is active
 *  - onPress: callback to start or stop recording
 */
export default function MicButton({ recording, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, recording ? styles.on : null]}
    >
      <Text style={styles.text}>{recording ? 'Listening…' : 'Hold to Speak'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1A88FF',
  },
  on: {
    backgroundColor: '#0F5BC0',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});
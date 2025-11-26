// HeaderTabs.js
// Top navigation bar for the main page.  Renders "Today", "All", and "Logs"
// tabs and a toggle for move mode.  Extracted from TaskApp to simplify
// the main screen component.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from '../styles';

export default function HeaderTabs({ page, setPage, scrollRef, screenWidth, moveMode, setMoveMode }) {
  const labels = ['Today', 'All', 'Logs'];
  return (
    <View style={styles.headerRow}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {labels.map((label, i) => (
          <TouchableOpacity
            key={label}
            onPress={() => {
              setPage(i);
              if (scrollRef?.current) {
                scrollRef.current.scrollTo({ x: screenWidth * i, animated: true });
              }
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: page === i ? '700' : '400', color: page === i ? '#111' : '#777' }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        onPress={() => setMoveMode((m) => !m)}
        style={[styles.moveToggle, moveMode && styles.moveToggleOn]}
      >
        <Text style={[styles.moveToggleText, moveMode && styles.moveToggleTextOn]}>{moveMode ? 'Move: ON' : 'Move: OFF'}</Text>
      </TouchableOpacity>
    </View>
  );
}
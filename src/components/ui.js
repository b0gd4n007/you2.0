// UI.js — pure presentational wrappers (no logic)
// Auto light/dark; soft cards; cleaner spacing.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';

function useTheme() {
  const scheme = useColorScheme();
  const light = {
    bg: '#EAF0FF',            // canvas
    text: '#101626',
    sub: '#6B7390',
    border: '#E2E9FF',
    card: '#FFFFFF',
    cardAlt: '#F7FAFF',
    primary: '#2F5BFF',
    primaryDark: '#2046CC',
    chipBg: '#EEF2FF',
    chipBorder: '#D9E0FF',
    shadow: { color: '#000', opacity: 0.06 },
  };
  const dark = {
    bg: '#0C1222',
    text: '#EFF2FF',
    sub: '#A2A8BF',
    border: '#1F2740',
    card: '#121A2E',
    cardAlt: '#0F172A',
    primary: '#7BA0FF',
    primaryDark: '#5E84E6',
    chipBg: '#1A2340',
    chipBorder: '#263155',
    shadow: { color: '#000', opacity: 0.25 },
  };
  return scheme === 'dark' ? dark : light;
}

/** Big section header (e.g., “Today”, “All”, “Logs”) */
export function SectionTitle({ children, right }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8, marginBottom: 6, paddingHorizontal: 4 }]}>
      <Text style={[styles.h, { color: t.text }]}>{children}</Text>
      {right || null}
    </View>
  );
}

/** Card for threads */
export function ThreadCard({ children, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          shadowColor: t.shadow.color,
          shadowOpacity: t.shadow.opacity,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Card for steps / substeps */
export function StepCard({ children, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.step,
        {
          backgroundColor: t.cardAlt,
          borderColor: t.border,
          shadowColor: t.shadow.color,
          shadowOpacity: t.shadow.opacity * 0.7,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Small pill chip (e.g., dates) */
export function Chip({ children }) {
  const t = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: t.chipBg, borderColor: t.chipBorder }]}>
      <Text style={[styles.chipText, { color: t.primary }]}>{children}</Text>
    </View>
  );
}

/** Primary button */
export function PrimaryButton({ title, onPress, style }) {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: t.primary, borderColor: t.primaryDark },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: '#fff' }]}>{title}</Text>
    </TouchableOpacity>
  );
}

/** Ghost secondary button */
export function SecondaryButton({ title, onPress, style }) {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: 'transparent', borderColor: t.border },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: t.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

/** Thin divider */
export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border, marginVertical: 8 }} />;
}

/** Optional: page background wrapper */
export function Screen({ children, style }) {
  const t = useTheme();
  return <View style={[{ flex: 1, backgroundColor: t.bg }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  h: { fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },

  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  step: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '800' },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});

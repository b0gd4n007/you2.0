// styles.js
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // Canvas
  container: { flex: 1, backgroundColor: '#eaf2ff' }, // soft blue backdrop
  scroll: { padding: 16, paddingBottom: 140 },

  // Header / tabs
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  menuButton: { padding: 10 },
  menuButtonText: { fontSize: 24 },

  // Mini gauges (kept neutral)
  gaugeContainer: { flexDirection: 'row', gap: 6 },
  gaugeBlock: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#eef3ff', borderWidth: 1, borderColor: '#cfe0ff' },
  gaugeText: { color: '#1e2b4a', fontWeight: 'bold', fontSize: 12 },

  // Move toggle
  moveToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bcd0ff',
    backgroundColor: '#eef4ff',
  },
  moveToggleOn: { backgroundColor: '#d8e6ff', borderColor: '#3b82f6' },
  moveToggleText: { fontWeight: '700', color: '#2a3c6b' },
  moveToggleTextOn: { color: '#0b5ed7' },

  // Thread cards (grey-ish with soft shadow)
  threadBlock: {
    marginTop: 12,
    backgroundColor: '#f5f7fb',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  threadHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  threadTitle: { fontSize: 18, fontWeight: '700', color: '#1c274c' },

  // Steps (white subcards)
  stepBlock: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6ecf8',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepText: { fontSize: 15, color: '#243255' },
  timestamp: { fontSize: 11, color: '#7a86a6', marginTop: 2 },

  // Disclosure chevron
  disclosureBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    minWidth: 18,
  },
  disclosureText: { fontSize: 14, fontWeight: '800', color: '#5a6792' },

  // Move arrows
  moveBtns: { flexDirection: 'row', gap: 4, marginLeft: 6 },
  moveBtn: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#d6ddff',
  },
  moveBtnDisabled: { opacity: 0.45 },
  moveBtnText: { fontWeight: '800', color: '#27345b' },

  // AI bar
  aiBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#dbe3ff',
    backgroundColor: '#f7f9ff',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d6ddff',
  },
  aiButton: {
    backgroundColor: '#1f3b8b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  aiButtonText: { color: '#fff', fontWeight: '700' },

  // Manual input bar
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#dbe3ff',
    backgroundColor: '#f7f9ff',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#d6ddff',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  sendText: { color: '#fff', fontWeight: 'bold' },

  // Focus screen block
  focusContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    paddingBottom: 80,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#e6ecf8',
  },
  focusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#1c274c' },

  // Overlay menu
  overlay: { flex: 1, backgroundColor: 'rgba(9,18,66,0.25)', justifyContent: 'flex-start' },
  overlayMenu: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    width: '100%',
    borderBottomWidth: 1,
    borderColor: '#e6ecf8',
  },
  overlayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1c274c' },
  overlayItem: { fontSize: 16, marginBottom: 10, color: '#243255' },

  // +/- button (Text)
  plusButton: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1c274c',
    backgroundColor: '#e8efff',
    borderWidth: 1,
    borderColor: '#cdd9ff',
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Swipe cues
  swipeLeft: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff2df',
    borderRightWidth: 1,
    borderRightColor: '#ffd8a8',
  },
  swipeLeftText: { fontWeight: '700', color: '#8a4b00' },
  swipeRight: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#e7fff6',
    borderLeftWidth: 1,
    borderLeftColor: '#96f2d7',
  },
  swipeRightText: { fontWeight: '700', color: '#0b7285' },

  // Date chip
  dateChip: {
    backgroundColor: '#e8f0ff',
    borderWidth: 1,
    borderColor: '#cfe0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dateChipText: { fontSize: 11, color: '#0b5ed7', fontWeight: '700' },

  // Quick buttons
  quickBtn: {
    backgroundColor: '#f1f4ff',
    borderWidth: 1,
    borderColor: '#d9e0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  // Status tints for tasks / threads
  threadCompleted: {
    backgroundColor: '#e6ffed',
    borderColor: '#b7f0c0',
  },
  threadOverdue: {
    backgroundColor: '#ffecec',
    borderColor: '#ffb3b3',
  },
  stepCompleted: {
    backgroundColor: '#e6ffed',
    borderColor: '#b7f0c0',
  },
  stepOverdue: {
    backgroundColor: '#fff0f0',
    borderColor: '#ffc9c9',
  },
});

export default styles;

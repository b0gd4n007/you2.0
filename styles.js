import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 140 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  menuButton: { padding: 10 },
  menuButtonText: { fontSize: 24 },

  gaugeContainer: { flexDirection: 'row', gap: 6 },
  gaugeBlock: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  gaugeText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

  moveToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#f0f0f0',
  },
  moveToggleOn: { backgroundColor: '#d0ebff', borderColor: '#3b82f6' },
  moveToggleText: { fontWeight: '700', color: '#333' },
  moveToggleTextOn: { color: '#0b5ed7' },

  threadBlock: {
    marginTop: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  threadHeader: { flexDirection: 'row', gap: 8 },
  threadTitle: { fontSize: 18, fontWeight: '700', color: '#222' },

  stepBlock: {
    marginTop: 8,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepText: { fontSize: 15 },
  timestamp: { fontSize: 11, color: '#888', marginTop: 2 },

  disclosureBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    minWidth: 18,
  },
  disclosureText: { fontSize: 14, fontWeight: '800' },

  moveBtns: { flexDirection: 'row', gap: 4, marginLeft: 6 },
  moveBtn: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.4 },
  moveBtnText: { fontWeight: '800' },

  aiBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  aiButton: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  aiButtonText: { color: '#fff', fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: 'bold' },

  focusContainer: { padding: 20, backgroundColor: '#fff', paddingBottom: 80 },
  focusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start' },
  overlayMenu: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    width: '100%',
  },
  overlayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  overlayItem: { fontSize: 16, marginBottom: 10 },

  plusButton: { fontSize: 22, width: 28, textAlign: 'center', fontWeight: '700' },
});

// TaskScreen.js
// Main screen for managing tasks and logs.  This implementation
// decomposes the original monolithic component into a set of hooks
// and utility modules.  It retains the core features: nested task
// hierarchy with reorder/promote, context menu with date picking and
// focus, a simple logs page, and an AI/voice assisted input bar.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles';
import {
  isToday,
  inferTargetDateFromText,
} from '../utils/dateUtils';
import {
  getNodeRef,
  getParentRef,
  canMoveUp as canMoveUpItem,
  canMoveDown as canMoveDownItem,
  moveBy as moveByTree,
  moveToTop as moveToTopTree,
  moveToBottom as moveToBottomTree,
  promoteToThread as promoteToThreadTree,
} from '../utils/treeUtils';
import {
  applyEditInstructionToThreads,
  adaptAIMagicToReducer,
} from '../utils/aiReducerHelpers';
import {
  ensureThreadInLevel,
  ensureStepUnderThread,
  addSubstepUnder,
} from '../utils/aiHelpers';
import { askAIToEdit } from '../services/AImagic';
import StepsList from '../components/StepsList';
import ThreadCard from '../components/ThreadCard';
import LogsPanel from '../components/LogsPanel';
import ThreadList from '../components/ThreadList';
import ContextMenu from '../components/ContextMenu';
import HeaderTabs from '../components/HeaderTabs';
import useLogs from '../hooks/useLogs';

import useVoice, { voiceAvailable } from '../hooks/useVoice';

// Task actions consolidate common mutations into reusable helpers
import {
  toggleCompletion as toggleCompletionAction,
  setTargetDate as setTargetDateAction,
  addItem as addItemAction,
  renameItem as renameItemAction,
  deleteItem as deleteItemAction,
  promoteItem as promoteItemAction,
} from '../utils/taskActions';

// Voice functionality is handled by the useVoice hook.  No direct
// import of react-native-voice here.

const SCREEN_W = Dimensions.get('window').width;

export default function TaskScreen({ navigation }) {
  // threads keyed by level
  const [threads, setThreads] = useState({ baseline: [], execution: [], creative: [] });
  const [expandedThreads, setExpandedThreads] = useState({}); // key: `${level}-${index}` => boolean
  const [collapsedSteps, setCollapsedSteps] = useState({}); // key: path string => boolean
  const [moveMode, setMoveMode] = useState(false);
  const [page, setPage] = useState(0);
  const scrollRef = useRef();
  // Context menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 24, y: 120 });
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  // Rename modal
  const [editVisible, setEditVisible] = useState(false);
  const [editText, setEditText] = useState('');
  // Subtask target (where manual input will be added)
  const [targetLevel, setTargetLevel] = useState(null);
  const [targetPath, setTargetPath] = useState(null);
  // AI state
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState('');
  // Chat overlay
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  // Manual input
  const [manualText, setManualText] = useState('');
  // Date/time picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerLevel, setPickerLevel] = useState(null);
  const [pickerPath, setPickerPath] = useState(null);

  // Keep a ref to the current threads for move helpers.  We update
  // this in an effect so that closures created earlier can refer
  // safely to the latest value.  Without this ref, passing `threads`
  // into callbacks would capture a stale value.
  const prevThreadsRef = useRef(threads);
  useEffect(() => {
    prevThreadsRef.current = threads;
  }, [threads]);

  // Logs management via hook
  const { logs, appendLog, setLogs } = useLogs();

  // Load saved state on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedThreads, storedUI] = await Promise.all([
          AsyncStorage.getItem('you2_threads'),
          AsyncStorage.getItem('you2_ui'),
        ]);
        if (storedThreads) {
          const t = JSON.parse(storedThreads);
          if (t && typeof t === 'object') setThreads(t);
        }
        if (storedUI) {
          const ui = JSON.parse(storedUI);
          if (ui && typeof ui === 'object') {
            setExpandedThreads(ui.expandedThreads || {});
            setCollapsedSteps(ui.collapsedSteps || {});
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Persist threads and UI state when changed
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
      } catch {
        // ignore
      }
    })();
  }, [threads]);
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          'you2_ui',
          JSON.stringify({ expandedThreads, collapsedSteps }),
        );
      } catch {
        // ignore
      }
    })();
  }, [expandedThreads, collapsedSteps]);

  // Clear AI result after display
  useEffect(() => {
    if (!aiResult) return;
    const t = setTimeout(() => setAiResult(''), 2500);
    return () => clearTimeout(t);
  }, [aiResult]);

  // Initialize voice recognition via the useVoice hook.  When
  // results arrive, append to the current AI text.  The hook
  // gracefully handles unsupported platforms.
  const { listening, startMic, stopMic } = useVoice((transcript) => {
    setAiText((prev) => (prev ? prev + ' ' : '') + transcript);
  });

  // --------- Task helpers ---------
  function toggleExpand(level, index) {
    const key = `${level}-${index}`;
    setExpandedThreads((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleCheckbox(level, path) {
    // Toggle completion for a node at the path.  If the node repeats,
    // schedule the next occurrence.
    // Use action helper to toggle completion or schedule repeat
    setThreads((prev) => toggleCompletionAction(prev, level, path));
  }

  function setTargetDateOnPath(level, path, ts, allDayFlag) {
    // Delegate to action helper to update the target date and allDay
    setThreads((prev) => setTargetDateAction(prev, level, path, ts, allDayFlag));
  }

  function handleManualAdd() {
    const text = manualText.trim();
    if (!text) return;
    // Delegate to action helper to add a new item under the current target
    setThreads((prev) => addItemAction(prev, text, targetLevel, targetPath));
    setManualText('');
    setTargetLevel(null);
    setTargetPath(null);
  }

  async function handleAISend() {
    const instr = aiText.trim();
    if (!instr) return;
    if (aiBusy) return;

    // Push user message into chat log (if chat is visible or later opened)
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        text: instr,
      },
    ]);

    setAiBusy(true);
    try {
      // Ask external AI service for plan
      const plan = await askAIToEdit({ threads, instruction: instr });
      // Map into reducer instructions
      const ops = Array.isArray(plan)
        ? plan.flatMap((ins) => adaptAIMagicToReducer(threads, ins))
        : [];
      let stateObj = threads;
      let added = 0;
      let inferredTs = inferTargetDateFromText(instr).ts;
      for (const op of ops) {
        const before = JSON.stringify(stateObj);
        stateObj = applyEditInstructionToThreads(op, stateObj, inferredTs);
        if (before !== JSON.stringify(stateObj)) added++;
      }
      setThreads(stateObj);

      // Short natural-language reply for the chat overlay
      const replyText = added
        ? `Okay. I updated your tasks and added ${added} item${added > 1 ? 's' : ''}.`
        : 'I read that, but there was nothing clear to change in your tasks.';

      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: replyText,
        },
      ]);

      setAiResult(
        added ? `added ${added} item${added > 1 ? 's' : ''}` : 'no changes'
      );
      setAiText('');
    } catch (err) {
      console.error('[AI] error', err);
      setAiResult('AI parse failed');
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Something went wrong trying to update your tasks.',
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  }
  // Voice handlers are provided by useVoice hook.  They are
  // destructured at initialization above.

  // Context menu actions
  function onAddSubtask() {
    if (!selectedLevel || !selectedPath) return;
    setTargetLevel(selectedLevel);
    setTargetPath(selectedPath);
    setMenuVisible(false);
  }
  function onEdit() {
    const node = getNodeRef(threads, selectedLevel, selectedPath || []);
    setEditText(node?.text || '');
    setEditVisible(true);
    setMenuVisible(false);
  }
  function onOpenDate() {
    setPickerLevel(selectedLevel);
    setPickerPath(selectedPath);
    const node = getNodeRef(threads, selectedLevel, selectedPath || []);
    if (node?.targetDate) setPickerDate(new Date(node.targetDate));
    else setPickerDate(new Date());
    setPickerVisible(true);
    setMenuVisible(false);
  }
  function onClearDate() {
    setTargetDateOnPath(selectedLevel, selectedPath, null);
    setMenuVisible(false);
  }
  function onDeleteItem() {
    if (!selectedLevel || !selectedPath) return;
    // Use action helper to delete the selected item
    setThreads((prev) => deleteItemAction(prev, selectedLevel, selectedPath));
    setMenuVisible(false);
  }
  function onPromote() {
    if (!selectedLevel || !selectedPath) return;
    // Use action helper to promote the selected item to a thread
    setThreads((prev) => promoteItemAction(prev, selectedLevel, selectedPath));
    setMenuVisible(false);
  }
  function onFocus() {
    // Navigate to focus screen (reuse original behavior)
    if (!selectedLevel || !selectedPath) return;
    const node = getNodeRef(threads, selectedLevel, selectedPath);
    if (!node) return;
    navigation.navigate('Focus', {
      index: 0,
      all: [{ level: selectedLevel, path: selectedPath, text: node.text, timestamp: node.timestamp, targetDate: node.targetDate || null }],
      threads,
      update: setThreads,
      removeFocus: () => {},
    });
    setMenuVisible(false);
  }

  // Handler to open the context menu at a given screen coordinate
  function openMenuHandler(e, lvl, path) {
    const { pageX = 24, pageY = 120 } = e?.nativeEvent || {};
    setMenuAnchor({ x: Math.max(8, pageX), y: Math.max(80, pageY) });
    setSelectedLevel(lvl);
    setSelectedPath(path);
    setMenuVisible(true);
  }

  // Save rename
  function onSaveRename() {
    const t = editText.trim();
    if (!t || !selectedLevel || !selectedPath) {
      setEditVisible(false);
      return;
    }
    // Use action helper to rename the selected item
    setThreads((prev) => renameItemAction(prev, selectedLevel, selectedPath, t));
    setEditVisible(false);
  }

  // Threads are rendered via the ThreadList component.



  // Render
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#eef4ff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderTabs
        page={page}
        setPage={(i) => {
          setPage(i);
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ x: SCREEN_W * i, animated: true });
          }
        }}
        scrollRef={scrollRef}
        screenWidth={SCREEN_W}
        moveMode={moveMode}
        setMoveMode={setMoveMode}
      />
      {/* Target banner */}
      {targetPath && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Adding subtask under: {targetLevel} / {targetPath.join(' › ')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTargetPath(null);
                setTargetLevel(null);
              }}
            >
              <Text style={{ fontSize: 16, color: '#c33' }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* AI result pill */}
      {aiResult ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
          <View
            style={{
              backgroundColor: '#e7f5ff',
              borderColor: '#74c0fc',
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#0b5ed7', fontWeight: '700' }}>{aiResult}</Text>
          </View>
        </View>
      ) : null}
      {/* Horizontal pager for Today/All/Logs */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          if (p !== page) setPage(p);
        }}
        scrollEventThrottle={16}
        ref={scrollRef}
      >
        {/* PAGE 0: Today */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ThreadList
              pageIndex={0}
              threads={threads}
              expandedThreads={expandedThreads}
              collapsedSteps={collapsedSteps}
              toggleExpand={toggleExpand}
              setCollapsedSteps={setCollapsedSteps}
              toggleCheckbox={toggleCheckbox}
              openMenu={openMenuHandler}
              setTargetPath={setTargetPath}
              setTargetLevel={setTargetLevel}
              promoteToThread={(lvl, pth) => setThreads((prev) => promoteItemAction(prev, lvl, pth))}
              moveMode={moveMode}
              canMoveUp={(lvl, pth) => canMoveUpItem(prevThreadsRef.current || threads, lvl, pth)}
              canMoveDown={(lvl, pth) => canMoveDownItem(prevThreadsRef.current || threads, lvl, pth)}
              moveBy={(lvl, pth, dir) => setThreads((prev) => moveByTree(prev, lvl, pth, dir))}
              moveToTop={(lvl, pth) => setThreads((prev) => moveToTopTree(prev, lvl, pth))}
              moveToBottom={(lvl, pth) => setThreads((prev) => moveToBottomTree(prev, lvl, pth))}
            />
          </ScrollView>
        </View>
        {/* PAGE 1: All */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ThreadList
              pageIndex={1}
              threads={threads}
              expandedThreads={expandedThreads}
              collapsedSteps={collapsedSteps}
              toggleExpand={toggleExpand}
              setCollapsedSteps={setCollapsedSteps}
              toggleCheckbox={toggleCheckbox}
              openMenu={openMenuHandler}
              setTargetPath={setTargetPath}
              setTargetLevel={setTargetLevel}
              promoteToThread={(lvl, pth) => setThreads((prev) => promoteItemAction(prev, lvl, pth))}
              moveMode={moveMode}
              canMoveUp={(lvl, pth) => canMoveUpItem(prevThreadsRef.current || threads, lvl, pth)}
              canMoveDown={(lvl, pth) => canMoveDownItem(prevThreadsRef.current || threads, lvl, pth)}
              moveBy={(lvl, pth, dir) => setThreads((prev) => moveByTree(prev, lvl, pth, dir))}
              moveToTop={(lvl, pth) => setThreads((prev) => moveToTopTree(prev, lvl, pth))}
              moveToBottom={(lvl, pth) => setThreads((prev) => moveToBottomTree(prev, lvl, pth))}
            />
          </ScrollView>
        </View>
        {/* PAGE 2: Logs */}
        <View style={{ width: SCREEN_W }}>
          <LogsPanel logs={logs} appendLog={appendLog} setLogs={setLogs} />
        </View>
      </ScrollView>
      {/* Context menu */}
      <ContextMenu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={menuAnchor}
        hasTarget={(selectedLevel && selectedPath && getNodeRef(threads, selectedLevel, selectedPath)?.targetDate) ? true : false}
        onAddSubtask={onAddSubtask}
        onEdit={onEdit}
        onOpenDatePicker={onOpenDate}
        onClearTargetDate={onClearDate}
        onDelete={onDeleteItem}
        canPromote={selectedPath && selectedPath.length > 1}
        onPromote={onPromote}
        onFocus={onFocus}
      />
      {/* Rename modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Rename item</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="New text…"
              style={{ backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 }}
              autoFocus
              autoCapitalize="sentences"
              onSubmitEditing={onSaveRename}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditVisible(false)}><Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={onSaveRename}><Text style={{ fontSize: 16, fontWeight: '700', color: '#0b5ed7' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Date/time picker */}
      {pickerVisible && (
        <DateTimePicker
          value={pickerDate}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android' && event.type === 'dismissed') {
              setPickerVisible(false);
              return;
            }
            const d = date || pickerDate;
            if (!d || !pickerLevel || !pickerPath) {
              setPickerVisible(false);
              return;
            }
            setTargetDateOnPath(pickerLevel, pickerPath, d.getTime(), false);
            setPickerLevel(null);
            setPickerPath(null);
            setPickerVisible(false);
          }}
        />
      )}
      {/* AI and manual input bar with mic */}
      <View style={styles.aiBar}>
        {voiceAvailable && (
          <TouchableOpacity
            onPress={() => setChatVisible(true)}
            style={[styles.aiButton, { marginRight: 8 }, listening && { opacity: 0.6 }]}
          >
            <Text style={styles.aiButtonText}>{listening ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setChatVisible(true)}
        >
          <Text style={{ color: '#9ca3af' }}>
            {aiBusy ? 'Working…' : "Talk to AI about what’s on your mind…"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={manualText}
          autoCapitalize="sentences"
          onChangeText={setManualText}
          placeholder={targetPath ? 'Add subtask…' : 'Add new item (Execution)'}
          onSubmitEditing={handleManualAdd}
        />
        <TouchableOpacity onPress={handleManualAdd} style={styles.sendButton}><Text style={styles.sendText}>Add</Text></TouchableOpacity>
      </View>

      {chatVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '65%',
            backgroundColor: '#050816',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingTop: 8,
            paddingHorizontal: 12,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text style={{ color: '#e5e7eb', fontWeight: '600' }}>AI</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)}>
              <Text style={{ color: '#9ca3af' }}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, marginBottom: 8 }}>
            {chatMessages.map((m) => (
              <View
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor:
                    m.role === 'user' ? '#1d4ed8' : 'rgba(31, 41, 55, 0.95)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  marginVertical: 3,
                  maxWidth: '80%',
                }}
              >
                <Text style={{ color: '#f9fafb' }}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingBottom: 8,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                color: '#e5e7eb',
              }}
              placeholder="Tell it what's on your mind..."
              placeholderTextColor="#6b7280"
              value={aiText}
              onChangeText={setAiText}
              onSubmitEditing={handleAISend}
              editable={!aiBusy}
            />
            <TouchableOpacity
              onPress={handleAISend}
              disabled={aiBusy}
              style={{ marginLeft: 8, opacity: aiBusy ? 0.4 : 1 }}
            >
              <Text style={{ color: '#bfdbfe', fontWeight: '600' }}>
                {aiBusy ? '...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}
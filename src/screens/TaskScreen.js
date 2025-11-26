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

// ---- Local helpers for delete / rename by title ----

// ---- Local helpers for delete / rename by title ----

// ---- Local helpers for delete / rename / mark-done by title ----

function normalizeTitle(text) {
  return (text || '').toString().trim().toLowerCase();
}

function cloneThreadsState(threads) {
  if (!threads || typeof threads !== 'object') {
    return { baseline: [], execution: [], creative: [] };
  }
  return JSON.parse(JSON.stringify(threads));
}

function deleteByTitle(threads, title) {
  const titleNorm = normalizeTitle(title);
  const cloned = cloneThreadsState(threads);
  let changed = false;

  function walkAndDelete(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = arr.length - 1; i >= 0; i--) {
      const node = arr[i];
      if (normalizeTitle(node?.text) === titleNorm) {
        arr.splice(i, 1);
        return true;
      }
      if (Array.isArray(node?.steps) && walkAndDelete(node.steps)) {
        return true;
      }
    }
    return false;
  }

  for (const lvl of ['baseline', 'execution', 'creative']) {
    if (walkAndDelete(cloned[lvl])) {
      changed = true;
      break;
    }
  }

  return { state: changed ? cloned : threads, changed };
}

function renameByTitle(threads, oldTitle, newTitle) {
  const oldNorm = normalizeTitle(oldTitle);
  const newClean = (newTitle || '').toString().trim();
  if (!newClean) return { state: threads, changed: false };

  const cloned = cloneThreadsState(threads);
  let changed = false;

  function walkAndRename(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const node = arr[i];
      if (normalizeTitle(node?.text) === oldNorm) {
        node.text = newClean;
        return true;
      }
      if (Array.isArray(node?.steps) && walkAndRename(node.steps)) {
        return true;
      }
    }
    return false;
  }

  for (const lvl of ['baseline', 'execution', 'creative']) {
    if (walkAndRename(cloned[lvl])) {
      changed = true;
      break;
    }
  }

  return { state: changed ? cloned : threads, changed };
}

function toggleDoneByTitle(threads, title) {
  const titleNorm = normalizeTitle(title);
  const cloned = cloneThreadsState(threads);
  let changed = false;

  function markNodeDone(node) {
    // set everything, so whatever the UI reads will flip
    node.done = true;
    node.completed = true;
    node.isCompleted = true;
    node.checked = true;
  }

  function walkAndToggle(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const node = arr[i];

      if (normalizeTitle(node?.text) === titleNorm) {
        markNodeDone(node);
        return true;
      }

      if (Array.isArray(node?.steps) && walkAndToggle(node.steps)) {
        return true;
      }
    }
    return false;
  }

  for (const lvl of ['baseline', 'execution', 'creative']) {
    if (walkAndToggle(cloned[lvl])) {
      changed = true;
      break;
    }
  }

  return { state: changed ? cloned : threads, changed };
}





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
    const instrRaw = aiText.trim();
    if (!instrRaw) return;

    // Use the original text for patterns, with case-insensitive regex
    // so we don't destroy titles' casing.

    // ---------- LOCAL DELETE ----------
    const deleteMatch = instrRaw.match(/^(delete|remove)\s+(.+)$/i);
    if (deleteMatch) {
      const titleToDelete = deleteMatch[2].trim();
      const { state, changed } = deleteByTitle(threads, titleToDelete);
      setThreads(state);
      setAiText('');
      setAiResult(changed ? 'changed 1 item' : 'no changes');
      return;
    }

    // ---------- LOCAL RENAME ----------
    // supports: rename X to Y, change X to Y, edit X to Y
    const renameMatch = instrRaw.match(/^(rename|change|edit)\s+(.+?)\s+to\s+(.+)$/i);
    if (renameMatch) {
      const oldTitle = renameMatch[2].trim();
      const newTitle = renameMatch[3].trim();
      const { state, changed } = renameByTitle(threads, oldTitle, newTitle);
      setThreads(state);
      setAiText('');
      setAiResult(changed ? 'changed 1 item' : 'no changes');
      return;
    }

    // ---------- LOCAL MARK-AS-DONE ----------
    // supports:
    //  - mark sink as done
    //  - mark sink done
    //  - complete sink
    //  - finish sink
    let markDoneMatch =
      instrRaw.match(/^mark\s+(.+?)\s+as\s+done$/i) ||
      instrRaw.match(/^mark\s+(.+?)\s+done$/i);

    if (!markDoneMatch) {
      const alt = instrRaw.match(/^(complete|finish)\s+(.+)$/i);
      if (alt) {
        // group 2 is the title in this case
        markDoneMatch = ['full', alt[2]];
      }
    }

    if (markDoneMatch) {
      const titleToMark = (markDoneMatch[1] || '').trim();
      const { state, changed } = toggleDoneByTitle(threads, titleToMark);
      setThreads(state);
      setAiText('');
      setAiResult(changed ? 'changed 1 item' : 'no changes');
      return;
    }

    // ---------- FALL BACK TO AI FOR ADD / NESTED LOGIC ----------
    if (aiBusy) return;
    setAiBusy(true);

    try {
      const hiInstructions = await askAIToEdit({ threads, instruction: instrRaw });

      let stateObj = threads;
      let changed = 0;
      const inferred = inferTargetDateFromText(instrRaw);
      const inferredTs = inferred?.ts ?? null;

      if (Array.isArray(hiInstructions)) {
        for (const hi of hiInstructions) {
          // IMPORTANT: adapt using the *current* state so later ops
          // see earlier changes in this same instruction.
          const ops = adaptAIMagicToReducer(stateObj, hi) || [];
          for (const op of ops) {
            const before = JSON.stringify(stateObj);
            stateObj = applyEditInstructionToThreads(op, stateObj, inferredTs);
            if (before !== JSON.stringify(stateObj)) changed++;
          }
        }
      }

      setThreads(stateObj);
      setAiResult(
        changed ? `changed ${changed} item${changed > 1 ? 's' : ''}` : 'no changes'
      );
      setAiText('');
    } catch (err) {
      console.error('[AI] error in handleAISend', err);
      setAiResult('AI parse failed');
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
            onPress={listening ? stopMic : startMic}
            style={[styles.aiButton, { marginRight: 8 }, listening && { opacity: 0.6 }]}
          >
            <Text style={styles.aiButtonText}>{listening ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.aiInput}
          value={aiText}
          onChangeText={setAiText}
          placeholder={aiBusy ? 'Working…' : "AI: 'add fix heater by Thursday under baseline'"}
          editable={!aiBusy}
          onSubmitEditing={handleAISend}
        />
        <TouchableOpacity style={[styles.aiButton, aiBusy && { opacity: 0.4 }]} disabled={aiBusy} onPress={handleAISend}>
          <Text style={styles.aiButtonText}>{aiBusy ? '...' : 'AI Apply'}</Text>
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
    </KeyboardAvoidingView>
  );
}
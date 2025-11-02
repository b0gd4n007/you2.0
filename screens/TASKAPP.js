// screens/TaskApp.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox, Menu } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { askAIToEdit } from '../AImagic';

// Optional speech & date pickers (won’t crash if not installed)
let Voice;
let DateTimePicker;
try { Voice = require('react-native-voice').default || require('react-native-voice'); } catch {}
try { DateTimePicker = require('@react-native-community/datetimepicker').default || require('@react-native-community/datetimepicker'); } catch {}

const { width: SCREEN_W } = Dimensions.get('window');

// ---------- date helpers ----------
const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
const isToday = (ts) => {
  const a = new Date(ts);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
};
const nextWeekdayFrom = (weekdayName, from = new Date()) => {
  const targetIdx = WEEKDAYS.indexOf(weekdayName.toLowerCase());
  if (targetIdx < 0) return null;
  const curr = from.getDay();
  let delta = targetIdx - curr;
  if (delta <= 0) delta += 7; // next upcoming
  return startOfDay(addDays(from, delta));
};
const quickTarget = {
  today: () => startOfDay(new Date()),
  tomorrow: () => startOfDay(addDays(new Date(), 1)),
  nextMon: () => nextWeekdayFrom('monday'),
  nextThu: () => nextWeekdayFrom('thursday'),
};

// Parse “by Thursday / by Mon / by today / by tomorrow” from free text
const inferTargetDateFromText = (text) => {
  if (!text) return null;
  const t = text.toLowerCase();

  // explicit today/tomorrow
  if (/\bby\s+(today)\b/.test(t)) return quickTarget.today();
  if (/\bby\s+(tomorrow|tmrw|tmr)\b/.test(t)) return quickTarget.tomorrow();

  // weekdays (allow short forms: mon, tue, wed, thu, fri, sat, sun)
  const shortMap = {
    mon: 'monday', tue: 'tuesday', tues: 'tuesday',
    wed: 'wednesday', thu: 'thursday', thur: 'thursday', thurs: 'thursday',
    fri: 'friday', sat: 'saturday', sun: 'sunday'
  };
  const m = t.match(/\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/);
  if (m && m[1]) {
    const norm = shortMap[m[1]] || m[1];
    return nextWeekdayFrom(norm);
  }
  return null;
};

// ---------- component ----------
export default function TaskApp({ navigation }) {
  // data
  const [threads, setThreads] = useState({ baseline: [], execution: [], creative: [] });
  const [focusedItems, setFocusedItems] = useState([]);

  // UI state
  const [expandedThreads, setExpandedThreads] = useState({}); // key `${level}-${index}`
  const [collapsedSteps, setCollapsedSteps] = useState({});   // "0-2-1":boolean
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [editVisible, setEditVisible] = useState(false);
  const [editText, setEditText] = useState('');

  const [targetPath, setTargetPath] = useState(null);
  const [targetLevel, setTargetLevel] = useState(null);

  const [moveMode, setMoveMode] = useState(false);

  // input bars
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [listening, setListening] = useState(false);
  const [manualText, setManualText] = useState('');

  // pager
  const [page, setPage] = useState(0); // 0=today,1=all,2=logs
  const [scrollRef, setScrollRef] = useState(null);

  // logs (keep simple)
  const [logs, setLogs] = useState({ food: [], supplements: [], gym: [], sleep: [], walk: [], mood: [], dreams: [], events: [], insights: [] });

  // Date picker modal state
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [datePickerLevel, setDatePickerLevel] = useState(null);
  const [datePickerPath, setDatePickerPath] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  // ---------- boot ----------
  useEffect(() => {
    const load = async () => {
      const [stored, storedFocus, ui, storedLogs] = await Promise.all([
        AsyncStorage.getItem('you2_threads'),
        AsyncStorage.getItem('you2_focus'),
        AsyncStorage.getItem('you2_ui'),
        AsyncStorage.getItem('you2_logs'),
      ]);
      if (stored) setThreads(JSON.parse(stored));
      if (storedFocus) setFocusedItems(JSON.parse(storedFocus));
      if (storedLogs) setLogs(JSON.parse(storedLogs));
      if (ui) {
        const { expandedThreads: et, collapsedSteps: cs } = JSON.parse(ui);
        if (et) setExpandedThreads(et);
        if (cs) setCollapsedSteps(cs);
      }
    };
    load();
  }, []);

  // persist
  useEffect(() => { AsyncStorage.setItem('you2_threads', JSON.stringify(threads)); }, [threads]);
  useEffect(() => { AsyncStorage.setItem('you2_focus', JSON.stringify(focusedItems)); }, [focusedItems]);
  useEffect(() => { AsyncStorage.setItem('you2_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => {
    AsyncStorage.setItem('you2_ui', JSON.stringify({ expandedThreads, collapsedSteps }));
  }, [expandedThreads, collapsedSteps]);

  useEffect(() => {
    if (!aiResult) return;
    const t = setTimeout(() => setAiResult(''), 2500);
    return () => clearTimeout(t);
  }, [aiResult]);

  // ---------- basic helpers ----------
  const getNodeRef = (obj, level, path) => {
    let node = obj[level];
    for (let i = 0; i < path.length; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    return node;
  };
  const getParentRef = (obj, level, path) => {
    if (!path || path.length === 0) return null;
    if (path.length === 1) return { arr: obj[level], index: path[0] };
    let node = obj[level];
    for (let i = 0; i < path.length - 1; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    return { arr: node.steps, index: path[path.length - 1] };
  };

  // ---------- reorder / promote ----------
  const canMoveUp = (level, path) => {
    const p = getParentRef(threads, level, path);
    return !!p && p.index > 0;
  };
  const canMoveDown = (level, path) => {
    const p = getParentRef(threads, level, path);
    return !!p && p.index < p.arr.length - 1;
  };
  const moveBy = (level, path, direction) => {
    const updated = JSON.parse(JSON.stringify(threads));
    const p = getParentRef(updated, level, path);
    if (!p) return;
    const { arr, index } = p;
    const delta = direction === 'up' ? -1 : 1;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= arr.length) return;
    const [item] = arr.splice(index, 1);
    arr.splice(newIndex, 0, item);
    setThreads(updated);
  };
  const moveToTop = (level, path) => {
    const updated = JSON.parse(JSON.stringify(threads));
    const p = getParentRef(updated, level, path);
    if (!p) return;
    const { arr, index } = p;
    const [item] = arr.splice(index, 1);
    arr.unshift(item);
    setThreads(updated);
  };
  const moveToBottom = (level, path) => {
    const updated = JSON.parse(JSON.stringify(threads));
    const p = getParentRef(updated, level, path);
    if (!p) return;
    const { arr, index } = p;
    const [item] = arr.splice(index, 1);
    arr.push(item);
    setThreads(updated);
  };
  const promoteToThread = (level, path) => {
    if (!path || path.length <= 1) return;
    const updated = JSON.parse(JSON.stringify(threads));
    let parent = updated[level];
    for (let i = 0; i < path.length - 1; i++) {
      parent = i === 0 ? parent[path[i]] : parent.steps[path[i]];
    }
    const idx = path[path.length - 1];
    const [node] = parent.steps.splice(idx, 1);
    updated[level].unshift(node);
    setThreads(updated);
  };

  // ---------- open menu ----------
  const openMenu = (event, level, path) => {
    const { pageX = 24, pageY = 120 } = event?.nativeEvent || {};
    setSelectedItemPath(path);
    setSelectedLevel(level);
    setMenuPosition({ x: Math.max(8, pageX), y: Math.max(80, pageY) });
    setMenuVisible(true);
  };

  // ---------- focus ----------
  const focusItem = (level, path) => {
    const deepCopy = JSON.parse(JSON.stringify(threads));
    let node = deepCopy[level];
    for (let i = 0; i < path.length; i++) {
      node = node[path[i]]?.steps ?? node[path[i]];
    }
    const target = node;
    const newFocus = { level, path, text: target.text, timestamp: target.timestamp, targetDate: target.targetDate || null };
    setFocusedItems((prev) => [...prev, newFocus]);
    navigation.navigate('Focus', {
      index: focusedItems.length,
      all: [...focusedItems, newFocus],
      threads,
      update: setThreads,
      removeFocus: (i) => setFocusedItems((prev) => prev.filter((_, j) => j !== i)),
    });
  };

  // ---------- delete ----------
  const deleteItem = () => {
    if (!selectedItemPath) return;
    const updated = JSON.parse(JSON.stringify(threads));
    const parent = getParentRef(updated, selectedLevel, selectedItemPath);
    if (!parent) return;
    parent.arr.splice(parent.index, 1);
    setThreads(updated);
    setMenuVisible(false);
    if (
      targetPath &&
      targetLevel === selectedLevel &&
      targetPath.join('-').startsWith(selectedItemPath.join('-'))
    ) {
      setTargetPath(null);
      setTargetLevel(null);
    }
  };

  // ---------- toggle complete ----------
  const toggleCheckbox = (level, path) => {
    const updated = JSON.parse(JSON.stringify(threads));
    if (!updated[level]) return;
    if (path.length === 1) {
      const idx = path[0];
      if (!updated[level][idx]) return;
      updated[level][idx].completed = !updated[level][idx].completed;
      setThreads(updated);
      return;
    }
    let cursorArray = updated[level];
    let parentArray = null;
    let finalIndex = path[path.length - 1];
    for (let depth = 0; depth < path.length - 1; depth++) {
      const idxAtDepth = path[depth];
      if (!cursorArray || !cursorArray[idxAtDepth]) return;
      const node = cursorArray[idxAtDepth];
      if (depth === path.length - 2) { parentArray = node.steps; break; }
      if (!node.steps || !Array.isArray(node.steps)) return;
      cursorArray = node.steps;
    }
    if (!parentArray || !parentArray[finalIndex]) return;
    parentArray[finalIndex].completed = !parentArray[finalIndex].completed;
    setThreads(updated);
  };

  // ---------- set / clear target date on any node ----------
  const setTargetOnPath = (level, path, tsOrNull) => {
    const updated = JSON.parse(JSON.stringify(threads));
    let node = updated[level];
    for (let i = 0; i < path.length; i++) {
      node = i === 0 ? node[path[i]] : node.steps[path[i]];
    }
    node.targetDate = tsOrNull || null;
    setThreads(updated);
  };

  // ---------- manual input add ----------
  const handleManualAdd = () => {
    const text = manualText.trim();
    if (!text) return;
    const updated = JSON.parse(JSON.stringify(threads));
    const newItem = { text, timestamp: Date.now(), completed: false, steps: [], targetDate: null };

    if (targetPath && targetLevel) {
      const parent = getNodeRef(updated, targetLevel, targetPath);
      parent.steps = parent.steps || [];
      parent.steps.unshift(newItem);
    } else {
      // default drop into Execution as a new thread at top
      updated.execution.unshift(newItem);
    }
    setThreads(updated);
    setManualText('');
  };

  // ---------- AI integration ----------
  function applyEditInstructionToThreads(instr, threads0, inferredTargetDate) {
    if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path)) return threads0;
    const updated = JSON.parse(JSON.stringify(threads0));
    const { level, path, mode } = instr;

    function getNodeAtPath(levelArr, fullPath) {
      if (!levelArr) return null;
      if (!fullPath || fullPath.length === 0) return null;
      let node = levelArr[fullPath[0]];
      if (!node) return null;
      for (let i = 1; i < fullPath.length; i++) {
        if (!node.steps || !node.steps[fullPath[i]]) return null;
        node = node.steps[fullPath[i]];
      }
      return node;
    }
    function getParentRefLocal(levelArr, fullPath) {
      if (!fullPath || fullPath.length === 0) return null;
      if (fullPath.length === 1) return { arr: levelArr, index: fullPath[0] };
      let node = levelArr[fullPath[0]];
      if (!node) return null;
      for (let i = 1; i < fullPath.length - 1; i++) {
        if (!node.steps || !node.steps[fullPath[i]]) return null;
        node = node.steps[fullPath[i]];
      }
      if (!node.steps) return null;
      return { arr: node.steps, index: fullPath[fullPath.length - 1] };
    }

    // DELETE
    if (instr.action === 'delete') {
      const parentRef = getParentRefLocal(updated[level], path);
      if (parentRef && parentRef.arr && parentRef.index >= 0 && parentRef.index < parentRef.arr.length) {
        parentRef.arr.splice(parentRef.index, 1);
      }
      return updated;
    }

    // COMPLETE
    if (instr.action === 'complete') {
      const node = getNodeAtPath(updated[level], path);
      if (node) node.completed = true;
      return updated;
    }

    // EDIT (keep targetDate as-is)
    if (instr.action === 'edit') {
      const node = getNodeAtPath(updated[level], path);
      if (node && typeof instr.text === 'string' && instr.text.trim()) node.text = instr.text.trim();
      return updated;
    }

    // SET_TARGET (explicit from AI)
    if (instr.action === 'set_target') {
      const node = getNodeAtPath(updated[level], path);
      if (node) node.targetDate = instr.targetDate ?? null;
      return updated;
    }

    // ADD (thread/child/sibling) — attach inferred or explicit target date when available
    const makeNode = (text) => ({
      text: text || 'New Task',
      timestamp: Date.now(),
      completed: false,
      steps: [],
      targetDate: instr.targetDate ?? inferredTargetDate ?? null,
    });

    if (instr.action === 'add' && mode === 'thread') {
      updated[level].unshift(makeNode(instr.text));
      return updated;
    }
    if (instr.action === 'add' && mode === 'child') {
      let parentNode = updated[level][path[0]];
      if (!parentNode) return updated;
      for (let i = 1; i < path.length; i++) {
        parentNode.steps = parentNode.steps || [];
        if (!parentNode.steps[path[i]]) return updated;
        parentNode = parentNode.steps[path[i]];
      }
      parentNode.steps = parentNode.steps || [];
      parentNode.steps.unshift(makeNode(instr.text));
      return updated;
    }
    if (instr.action === 'add' && mode === 'sibling') {
      const parentRef = getParentRefLocal(updated[level], path);
      if (!parentRef) return updated;
      parentRef.arr.splice(parentRef.index + 1, 0, makeNode(instr.text));
      return updated;
    }

    // PROMOTE
    if (instr.action === 'promote') {
      if (!updated[level] || !Array.isArray(path) || path.length <= 1) return updated;
      let parent = updated[level][path[0]];
      for (let i = 1; i < path.length - 1; i++) {
        parent = parent?.steps?.[path[i]];
        if (!parent) return updated;
      }
      if (!parent?.steps?.[path[path.length - 1]]) return updated;
      const [node] = parent.steps.splice(path[path.length - 1], 1);
      updated[level].unshift(node);
      return updated;
    }

    // REORDER
    if (instr.action === 'reorder') {
      const direction = instr.direction || 'up';
      const parentRef = getParentRefLocal(updated[level], path);
      if (!parentRef) return updated;
      const { arr, index } = parentRef;
      const [item] = arr.splice(index, 1);
      if (direction === 'top') arr.unshift(item);
      else if (direction === 'bottom') arr.push(item);
      else {
        const newIndex = direction === 'down' ? Math.min(index + 1, arr.length) : Math.max(index - 1, 0);
        arr.splice(newIndex, 0, item);
      }
      return updated;
    }

    return updated;
  }

  async function handleAIApply() {
    if (!aiText.trim() || aiBusy) return;
    setAiBusy(true);
    try {
      // infer a target date from the free text; we’ll attach it to any ADDs that don’t specify one
      const inferredTargetDate = inferTargetDateFromText(aiText.trim());

      const instrList = await askAIToEdit({ threads, instruction: aiText.trim() });
      if (!Array.isArray(instrList) || instrList.length === 0) {
        setAiText('');
        setAiBusy(false);
        return;
      }

      let nextThreads = threads;
      const counts = { add: 0, edit: 0, delete: 0, complete: 0, promote: 0, reorder: 0, set_target: 0 };

      for (const instr of instrList) {
        if (!instr || instr.action === 'none') continue;
        counts[instr.action] = (counts[instr.action] || 0) + 1;
        nextThreads = applyEditInstructionToThreads(instr, nextThreads, inferredTargetDate);
      }

      setThreads(nextThreads);
      setAiText('');
      const summary = Object.entries(counts)
        .filter(([_, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`)
        .join(', ');
      setAiResult(summary || 'no changes');
    } catch (err) {
      console.log('AI error:', err);
    } finally {
      setAiBusy(false);
    }
  }

  // ---------- mic handlers ----------
  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechResults = (e) => {
      const txt = (e?.value && e.value[0]) || '';
      if (txt) setAiText((prev) => (prev ? prev + ' ' + txt : txt));
    };
    Voice.onSpeechError = () => setListening(false);
    return () => {
      Voice?.destroy?.();
      Voice?.removeAllListeners?.();
    };
  }, []);
  const startMic = async () => { if (!Voice) return; try { setListening(true); await Voice.start('en-US'); } catch { setListening(false); } };
  const stopMic  = async () => { if (!Voice) return; try { await Voice.stop(); } finally { setListening(false); } };

  // ---------- UI atoms ----------
  const MoveArrows = ({ level, path }) => {
    if (!moveMode) return null;
    const upDisabled = !canMoveUp(level, path);
    const downDisabled = !canMoveDown(level, path);
    const isNested = path.length > 1;
    return (
      <View style={styles.moveBtns}>
        <TouchableOpacity disabled={upDisabled} onPress={() => moveBy(level, path, 'up')} style={[styles.moveBtn, upDisabled && styles.moveBtnDisabled]}><Text style={styles.moveBtnText}>▲</Text></TouchableOpacity>
        <TouchableOpacity disabled={downDisabled} onPress={() => moveBy(level, path, 'down')} style={[styles.moveBtn, downDisabled && styles.moveBtnDisabled]}><Text style={styles.moveBtnText}>▼</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => moveToTop(level, path)} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤒</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => moveToBottom(level, path)} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤓</Text></TouchableOpacity>
        {isNested && (
          <TouchableOpacity onPress={() => promoteToThread(level, path)} style={[styles.moveBtn, { backgroundColor: '#ffe8cc', borderWidth: 1, borderColor: '#ffb563' }]}>
            <Text style={styles.moveBtnText}>Promote</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const StepRow = ({ step, level, currentPath, depth }) => {
    const isNested = currentPath.length > 1;

    const renderLeft = () => (
      <View style={styles.swipeLeft}><Text style={styles.swipeLeftText}>{isNested ? 'Promote' : ''}</Text></View>
    );
    const renderRight = () => (
      <View style={styles.swipeRight}><Text style={styles.swipeRightText}>{step.completed ? 'Uncomplete' : 'Complete'}</Text></View>
    );

    const onSwipeLeft = () => { if (isNested) promoteToThread(level, currentPath); };
    const onSwipeRight = () => toggleCheckbox(level, currentPath);

    return (
      <Swipeable renderLeftActions={isNested ? renderLeft : undefined} renderRightActions={renderRight} onSwipeableLeftOpen={onSwipeLeft} onSwipeableRightOpen={onSwipeRight}>
        <View style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
          <View style={styles.stepRow}>
            <TouchableOpacity onPress={() => step.steps?.length && setCollapsedSteps((p)=>({ ...p, [currentPath.join('-')]: !p[currentPath.join('-')] }))} style={styles.disclosureBtn}>
              <Text style={styles.disclosureText}>
                {step.steps?.length ? (collapsedSteps[currentPath.join('-')] ? '▶' : '▼') : '–'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setTargetPath(currentPath); setTargetLevel(level); }}
              onLongPress={(e) => openMenu(e, level, currentPath)}
              delayLongPress={250}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Checkbox status={step.completed ? 'checked' : 'unchecked'} onPress={() => toggleCheckbox(level, currentPath)} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepText}>{step.text}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={styles.timestamp}>created {formatDate(step.timestamp)}</Text>
                    {!!step.targetDate && (
                      <View style={styles.dateChip}>
                        <Text style={styles.dateChipText}>📅 {formatDate(step.targetDate)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <MoveArrows level={level} path={currentPath} />

            <TouchableOpacity onLongPress={(e) => openMenu(e, level, currentPath)} delayLongPress={250} style={{ padding: 6, marginLeft: 4 }}>
              <Text style={{ fontSize: 16 }}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    );
  };

  const RenderSteps = ({ steps, level, path = [], depth = 1 }) =>
    steps.map((step, idx) => {
      const currentPath = [...path, idx];
      const id = currentPath.join('-');
      const isCollapsedFlag = !!collapsedSteps[id];
      return (
        <View key={id}>
          <StepRow step={step} level={level} currentPath={currentPath} depth={depth} />
          {!isCollapsedFlag && step.steps?.length > 0 && (
            <RenderSteps steps={step.steps} level={level} path={currentPath} depth={depth + 1} />
          )}
        </View>
      );
    });

  const toggleThread = (level, index) => {
    const key = `${level}-${index}`;
    setExpandedThreads((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---------- filters ----------
  const threadMatchesToday = (thread) => {
    if (isToday(thread.timestamp)) return true;
    if (thread.targetDate && isToday(thread.targetDate)) return true;
    const stack = [...(thread.steps || [])];
    while (stack.length) {
      const n = stack.pop();
      if (isToday(n.timestamp) || (n.targetDate && isToday(n.targetDate))) return true;
      if (n.steps?.length) stack.push(...n.steps);
    }
    return false;
  };

  const levelsToRender = ['baseline', 'execution', 'creative'];
  const listForPage = (lvl) => threads[lvl] || [];

  const renderThreadCard = (thread, level, index) => {
    const key = `${level}-${index}`;
    const isOpen = !!expandedThreads[key];
    return (
      <View key={key} style={styles.threadBlock}>
        <View style={[styles.threadHeader, { alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => toggleThread(level, index)}>
            <Text style={styles.plusButton}>{isOpen ? '-' : '+'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setTargetPath([index]); setTargetLevel(level); }}
            onLongPress={(e) => openMenu(e, level, [index])}
            delayLongPress={250}
            style={{ flex: 1 }}
          >
            <Text style={styles.threadTitle}>• {thread.text}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={styles.timestamp}>created {formatDate(thread.timestamp)}</Text>
              {!!thread.targetDate && (
                <View style={styles.dateChip}>
                  <Text style={styles.dateChipText}>📅 {formatDate(thread.targetDate)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {moveMode && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => moveBy(level, [index], 'up')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▲</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => moveBy(level, [index], 'down')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▼</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => moveToTop(level, [index])} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤒</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => moveToBottom(level, [index])} style={styles.moveBtn}><Text style={styles.moveBtnText}>⤓</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {isOpen && <RenderSteps steps={thread.steps} level={level} path={[index]} />}
      </View>
    );
  };

  // ---------- date picker modal helpers ----------
  const openDatePicker = (level, path) => {
    setDatePickerLevel(level);
    setDatePickerPath(path);
    // Prefill with current target or today
    const node = getNodeRef(threads, level, path);
    const existing = node?.targetDate ? new Date(node.targetDate) : new Date();
    setTempDate(existing);
    setMenuVisible(false);
    setDateModalVisible(true);
  };

  const confirmDatePicker = () => {
    if (!datePickerLevel || !datePickerPath) { setDateModalVisible(false); return; }
    setTargetOnPath(datePickerLevel, datePickerPath, startOfDay(tempDate));
    setDateModalVisible(false);
  };

  // ---------- menu ----------
  const quickSetTarget = (kind) => {
    if (!selectedItemPath) { setMenuVisible(false); return; }
    const map = {
      today: quickTarget.today(),
      tomorrow: quickTarget.tomorrow(),
      nextMon: quickTarget.nextMon(),
      nextThu: quickTarget.nextThu(),
      clear: null,
    };
    setTargetOnPath(selectedLevel, selectedItemPath, map[kind]);
    setMenuVisible(false);
  };

  // ---------- render ----------
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* top tabs */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {['Today','All','Logs'].map((label, i) => (
            <TouchableOpacity key={label} onPress={() => { setPage(i); scrollRef?.scrollTo({ x: SCREEN_W * i, animated: true }); }}>
              <Text style={{ fontSize: 16, fontWeight: page === i ? '700' : '400', color: page === i ? '#111' : '#777' }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setMoveMode((m) => !m)} style={[styles.moveToggle, moveMode && styles.moveToggleOn]}>
          <Text style={[styles.moveToggleText, moveMode && styles.moveToggleTextOn]}>{moveMode ? 'Move: ON' : 'Move: OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* item context menu with quick target date + picker */}
      <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={{ x: menuPosition.x, y: menuPosition.y }}>
        <Menu.Item title="➕ Add subtask here" onPress={() => { setTargetPath(selectedItemPath); setTargetLevel(selectedLevel); setMenuVisible(false); }} />
        <Menu.Item title="✏️ Edit" onPress={() => {
          const node = getNodeRef(threads, selectedLevel, selectedItemPath || []);
          setEditText(node?.text || '');
          setEditVisible(true);
          setMenuVisible(false);
        }} />
        <Menu.Item title="📆 Pick a date…" onPress={() => openDatePicker(selectedLevel, selectedItemPath)} />
        <Menu.Item title="📅 Set target: Today" onPress={() => quickSetTarget('today')} />
        <Menu.Item title="📅 Set target: Tomorrow" onPress={() => quickSetTarget('tomorrow')} />
        <Menu.Item title="📅 Set target: Next Monday" onPress={() => quickSetTarget('nextMon')} />
        <Menu.Item title="📅 Set target: Next Thursday" onPress={() => quickSetTarget('nextThu')} />
        <Menu.Item title="❌ Clear target date" onPress={() => quickSetTarget('clear')} />
        <Menu.Item title="🗑 Delete" onPress={deleteItem} />
        {selectedItemPath && selectedItemPath.length > 1 && (
          <Menu.Item title="⬆️ Promote to thread" onPress={() => { setMenuVisible(false); promoteToThread(selectedLevel, selectedItemPath); }} />
        )}
        <Menu.Item title="🎯 Focus" onPress={() => { setMenuVisible(false); if (!selectedItemPath) return; focusItem(selectedLevel, selectedItemPath); }} />
      </Menu>

      {/* target banner */}
      {targetPath && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Adding subtask under: {targetLevel} / {targetPath.join(' › ')}
            </Text>
            <TouchableOpacity onPress={() => { setTargetPath(null); setTargetLevel(null); }}>
              <Text style={{ fontSize: 16, color: '#c33' }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI results pill */}
      {aiResult ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
          <View style={{ backgroundColor: '#e7f5ff', borderColor: '#74c0fc', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#0b5ed7', fontWeight: '700' }}>{aiResult}</Text>
          </View>
        </View>
      ) : null}

      {/* HORIZONTAL PAGER (no new deps) */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          if (p !== page) setPage(p);
        }}
        scrollEventThrottle={16}
        ref={setScrollRef}
      >
        {/* PAGE 0: TODAY */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {levelsToRender.flatMap((level) => {
              const vis = (threads[level] || []).filter(threadMatchesToday);
              return vis.map((thread, index) => renderThreadCard(thread, level, index));
            })}
            {levelsToRender.every((lvl) => (threads[lvl] || []).filter(threadMatchesToday).length === 0) && (
              <Text style={{ padding: 16, color: '#777' }}>Nothing for today yet. Add a target date or create something new.</Text>
            )}
          </ScrollView>
        </View>

        {/* PAGE 1: ALL */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {levelsToRender.flatMap((level) => listForPage(level).map((thread, index) => renderThreadCard(thread, level, index)))}
          </ScrollView>
        </View>

        {/* PAGE 2: LOGS (simple MVP) */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Logs</Text>
            {Object.entries(logs).map(([k, arr]) => (
              <View key={k} style={styles.threadBlock}>
                <Text style={styles.threadTitle}>{k.toUpperCase()}</Text>
                {arr.length === 0 ? (
                  <Text style={{ color: '#777', marginTop: 6 }}>— empty —</Text>
                ) : (
                  arr.map((it, i) => (
                    <View key={i} style={[styles.stepBlock, { marginTop: 8 }]}>
                      <Text style={styles.stepText}>{it.text}</Text>
                      <Text style={styles.timestamp}>{formatDate(it.timestamp)}</Text>
                    </View>
                  ))
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* AI bar */}
      <View style={styles.aiBar}>
        {!!Voice && (
          <TouchableOpacity onPress={listening ? stopMic : startMic} style={[styles.aiButton, { marginRight: 8 }, listening && { opacity: 0.6 }]}>
            <Text style={styles.aiButtonText}>{listening ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.aiInput}
          value={aiText}
          onChangeText={setAiText}
          placeholder={aiBusy ? 'Working…' : "AI: 'add fix heater by Thursday under baseline'"}
          editable={!aiBusy}
          onSubmitEditing={handleAIApply}
        />
        <TouchableOpacity style={[styles.aiButton, aiBusy && { opacity: 0.4 }]} disabled={aiBusy} onPress={handleAIApply}>
          <Text style={styles.aiButtonText}>{aiBusy ? '...' : 'AI Apply'}</Text>
        </TouchableOpacity>
      </View>

      {/* manual input bar */}
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

      {/* edit modal */}
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
              onSubmitEditing={() => {
                const t = (editText || '').trim();
                if (!t || !selectedLevel || !selectedItemPath) { setEditVisible(false); return; }
                const updated = JSON.parse(JSON.stringify(threads));
                let node = updated[selectedLevel];
                for (let i = 0; i < selectedItemPath.length; i++) node = i === 0 ? node[selectedItemPath[i]] : node.steps[selectedItemPath[i]];
                node.text = t;
                setThreads(updated);
                setEditVisible(false);
              }}
              autoCapitalize="sentences"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditVisible(false)}><Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const t = (editText || '').trim();
                if (!t || !selectedLevel || !selectedItemPath) { setEditVisible(false); return; }
                const updated = JSON.parse(JSON.stringify(threads));
                let node = updated[selectedLevel];
                for (let i = 0; i < selectedItemPath.length; i++) node = i === 0 ? node[selectedItemPath[i]] : node.steps[selectedItemPath[i]];
                node.text = t;
                setThreads(updated);
                setEditVisible(false);
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b5ed7' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* date picker modal */}
      <Modal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Set target date</Text>

            {DateTimePicker ? (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { if (d) setTempDate(d); }}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#666' }}>Dependency not installed. Using quick picks + manual input (YYYY-MM-DD).</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Today','Tomorrow','Next Mon','Next Thu'].map((label) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.quickBtn]}
                      onPress={() => {
                        const map = { 'Today': quickTarget.today(), 'Tomorrow': quickTarget.tomorrow(), 'Next Mon': quickTarget.nextMon(), 'Next Thu': quickTarget.nextThu() };
                        setTempDate(new Date(map[label]));
                      }}
                    >
                      <Text style={{ fontWeight: '700' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  style={{ backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
                  onChangeText={(t) => {
                    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (m) {
                      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                      if (!isNaN(d)) setTempDate(d);
                    }
                  }}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setTempDate(new Date(quickTarget.today()))}><Text style={{ fontWeight: '700' }}>Today</Text></TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setTempDate(new Date(quickTarget.tomorrow()))}><Text style={{ fontWeight: '700' }}>Tomorrow</Text></TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setTempDate(new Date(quickTarget.nextMon()))}><Text style={{ fontWeight: '700' }}>Next Mon</Text></TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setTempDate(new Date(quickTarget.nextThu()))}><Text style={{ fontWeight: '700' }}>Next Thu</Text></TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => { setTargetOnPath(datePickerLevel, datePickerPath, null); setDateModalVisible(false); }}>
                  <Text style={{ fontSize: 16, color: '#c33' }}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDatePicker}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b5ed7' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 140 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    justifyContent: 'space-between',
  },

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

  stepBlock: { marginTop: 8, backgroundColor: '#f8f8f8', padding: 10, borderRadius: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepText: { fontSize: 15 },
  timestamp: { fontSize: 11, color: '#888', marginTop: 2 },

  disclosureBtn: { paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center', justifyContent: 'center', marginRight: 2, minWidth: 18 },
  disclosureText: { fontSize: 14, fontWeight: '800' },

  moveBtns: { flexDirection: 'row', gap: 4, marginLeft: 6 },
  moveBtn: { backgroundColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
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
  aiInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  aiButton: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  aiButtonText: { color: '#fff', fontWeight: '600' },

  inputBar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  input: { flex: 1, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 10 },
  sendButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: 'bold' },

  swipeLeft: { justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#ffe8cc', borderRightWidth: 1, borderRightColor: '#ffb563' },
  swipeLeftText: { fontWeight: '700', color: '#8a4b00' },
  swipeRight: { justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#e6fcf5', borderLeftWidth: 1, borderLeftColor: '#63e6be' },
  swipeRightText: { fontWeight: '700', color: '#0b7285' },

  dateChip: { backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#cfe0ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  dateChipText: { fontSize: 11, color: '#0b5ed7', fontWeight: '700' },

  quickBtn: { backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});
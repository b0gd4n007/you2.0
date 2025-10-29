function TaskApp({ navigation }) {
  const [inputText, setInputText] = useState('');
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [collapsedSteps, setCollapsedSteps] = useState({});
  const [threads, setThreads] = useState({ baseline: [], execution: [], creative: [] });
  const [menuVisible, setMenuVisible] = useState(false);
  const [overlayMenuVisible, setOverlayMenuVisible] = useState(false);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [baselineLevel, setBaselineLevel] = useState('Medium');
  const [focusedItems, setFocusedItems] = useState([]);

  // AI integration
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('you2_threads');
      const storedFocus = await AsyncStorage.getItem('you2_focus');
      if (stored) setThreads(JSON.parse(stored));
      if (storedFocus) setFocusedItems(JSON.parse(storedFocus));
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem('you2_focus', JSON.stringify(focusedItems));
  }, [focusedItems]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return isNaN(d) ? '' : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!inputText.trim() || !expandedLevel) return;
    const updated = { ...threads };
    const threadIndex = threads[expandedLevel].findIndex((_, i) => expandedThreads[i]);
    const newItem = { text: inputText.trim(), timestamp: Date.now(), completed: false, steps: [] };

    if (threadIndex !== -1) {
      updated[expandedLevel][threadIndex].steps.push(newItem);
    } else {
      updated[expandedLevel].push(newItem);
    }

    setThreads(updated);
    setInputText('');
  };

  const toggleCheckbox = (level, path) => {
    const updated = { ...threads };
    let node = updated[level];
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]].steps;
    node[path.at(-1)].completed = !node[path.at(-1)].completed;
    setThreads(updated);
  };

  const toggleLevel = (level) => setExpandedLevel((prev) => (prev === level ? null : level));
  const toggleThread = (index) => setExpandedThreads((prev) => ({ ...prev, [index]: !prev[index] }));

  const openMenu = (event, level, path) => {
    const { pageX: x, pageY: y } = event.nativeEvent;
    setSelectedItemPath(path);
    setSelectedLevel(level);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  // ✅ New: apply AI edit instructions
  function applyEditInstruction(instr) {
    if (!instr || !instr.action || !instr.level || !Array.isArray(instr.path)) return;

    const updated = JSON.parse(JSON.stringify(threads));
    const level = instr.level;
    const path = instr.path;

    function getParentRefLocal(objLevelArr, fullPath) {
      if (fullPath.length === 0) return null;
      if (fullPath.length === 1) return { arr: objLevelArr, index: fullPath[0] };
      let node = objLevelArr[fullPath[0]];
      for (let i = 1; i < fullPath.length - 1; i++) node = node.steps[fullPath[i]];
      return { arr: node.steps, index: fullPath[fullPath.length - 1] };
    }

    if (instr.action === 'delete') {
      const parentRef = getParentRefLocal(updated[level], path);
      if (parentRef && parentRef.arr && parentRef.index >= 0) {
        parentRef.arr.splice(parentRef.index, 1);
      }
    }

    if (instr.action === 'add') {
      const parentRef = getParentRefLocal(updated[level], path);
      if (parentRef && parentRef.arr) {
        parentRef.arr.push({
          text: instr.text || 'New Task',
          timestamp: Date.now(),
          completed: false,
          steps: [],
        });
      } else {
        let node = updated[level][path[0]];
        for (let i = 1; i < path.length; i++) node = node.steps[path[i]];
        node.steps = node.steps || [];
        node.steps.push({
          text: instr.text || 'New Task',
          timestamp: Date.now(),
          completed: false,
          steps: [],
        });
      }
    }

    setThreads(updated);
  }

  // ✅ New: AI call + apply
  async function handleAIApply() {
    if (!aiText.trim() || aiBusy) return;
    setAiBusy(true);

    try {
      const instr = await askAIToEdit({ threads, instruction: aiText.trim() });
      applyEditInstruction(instr);
      setAiText('');
    } catch (err) {
      console.log('AI error:', err);
    } finally {
      setAiBusy(false);
    }
  }

  // ----- Rendering -----
  const RenderSteps = ({ steps, level, path = [], depth = 1 }) =>
    steps.map((step, idx) => {
      const currentPath = [...path, idx];
      const id = currentPath.join('-');
      const isCollapsed = collapsedSteps[id];

      return (
        <TouchableOpacity key={id} onLongPress={(e) => openMenu(e, level, currentPath)}>
          <View style={[styles.stepBlock, { marginLeft: depth * 10 }]}>
            <View style={styles.stepRow}>
              <Checkbox
                status={step.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleCheckbox(level, currentPath)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{step.text}</Text>
                <Text style={styles.timestamp}>{formatTime(step.timestamp)}</Text>
              </View>
            </View>
            {step.steps?.length > 0 && !isCollapsed && (
              <RenderSteps steps={step.steps} level={level} path={currentPath} depth={depth + 1} />
            )}
          </View>
        </TouchableOpacity>
      );
    });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {['baseline', 'execution', 'creative'].map((level) => (
          <View key={level} style={styles.block}>
            <TouchableOpacity onPress={() => toggleLevel(level)}>
              <Text style={styles.title}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
            </TouchableOpacity>
            {expandedLevel === level &&
              threads[level].map((thread, index) => (
                <View key={index} style={styles.threadBlock}>
                  <View style={styles.threadHeader}>
                    <TouchableOpacity onPress={() => toggleThread(index)}>
                      <Text style={styles.plusButton}>{expandedThreads[index] ? '-' : '+'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onLongPress={(e) => openMenu(e, level, [index])}>
                      <Text style={styles.threadText}>• {thread.text}</Text>
                      <Text style={styles.timestamp}>{formatTime(thread.timestamp)}</Text>
                    </TouchableOpacity>
                  </View>
                  {expandedThreads[index] && (
                    <RenderSteps steps={thread.steps} level={level} path={[index]} />
                  )}
                </View>
              ))}
          </View>
        ))}
      </ScrollView>

      {/* ✅ AI Command Bar */}
      <View style={styles.aiBar}>
        <TextInput
          style={styles.aiInput}
          value={aiText}
          onChangeText={setAiText}
          placeholder={aiBusy ? 'Working...' : "AI command (e.g. 'add fix heater under baseline')"}
          editable={!aiBusy}
        />
        <TouchableOpacity
          style={[styles.aiButton, aiBusy && { opacity: 0.4 }]}
          disabled={aiBusy}
          onPress={handleAIApply}
        >
          <Text style={styles.aiButtonText}>{aiBusy ? '...' : 'AI Apply'}</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type something..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

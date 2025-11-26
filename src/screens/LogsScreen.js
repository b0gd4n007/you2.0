import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { loadNotes, saveNotes } from '../lib/notes';
import { aiEdit } from '../lib/ai';

/**
 * A note-taking screen that allows the user to create, edit, search,
 * and delete notes.  Each note has a title, body, and history of
 * revisions.  The AI buttons can rewrite, summarize, bulletify,
 * or expand the current draft using placeholder functions defined
 * in ../lib/ai.
 */
export default function LogsScreen() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // Load notes from storage on mount
  useEffect(() => {
    loadNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  // Filter notes based on search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => (n.title + ' ' + n.body).toLowerCase().includes(q));
  }, [notes, query]);

  function openNew() {
    const n = {
      id: 'n_' + Date.now(),
      title: '',
      body: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
    };
    setCurrent(n);
    setDraftTitle('');
    setDraftBody('');
    setEditorOpen(true);
  }

  function openExisting(n) {
    setCurrent(n);
    setDraftTitle(n.title);
    setDraftBody(n.body);
    setEditorOpen(true);
  }

  async function hardSave(updated) {
    const next = [...notes];
    const idx = next.findIndex((x) => x.id === updated.id);
    if (idx >= 0) next[idx] = updated;
    else next.unshift(updated);
    setNotes(next);
    await saveNotes(next);
  }

  async function onSave() {
    if (!current) return;
    const updated = {
      ...current,
      title: draftTitle.trim() || 'Untitled',
      body: draftBody,
      updatedAt: Date.now(),
      history: [
        { title: current.title, body: current.body, ts: current.updatedAt },
        ...(current.history || []).slice(0, 9),
      ],
    };
    await hardSave(updated);
    setEditorOpen(false);
  }

  async function onDelete(id) {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const next = notes.filter((n) => n.id !== id);
          setNotes(next);
          await saveNotes(next);
        },
      },
    ]);
  }

  async function onAI(mode) {
    if (!current) return;
    setAiBusy(true);
    try {
      const text = `Title: ${draftTitle}\n\n${draftBody}`.trim();
      const edited = await aiEdit(text, mode);
      // Try to extract a "Title: <...>" line from the result
      let newTitle = draftTitle;
      let newBody = edited;
      const m = /^Title:\s*(.+)$\n?([\s\S]*)/i.exec(edited);
      if (m) {
        newTitle = m[1].trim();
        newBody = m[2] || '';
      }
      setDraftTitle(newTitle);
      setDraftBody(newBody);
    } finally {
      setAiBusy(false);
    }
  }

  function restoreVersion(ix) {
    if (!current || !current.history) return;
    const v = current.history[ix];
    if (!v) return;
    setDraftTitle(v.title);
    setDraftBody(v.body);
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => openExisting(item)}
      style={{
        padding: 12,
        backgroundColor: '#111827',
        borderRadius: 16,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
        {item.title || 'Untitled'}
      </Text>
      <Text style={{ color: '#9CA3AF', marginTop: 6 }} numberOfLines={2}>
        {item.body.replace(/\n/g, ' ') || '—'}
      </Text>
      <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>
        {new Date(item.updatedAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0B1220' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Logs</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#111827',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor="#6B7280"
              style={{ color: 'white' }}
            />
          </View>
          <TouchableOpacity
            onPress={openNew}
            style={{
              backgroundColor: '#2563EB',
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800' }}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <Text style={{ color: '#6B7280', paddingHorizontal: 16 }}>
            No notes yet. Create one and try the AI buttons to clean up your wall of text.
          </Text>
        }
      />

      {/* Editor modal */}
      <Modal
        visible={editorOpen}
        animationType="slide"
        onRequestClose={() => setEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#0B1220' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              padding: 16,
              paddingTop: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity onPress={() => setEditorOpen(false)}>
              <Text style={{ color: '#93C5FD' }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ color: 'white', fontWeight: '800' }}>
              {current && current.title ? 'Edit note' : 'New note'}
            </Text>
            <TouchableOpacity
              onPress={onSave}
              disabled={aiBusy}
              style={{ opacity: aiBusy ? 0.6 : 1 }}
            >
              <Text style={{ color: '#34D399', fontWeight: '800' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: '#111827',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Title"
                placeholderTextColor="#6B7280"
                style={{ color: 'white', fontSize: 18, fontWeight: '700' }}
              />
            </View>
            <View
              style={{
                backgroundColor: '#111827',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 240,
              }}
            >
              <TextInput
                value={draftBody}
                onChangeText={setDraftBody}
                placeholder="Write your note..."
                placeholderTextColor="#6B7280"
                style={{ color: 'white', fontSize: 16, minHeight: 220 }}
                multiline
                textAlignVertical="top"
              />
              <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>
                {draftBody.length} chars
              </Text>
            </View>

            {/* AI actions */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['rewrite', 'Rewrite clearer'],
                ['summarize', 'Summarize'],
                ['bulletify', 'Bulletify'],
                ['expand', 'Expand'],
              ].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => onAI(key)}
                  disabled={aiBusy}
                  style={{
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    opacity: aiBusy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* History */}
            {current && current.history && current.history.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: '#9CA3AF', marginBottom: 8 }}>History</Text>
                {current.history.map((h, ix) => (
                  <TouchableOpacity
                    key={ix}
                    onPress={() => restoreVersion(ix)}
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: '#E5E7EB', fontWeight: '700' }} numberOfLines={1}>
                      {h.title || 'Untitled'}
                    </Text>
                    <Text style={{ color: '#9CA3AF' }} numberOfLines={1}>
                      {new Date(h.ts).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Danger zone */}
            {current && (
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => onDelete(current.id)}
                  style={{
                    backgroundColor: '#DC2626',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '800' }}>Delete note</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
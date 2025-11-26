import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTaskStore = create(
  persist(
    (set, get) => ({
      threads: [],

      addThread: (title) =>
        set({
          threads: [
            {
              id: Date.now().toString(),
              title,
              steps: [],
              focus: false,
            },
            ...get().threads
          ]
        }),

      addStepTop: (threadId, text) =>
        set({
          threads: get().threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  steps: [
                    {
                      id: Date.now().toString(),
                      text,
                      done: false
                    },
                    ...t.steps
                  ]
                }
              : t
          ),
        }),

      toggleStep: (threadId, stepId) =>
        set({
          threads: get().threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  steps: t.steps.map((s) =>
                    s.id === stepId ? { ...s, done: !s.done } : s
                  )
                }
              : t
          ),
        }),

      markFocus: (threadId) =>
        set({
          threads: get().threads.map((t) => ({
            ...t,
            focus: t.id === threadId ? !t.focus : t.focus
          }))
        }),

      upsertThread: (updatedThread) =>
        set({
          threads: get().threads.map((t) =>
            t.id === updatedThread.id ? updatedThread : t
          )
        }),
    }),

    {
      name: 'task-storage',
      storage: AsyncStorage, // <-- NEW MODERN API (no warnings)
    }
  )
);

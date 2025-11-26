// src/services/aiRouter.js

import { useTaskStore } from '../store/useTaskStore';
import { chatMagic } from './chatMagic';
import {
  adaptAIMagicToReducer,
  applyEditInstructionToThreads,
  inferTargetDateFromText,
} from '../utils/aiReducerHelpers';

// chat + suggestion generator
export async function chatAndMaybeAct(userText, history) {
  const { threads } = useTaskStore.getState();

  const { reply, task_instructions } = await chatMagic({
    threads,
    history,
    userText,
  });

  // DO NOT mutate tasks here.
  // We just return suggestions; UI will ask for confirmation.
  return {
    reply,
    suggestedInstructions: task_instructions || [],
  };
}

// helper to actually apply the suggested instructions
export function applySuggestedInstructions(instructions, originalText) {
  const { threads, setThreads } = useTaskStore.getState();
  let stateObj = threads;
  let changed = 0;

  const inferred = inferTargetDateFromText(originalText || '');
  const inferredTs = inferred?.ts ?? null;

  if (Array.isArray(instructions)) {
    for (const hi of instructions) {
      const ops = adaptAIMagicToReducer(stateObj, hi) || [];
      for (const op of ops) {
        const before = JSON.stringify(stateObj);
        stateObj = applyEditInstructionToThreads(op, stateObj, inferredTs);
        if (before !== JSON.stringify(stateObj)) changed++;
      }
    }
  }

  if (changed > 0) {
    setThreads(stateObj);
  }

  return changed;
}


// AImagic.js (hardened)
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || "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", // Replace for local dev
});

const MODEL = "gpt-4o-mini";

const systemPrompt = `
You are an editing engine for a nested task tree.

Your job:
1. Read the user's message.
2. Break it into 0, 1, or MANY clear edit commands.
3. For each clear command, output ONE instruction object.
4. Return ALL of them as a JSON ARRAY.

If there are no valid commands, return [].

Each instruction object must look like:
{
  "action": "add" | "delete" | "complete" | "edit" | "none",
  "level": "baseline" | "execution" | "creative",
  "path": [number,...],
  "text": "string or null",
  "mode": "thread" | "child" | "sibling"
}

Rules:

- "mode":"thread"
  Add a NEW top-level thread to that level.
  Use path: [].

- "mode":"child"
  Add a NEW subtask under the node at that path.
  Example: { level:"baseline", path:[2], mode:"child", text:"call plumber" }
  means "add 'call plumber' as a child of baseline[2]".

- "mode":"sibling"
  Add a NEW item next to the target (same parent).
  Use the SAME path as the target.

- "delete"
  Remove the item at that path.

- "complete"
  Toggle completion for the item at that path.

- "edit"
  Rename the item at that path to the provided text.

VERY IMPORTANT when resolving names:
You are given a "Thread Directory" for each level.
Each thread has an INDEX and TEXT.
When the user says "add X in Y", or "under Y", or "for Y",
you MUST find which thread name best matches Y (case-insensitive substring),
and then:
- level = that thread's level (baseline/execution/creative)
- path = [thatThreadIndex]
- mode = "child"
- text = X

If the user mentions two different targets in one sentence,
you MUST return multiple instruction objects, one per target.

If you cannot confidently match a name to a thread, fallback to adding
as a new top-level thread in baseline:
- action:"add", level:"baseline", mode:"thread", path:[], text:<the task text>

Output ONLY the JSON array. No prose.
`;

function stripCodeFences(s) {
  if (!s) return s;
  return s.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function askAIToEdit({ threads, instruction }) {
  // Build a "Thread Directory" summary to help targeting by name
  function summarizeLevel(levelName) {
    const arr = threads[levelName] || [];
    return arr.map((t, idx) => ({
      index: idx,
      text: t.text || "",
    }));
  }

  const threadDirectory = {
    baseline: summarizeLevel("baseline"),
    execution: summarizeLevel("execution"),
    creative: summarizeLevel("creative"),
  };

  const userPrompt = `
Current task tree (full JSON):
${JSON.stringify(threads, null, 2)}

Thread Directory:
${JSON.stringify(threadDirectory, null, 2)}

User request:
${instruction}

Return ONLY the JSON ARRAY of instruction objects as described.
`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    let raw = completion.choices?.[0]?.message?.content || '[]';
    raw = stripCodeFences(raw);

    // Try parse normally
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // fallback splitter if model forgot brackets
      const pieces = raw
        .trim()
        .replace(/}\s*{/g, "}|SPLIT|{")
        .split("|SPLIT|");

      const objs = [];
      for (const p of pieces) {
        try {
          objs.push(JSON.parse(p));
        } catch (e2) {
          // skip
        }
      }
      parsed = objs;
    }

    if (!Array.isArray(parsed)) parsed = [parsed];
    parsed = parsed.filter(Boolean);
    return parsed;
  } catch (err) {
    console.log("askAIToEdit error:", err?.message || err);
    return [];
  }
}

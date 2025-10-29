// AImagic.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "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", // use your test key for now
});

const MODEL = "gpt-4o-mini";

// === define the systemPrompt ===
const systemPrompt = `
You are an editing engine for a nested task tree.

Your job:
- Read the user's message.
- Break it into 0, 1, or MANY clear edit commands.
- For each clear command, output one instruction object.
- Return ALL of them as a JSON ARRAY.

If there are no valid commands, return [].

Each instruction object must look like:
{
  "action": "add" | "delete" | "complete" | "edit" | "none",
  "level": "baseline" | "execution" | "creative",
  "path": [number,...],
  "text": "string or null",
  "mode": "thread" | "child"
}

Rules:
- Only return valid JSON (array form).
- If a command cannot be resolved, skip it.
- For example:
  [
    { "action": "add", "level": "baseline", "path": [0], "text": "fix heater", "mode": "child" },
    { "action": "add", "level": "baseline", "path": [0], "text": "buy new hose", "mode": "child" }
  ]
`;

export async function askAIToEdit({ threads, instruction }) {
  const userPrompt = `
Current task tree (JSON):
${JSON.stringify(threads, null, 2)}

User request:
${instruction}

Return the edit instructions as JSON.
`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content;
    console.log("RAW AI:", raw);

    // handle single object, array, or multiple concatenated JSONs
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const pieces = raw
        .trim()
        .replace(/}\s*{/g, "}|SPLIT|{")
        .split("|SPLIT|");
      const objs = [];
      for (const p of pieces) {
        try {
          objs.push(JSON.parse(p));
        } catch (e2) {
          console.log("Skipping bad chunk:", p);
        }
      }
      parsed = objs;
    }

    if (!Array.isArray(parsed)) parsed = [parsed];
    parsed = parsed.filter(Boolean);

    return parsed;
  } catch (err) {
    console.log("askAIToEdit error:", err);
    return [];
  }
}

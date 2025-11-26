// src/services/AImagic.js
// React Native–safe OpenAI caller that turns a user instruction
// into an array of structured edit commands.
//
// Returned instruction shape:
//
// {
//   action: "add" | "delete" | "edit",
//   type: "thread" | "step" | "substep",
//   title: string,          // new or existing title
//   old_title: string|null, // for edit/rename
//   parent_title: string|null, // parent node title for step/substep
//   targetDate: number|null     // always null for now
// }

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// TODO: move this out of code. For now keep it so it actually runs.
const API_KEY = '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';

export async function askAIToEdit({ threads, instruction }) {
  // If you forgot to set the key, just don't even call the API
  if (!API_KEY || API_KEY === 'YOUR_OPENAI_KEY_HERE') {
    console.log('[AImagic] Missing API key, returning no instructions');
    return [];
  }

  const systemPrompt = `
You convert user text about tasks into a JSON ARRAY of edit instructions.

Return ONLY valid JSON. No markdown, no backticks, no explanations.

Each object in the array MUST have this shape:
{
  "action": "add" | "delete" | "edit",
  "type": "thread" | "step" | "substep",
  "title": "string",
  "old_title": "string or null",
  "parent_title": "string or null",
  "targetDate": null
}

Semantics:
- action = "add": create new items.
- action = "delete": remove existing items by title.
- action = "edit": rename an existing item from old_title to title.

Types:
- type = "thread": top-level item (e.g. "Laptop", "Boat").
- type = "step": direct child of a thread.
- type = "substep": child of a step.

Fields:
- title: for add → new title; for delete → title to delete; for edit → new title.
- old_title: ONLY for edit, the previous title. null for add/delete.
- parent_title: for step/substep → the title of the parent node. For thread → null.
- targetDate: always null. Date logic is handled by the app, not by you.

Examples:

User: add laptop
Output:
[
  {
    "action": "add",
    "type": "thread",
    "title": "Laptop",
    "old_title": null,
    "parent_title": null,
    "targetDate": null
  }
]

User: add laptop and boat and at laptop add mouse and at boat add sink and at sink add buy connector
Output:
[
  { "action": "add", "type": "thread",  "title": "Laptop",        "old_title": null, "parent_title": null,   "targetDate": null },
  { "action": "add", "type": "thread",  "title": "Boat",          "old_title": null, "parent_title": null,   "targetDate": null },
  { "action": "add", "type": "step",    "title": "Mouse",         "old_title": null, "parent_title": "Laptop","targetDate": null },
  { "action": "add", "type": "step",    "title": "Sink",          "old_title": null, "parent_title": "Boat",  "targetDate": null },
  { "action": "add", "type": "substep", "title": "Buy Connector", "old_title": null, "parent_title": "Sink",  "targetDate": null }
]

User: delete boat
Output:
[
  { "action": "delete", "type": "thread", "title": "Boat", "old_title": null, "parent_title": null, "targetDate": null }
]

User: rename laptop to car
Output:
[
  { "action": "edit", "type": "thread", "title": "Car", "old_title": "Laptop", "parent_title": null, "targetDate": null }
]

If the request is not about changing tasks, return [].
  `.trim();

  const userPrompt = `
User instruction:
${instruction}
`.trim();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      console.log('[AImagic] HTTP error', response.status, txt);
      return [];
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || '[]';

    // Strip accidental ```json fences if the model ignores instructions
    content = content
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.log('[AImagic] JSON parse failed, content was:', content);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.log('[AImagic] Model returned non-array JSON, ignoring');
      return [];
    }

    // Normalise / sanitise into the exact shape the rest of the app expects
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((ins) => {
        const action =
          ins.action === 'delete' || ins.action === 'edit' ? ins.action : 'add';
        const type =
          ins.type === 'step' || ins.type === 'substep'
            ? ins.type
            : 'thread';

        const title =
          typeof ins.title === 'string' ? ins.title.trim() : '';
        const old_title =
          typeof ins.old_title === 'string' && ins.old_title.trim()
            ? ins.old_title.trim()
            : null;
        const parent_title =
          typeof ins.parent_title === 'string' && ins.parent_title.trim()
            ? ins.parent_title.trim()
            : null;

        return {
          action,
          type,
          title,
          old_title,
          parent_title,
          targetDate: null,
        };
      })
      .filter((ins) => ins.title || ins.old_title);
  } catch (err) {
    console.log('[AImagic] network or other error', err);
    return [];
  }
}

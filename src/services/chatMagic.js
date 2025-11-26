// src/services/chatMagic.js

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o'; // "chat brain", can change later

// reuse same key as AImagic for now
const API_KEY = 'YOUR_OPENAI_KEY_HERE';

export async function chatMagic({ threads, history, userText }) {
  if (!API_KEY || API_KEY === 'YOUR_OPENAI_KEY_HERE') {
    console.log('[chatMagic] Missing API key');
    return { reply: "I can't reach the model right now.", task_instructions: [] };
  }

  const systemPrompt = `
You are a sharp, grounded assistant helping someone manage their life.

1) Talk like a human, short and clear. Help them think, prioritise, and calm down.
2) ALSO detect hidden tasks and structure.

You must return ONLY valid JSON with this exact shape:

{
  "reply": "what you say back in chat, as a short paragraph",
  "task_instructions": [
    {
      "action": "add" | "delete" | "edit",
      "type": "thread" | "step" | "substep",
      "title": "string",
      "old_title": "string or null",
      "parent_title": "string or null",
      "targetDate": null
    }
  ]
}

Rules:
- "thread" = top-level item ("Boat", "Fix finances").
- "step" = directly under a thread.
- "substep" = under a step.
- For now, only create tasks when it's obviously useful.
- If you're not sure, put an empty array for "task_instructions".
- Never mention JSON or instructions in "reply".
- Always be concise and normal, not robotic.

Example:

User: "Man, the boat is stressing me. I need to fix the sink and the wiring, and also sort the bathroom floor this week. I’ve got like: measure, buy plywood, find a plumber, and probably order that connector."

Possible output:

{
  "reply": "Okay, boat first. Sink, wiring, and floor are the three pillars. You don't need to fix the whole boat this week, just move each one a step: measure the floor, list what wiring you actually need, and decide on plumber vs DIY for the sink.",
  "task_instructions": [
    { "action": "add", "type": "thread",  "title": "Boat - Sink",           "old_title": null, "parent_title": null,          "targetDate": null },
    { "action": "add", "type": "substep", "title": "Order connector",      "old_title": null, "parent_title": "Boat - Sink", "targetDate": null },
    { "action": "add", "type": "thread",  "title": "Boat - Wiring",        "old_title": null, "parent_title": null,          "targetDate": null },
    { "action": "add", "type": "thread",  "title": "Boat - Bathroom Floor","old_title": null, "parent_title": null,          "targetDate": null },
    { "action": "add", "type": "substep", "title": "Measure floor area",   "old_title": null, "parent_title": "Boat - Bathroom Floor","targetDate": null },
    { "action": "add", "type": "substep", "title": "Buy plywood",          "old_title": null, "parent_title": "Boat - Bathroom Floor","targetDate": null }
  ]
}
  `.trim();

  const historyLines = (history || [])
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  const userPrompt = `
Conversation so far:
${historyLines}

Current task tree (for context only):
${JSON.stringify(threads || {}, null, 2)}

User just said:
"${userText}"

Respond with JSON only.
`.trim();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          // you could send a few prior turns instead of a big blob later
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.log('[chatMagic] HTTP error', res.status, txt);
      return { reply: 'Something broke on my side.', task_instructions: [] };
    }

    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content || '{}';

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
      console.log('[chatMagic] JSON parse failed, content:', content);
      return { reply: 'I got confused trying to parse that.', task_instructions: [] };
    }

    const reply =
      typeof parsed.reply === 'string'
        ? parsed.reply.trim()
        : 'Okay.';

    const task_instructions = Array.isArray(parsed.task_instructions)
      ? parsed.task_instructions
          .filter((x) => x && typeof x === 'object')
          .map((ins) => ({
            action:
              ins.action === 'delete' || ins.action === 'edit'
                ? ins.action
                : 'add',
            type:
              ins.type === 'step' || ins.type === 'substep'
                ? ins.type
                : 'thread',
            title: typeof ins.title === 'string' ? ins.title.trim() : '',
            old_title:
              typeof ins.old_title === 'string' && ins.old_title.trim()
                ? ins.old_title.trim()
                : null,
            parent_title:
              typeof ins.parent_title === 'string' && ins.parent_title.trim()
                ? ins.parent_title.trim()
                : null,
            targetDate: null,
          }))
      : [];

    return { reply, task_instructions };
  } catch (err) {
    console.log('[chatMagic] network/error', err);
    return { reply: 'Network error. Try again.', task_instructions: [] };
  }
}

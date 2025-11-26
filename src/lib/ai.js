// Lightweight AI editing functions.  This module exposes a single
// async function, aiEdit, which takes user input and a mode and
// returns a transformed string.  In a production environment you
// would replace the implementations with calls to your LLM service.

/**
 * Entry point for AI editing.  Accepts text and a mode string
 * ('rewrite', 'summarize', 'bulletify', 'expand') and returns the
 * edited output.  The function includes a small delay to simulate
 * network latency.
 * @param {string} input The raw text to transform
 * @param {'rewrite'|'summarize'|'bulletify'|'expand'} mode The edit mode
 */
export async function aiEdit(input, mode) {
  // artificial delay to mimic asynchronous API calls
  await sleep(250);
  switch (mode) {
    case 'summarize':
      return quickSummarize(input);
    case 'bulletify':
      return bulletify(input);
    case 'expand':
      return expand(input);
    default:
      return rewrite(input);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ensure "Title:" uses consistent casing and strip whitespace-only lines.
function rewrite(text) {
  return text
    .replace(/^Title:/i, 'Title:')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

// Quickly summarize by picking a handful of sentences.  Extracts a
// title if provided and prepends it to the summary.
function quickSummarize(text) {
  const body = text.replace(/^[\s\S]*?\n\n/, '');
  const sentences = body.split(/[.!?]\s+/).filter(Boolean);
  const count = sentences.length;
  const pick = sentences.slice(0, Math.max(1, Math.min(3, Math.ceil(count / 3))));
  const summary = pick.join('. ') + (pick.length ? '.' : '');
  const titleMatch = /^Title:\s*(.+)/im.exec(text);
  const title = titleMatch ? `Title: ${titleMatch[1]}` : 'Title: Summary';
  return `${title}\n\n${summary}`;
}

// Convert paragraphs into bullet points.  Extracts a title if
// provided and prepends it.
function bulletify(text) {
  const body = text.replace(/^[\s\S]*?\n\n/, '');
  const lines = body.split(/\n+/).filter(Boolean);
  const bullets = lines.map((l) => `• ${l.replace(/^[-•\s]+/, '')}`);
  const titleMatch = /^Title:\s*(.+)/im.exec(text);
  const title = titleMatch ? `Title: ${titleMatch[1]}` : 'Title: Bullet points';
  return `${title}\n\n${bullets.join('\n')}`;
}

// Expand a note by adding prompts for additional details.  Extracts
// a title if provided and prepends it.
function expand(text) {
  const titleMatch = /^Title:\s*(.+)/im.exec(text);
  const title = titleMatch ? `Title: ${titleMatch[1]}` : 'Title: Expanded note';
  const body = text.replace(/^[\s\S]*?\n\n/, '');
  const more =
    '\n\nDetails:\n- Context: clarify the who/what/when.\n- Why it matters: 1–2 sentences.\n- Next steps: 2–3 bullets.';
  return `${title}\n\n${body}${more}`;
}
// Central type definitions used by the global task store.  Keeping
// definitions in one place avoids circular dependencies and makes it
// easier to extend fields later (e.g. adding priority or due date).

/**
 * A single actionable step within a thread.  Steps can be marked
 * complete, contain a title, and record their creation time.
 * @typedef {Object} Step
 * @property {string} id - Unique identifier for the step
 * @property {string} title - Text content of the step
 * @property {boolean} done - Whether the step is completed
 * @property {number} createdAt - Timestamp of creation (ms since epoch)
 */

/**
 * A thread represents a collection of related steps.  It may also be
 * focused (shown on the Today page) and has its own creation time.
 * @typedef {Object} Thread
 * @property {string} id - Unique identifier for the thread
 * @property {string} title - Title of the thread
 * @property {Step[]} steps - Ordered list of steps, newest first
 * @property {boolean} [focus] - Flag indicating if the thread is in focus
 * @property {number} createdAt - Timestamp of creation
 */

/**
 * Log entries capture various categories of life data (food, mood,
 * dreams, events, insights, etc.).  Each entry stores its own
 * category, freeform text, and timestamp.
 * @typedef {Object} LogEntry
 * @property {string} id - Unique identifier
 * @property {"food"|"supplement"|"gym"|"sleep"|"walk"|"mood"|"dream"|"insight"|"event"} kind
 *   The type of log entry
 * @property {string} text - The content of the log entry
 * @property {number} createdAt - Timestamp of creation
 */
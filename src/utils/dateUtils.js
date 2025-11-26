// dateUtils.js
// Helper functions for dealing with dates and times.  These were extracted
// from the original TaskApp component to make the codebase modular.  Each
// function behaves exactly as before.

// Check if two timestamps fall on the same calendar day.
export const isSameDay = (aTs, bTs) => {
  const a = new Date(aTs), b = new Date(bTs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

// Determine if a timestamp includes a non‑midnight time.  If `allDayFlag` is
// true the clock time is ignored.
export const hasClockTimeTs = (ts, allDayFlag) => {
  if (!ts || allDayFlag) return false;
  const d = new Date(ts);
  return !(d.getHours() === 0 && d.getMinutes() === 0);
};

// Format a timestamp as HH:MM.  Uses the device locale for leading zeros.
export const hhmm = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Return a short weekday string (Mon, Tue, …) for a timestamp.
export const weekdayShortTs = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short' });

// Compute the next occurrence of a weekday at an optional time.  Weekdays
// are numbers 0–6 (Sun=0).  If `timeObj` has {h, m}, those hours/minutes
// are applied; otherwise the time is set to midnight.  The result is a
// Unix timestamp in milliseconds.
export const nextWeeklyAt = (weekday, timeObj /* {h,m} or null */, from = new Date()) => {
  const base = new Date(from);
  const t = new Date(base);
  let delta = (weekday - base.getDay() + 7) % 7;
  if (delta === 0 && timeObj) {
    const after = base.getHours() > timeObj.h || (base.getHours() === timeObj.h && base.getMinutes() >= timeObj.m);
    if (after) delta = 7;
  }
  t.setDate(base.getDate() + delta);
  if (timeObj) t.setHours(timeObj.h, timeObj.m, 0, 0); else t.setHours(0, 0, 0, 0);
  return t.getTime();
};

// Format a timestamp as DD MMM YYYY.  Returns an empty string for invalid
// dates.
export const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format a timestamp as "DD MMM YYYY • HH:MM".  Returns an empty string
// for invalid dates.
export const formatDateTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
};

// True if a timestamp represents today.
export const isToday = (ts) => {
  const a = new Date(ts);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

// Return the start of the day (midnight) for a Date object as a timestamp.
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Add n days to a Date and return a new Date.
export const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
};

// Compute the next occurrence of a weekday name starting from `from`.
export const nextWeekdayFrom = (weekdayName, from = new Date()) => {
  const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const targetIdx = WEEKDAYS.indexOf(weekdayName.toLowerCase());
  if (targetIdx < 0) return null;
  const curr = from.getDay();
  let delta = targetIdx - curr;
  if (delta <= 0) delta += 7; // next upcoming
  return startOfDay(addDays(from, delta));
};

// Quick target presets for scheduling tasks.  Each returns a timestamp
// (start of the day) appropriate for the chosen shortcut.
export const quickTarget = {
  today: () => startOfDay(new Date()),
  tomorrow: () => startOfDay(addDays(new Date(), 1)),
  nextMon: () => nextWeekdayFrom('monday'),
  nextThu: () => nextWeekdayFrom('thursday'),
};

// Infer a target date and allDay flag from free text.  Returns an
// object { ts, allDay } where ts may be null if no target is detected.
export const inferTargetDateFromText = (text) => {
  if (!text) return { ts: null, allDay: null };
  const t = text.toLowerCase();

  // Helper to parse times like "14:30", "2pm", "2:15pm", "2 p.m.", "14h".
  const parseTime = (s) => {
    const m1 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);               // 14:30
    const m2 = s.match(/\b([1-9]|1[0-2])\s*(:([0-5]\d))?\s*(am|pm)\b/); // 2pm / 2:15pm
    const m3 = s.match(/\b([01]?\d|2[0-3])\s*h\b/);                      // 14h
    if (m1) return { h: +m1[1], m: +m1[2] };
    if (m2) return { h: ((+(m2[1]) % 12) + (m2[4] === 'pm' ? 12 : 0)), m: m2[3] ? +m2[3] : 0 };
    if (m3) return { h: +m3[1], m: 0 };
    return null;
  };

  const shortMap = { mon:'monday', tue:'tuesday', tues:'tuesday', wed:'wednesday', thu:'thursday', thur:'thursday', thurs:'thursday', fri:'friday', sat:'saturday', sun:'sunday' };

  // today / tomorrow
  if (/\bby\s+(today)\b/.test(t)) {
    const time = parseTime(t);
    if (time) {
      const d = new Date();
      d.setHours(time.h, time.m, 0, 0);
      return { ts: d.getTime(), allDay: false };
    }
    return { ts: quickTarget.today(), allDay: true };
  }
  if (/\bby\s+(tomorrow|tmrw|tmr)\b/.test(t)) {
    const time = parseTime(t);
    const d = addDays(new Date(), 1);
    if (time) {
      d.setHours(time.h, time.m, 0, 0);
      return { ts: d.getTime(), allDay: false };
    }
    return { ts: startOfDay(d).getTime(), allDay: true };
  }

  // by <weekday> [time]
  const mW = t.match(/\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/);
  if (mW) {
    const wd = shortMap[mW[1]] || mW[1];
    const base = nextWeekdayFrom(wd);
    const time = parseTime(t);
    if (time) {
      const d = new Date(base);
      d.setHours(time.h, time.m, 0, 0);
      return { ts: d.getTime(), allDay: false };
    }
    return { ts: base, allDay: true };
  }

  // lone time like "by 18:00" / "by 6pm"
  const timeOnly = parseTime(t);
  if (/\bby\b/.test(t) && timeOnly) {
    const d = new Date();
    const now = new Date();
    d.setHours(timeOnly.h, timeOnly.m, 0, 0);
    // if time already passed today, roll to tomorrow
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return { ts: d.getTime(), allDay: false };
  }

  return { ts: null, allDay: null };
};
/* HTD core — state, school calendar, training plan, planner, calendar feeds.
   No DOM rendering here; ui.js draws everything. Exposed as window.HTD. */
(() => {
"use strict";
const D = window.HTD_DATA;
const KEY = "htd.v1";
const CATS = {
  school: "School", college: "College", lawn: "Lawn Lads", volunteer: "Volunteering",
  training: "Training", health: "Health", other: "Other",
};
const CAT_COLORS = {
  school: "#4d8dff", college: "#a46bff", lawn: "#2fd27a", volunteer: "#ffa133",
  training: "#ff4d6a", health: "#22d3c5", other: "#8b93a7",
};

// ---------- date helpers ----------
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYMD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d); };
const todayStr = () => ymd(new Date());
const daysBetween = (a, b) => Math.round((parseYMD(b) - parseYMD(a)) / 86400000);
const toMin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60; };
const fmtMin = m => { m = Math.round(m); let h = Math.floor(m / 60) % 24, mm = m % 60; const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return `${h}:${pad(mm)}${ap}`; };
const fmtHM = m => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (s, long) => { const d = parseYMD(s); return long ? d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`; };
const relDay = s => {
  const n = daysBetween(todayStr(), s);
  if (n < -1) return `${-n} days late`; if (n === -1) return "Yesterday"; if (n === 0) return "Today";
  if (n === 1) return "Tomorrow"; if (n < 7) return DOW[parseYMD(s).getDay()]; return fmtDate(s);
};
const fmtDur = m => { m = Math.round(m); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h ${r}m` : `${h}h`; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- state ----------
const defaults = () => ({
  tasks: D.seedTasks.map(t => ({ id: uid(), done: false, notes: "", source: "seed", ...t })),
  events: [], hours: [],
  colleges: D.colleges.map(c => ({ ...c, notes: "" })),
  scholarships: [], feeds: [],
  training: { raceName: "", raceDate: "", startLong: 6, peakLong: 12, goal: "", weekdayTime: "15:30", weekendTime: "08:00" },
  health: {}, workoutsDone: {},
  settings: {
    wake: "06:30", bed: "22:30", dinner: "18:30",
    periods: [{ start: "08:30", end: "10:00" }, { start: "10:07", end: "11:37" }, { start: "12:13", end: "13:43" }],
    homeworkMins: 60, links: { ...D.links }, motion: "full",
  },
});
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
if (!S) S = defaults();
S = { ...defaults(), ...S, settings: { ...defaults().settings, ...(S.settings || {}) }, training: { ...defaults().training, ...(S.training || {}) } };
const listeners = [];
// On the website, plain-text copies only stay on this device if "Remember" was ticked at login.
const SITE = /\.github\.io$/i.test(location.hostname) || (location.hostname === "127.0.0.1" && /[?&]site=1\b/.test(location.search));
const saveHooks = [];
const save = () => {
  try { if (!SITE || window.HTD_REMEMBER) localStorage.setItem(KEY, JSON.stringify(S)); else localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  saveHooks.forEach(f => f());
};
const changed = () => { save(); listeners.forEach(f => f()); };
save();

// ---------- school calendar ----------
const SC = D.school;
function isSchoolDay(s) { const dw = parseYMD(s).getDay(); return dw > 0 && dw < 6 && !SC.noSchool[s] && s >= SC.firstDay && s <= SC.lastDay; }
function noSchoolReason(s) {
  const dw = parseYMD(s).getDay();
  if (s < SC.firstDay || s > SC.lastDay) return "Summer";
  if (dw === 0 || dw === 6) return "Weekend";
  return SC.noSchool[s] || null;
}
const abCache = {};
function abDay(s) {
  if (!isSchoolDay(s)) return null;
  if (abCache[s]) return abCache[s];
  const a = SC.abAnchor.date; let n = 0;
  if (s >= a) { for (let d = a; d < s; d = addDays(d, 1)) if (isSchoolDay(addDays(d, 1))) n++; }
  else { for (let d = a; d > s; d = addDays(d, -1)) if (isSchoolDay(addDays(d, -1))) n++; }
  const other = SC.abAnchor.day === "A" ? "B" : "A";
  return (abCache[s] = n % 2 === 0 ? SC.abAnchor.day : other);
}
function nextSchoolDay(s) { let d = addDays(s, 1); for (let i = 0; i < 30 && !isSchoolDay(d); i++) d = addDays(d, 1); return d; }

// ---------- training plan ----------
function longRunMiles(s) {
  const t = S.training, start = +t.startLong || 6, peak = +t.peakLong || 12;
  if (!t.raceDate) return start;
  const wo = Math.floor(daysBetween(s, t.raceDate) / 7);
  if (wo < 0) return Math.max(3, Math.round(start * 0.6));
  if (wo === 0) return 0;
  if (wo === 1) return Math.round(peak * 0.65);
  if (wo <= 3) return peak;
  let m = Math.max(start, peak - (wo - 3));
  if (wo % 4 === 0) m = Math.max(start - 1, m - 2);
  return Math.min(m, peak);
}
function workoutFor(s) {
  const t = S.training, dw = parseYMD(s).getDay();
  if (t.raceDate && s === t.raceDate) return { title: `RACE DAY · ${t.raceName || "Half Marathon"}`, mins: 150, sub: t.goal ? `Goal ${t.goal}` : "Start slow. Have fun." };
  const raceWeek = t.raceDate && daysBetween(s, t.raceDate) >= 0 && daysBetween(s, t.raceDate) < 7;
  const post = t.raceDate && s > t.raceDate && daysBetween(t.raceDate, s) <= 7;
  if (post) return dw === 0 || dw === 3 ? { title: "Recovery spin or walk", mins: 30, sub: "Post-race week" } : dw === 6 ? { title: "Easy run 3 mi", mins: 30, sub: "Post-race week" } : null;
  const L = longRunMiles(s);
  const easy = Math.max(3, Math.round(L * 0.4)), q = Math.max(4, Math.round(L * 0.5));
  switch (dw) {
    case 1: return { title: "Strength + mobility", mins: 40, sub: "Legs, core, hips" };
    case 2: return { title: `Easy run · ${raceWeek ? 3 : easy} mi`, mins: (raceWeek ? 3 : easy) * 10, sub: "Conversational pace" };
    case 3: return { title: "Swim", mins: raceWeek ? 20 : 40, sub: "Ironman base · technique + steady laps" };
    case 4: return raceWeek ? { title: "Shakeout · 3 mi + strides", mins: 30, sub: "Race week" } : { title: `Tempo · ${q} mi`, mins: q * 10, sub: "Warm up, work, cool down" };
    case 5: return { title: "Rest + 15 min mobility", mins: 15, sub: "Recovery day" };
    case 6: return raceWeek ? { title: "Rest or 20 min easy", mins: 20, sub: "Race week" } : { title: `Long run · ${L} mi`, mins: L * 10, sub: "Easy pace, fuel + water" };
    case 0: return { title: raceWeek ? "Easy spin · 30 min" : "Bike ride", mins: raceWeek ? 30 : 60, sub: "Ironman base · aerobic" };
  }
}

// ---------- priority ----------
// Higher = do sooner. Mixes due date, priority, and size.
function urgency(t) {
  const n = t.due ? daysBetween(todayStr(), t.due) : 21;
  const dueScore = n < 0 ? 100 + Math.min(-n, 10) * 4 : Math.max(0, 90 - n * 9);
  return Math.round(dueScore + ((+t.pri || 2) - 2) * 18);
}
function lane(t) {
  const n = t.due ? daysBetween(todayStr(), t.due) : 99;
  if (n <= 1 || (+t.pri === 3 && n <= 3)) return "now";
  if (n <= 7) return "soon";
  return "later";
}
const openTasks = () => S.tasks.filter(t => !t.done).sort((a, b) => urgency(b) - urgency(a));

// ---------- planner ----------
function fixedBlocks(s) {
  const st = S.settings, out = [], school = isSchoolDay(s);
  if (school) {
    const ab = abDay(s);
    SC.classes[ab].forEach((c, i) => {
      const p = st.periods[i];
      out.push({ start: toMin(p.start), end: toMin(p.end), title: c.name, kicker: `Period ${c.period}`, sub: c.full, cat: "school", fixed: true });
    });
  }
  const w = workoutFor(s);
  if (w) {
    const start = toMin(school ? S.training.weekdayTime : S.training.weekendTime);
    out.push({ start, end: start + w.mins, title: w.title, kicker: "Workout", sub: w.sub, cat: "training", fixed: true, workout: true });
  }
  S.events.filter(e => e.date === s).forEach(e => {
    if (!e.start) { out.push({ allDay: true, title: e.title, kicker: CATS[e.cat], cat: e.cat, sub: e.sub || "", id: e.id }); return; }
    const st0 = toMin(e.start), en = e.end ? toMin(e.end) : st0 + 60;
    out.push({ start: st0, end: en > st0 ? en : st0 + 60, title: e.title, kicker: e.cat === "lawn" ? "Lawn Lads job" : CATS[e.cat], sub: e.sub || "", cat: e.cat, fixed: true, id: e.id });
  });
  out.push({ start: toMin(st.dinner), end: toMin(st.dinner) + 30, title: "Dinner", kicker: "Break", cat: "other", fixed: true, soft: true });
  return out;
}
function freeSlots(s, fixed, fromMin) {
  const st = S.settings;
  let dayStart = isSchoolDay(s) ? toMin(st.periods[st.periods.length - 1].end) + 15 : toMin(st.wake) + 60;
  if (fromMin != null) dayStart = Math.max(dayStart, fromMin);
  const dayEnd = toMin(st.bed) - 30;
  const busy = fixed.filter(b => !b.allDay).map(b => [b.start - 5, b.end + 5]).sort((a, b) => a[0] - b[0]);
  const slots = []; let cur = dayStart;
  for (const [a, b] of busy) {
    if (b <= cur) continue;
    if (a > cur) slots.push([cur, Math.min(a, dayEnd)]);
    cur = Math.max(cur, b);
    if (cur >= dayEnd) break;
  }
  if (cur < dayEnd) slots.push([cur, dayEnd]);
  return slots.filter(([a, b]) => b - a >= 15);
}
function plan(start, days) {
  const rem = new Map(S.tasks.filter(t => !t.done).map(t => [t.id, Math.max(5, +t.mins || 30)]));
  const out = {};
  for (let i = 0; i < days; i++) {
    const s = addDays(start, i);
    const fixed = fixedBlocks(s), blocks = [...fixed];
    const slots = freeSlots(s, fixed, s === todayStr() ? Math.ceil(nowMin() / 5) * 5 : null);
    const queue = [];
    const nxt = nextSchoolDay(s);
    if (daysBetween(s, nxt) === 1 || (parseYMD(s).getDay() === 0 && daysBetween(s, nxt) === 1)) {
      const ab = abDay(nxt);
      queue.push({ id: "hw-" + s, title: `Homework · prep for ${ab} day`, sub: SC.classes[ab].map(c => c.name).join(" · "), cat: "school", mins: +S.settings.homeworkMins || 60, synthetic: true });
    }
    S.tasks.filter(t => !t.done && rem.get(t.id) > 0)
      .map(t => ({ ...t, score: urgency(t) + (t.due ? -Math.max(0, daysBetween(s, todayStr())) : 0) }))
      .sort((a, b) => b.score - a.score).forEach(t => queue.push(t));
    let budget = 240;
    for (const slot of slots) {
      let [a, b] = slot;
      while (b - a >= 15 && budget > 0 && queue.length) {
        const t = queue[0];
        const left = t.synthetic ? t.mins : rem.get(t.id);
        const chunk = Math.min(left, 60, b - a, budget);
        if (chunk < Math.min(15, left)) break;
        blocks.push({ start: a, end: a + chunk, title: t.title, kicker: t.synthetic ? "Study" : "Task", sub: t.sub || (t.due ? `Due ${relDay(t.due)}` : ""), cat: t.cat, taskId: t.synthetic ? null : t.id });
        if (t.synthetic) { t.mins -= chunk; if (t.mins <= 0) queue.shift(); }
        else { rem.set(t.id, left - chunk); if (left - chunk <= 0) queue.shift(); }
        budget -= chunk; a += chunk + 5;
      }
    }
    blocks.sort((x, y) => (x.allDay ? -1 : x.start) - (y.allDay ? -1 : y.start));
    out[s] = blocks;
  }
  return out;
}
// Full fixed schedule for today (including past blocks) merged with planned tasks for the rest.
function today() {
  const s = todayStr();
  return plan(s, 1)[s];
}

// ---------- deadlines ----------
function deadlines(limit = 12) {
  const t = todayStr();
  const items = [
    ...SC.keyDates.map(k => ({ ...k, cat: "school" })),
    ...D.clubs.nhs.deadlines.map(k => ({ ...k, cat: "volunteer" })),
    ...D.clubs.beta.deadlines.map(k => ({ ...k, cat: "volunteer" })),
    ...D.clubs.beta.betaCon.map(k => ({ ...k, cat: "volunteer" })),
    ...S.scholarships.filter(x => x.due && !["Submitted", "Won", "Not selected"].includes(x.status)).map(x => ({ date: x.due, label: "Scholarship · " + x.name, cat: "college" })),
  ];
  if (S.training.raceDate) items.push({ date: S.training.raceDate, label: S.training.raceName || "Half marathon", cat: "training" });
  Object.entries(SC.noSchool).forEach(([d, l]) => { if (!SC.noSchool[addDays(d, -1)] || parseYMD(d).getDay() === 1) items.push({ date: d, label: "No school · " + l, cat: "school", off: true }); });
  const seen = new Set();
  return items.filter(i => i.date >= t).sort((a, b) => a.date < b.date ? -1 : 1)
    .filter(i => { const k = i.date + i.label; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}

// ---------- clubs ----------
const semOf = s => s >= "2026-08-01" && s <= "2027-01-15" ? "fall" : "spring";
function clubStats(key) {
  const entries = S.hours.filter(h => h.club === key || h.club === "both");
  const total = entries.reduce((a, h) => a + (+h.hours || 0), 0);
  const events = entries.filter(h => h.betaEvent && semOf(h.date) === semOf(todayStr())).length;
  return { total, events, entries };
}

// ---------- quick-add parser ----------
const CAT_WORDS = {
  school: /\b(school|canvas|bio|biology|english|math|tok|hoa|history|sehs|sports ex\w*|test|quiz|exam|essay|ia|ee|cas|homework|hw|lab|study|read)\b/i,
  college: /\b(college|app|application|scholarship|fafsa|css|unc|ncsu|nc state|uncw|common ?app|admissions|portal|counselor|transcript|rec letter|recommendation|recs)\b/i,
  lawn: /\b(lawn|mow|mowing|edge|jobber|invoice|quote|client|leaf|leaves|mulch|pine straw|trim|lawn lads)\b/i,
  volunteer: /\b(nhs|beta|volunteer|service|hours|validation)\b/i,
  training: /\b(run|swim|bike|ride|workout|race|tempo|long run|ironman|marathon|gym|lift)\b/i,
  health: /\b(sleep|doctor|dentist|physical|appointment|meds|stretch|health)\b/i,
};
function parseQuick(text) {
  let t = " " + text + " ";
  const out = { cat: null, due: "", mins: 30, pri: 2 };
  const tag = t.match(/#(\w+)/);
  if (tag) { const k = Object.keys(CATS).find(c => c.startsWith(tag[1].toLowerCase()) || CATS[c].toLowerCase().startsWith(tag[1].toLowerCase())); if (k) out.cat = k; t = t.replace(tag[0], " "); }
  if (/!!|!\s|\bhigh\b|\burgent\b/i.test(t)) { out.pri = 3; t = t.replace(/!+|\b(high|urgent)\b/gi, " "); }
  else if (/\blow\b/i.test(t)) { out.pri = 1; t = t.replace(/\blow\b/i, " "); }
  const m = t.match(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b/i);
  if (m) { out.mins = Math.round(/^h/i.test(m[2]) ? +m[1] * 60 : +m[1]); t = t.replace(m[0], " "); }
  const today = todayStr();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  let dm;
  if ((dm = t.match(/\b(today|tonight)\b/i))) out.due = today;
  else if ((dm = t.match(/\b(tomorrow|tmrw|tmr)\b/i))) out.due = addDays(today, 1);
  else if ((dm = t.match(/\b(?:next\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\b/i))) {
    const target = days.indexOf(dm[1].slice(0, 3).toLowerCase());
    let n = (target - parseYMD(today).getDay() + 7) % 7 || 7; if (/next/i.test(dm[0]) && n < 7) n += 7;
    out.due = addDays(today, n);
  } else if ((dm = t.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    let y = parseYMD(today).getFullYear(); let s = `${y}-${pad(dm[1])}-${pad(dm[2])}`; if (s < today) s = `${y + 1}-${pad(dm[1])}-${pad(dm[2])}`; out.due = s;
  } else if ((dm = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i))) {
    const mo = MON.findIndex(x => x.toLowerCase() === dm[1].slice(0, 3).toLowerCase()) + 1;
    let y = parseYMD(today).getFullYear(); let s = `${y}-${pad(mo)}-${pad(dm[2])}`; if (s < today) s = `${y + 1}-${pad(mo)}-${pad(dm[2])}`; out.due = s;
  } else if ((dm = t.match(/\bin\s+(\d+)\s+days?\b/i))) out.due = addDays(today, +dm[1]);
  if (dm) t = t.replace(dm[0], " ");
  t = t.replace(/\b(due|by|on)\s*$/i, " ").replace(/\s+(due|by|on)\s+/gi, " ");
  if (!out.cat) out.cat = Object.keys(CAT_WORDS).find(k => CAT_WORDS[k].test(text)) || "other";
  out.title = t.replace(/\s+/g, " ").trim();
  return out;
}

// ---------- smart add (free, runs in the browser) ----------
// Turns messy typed/spoken text into clean items: splits multiple things,
// strips filler, fixes names and abbreviations, and pulls out dates/times.
const VERBS = "finish|do|study|review|mow|edge|trim|ask|email|e-mail|call|text|message|submit|sign up|signup|log|send|pay|buy|get|pick up|read|write|practice|run|swim|bike|ride|lift|schedule|book|apply|check|turn in|register|meet|go|make|fix|clean|quote|invoice|bill|prep|prepare|start|work on|print|return|order|fill out|complete|update|follow up|reply|respond|talk to|tell|remind|find|look into|research|plan|clear|rake|blow|mulch|bring|drop off|take|visit|grab|renew|cancel|set up|upload|download|watch|memorize|outline|draft|edit|proofread|validate|volunteer|help|attend";
const VERB_RE = new RegExp(`^(?:${VERBS})\\b`, "i");
const LEAD_RE = /^(?:(?:and|also|then|plus|so|oh|and then|but|okay|ok|alright)\s+)*(?:(?:i|we)\s+(?:really\s+)?(?:need|have|has|got|gotta|should|must|want|wanna|'ve got|have got|gonna|am gonna|'m gonna|will|'ll)\s+(?:to\s+)?|i\s*'?ve\s+got\s+to\s+|i\s*'?m\s+supposed\s+to\s+|gotta\s+|got\s+to\s+|need\s+to\s+|have\s+to\s+|remember\s+to\s+|don'?t\s+forget\s+to\s+|make\s+sure\s+(?:to|i|that\s+i)\s+|let'?s\s+|to\s?do:?\s*|reminder:?\s*|remind\s+me\s+to\s+)*/i;
const FILLER_RE = /\b(?:u+m+|u+h+|e+r+m*|hmm+|like|kinda|sorta|kind of|sort of|basically|literally|actually|honestly|just|really|you know|i mean|or whatever|or something|and stuff|and everything|or so|somehow|probably|maybe)\b/gi;
const ABBR = [
  [/\brec\s+letters?\b/gi, m => /s$/i.test(m) ? "recommendation letters" : "recommendation letter"], [/\brecs\b/gi, "recommendations"], [/\brec\b/gi, "recommendation"],
  [/\bhw\b/gi, "homework"], [/\bapps\b/gi, "applications"], [/\bapp\b(?!le)/gi, "application"], [/\bassignmt\b/gi, "assignment"],
  [/\bbio\b/gi, "Bio"], [/\bbiology\b/gi, "Biology"], [/\benglish\b/gi, "English"], [/\bmath\b/gi, "Math"], [/\btok\b/gi, "TOK"], [/\bhoa\b/gi, "HOA"],
  [/\bsehs\b/gi, "SEHS"], [/\bsports ex(?:ercise)?\b/gi, "Sports Exercise"], [/\bib\b/gi, "IB"], [/\bia\b/gi, "IA"], [/\bee\b/gi, "EE"], [/\bcas\b/gi, "CAS"],
  [/\bunc ?w\b/gi, "UNCW"], [/\bunc chapel hill\b/gi, "UNC Chapel Hill"], [/\bunc\b/gi, "UNC"], [/\bnc ?state\b/gi, "NC State"], [/\bncsu\b/gi, "NC State"],
  [/\bfafsa\b/gi, "FAFSA"], [/\bcommon ?app\b/gi, "Common App"], [/\bcss profile\b/gi, "CSS Profile"], [/\bnhs\b/gi, "NHS"], [/\bbeta club\b/gi, "Beta Club"], [/\bbeta\b/gi, "Beta"],
  [/\bcanvas\b/gi, "Canvas"], [/\bjobber\b/gi, "Jobber"], [/\binfinite campus\b/gi, "Infinite Campus"], [/\blawn lads\b/gi, "Lawn Lads"], [/\bsat\b(?= (?:test|exam|prep|practice|score|scores))/gi, "SAT"], [/\bact\b(?= (?:test|exam|prep|practice|score|scores))/gi, "ACT"],
  [/\bmr\.?\s+(\w)/gi, (m, c) => "Mr. " + c.toUpperCase()], [/\bmrs\.?\s+(\w)/gi, (m, c) => "Mrs. " + c.toUpperCase()], [/\bms\.?\s+(\w)/gi, (m, c) => "Ms. " + c.toUpperCase()],
  [/\bdr\.?\s+(\w)/gi, (m, c) => "Dr. " + c.toUpperCase()], [/\bcoach\s+(\w)/gi, (m, c) => "Coach " + c.toUpperCase()],
  [/\bthe (\w+) thing\b/gi, "the $1"], [/\b(\w+) thing\b/gi, "$1"], [/\bstuff\b/gi, ""], [/\bw\/\s*/gi, "with "], [/\b(?:u)\b/gi, "you"], [/\bpls\b/gi, ""],
];
const COMMON = new Set("the a an my his her their our lawn lawns yard yards grass front back side hedges hedge leaves bushes beds trees gutters weeds quote quotes invoice invoices client clients mom dad him her them it this that for about some all new old next hours mowers blades supplies tools jobs visits".split(" "));
const DAYMAP = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
function nextDow(from, dow, nextWeek) { let n = (dow - parseYMD(from).getDay() + 7) % 7 || 7; if (nextWeek && n < 7) n += 7; return addDays(from, n); }
function extractWhen(s) {
  const today = todayStr(); let date = "", before = false, m;
  if (/\bbefore\b/i.test(s)) before = true;
  const take = re => { const r = s.match(re); if (r) s = s.replace(r[0], " "); return r; };
  if ((m = take(/\b(?:today|tonight|this (?:morning|afternoon|evening))\b/i))) date = today;
  else if ((m = take(/\b(?:tomorrow|tmrw|tmr|tmw)\b/i))) date = addDays(today, 1);
  else if ((m = take(/\bnext\s+([ab])\s*day\b/i))) { let d = addDays(today, 1); for (let i = 0; i < 40 && abDay(d) !== m[1].toUpperCase(); i++) d = addDays(d, 1); date = d; }
  else if ((m = take(/\b(?:the\s+)?day after tomorrow\b/i))) date = addDays(today, 2);
  else if ((m = take(/\b(?:this\s+)?weekend\b/i))) date = nextDow(addDays(today, -1), 6);
  else if ((m = take(/\b(?:end of (?:the|this) week|this week)\b/i))) date = nextDow(addDays(today, -1), 5);
  else if ((m = take(/\bnext week\b/i))) date = nextDow(today, 1);
  else if ((m = take(/\bin\s+(\d+|a|one|two|three)\s+(day|days|week|weeks)\b/i))) { const n = { a: 1, one: 1, two: 2, three: 3 }[m[1].toLowerCase()] || +m[1]; date = addDays(today, /week/i.test(m[2]) ? n * 7 : n); }
  else if ((m = take(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)\b(?!\s+(?:test|exam|prep|practice|score))/i))) { const k = m[2].toLowerCase(); date = nextDow(today, k.startsWith("thu") ? 4 : DAYMAP[k.slice(0, 3)], !!m[1]); }
  else if ((m = take(/\b(\d{1,2})\/(\d{1,2})\b/))) { const y = parseYMD(today).getFullYear(); let d = `${y}-${pad(m[1])}-${pad(m[2])}`; if (d < today) d = `${y + 1}-${pad(m[1])}-${pad(m[2])}`; date = d; }
  else if ((m = take(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i))) { const mo = MON.findIndex(x => x.toLowerCase() === m[1].slice(0, 3).toLowerCase()) + 1; const y = parseYMD(today).getFullYear(); let d = `${y}-${pad(mo)}-${pad(m[2])}`; if (d < today) d = `${y + 1}-${pad(mo)}-${pad(m[2])}`; date = d; }
  if (date && before && date > today) date = addDays(date, -1);
  // time of day
  let start = "";
  if ((m = take(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\s|$|[,.])/i))) { let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; start = `${pad(h)}:${m[2] || "00"}`; }
  else if ((m = take(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i))) { let h = +m[1]; if (h >= 1 && h <= 6) h += 12; start = `${pad(h)}:${m[2] || "00"}`; }
  else if ((m = take(/\bat\s+noon\b/i))) start = "12:00";
  // duration
  let mins = 0;
  if ((m = take(/\bfor\s+(?:an?\s+)?(\d+(?:\.\d+)?)?\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i))) mins = Math.round((/^h/i.test(m[2]) ? 60 : 1) * (+m[1] || 1));
  else if ((m = take(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i))) mins = Math.round((/^h/i.test(m[2]) ? 60 : 1) * +m[1]);
  else if ((m = take(/\b(?:an|one)\s+hour\b/i))) mins = 60;
  else if ((m = take(/\bhalf (?:an )?hour\b/i))) mins = 30;
  return { s, date, start, mins };
}
function guessMins(title, cat, isEvent) {
  if (isEvent) return 60;
  if (/\b(essay|IA|EE|project|lab report|application)\b/i.test(title)) return 90;
  if (/\b(study|test|exam|quiz|lab|outline|draft|scholarship)\b/i.test(title)) return 60;
  if (/\b(email|text|call|ask|tell|reply|remind|sign up|submit|check|log|validate|pay|order)\b/i.test(title)) return 10;
  if (/\b(invoice|quote|bill)\b/i.test(title)) return 15;
  if (cat === "lawn") return 60;
  if (cat === "school") return 45;
  return 30;
}
function cleanTitle(raw, cat) {
  let t = " " + raw + " ";
  t = t.replace(FILLER_RE, " ");
  for (const [re, rep] of ABBR) t = t.replace(re, rep);
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(LEAD_RE, "").trim();
  t = t.replace(/^(?:the|a|an|to)\s+/i, "");
  t = t.replace(/\s+(?:by|on|due|before|for|at|this|next|until|till|and|or|then|please|asap|due date)\s*$/i, "").replace(/[,.;:!?\-–]+$/g, "").trim();
  // "do the bio lab" → "Finish Bio lab"
  t = t.replace(/^do\s+(?:the|my|that)?\s*(?=.*\b(?:lab|homework|essay|assignment|worksheet|project|IA|EE|reading|problems|questions|packet|notes|report|test corrections)\b)/i, "Finish ");
  t = t.replace(/^(?:(?:get|be)\s+(?:done|finished)\s+with)\s+/i, "Finish ");
  // capitalize a client name right after a lawn verb: "mow hendersons" → "Mow Hendersons"
  t = t.replace(/^(mow|edge|trim|quote|invoice|bill|call|text|email|visit|rake|mulch|blow)\s+(?:the\s+)?([a-z][\w'-]*)/i, (m, v, name) => COMMON.has(name.toLowerCase()) ? m : `${v} ${name.charAt(0).toUpperCase()}${name.slice(1)}`);
  if (cat === "lawn") t = t.replace(/\b(to|for|at|the)\s+(?:the\s+)?([a-z]+s)\b/g, (m, p, name) => COMMON.has(name) ? m : m.replace(name, name.charAt(0).toUpperCase() + name.slice(1)));
  if (!VERB_RE.test(t) && cat === "school" && /\b(lab|homework|essay|assignment|worksheet|project|IA|EE|reading|packet|report)\b/i.test(t)) t = "Finish " + t.replace(/^(?:my|the)\s+/i, "");
  t = t.replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function smartParse(text) {
  const marked = " " + String(text).replace(/\s+/g, " ") + " ";
  const splitVerb = new RegExp(`\\s+(?:and|&)\\s+(?:then\\s+)?(?=(?:i\\s|i'|gotta|got to|need to|have to|remember|also|${VERBS})\\b)`, "gi");
  const splitter = new RegExp(`\\s*(?:\\|\\|\\||[.;!?\\n]+(?=\\s|$)|,\\s*(?:and\\s+)?(?:then\\s+|also\\s+)?(?=(?:i\\s|i'|gotta|got to|need to|have to|remember|also|and|then|plus|${VERBS})\\b)|\\s+(?:and then also|and then|also|plus|then)\\s+)\\s*`, "i");
  const pieces = marked.replace(splitVerb, " ||| ")
    .split(splitter)
    .map(p => p.trim()).filter(p => p && p.replace(FILLER_RE, "").replace(/[^a-z0-9]/gi, "").length > 2);
  const items = [];
  for (const piece of pieces) {
    let pri = 2, s = piece;
    if (/\b(urgent|asap|important|super important|really need|need to really|stressing|critical)\b|!/i.test(s)) { pri = 3; s = s.replace(/\b(urgent|asap|important|super important|critical)\b|!+/gi, " "); }
    else if (/\b(whenever|eventually|someday|no rush|low priority|at some point|if i have time)\b/i.test(s)) { pri = 1; s = s.replace(/\b(whenever|eventually|someday|no rush|low priority|at some point|if i have time)\b/gi, " "); }
    const w = extractWhen(s);
    let cat = Object.keys(CAT_WORDS).find(k => CAT_WORDS[k].test(piece)) || "other";
    if (cat === "other" && /\b(mow|edge|trim|mulch|rake)\b/i.test(piece)) cat = "lawn";
    const title = cleanTitle(w.s, cat);
    if (!title || title.length < 2) continue;
    const isEvent = !!w.start;
    items.push({ kind: isEvent ? "event" : "task", title, cat, date: w.date || (isEvent ? todayStr() : ""), start: w.start, mins: w.mins || guessMins(title, cat, isEvent), pri, notes: "" });
  }
  return items;
}

// ---------- grouping helpers ----------
const CLASS_WORDS = { tok: /\b(tok|theory of knowledge)\b/i, hoa: /\b(hoa|history|apush)\b/i, math: /\b(math|calc|calculus|analysis|aa)\b/i, sehs: /\b(sehs|sports ex\w*|exercise science)\b/i, english: /\b(english|lit|literature|io|paper 1|paper 2)\b/i, bio: /\b(bio|biology)\b/i };
const classOf = t => t.cls || Object.keys(CLASS_WORDS).find(k => CLASS_WORDS[k].test(t.title)) || "";
function collegeOf(t) {
  if (t.org) return t.org;
  const s = t.title;
  if (/\bnc ?state\b|\bncsu\b/i.test(s)) return "ncsu";
  if (/\bunc ?w\b|\bunc[- ]wilmington\b/i.test(s)) return "uncw";
  if (/\bunc\b(?!w)|chapel hill/i.test(s)) return "unc";
  const c = (S.colleges || []).find(x => x.name && new RegExp(`\\b${x.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s));
  return c ? c.id : "";
}
const clubOf = t => t.org || (/\bnhs\b|honor society/i.test(t.title) ? "nhs" : /\bbeta\b/i.test(t.title) ? "beta" : "");

// ---------- calendar feeds (.ics) ----------
function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const evs = []; let cur = null;
  const unesc = v => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
  const dt = (val, params) => {
    const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null };
    const d = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
    return { date: ymd(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  };
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur && cur.start) evs.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const [name, ...ps] = line.slice(0, i).split(";"); const params = ps.join(";"); const val = line.slice(i + 1);
    if (name === "UID") cur.uid = val;
    else if (name === "SUMMARY") cur.summary = unesc(val);
    else if (name === "LOCATION") cur.location = unesc(val);
    else if (name === "URL") cur.url = val;
    else if (name === "DTSTART") cur.start = dt(val, params);
    else if (name === "DTEND") cur.end = dt(val, params);
  }
  return evs;
}
function importFeed(feed, text) {
  const evs = parseICS(text);
  const lo = addDays(todayStr(), -14), hi = addDays(todayStr(), 120);
  let added = 0;
  if (feed.type === "canvas") {
    for (const e of evs) {
      if (!e.start || e.start.date < lo || e.start.date > hi) continue;
      const extId = feed.id + ":" + (e.uid || e.summary + e.start.date);
      const ex = S.tasks.find(t => t.extId === extId);
      const title = (e.summary || "Canvas item").trim();
      if (ex) { ex.title = title; ex.due = e.start.date; continue; }
      S.tasks.push({ id: uid(), extId, source: feed.label, title, cat: "school", due: e.start.date, mins: 45, pri: 2, done: e.start.date < todayStr(), notes: e.url || "" });
      added++;
    }
  } else {
    S.events = S.events.filter(x => x.feedId !== feed.id);
    for (const e of evs) {
      if (!e.start || e.start.date < lo || e.start.date > hi) continue;
      S.events.push({ id: uid(), feedId: feed.id, title: (e.summary || "Event").trim(), date: e.start.date, start: e.start.time, end: e.end && e.end.date === e.start.date ? e.end.time : null, cat: feed.type === "jobber" ? "lawn" : "other", sub: e.location || feed.label });
      added++;
    }
  }
  feed.lastSync = new Date().toISOString(); feed.error = null;
  changed();
  return added;
}
async function syncFeed(feed) {
  if (location.protocol === "file:") throw new Error("Start server.py to sync feeds");
  if (SITE) throw new Error("Calendar links only sync when HTD runs on your Mac. On the website, use 'Import an .ics file'.");
  try {
    const r = await fetch("/api/ics?url=" + encodeURIComponent(feed.url));
    if (!r.ok) throw new Error((await r.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140) || r.status);
    return importFeed(feed, await r.text());
  } catch (e) { feed.error = String(e.message || e); changed(); throw e; }
}
async function autoSync() {
  for (const f of S.feeds) if (f.url && (!f.lastSync || Date.now() - new Date(f.lastSync) > 3600e3)) { try { await syncFeed(f); } catch { /* shown on feed card */ } }
}

window.HTD = {
  D, CATS, CAT_COLORS, get S() { return S; }, set S(v) { S = v; }, defaults, save, changed, onChange: f => listeners.push(f),
  SITE, onSave: f => saveHooks.push(f),
  load(v) { const d = defaults(); S = { ...d, ...v, settings: { ...d.settings, ...(v.settings || {}) }, training: { ...d.training, ...(v.training || {}) } }; },
  pad, ymd, parseYMD, addDays, todayStr, daysBetween, toMin, nowMin, fmtMin, fmtHM, fmtDate, relDay, fmtDur, DOW, MON, esc, uid,
  isSchoolDay, noSchoolReason, abDay, nextSchoolDay, workoutFor, longRunMiles,
  urgency, lane, openTasks, plan, today, fixedBlocks, deadlines, clubStats, parseQuick, smartParse, classOf, collegeOf, clubOf, importFeed, syncFeed, autoSync,
};
})();

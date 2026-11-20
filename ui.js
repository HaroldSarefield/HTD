/* HTD UI — pages: Main, Review, Calendar, six area pages, Settings. Logic lives in core.js. */
(() => {
"use strict";
const H = window.HTD;
const { D, CATS, esc, fmtMin, fmtDate, relDay, fmtDur, todayStr, addDays, daysBetween, parseYMD, toMin, uid } = H;
const S = () => H.S;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CODE = { school: "SCH", college: "COL", lawn: "LWN", volunteer: "VOL", training: "TRN", health: "HLT", other: "GEN" };
const AREAS = ["school", "college", "lawn", "volunteer", "health", "training"];
const MONU = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const two = n => String(n).padStart(2, "0");
const code = c => `<span class="code">${CODE[c] || "GEN"}</span>`;
const longDate = s => { const d = parseYMD(s); return `${H.DOW[d.getDay()]} ${d.getDate()} ${MONU[d.getMonth()]} ${d.getFullYear()}`; };
const mondayOf = s => addDays(s, -((parseYMD(s).getDay() + 6) % 7));
const ALLCLASSES = [...D.school.classes.A.map(c => ({ ...c, day: "A" })), ...D.school.classes.B.map(c => ({ ...c, day: "B" }))];
const HABITS = () => [["sleep", "8+ hours of sleep"], ["water", "80+ oz water"], ["protein", "Protein with every meal"], ["mobility", "10 min stretching / mobility"], ["screens", `Screens off by ${fmtMin(toMin(S().settings.bed))}`]];

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
const dueHTML = t => {
  if (!t.due) return `<span class="due">No date</span>`;
  const n = daysBetween(todayStr(), t.due);
  return `<span class="due ${n < 0 ? "late" : n <= 1 ? "close" : ""}">${relDay(t.due)}</span>`;
};
function tcard(t, showArea) {
  return `<div class="tcard" data-id="${t.id}" data-act="edit">
    <button class="check" data-act="done" aria-label="Mark done"></button>
    <div><span class="tt">${esc(t.title)}</span>
      <div class="tmeta">${showArea ? code(t.cat) : ""}${dueHTML(t)}<span>${fmtDur(t.mins || 30)}</span>${+t.pri === 3 ? `<span class="hi">▲ High</span>` : ""}</div></div></div>`;
}
const list = (tasks, opts = {}) => tasks.length ? tasks.slice(0, opts.max || 99).map(t => tcard(t, opts.area)).join("") + (tasks.length > (opts.max || 99) ? `<div class="empty">+ ${tasks.length - opts.max} more</div>` : "") : `<div class="empty">${opts.empty || "Nothing to do"}</div>`;
const open = cat => H.openTasks().filter(t => !cat || t.cat === cat);
function nowState() {
  const nm = H.nowMin(), bl = H.today();
  const cur = bl.find(b => !b.allDay && nm >= b.start && nm < b.end && !b.soft);
  const next = bl.filter(b => !b.allDay && b.start > nm && b !== cur && !b.soft);
  return { nm, bl, cur, next };
}
function clockText() { const d = new Date(); let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return { h, m: two(d.getMinutes()), ap }; }
const pageHead = (eyebrow, title, stat, actions = "") => `<div class="page-h"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div><div class="meta">${stat ? `<div class="stat">${stat}</div>` : ""}<div class="actions">${actions}</div></div></div>`;
const subHead = (title, label = "") => `<div class="sub-h"><h2>${title}</h2>${label ? `<span class="label">${label}</span>` : ""}</div>`;
const extLinks = links => links.map(([l, u]) => `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">${l} ↗</a>`).join("");

// ---------- add box (free smart parsing) ----------
const ad = { text: "", items: null, listening: false, error: "" };
function addBoxHTML() {
  const review = ad.items ? `
    <div class="review">
      <div class="review-h"><p>${ad.items.length ? `Found ${ad.items.length} item${ad.items.length === 1 ? "" : "s"} — check them, then add.` : "Couldn't find anything to add in that."}</p></div>
      ${ad.items.map((it, i) => `<div class="ritem ${it.off ? "off" : ""}" data-i="${i}">
        <input type="checkbox" data-r="on" ${it.off ? "" : "checked"} aria-label="Include">
        <label>${it.kind === "event" ? "Event" : "Task"}<input type="text" data-r="title" value="${esc(it.title)}"></label>
        <label>Area<select data-r="cat">${AREAS.concat("other").map(c => `<option value="${c}" ${c === it.cat ? "selected" : ""}>${CATS[c]}</option>`).join("")}</select></label>
        <label>${it.kind === "event" ? "Date" : "Due"}<input type="date" data-r="date" value="${esc(it.date)}"></label>
        ${it.kind === "event" ? `<label>Start<input type="time" data-r="start" value="${esc(it.start)}"></label>` : `<label>Minutes<input type="number" data-r="mins" min="5" step="5" value="${it.mins}"></label>`}
        <label>Priority<select data-r="pri"><option value="3" ${it.pri == 3 ? "selected" : ""}>High</option><option value="2" ${it.pri == 2 ? "selected" : ""}>Med</option><option value="1" ${it.pri == 1 ? "selected" : ""}>Low</option></select></label>
        <button class="x" data-act="r-del" aria-label="Remove">✕</button>
      </div>`).join("")}
      <div class="review-f"><button class="btn ghost sm" data-act="r-cancel">Cancel</button>${ad.items.length ? `<button class="btn solid sm" data-act="r-add">Add ${ad.items.filter(i => !i.off).length} to HTD</button>` : ""}</div>
    </div>` : "";
  return `<div class="ai" id="addBox">
    <div class="ai-row">
      <div class="ai-tag"><i></i>Add</div>
      <textarea id="aiText" rows="1" placeholder="Type or talk — “gotta finish the bio lab by friday, mow the hendersons sat at 9, and ask mrs k for a rec letter”">${esc(ad.text)}</textarea>
      <button class="ai-mic ${ad.listening ? "rec" : ""}" data-act="mic" type="button"><span class="dot"></span><span>${ad.listening ? "Listening" : "Speak"}</span></button>
      <button class="ai-go" data-act="ai-go" type="button">Add →</button>
    </div>
    <div class="ai-status">${ad.error ? `<b>${esc(ad.error)}</b>` : "Free · cleans up your wording, splits multiple things, and finds dates and times · you review before anything is added"}<span class="grow"></span><span>⌘↵ to send</span></div>
    ${review}
  </div>`;
}
function renderAdd() {
  const box = $("#addBox"); if (!box) return;
  const hadFocus = document.activeElement && document.activeElement.id === "aiText";
  box.outerHTML = addBoxHTML();
  const ta = $("#aiText"); autosize(ta);
  if (hadFocus) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}
function autosize(ta) { if (!ta) return; ta.style.height = "auto"; ta.style.height = Math.min(200, ta.scrollHeight) + "px"; }
function addSend() {
  const text = ($("#aiText")?.value || ad.text).trim();
  if (!text) return;
  stopMic();
  ad.text = text; ad.error = "";
  ad.items = H.smartParse(text).map(it => ({ ...it, off: false }));
  renderAdd();
}
function addCommit() {
  const st = S(); let n = 0;
  (ad.items || []).filter(it => !it.off && it.title.trim()).forEach(it => {
    if (it.kind === "event" && it.date) {
      const end = it.start ? H.fmtHM(toMin(it.start) + (+it.mins || 60)) : null;
      st.events.push({ id: uid(), title: it.title.trim(), date: it.date, start: it.start || null, end, cat: it.cat, sub: CATS[it.cat] });
    } else st.tasks.push({ id: uid(), done: false, source: "me", title: it.title.trim(), cat: it.cat, due: it.date || "", mins: +it.mins || 30, pri: +it.pri || 2, notes: "" });
    n++;
  });
  ad.items = null; ad.text = ""; ad.error = "";
  renderAdd(); H.changed(); toast(`Added ${n} item${n === 1 ? "" : "s"}`);
}
let rec = null;
function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { ad.error = "Voice isn't supported in this browser — open HTD in Chrome or Safari, or use Mac dictation (press fn twice)."; renderAdd(); return; }
  rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
  const base = ($("#aiText")?.value || "").trim();
  rec.onresult = e => {
    let txt = ""; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    const ta = $("#aiText"); if (!ta) return;
    ta.value = (base ? base + " " : "") + txt.trim(); ad.text = ta.value; autosize(ta);
  };
  rec.onerror = e => { ad.error = e.error === "not-allowed" ? "Microphone access was blocked. Allow it in the browser to use voice." : `Voice error: ${e.error}`; ad.listening = false; renderAdd(); };
  rec.onend = () => { if (ad.listening) { ad.listening = false; renderAdd(); } };
  try { rec.start(); ad.listening = true; ad.error = ""; renderAdd(); } catch { ad.error = "Couldn't start the microphone."; renderAdd(); }
}
function stopMic() { if (rec && ad.listening) { ad.listening = false; try { rec.stop(); } catch { /* ignore */ } } }

// ---------- what's on a given day (calendar + drawer) ----------
function dayItems(d) {
  const st = S(), out = [];
  const dl = [...D.school.keyDates, ...D.clubs.nhs.deadlines, ...D.clubs.beta.deadlines, ...D.clubs.beta.betaCon].filter(k => k.date === d);
  dl.forEach(k => out.push({ k: "dl", title: k.label }));
  st.scholarships.filter(x => x.due === d).forEach(x => out.push({ k: "dl", title: "Scholarship: " + x.name }));
  if (st.training.raceDate === d) out.push({ k: "dl", title: st.training.raceName || "Race day" });
  st.events.filter(e => e.date === d).sort((a, b) => (a.start || "") < (b.start || "") ? -1 : 1).forEach(e => out.push({ k: "ev", title: e.title, time: e.start ? fmtMin(toMin(e.start)) : "", cat: e.cat, id: e.id }));
  st.tasks.filter(t => t.due === d).sort((a, b) => a.done - b.done || b.pri - a.pri).forEach(t => out.push({ k: "task", title: t.title, cat: t.cat, id: t.id, done: t.done }));
  const w = H.workoutFor(d); if (w) out.push({ k: "wo", title: w.title, done: !!st.workoutsDone[d] });
  return out;
}

// ---------- pages ----------
const P = {};

P[""] = () => {
  const s = todayStr(), { nm, bl, cur, next } = nowState();
  const all = open(), top = all[0], c = clockText(), ab = H.abDay(s);
  let st;
  if (cur) st = { tag: "Now", title: cur.title, sub: [cur.kicker, `${fmtMin(cur.start)}–${fmtMin(cur.end)}`].filter(Boolean).join(" · "), pct: (nm - cur.start) / (cur.end - cur.start), left: `${fmtDur(cur.end - nm)} left`, block: cur };
  else { const n0 = next[0]; st = { tag: "Free time — best use", title: top ? top.title : "You're clear.", sub: top ? `${CATS[top.cat]} · ${top.due ? "due " + relDay(top.due).toLowerCase() : "no date"} · ${fmtDur(top.mins)}` : "Nothing urgent.", pct: n0 ? Math.max(0.03, 1 - (n0.start - nm) / 240) : 1, left: n0 ? `${fmtDur(n0.start - nm)} until ${n0.title}` : "Free the rest of the day", task: top }; }
  const wDone = !!S().workoutsDone[s];
  const actions = st.block?.taskId ? `<button class="btn solid sm" data-act="done-id" data-id="${st.block.taskId}">Mark done</button>`
    : st.block?.workout ? `<button class="btn solid sm" data-act="workout-done" data-date="${s}">${wDone ? "Undo workout" : "Workout done"}</button>`
    : st.task ? `<button class="btn solid sm" data-act="done-id" data-id="${st.task.id}">Mark done</button><button class="btn sm" data-act="edit-id" data-id="${st.task.id}">Edit</button>` : "";
  const sched = bl.filter(b => !b.soft);
  return `${addBoxHTML()}
  <section class="block">
    <div class="block-h"><h2>Today</h2><span class="label">${longDate(s)} · ${ab ? `${ab} day — ${D.school.classes[ab].map(x => x.name).join(" · ")}` : `No school — ${esc(H.noSchoolReason(s))}`}</span></div>
    <div class="today-grid">
      <div class="now-box">
        <div class="clock"><span id="bigClock">${c.h}:${c.m}</span><sup>${c.ap}</sup></div>
        <div class="now-tag label"><i></i>${st.tag}</div>
        <div class="now-title">${esc(st.title)}</div><div class="now-sub">${esc(st.sub)}</div>
        <div class="meter"><div class="meter-bar"><i style="--p:${Math.max(0, Math.min(1, st.pct)).toFixed(3)}"></i></div><span>${esc(st.left)}</span></div>
        <div class="now-actions">${actions}</div>
      </div>
      <div><div class="col-h"><span class="label">Schedule</span><span class="label">${sched.length} items</span></div>
        ${sched.map(b => `<div class="srow ${!b.allDay && b.end <= nm ? "past" : ""} ${b === cur ? "now" : ""} ${b.taskId || b.kicker === "Study" ? "task" : ""}"><time>${b.allDay ? "ALL DAY" : fmtMin(b.start)}</time>${code(b.cat)}<b>${esc(b.title)}</b></div>`).join("") || `<div class="empty">Nothing scheduled</div>`}</div>
      <div><div class="col-h"><span class="label">Top priorities</span><span class="label">${all.length} open</span></div>${list(all, { area: true, max: 5, empty: "Nothing open" })}</div>
    </div>
  </section>
  <section class="block">
    <div class="block-h"><h2>Areas</h2><span class="label">Tap an area for its full page</span></div>
    <div class="cells c3">${AREAS.map(cat => { const t = open(cat); return `<div class="ov" data-go="#/${cat}">
      <div class="cell-h">${code(cat)}<h3>${CATS[cat]}</h3><span class="label">${t.length} open</span></div>
      <div class="cell-sub">${areaStat(cat)}</div>${list(t, { max: 3 })}<div class="go">Open ${CATS[cat]} →</div></div>`; }).join("")}</div>
  </section>
  <section class="block">
    <div class="block-h"><h2>Coming up</h2><span class="label"><a href="#/calendar" style="color:inherit">Full calendar →</a></span></div>
    ${H.deadlines(8).map(i => { const n = daysBetween(s, i.date); return `<div class="arow ${i.off ? "off" : ""}"><div class="cd">${n === 0 ? "Today" : n}${n ? `<small>${n === 1 ? "DAY" : "DAYS"}</small>` : ""}</div><div class="dt">${fmtDate(i.date)}</div><div class="lb">${esc(i.label)}</div>${code(i.cat)}</div>`; }).join("")}
  </section>`;
};
function areaStat(cat) {
  const s = todayStr(), st = S();
  if (cat === "school") { const ab = H.abDay(s), nxt = H.nextSchoolDay(s); return ab ? `${ab} day today · next: ${relDay(nxt)} (${H.abDay(nxt)})` : `Next school day: ${relDay(nxt)} (${H.abDay(nxt)} day)`; }
  if (cat === "college") return st.colleges.map(c => `${c.name}: ${c.status}`).join(" · ");
  if (cat === "lawn") { const j = st.events.filter(e => e.cat === "lawn" && e.date >= s && e.date <= addDays(s, 6)).length; return `${j} job${j === 1 ? "" : "s"} this week`; }
  if (cat === "volunteer") { const n = H.clubStats("nhs"), b = H.clubStats("beta"); return `NHS ${n.total}/20 hrs · Beta ${b.total}/20 hrs · due Jan 15`; }
  if (cat === "health") { const h = st.health[s] || {}; return `${HABITS().filter(([k]) => h[k]).length}/5 habits today`; }
  if (cat === "training") { const w = H.workoutFor(s); return `Today: ${w ? w.title : "rest"}${st.training.raceDate ? ` · ${Math.max(0, Math.ceil(daysBetween(s, st.training.raceDate) / 7))} wks to race` : ""}`; }
  return "";
}

P.review = () => {
  const s = todayStr(), st = S(), mon = mondayOf(s), all = open();
  const overdue = all.filter(t => t.due && t.due < s);
  const week = all.filter(t => t.due && t.due >= s && t.due <= addDays(s, 6));
  const nodate = all.filter(t => !t.due);
  const doneWk = st.tasks.filter(t => t.done && t.doneAt && t.doneAt >= addDays(s, -6));
  const wkDays = [...Array(7)].map((_, i) => addDays(mon, i)).filter(d => d <= s);
  const wos = wkDays.filter(d => H.workoutFor(d)), wosDone = wos.filter(d => st.workoutsDone[d]).length;
  const habAvg = wkDays.length ? (wkDays.reduce((a, d) => a + Object.values(st.health[d] || {}).filter(Boolean).length, 0) / wkDays.length).toFixed(1) : "0";
  const acts = (t, set) => `<div class="rv-acts">${set.map(([l, v]) => `<button data-act="move" data-id="${t.id}" data-to="${v}">${l}</button>`).join("")}<button data-act="done-id" data-id="${t.id}">Done</button></div>`;
  const rvRow = (t, set) => `<div class="rv-row" data-id="${t.id}"><button class="check" data-act="done" aria-label="Done"></button><div><span class="tt" data-act="edit">${esc(t.title)}</span><div class="tmeta">${code(t.cat)}${dueHTML(t)}<span>${fmtDur(t.mins)}</span></div></div>${acts(t, set)}</div>`;
  const byDay = {}; week.forEach(t => (byDay[t.due] = byDay[t.due] || []).push(t));
  const byArea = {}; doneWk.forEach(t => (byArea[t.cat] = byArea[t.cat] || []).push(t));
  return pageHead(`Weekly check-in · week of ${fmtDate(mon)}`, "Review", `<b>${all.length}</b> open · <b>${doneWk.length}</b> done in 7 days`, `<button class="btn solid sm" data-act="new">+ Add task</button>`) + `
    <div class="rv-stats" style="margin-top:24px">
      <div><div class="n">${two(doneWk.length)}</div><span class="label">Done · 7 days</span></div>
      <div><div class="n">${two(overdue.length)}</div><span class="label">Overdue</span></div>
      <div><div class="n">${two(week.length)}</div><span class="label">Due next 7 days</span></div>
      <div><div class="n">${two(nodate.length)}</div><span class="label">No due date</span></div>
      <div><div class="n">${wosDone}/${wos.length}</div><span class="label">Workouts this week</span></div>
      <div><div class="n">${habAvg}</div><span class="label">Habits / day (of 5)</span></div>
    </div>
    ${subHead("Overdue", overdue.length ? "Reschedule or finish" : "None — nice")}
    ${overdue.map(t => rvRow(t, [["Today", 0], ["Tomorrow", 1], ["Next week", "nw"]])).join("") || `<div class="empty">Nothing overdue</div>`}
    ${subHead("Due in the next 7 days", `${week.length} tasks`)}
    ${Object.keys(byDay).sort().map(d => `<div class="group-l label">${d === s ? "Today" : fmtDate(d)} · ${H.abDay(d) ? H.abDay(d) + " day" : H.noSchoolReason(d)}</div>${byDay[d].map(t => tcard(t, true)).join("")}`).join("") || `<div class="empty">Nothing due this week</div>`}
    ${subHead("No due date", "Give these a day")}
    ${nodate.map(t => rvRow(t, [["Tomorrow", 1], ["Friday", "fri"], ["Next week", "nw"]])).join("") || `<div class="empty">Everything has a date</div>`}
    ${subHead("Finished this week", `${doneWk.length} done`)}
    ${Object.keys(byArea).map(c => `<div class="group-l label">${CATS[c]}</div>${byArea[c].map(t => `<div class="rv-row done-row" data-id="${t.id}"><span></span><div><span class="tt">${esc(t.title)}</span><div class="tmeta">${code(t.cat)}<span>Done ${relDay(t.doneAt)}</span></div></div><div class="rv-acts"><button data-act="undo" data-id="${t.id}">Undo</button></div></div>`).join("")}`).join("") || `<div class="empty">Nothing finished yet this week</div>`}
    ${subHead("By area")}
    <div class="cells c3">${AREAS.map(c => { const o = open(c).length, d = doneWk.filter(t => t.cat === c).length; return `<div class="ov" data-go="#/${c}"><div class="cell-h">${code(c)}<h3>${CATS[c]}</h3></div>
      <div class="mb"><span>Done</span><div class="bar"><i style="--w:${o + d ? d / (o + d) * 100 : 0}%"></i></div><span>${d}/${o + d}</span></div><div class="cell-sub" style="margin-top:6px">${o} open · ${areaStat(c)}</div></div>`; }).join("")}</div>`;
};

const cal = { mode: "month", offset: 0 };
P.calendar = () => {
  const s = todayStr(); let start, end, title, inMonth = () => true;
  if (cal.mode === "month") {
    const t = parseYMD(s); const first = new Date(t.getFullYear(), t.getMonth() + cal.offset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    start = mondayOf(H.ymd(first)); end = addDays(mondayOf(H.ymd(last)), 6);
    title = `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    const m = first.getMonth(); inMonth = d => parseYMD(d).getMonth() === m;
  } else {
    start = addDays(mondayOf(s), cal.offset * 21); end = addDays(start, 20);
    title = `${fmtDate(start)} – ${fmtDate(end)}`;
  }
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const maxItems = cal.mode === "month" ? 5 : 9;
  return pageHead("Everything, by day", "Calendar", "Tap a day for details", `<button class="btn solid sm" data-act="new">+ Add task</button>`) + `
    <div class="cal-bar"><h2>${title}</h2>
      <div class="seg"><button data-act="cal-mode" data-m="month" class="${cal.mode === "month" ? "on" : ""}">Month</button><button data-act="cal-mode" data-m="3w" class="${cal.mode === "3w" ? "on" : ""}">3 weeks</button></div>
      <div class="seg"><button data-act="cal-nav" data-d="-1">← Prev</button><button data-act="cal-nav" data-d="0">Today</button><button data-act="cal-nav" data-d="1">Next →</button></div></div>
    <div class="cal ${cal.mode === "3w" ? "weeks3" : ""}">
      ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(x => `<div class="cal-dow">${x}</div>`).join("")}
      ${days.map(d => {
        const items = dayItems(d), ab = H.abDay(d), off = !ab && parseYMD(d).getDay() % 6 !== 0 && H.noSchoolReason(d) !== "Summer" ? H.noSchoolReason(d) : "";
        const shown = items.slice(0, maxItems);
        return `<button class="cal-day ${d === s ? "today" : ""} ${inMonth(d) ? "" : "out"} ${d < s ? "past" : ""}" data-act="open-day" data-date="${d}">
          <div class="cal-top"><span class="cal-n">${parseYMD(d).getDate()}</span>${ab ? `<span class="chip inv">${ab}</span>` : off ? `<span class="chip off">Off</span>` : ""}</div>
          <div class="cal-items">${off ? `<div class="ci wo">No school · ${esc(off)}</div>` : ""}${shown.map(i => `<div class="ci ${i.k} ${i.done ? "done" : ""}">${i.time ? `<time>${i.time}</time>` : ""}${esc(i.title)}</div>`).join("")}${items.length > maxItems ? `<div class="ci more">+${items.length - maxItems} more</div>` : ""}</div>
        </button>`;
      }).join("")}
    </div>
    <div class="cal-key"><span><i style="background:var(--ink)"></i>Deadline</span><span><i style="border-left:2px solid var(--ink)"></i>Task due</span><span><i style="border-left:2px solid var(--line-2)"></i>Event / job</span><span><i></i><span class="muted">Gray — workout / day off</span></span><span><span class="chip inv" style="height:16px">A</span> / <span class="chip inv" style="height:16px">B</span> school day</span></div>`;
};

P.school = () => {
  const s = todayStr(), st = S(), ab = H.abDay(s), nxt = H.nextSchoolDay(s), nab = H.abDay(nxt);
  const nextFor = day => { let d = ab === day ? s : addDays(s, 1); for (let i = 0; i < 40 && H.abDay(d) !== day; i++) d = addDays(d, 1); return d; };
  const school = open("school");
  const classTasks = key => school.filter(t => H.classOf(t) === key);
  const general = school.filter(t => !H.classOf(t));
  const days = []; let d = s; while (days.length < 10) { if (H.isSchoolDay(d)) days.push(d); d = addDays(d, 1); }
  const dayBlock = day => {
    const nd = nextFor(day), isToday = ab === day;
    return `<div class="cls-day ${isToday ? "today" : ""}"><span class="label"><b style="color:var(--ink);font-weight:500">${day} day</b> — ${D.school.classes[day].map(c => c.name).join(" · ")}</span><span class="chip ${isToday ? "inv" : ""}">${isToday ? "Today" : "Next: " + relDay(nd)}</span></div>
      <div class="cells c3">${D.school.classes[day].map((c, i) => { const ts = classTasks(c.key); return `<div class="cls ${isToday ? "today" : ""}">
        <div class="period"><span>Period ${c.period} · ${fmtMin(toMin(st.settings.periods[i].start))}–${fmtMin(toMin(st.settings.periods[i].end))}</span><span>${ts.length} open</span></div>
        <div class="cell-h" style="margin-top:8px"><h3>${esc(c.name)}</h3></div><div class="cell-sub">${esc(c.full)} · next class ${relDay(nd)}</div>
        ${list(ts, { empty: "Nothing due for this class" })}
        <button class="mini-add" data-act="new" data-cat="school" data-cls="${c.key}" data-due="${nd}">+ Add for ${esc(c.name)}</button></div>`; }).join("")}</div>`;
  };
  return pageHead("Hoggard · IB", "School", ab ? `<b>${ab} day</b> today · next: <b>${relDay(nxt)} (${nab})</b>` : `No school today · next: <b>${relDay(nxt)} (${nab} day)</b>`, `<button class="btn solid sm" data-act="new" data-cat="school">+ Add task</button>${extLinks([["Canvas", st.settings.links.canvas], ["Campus", st.settings.links.infiniteCampus], ["Outlook", st.settings.links.outlook]])}`) +
    (ab === "B" ? dayBlock("B") + dayBlock("A") : dayBlock("A") + dayBlock("B")) +
    subHead("General school", `${general.length} open`) + `
    <div class="cells c2">
      <div>${list(general, { empty: "No general school tasks" })}<button class="mini-add" data-act="new" data-cat="school">+ Add school task</button></div>
      <div><div class="col-h"><span class="label">Next 10 school days</span></div>${days.map(x => `<div class="info-row"><span>${fmtDate(x)} — ${D.school.classes[H.abDay(x)].map(c => c.name).join(" · ")}</span><span><span class="chip inv">${H.abDay(x)}</span></span></div>`).join("")}</div>
      <div><div class="col-h"><span class="label">Key dates</span></div>${D.school.keyDates.filter(k => k.date >= s).map(k => `<div class="info-row"><span>${esc(k.label)}</span><span>${fmtDate(k.date)}</span></div>`).join("")}</div>
      ${feedCard(["canvas"], "Canvas → Calendar → Calendar Feed (bottom right). Paste the link and every assignment becomes a task with its due date. Assignments are sorted into classes by their names.")}
    </div>`;
};

P.college = () => {
  const st = S(), col = open("college");
  const statuses = ["Applied", "Submitted — waiting", "Accepted", "Waitlisted", "Deferred", "Denied", "Committed", "Planning to apply"];
  const general = col.filter(t => !H.collegeOf(t));
  return pageHead("Applications · scholarships", "College", `<b>${st.colleges.length}</b> applications · <b>${col.length}</b> open tasks`, `<button class="btn solid sm" data-act="new" data-cat="college">+ Add task</button>${extLinks([["Common App", st.settings.links.commonApp], ["FAFSA", D.links.fafsa]])}`) +
    subHead("Schools") + `<div class="cells c3">${st.colleges.map((c, i) => { const ts = col.filter(t => H.collegeOf(t) === c.id); return `<div>
      <div class="cell-h"><h3>${esc(c.name)}</h3><a class="label" href="${esc(c.portal)}" target="_blank" rel="noopener" style="text-decoration:none">Site ↗</a></div>
      <label>Status<select data-college="${i}" data-field="status">${statuses.map(x => `<option ${x === c.status ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label style="margin:12px 0 6px">Notes<textarea rows="2" data-college="${i}" data-field="notes" placeholder="Decision date, portal login, to-dos">${esc(c.notes)}</textarea></label>
      ${list(ts, { empty: "No tasks for this school" })}<button class="mini-add" data-act="new" data-cat="college" data-org="${c.id}">+ Add for ${esc(c.name)}</button></div>`; }).join("")}
      <form data-form="college" style="display:flex;flex-direction:column;gap:12px"><div class="cell-h"><h3>Add a school</h3></div><label>Name<input name="name" required placeholder="App State"></label><label>Admissions link<input name="portal" placeholder="https://"></label><div><button class="btn sm">Add school</button></div></form></div>` +
    subHead("Scholarships", `${st.scholarships.length} tracked`) + `
    <table><tr><th>Name</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>
      ${[...st.scholarships].sort((a, b) => (a.due || "9") < (b.due || "9") ? -1 : 1).map(x => `<tr><td>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</td><td>${esc(x.amount)}</td><td class="mono small">${x.due ? fmtDate(x.due) : ""}</td>
        <td><select data-sch="${x.id}">${["Researching", "In progress", "Submitted", "Won", "Not selected"].map(v => `<option ${v === x.status ? "selected" : ""}>${v}</option>`).join("")}</select></td><td><button class="btn sm danger" data-act="del-sch" data-sid="${x.id}">✕</button></td></tr>`).join("") || `<tr><td colspan="5" class="muted">None yet. Adding one creates a task two days before its deadline.</td></tr>`}</table>
    <form class="form-inline" data-form="scholarship" style="margin-top:14px"><label>Name<input name="name" required></label><label>Amount<input name="amount" placeholder="$"></label><label>Due<input name="due" type="date"></label><label>Link<input name="url"></label><button class="btn solid sm">Add</button></form>
    <div class="small muted" style="margin-top:10px">Where to look: Hoggard counselor's list, each school's financial aid page, NCSEAA, Wilmington community foundations, local businesses.</div>` +
    subHead("General college", `${general.length} open`) + list(general, { empty: "No general college tasks" }) + `<button class="mini-add" data-act="new" data-cat="college">+ Add college task</button>`;
};

P.lawn = () => {
  const s = todayStr(), st = S();
  const jobs = st.events.filter(e => e.cat === "lawn" && e.date >= s).sort((a, b) => (a.date + (a.start || "")) < (b.date + (b.start || "")) ? -1 : 1);
  const byDay = {}; jobs.filter(j => j.date <= addDays(s, 20)).forEach(j => (byDay[j.date] = byDay[j.date] || []).push(j));
  const biz = open("lawn");
  return pageHead("Lawn care business", "Lawn Lads", `<b>${jobs.filter(j => j.date <= addDays(s, 6)).length}</b> jobs this week · <b>${biz.length}</b> business tasks`, `<button class="btn solid sm" data-act="new" data-cat="lawn">+ Add task</button>${extLinks([["Jobber", st.settings.links.jobber]])}`) +
    `<div class="cells c2" style="margin-top:24px">
      <div><div class="cell-h"><h3>Jobs — next 3 weeks</h3><span class="label">${jobs.length} upcoming</span></div>
        ${Object.keys(byDay).map(d => `<div class="group-l label">${relDay(d)} · ${fmtDate(d)}</div>${byDay[d].map(j => `<div class="info-row"><span>${j.start ? `<span class="mono small">${fmtMin(toMin(j.start))}</span> ` : ""}${esc(j.title)}</span><span>${j.feedId ? "Jobber" : `<button class="btn sm danger" data-act="del-event" data-eid="${j.id}">✕</button>`}</span></div>`).join("")}`).join("") || `<div class="empty">No jobs yet — add one below, connect Jobber, or type it in the add box</div>`}
        <form class="form-inline" data-form="job" style="margin-top:16px"><label>Client / job<input name="title" required placeholder="Smith — mow + edge"></label><label>Date<input name="date" type="date" required value="${s}"></label><label>Start<input name="start" type="time" value="15:30"></label><label>Hours<input name="hrs" type="number" step="0.25" value="1.5"></label>
          <label>Repeat weekly<select name="rep"><option value="0">No</option><option value="4">4 weeks</option><option value="8">8 weeks</option><option value="12">12 weeks</option></select></label><button class="btn solid sm">Add job</button></form></div>
      <div><div class="cell-h"><h3>Business tasks</h3><span class="label">${biz.length} open</span></div>${list(biz, { empty: "No business tasks" })}<button class="mini-add" data-act="new" data-cat="lawn">+ Add business task</button></div>
      ${feedCard(["jobber"], "Connect Jobber's calendar so visits appear automatically.")}
      <div><div class="cell-h"><h3>Connecting Jobber</h3></div><ul class="rules">
        <li>Easiest: use Jobber's calendar sync link for your user and paste it on the left.</li>
        <li>No link: sync Jobber to Google Calendar, then paste that calendar's secret iCal address.</li>
        <li>Full version: Jobber's developer API can pull quotes and invoices. Needs a developer app and login.</li></ul></div>
    </div>`;
};

P.volunteer = () => {
  const s = todayStr(), { nhs, beta } = D.clubs, n = H.clubStats("nhs"), b = H.clubStats("beta"), vol = open("volunteer");
  const occ = ev => {
    if (ev.recurring) { let d = parseYMD(s); d.setDate(1); for (let k = 0; k < 3; k++) { const f = new Date(d); let tu = 0; while (!(f.getDay() === 2 && ++tu === 3)) f.setDate(f.getDate() + 1); if (H.ymd(f) >= s) return H.ymd(f); d.setMonth(d.getMonth() + 1); } }
    if (ev.end && ev.end >= s) return ev.date > s ? ev.date : s;
    return ev.date;
  };
  const evs = beta.events.map((ev, i) => ({ ...ev, i, next: occ(ev) })).filter(ev => ev.next >= s);
  const club = (key, c, stt, extra) => { const ts = vol.filter(t => H.clubOf(t) === key); return `<div>
    <div class="cell-h"><h3>${c.name}</h3><a class="label" href="${c.site}" target="_blank" rel="noopener" style="text-decoration:none">Site ↗</a></div>
    <div class="big">${stt.total}<small>/ 20 hrs${extra || ""}</small></div><div class="bar" style="margin:10px 0 14px"><i style="--w:${Math.min(100, stt.total / 20 * 100)}%"></i></div>
    <ul class="rules">${c.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    <div class="links" style="margin:12px 0">${c.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
    ${list(ts, { empty: `No ${key.toUpperCase()} tasks` })}<button class="mini-add" data-act="new" data-cat="volunteer" data-org="${key}">+ Add ${key === "nhs" ? "NHS" : "Beta"} task</button></div>`; };
  const general = vol.filter(t => !H.clubOf(t));
  return pageHead("NHS · Beta Club", "Volunteering", `Fall hours due <b>Jan 15</b> · <b>${Math.max(0, daysBetween(s, "2027-01-15"))}</b> days left`, `<button class="btn solid sm" data-act="new" data-cat="volunteer">+ Add task</button>`) +
    `<div class="cells c2" style="margin-top:24px">${club("nhs", nhs, n)}${club("beta", beta, b, ` · ${b.events}/2 events`)}</div>` +
    subHead("Log hours", "Creates a reminder to submit the club's form in time") + `
    <form class="form-inline" data-form="hours" style="margin-top:14px"><label>What<input name="title" required placeholder="Turkey Trot course monitor"></label><label>Date<input name="date" type="date" value="${s}" required></label><label>Hours<input name="hours" type="number" step="0.25" min="0.25" value="2" required></label>
      <label>Counts for<select name="club"><option value="both">NHS + Beta</option><option value="nhs">NHS only</option><option value="beta">Beta only</option></select></label><label>Beta event<select name="betaEvent"><option value="0">No</option><option value="1">Yes</option></select></label><button class="btn solid sm">Log</button></form>
    <table style="margin-top:14px"><tr><th>Date</th><th>What</th><th>Hrs</th><th>Club</th><th>Form sent</th><th></th></tr>
      ${[...S().hours].sort((a, c) => a.date < c.date ? 1 : -1).map(h => `<tr><td class="mono small">${fmtDate(h.date)}</td><td>${esc(h.title)}${h.betaEvent ? ' <span class="code">BETA EVT</span>' : ""}</td><td class="mono">${h.hours}</td><td class="mono small">${h.club === "both" ? "NHS+BETA" : h.club.toUpperCase()}</td><td><input type="checkbox" data-act="submitted" data-hid="${h.id}" ${h.submitted ? "checked" : ""}></td><td><button class="btn sm danger" data-act="del-hours" data-hid="${h.id}">✕</button></td></tr>`).join("") || `<tr><td colspan="6" class="muted">No hours logged yet.</td></tr>`}</table>` +
    `<div class="cells c2" style="margin-top:36px">
      <div><div class="cell-h"><h3>Beta events open now</h3></div>${evs.map(ev => `<div class="info-row"><span>${esc(ev.title)}<br><span class="tmeta" style="margin-top:4px">${ev.recurring ? ev.recurring + " · next " + fmtDate(ev.next) : ev.end ? `Daily to ${fmtDate(ev.end)}` : fmtDate(ev.date)}</span></span><span style="display:flex;gap:4px;align-items:start"><a class="btn sm" href="${ev.url}" target="_blank" rel="noopener">Sign up ↗</a><button class="btn sm ghost" data-act="add-beta" data-i="${ev.i}" data-date="${ev.next}">Schedule</button></span></div>`).join("")}</div>
      <div><div class="cell-h"><h3>Beta Con 2027</h3></div>${beta.betaCon.map(k => `<div class="info-row"><span>${esc(k.label)}</span><span>${fmtDate(k.date)}</span></div>`).join("")}
        <div class="cell-h" style="margin-top:24px"><h3>Other volunteering</h3><span class="label">${general.length}</span></div>${list(general, { empty: "Nothing else" })}</div>
    </div>`;
};

P.health = () => {
  const s = todayStr(), h = S().health[s] || {}, hab = HABITS();
  const days = [...Array(28)].map((_, i) => addDays(s, -27 + i));
  return pageHead("Daily habits", "Health", `<b>${hab.filter(([k]) => h[k]).length}/5</b> habits today`, `<button class="btn solid sm" data-act="new" data-cat="health">+ Add task</button>`) +
    `<div class="cells c2" style="margin-top:24px">
      <div><div class="cell-h"><h3>Today</h3></div>${hab.map(([k, l]) => `<label class="check-row"><input type="checkbox" data-act="health" data-k="${k}" ${h[k] ? "checked" : ""}>${l}</label>`).join("")}</div>
      <div><div class="cell-h"><h3>Last 4 weeks</h3><span class="label">darker = more habits</span></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${days.map(d => { const v = Object.values(S().health[d] || {}).filter(Boolean).length; return `<div title="${fmtDate(d)}: ${v}/5" style="aspect-ratio:1;background:color-mix(in srgb, var(--ink) ${v * 20}%, var(--bg-3));display:grid;place-items:center;font:500 10px var(--mono);color:${v >= 3 ? "var(--bg)" : "var(--ink-3)"}${d === s ? ";outline:1px solid var(--ink)" : ""}">${parseYMD(d).getDate()}</div>`; }).join("")}</div></div>
    </div>` + subHead("Health tasks", `${open("health").length} open`) + list(open("health"), { empty: "No health tasks — appointments and the like go here" }) + `<button class="mini-add" data-act="new" data-cat="health">+ Add health task</button>`;
};

P.training = () => {
  const s = todayStr(), t = S().training, mon = mondayOf(s);
  const week = [...Array(7)].map((_, i) => addDays(mon, i));
  const wo = t.raceDate ? Math.ceil(daysBetween(s, t.raceDate) / 7) : null;
  const ahead = [...Array(Math.min(16, Math.max(4, wo || 6)))].map((_, i) => addDays(mon, 7 * (i + 1)));
  return pageHead("Half marathon → Ironman", "Training", wo != null ? `<b>${Math.max(0, wo)}</b> weeks to ${esc(t.raceName || "race day")}` : `Race date <b>not set</b>`, `<button class="btn solid sm" data-act="new" data-cat="training">+ Add task</button>`) +
    (!t.raceDate ? `<div class="notice" style="margin-top:20px">Set your half marathon date below. The plan will build your long run and taper automatically.</div>` : "") +
    `<div class="cells c2" style="margin-top:24px">
      <div><div class="cell-h"><h3>This week</h3><span class="label">${week.filter(d => H.workoutFor(d) && S().workoutsDone[d]).length} done</span></div>
        ${week.map(d => { const w = H.workoutFor(d); return w ? `<label class="check-row" style="${d === s ? "font-weight:600" : ""}"><input type="checkbox" data-act="workout-done" data-date="${d}" ${S().workoutsDone[d] ? "checked" : ""}><span class="label" style="width:70px">${d === s ? "Today" : fmtDate(d).slice(0, 3)}</span><span>${esc(w.title)}<br><span class="small muted">${esc(w.sub)} · ${w.mins} min</span></span></label>` : ""; }).join("")}</div>
      <div><div class="cell-h"><h3>Race</h3></div>
        <form data-form="training" style="gap:14px;display:flex;flex-direction:column">
          <div class="row2"><label>Race name<input name="raceName" value="${esc(t.raceName)}" placeholder="Half marathon"></label><label>Race date<input type="date" name="raceDate" value="${esc(t.raceDate)}"></label></div>
          <div class="row2"><label>Current long run (mi)<input type="number" name="startLong" value="${t.startLong}"></label><label>Peak long run (mi)<input type="number" name="peakLong" value="${t.peakLong}"></label></div>
          <div class="row2"><label>Goal time<input name="goal" value="${esc(t.goal)}" placeholder="1:45:00"></label><label>School-day time<input type="time" name="weekdayTime" value="${t.weekdayTime}"></label></div>
          <div class="row2"><label>Day-off time<input type="time" name="weekendTime" value="${t.weekendTime}"></label><span></span></div>
          <div><button class="btn solid sm">Save plan</button></div></form></div>
      <div><div class="cell-h"><h3>Long runs ahead</h3></div>${ahead.map(m => { const w = H.workoutFor(addDays(m, 5)); return `<div class="info-row"><span>Week of ${fmtDate(m)}</span><span>${w ? esc(w.title) : "—"}</span></div>`; }).join("")}</div>
      <div><div class="cell-h"><h3>Road to Ironman</h3></div><ul class="rules">
        <li>Every week keeps one swim and one bike so the half builds your Ironman base.</li>
        <li>After the half: recovery week, then swim twice a week and extend the ride toward 2–3 hours.</li>
        <li>Stepping stones: sprint tri, Olympic, 70.3, then full Ironman.</li></ul></div>
    </div>` + subHead("Training tasks", `${open("training").length} open`) + list(open("training"), { empty: "No training tasks" }) + `<button class="mini-add" data-act="new" data-cat="training">+ Add training task</button>`;
};

P.settings = () => {
  const st = S().settings;
  return pageHead("System", "Settings", "", "") + `<div class="cells c2" style="margin-top:24px">
    ${window.HTD_SITE ? window.HTD_SITE.card() : ""}
    <form data-form="settings" style="display:flex;flex-direction:column;gap:14px"><div class="cell-h"><h3>Daily rhythm</h3></div>
      <div class="row2"><label>Wake up<input type="time" name="wake" value="${st.wake}"></label><label>Bedtime<input type="time" name="bed" value="${st.bed}"></label></div>
      <div class="row2"><label>Dinner<input type="time" name="dinner" value="${st.dinner}"></label><label>Nightly homework (min)<input type="number" name="homeworkMins" step="15" value="${st.homeworkMins}"></label></div>
      <div class="cell-h" style="margin-top:10px"><h3>Bell schedule</h3><span class="label">Set Hoggard's real times</span></div>
      ${st.periods.map((p, i) => `<div class="row2"><label>P${i + 1} start<input type="time" name="p${i}s" value="${p.start}"></label><label>P${i + 1} end<input type="time" name="p${i}e" value="${p.end}"></label></div>`).join("")}
      <div><button class="btn solid sm">Save</button></div></form>
    <form data-form="links" style="display:flex;flex-direction:column;gap:14px"><div class="cell-h"><h3>Links</h3></div>
      ${Object.entries({ canvas: "Canvas", infiniteCampus: "Infinite Campus", outlook: "Outlook (school email)", commonApp: "Common App", jobber: "Jobber" }).map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(st.links[k])}"></label>`).join("")}
      <div><button class="btn solid sm">Save links</button></div></form>
    ${feedCard(["outlook", "other"], "Outlook on the web → Settings → Calendar → Shared calendars → Publish a calendar → ICS link. School accounts sometimes block this.")}
    <div><div class="cell-h"><h3>Backup</h3></div><div class="small muted" style="margin-bottom:12px">Everything is saved in this browser. Export a copy now and then.</div>
      <div class="links"><button class="btn sm" id="exportBtn">Export</button><label class="btn sm">Import<input type="file" id="importFile" accept=".json" hidden></label><button class="btn sm danger" id="resetBtn">Reset</button></div></div>
  </div>`;
};

function feedCard(types, help) {
  const feeds = S().feeds.filter(f => types.includes(f.type));
  return `<div><div class="cell-h"><h3>Calendar sync</h3></div>
    <div class="small muted" style="margin-bottom:12px">${help}</div>
    ${feeds.map(f => `<div style="display:flex;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:0"><b style="font-weight:500">${esc(f.label)}</b><div class="small muted">${f.lastSync ? "Synced " + new Date(f.lastSync).toLocaleString() : "Never synced"}${f.error ? ` — ${esc(f.error)}` : ""}</div></div>
      ${f.url ? `<button class="btn sm" data-act="sync" data-fid="${f.id}">Sync</button>` : ""}<button class="btn sm danger" data-act="del-feed" data-fid="${f.id}">✕</button></div>`).join("")}
    <form class="form-inline" data-form="feed" data-type="${types[0]}" style="margin-top:12px"><label>Feed link (.ics / webcal)<input name="url" placeholder="https://… or webcal://…" required></label><button class="btn sm">Connect</button></form>
    <form class="form-inline" data-form="icsfile" data-type="${types[0]}" style="margin-top:12px"><label>Or import an .ics file<input type="file" name="file" accept=".ics,text/calendar"></label></form></div>`;
}

// ---------- day drawer ----------
let drawerDate = null;
function dayDrawer(date) {
  const ab = H.abDay(date), items = dayItems(date);
  const bl = date >= todayStr() && daysBetween(todayStr(), date) < 7 ? H.plan(todayStr(), 7)[date] : H.fixedBlocks(date);
  const due = S().tasks.filter(t => t.due === date);
  return `<div class="d-head"><div class="eyebrow">${ab ? `${ab} day — ${D.school.classes[ab].map(c => c.name).join(" · ")}` : esc(H.noSchoolReason(date) || "")}</div><h2>${fmtDate(date, true)}</h2></div>
    <div class="d-grid">
      <div class="card"><div class="card-h"><h3>Due · ${due.filter(t => !t.done).length}</h3></div><div class="task-list">${due.filter(t => !t.done).map(t => tcard(t, true)).join("") || `<div class="muted small mono">NOTHING DUE</div>`}</div>
        ${due.filter(t => t.done).map(t => `<div class="info-row"><span style="text-decoration:line-through;color:var(--ink-3)">${esc(t.title)}</span><span>Done</span></div>`).join("")}</div>
      <div class="card"><div class="card-h"><h3>Deadlines & events</h3></div>${items.filter(i => i.k === "dl" || i.k === "ev").map(i => `<div class="info-row"><span>${i.k === "dl" ? "<b>" + esc(i.title) + "</b>" : esc(i.title)}</span><span>${i.time || (i.k === "dl" ? "Deadline" : "")}${i.k === "ev" ? ` <button class="btn sm danger" data-act="del-event" data-eid="${i.id}">✕</button>` : ""}</span></div>`).join("") || `<div class="muted small mono">NONE</div>`}</div>
      <div class="card full"><div class="card-h"><h3>Planned schedule</h3></div>${bl.filter(b => !b.soft).map(b => `<div class="srow"><time>${b.allDay ? "ALL DAY" : fmtMin(b.start)}</time>${code(b.cat)}<b>${esc(b.title)}</b></div>`).join("") || `<div class="muted">Nothing scheduled.</div>`}</div>
    </div>
    <div style="margin-top:18px"><button class="btn solid sm" data-act="new" data-due="${date}">+ Add task due this day</button></div>`;
}
function openDay(date) {
  drawerDate = date;
  $("#drawerCrumb").textContent = fmtDate(date);
  $("#drawerBody").innerHTML = dayDrawer(date); $("#drawerBody").scrollTop = 0;
  $("#drawer").classList.add("open"); $("#drawerBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeDrawer() { drawerDate = null; $("#drawer").classList.remove("open"); $("#drawerBackdrop").classList.remove("open"); document.body.style.overflow = ""; }
$("#drawerClose").onclick = closeDrawer;
$("#drawerBackdrop").onclick = closeDrawer;

// ---------- task dialog ----------
const dlg = $("#taskDialog"), form = $("#taskForm");
let editing = null, presetOrg = "";
function syncCls() { $("#clsWrap").style.display = form.elements.cat.value === "school" ? "" : "none"; }
form.elements.cat.addEventListener("change", syncCls);
function openTask(task, preset = {}) {
  editing = task || null; presetOrg = preset.org || "";
  const t = task || { title: "", cat: "school", due: "", mins: 30, pri: 2, notes: "", cls: "", ...preset };
  $("#taskDialogTitle").textContent = task ? "Edit task" : "New task";
  for (const k of ["title", "cat", "due", "mins", "pri", "notes"]) form.elements[k].value = t[k] ?? "";
  form.elements.cls.value = task ? H.classOf(task) : (t.cls || "");
  $("#taskDelete").style.display = task ? "" : "none";
  syncCls(); dlg.showModal(); setTimeout(() => form.elements.title.focus(), 30);
}
form.addEventListener("submit", e => {
  e.preventDefault();
  const f = form.elements;
  const v = { title: f.title.value.trim(), cat: f.cat.value, due: f.due.value, mins: +f.mins.value || 30, pri: +f.pri.value, notes: f.notes.value, cls: f.cat.value === "school" ? f.cls.value : "" };
  if (!v.title) return;
  if (editing) Object.assign(editing, v); else S().tasks.push({ id: uid(), done: false, source: "me", org: presetOrg, ...v });
  dlg.close(); H.changed(); toast(editing ? "Saved" : "Task added");
});
$("#taskCancel").onclick = () => dlg.close();
$("#taskDelete").onclick = () => { if (!editing) return; H.S.tasks = S().tasks.filter(t => t !== editing); dlg.close(); H.changed(); toast("Deleted"); };

function completeTask(id, el) {
  const t = S().tasks.find(x => x.id === id); if (!t) return;
  const card = el && el.closest(".tcard, .rv-row");
  const finish = () => { t.done = true; t.doneAt = todayStr(); const h = S().hours.find(x => x.id === t.hoursId); if (h) h.submitted = true; H.changed(); };
  if (card) { card.classList.add("done-anim"); setTimeout(() => card.classList.add("leaving"), 300); setTimeout(finish, 650); } else finish();
  toast("Done — " + t.title.slice(0, 40));
}

// ---------- events ----------
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  const go = e.target.closest("[data-go]");
  if (!el && go) { location.hash = go.dataset.go; return; }
  if (e.target.id === "exportBtn") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S(), null, 2)], { type: "application/json" })); a.download = `htd-backup-${todayStr()}.json`; a.click(); return; }
  if (e.target.id === "resetBtn") { if (confirm("Erase all HTD data in this browser and start over?")) { H.S = H.defaults(); H.changed(); } return; }
  if (!el) return;
  const act = el.dataset.act;
  const row = el.closest("[data-id]"); const id = el.dataset.id || (row && row.dataset.id);
  const task = id && S().tasks.find(x => x.id === id);
  if (act === "done") { e.stopPropagation(); completeTask(id, el); }
  else if (act === "done-id") completeTask(id, el);
  else if (act === "edit" || act === "edit-id") { if (task) openTask(task); }
  else if (act === "new") openTask(null, { cat: el.dataset.cat || "school", due: el.dataset.due || "", cls: el.dataset.cls || "", org: el.dataset.org || "" });
  else if (act === "move" && task) { const to = el.dataset.to, s = todayStr(); let fri = s; while (parseYMD(fri).getDay() !== 5) fri = addDays(fri, 1);
    task.due = to === "nw" ? addDays(mondayOf(s), 7) : to === "fri" ? fri : addDays(s, +to); H.changed(); toast(`Moved to ${relDay(task.due)}`); }
  else if (act === "undo" && task) { task.done = false; task.doneAt = null; H.changed(); }
  else if (act === "open-day") openDay(el.dataset.date);
  else if (act === "cal-mode") { cal.mode = el.dataset.m; cal.offset = 0; render(); }
  else if (act === "cal-nav") { cal.offset = +el.dataset.d === 0 ? 0 : cal.offset + +el.dataset.d; render(); }
  else if (act === "workout-done") { const d = el.dataset.date; S().workoutsDone[d] = el.type === "checkbox" ? el.checked : !S().workoutsDone[d]; if (S().workoutsDone[d]) toast("Workout logged"); H.changed(); }
  else if (act === "del-event") { H.S.events = S().events.filter(x => x.id !== el.dataset.eid); H.changed(); }
  else if (act === "del-hours") { H.S.hours = S().hours.filter(x => x.id !== el.dataset.hid); H.changed(); }
  else if (act === "submitted") { const h = S().hours.find(x => x.id === el.dataset.hid); if (h) { h.submitted = el.checked; const t = S().tasks.find(x => x.hoursId === h.id); if (t) t.done = el.checked; H.changed(); } }
  else if (act === "sync") { const f = S().feeds.find(x => x.id === el.dataset.fid); if (f) { toast("Syncing"); H.syncFeed(f).then(n => toast(`${f.label} — ${n} new`)).catch(err => toast(`Sync failed — ${err.message}`)); } }
  else if (act === "del-feed") { H.S.feeds = S().feeds.filter(x => x.id !== el.dataset.fid); H.S.events = S().events.filter(x => x.feedId !== el.dataset.fid); H.changed(); }
  else if (act === "add-beta") { const ev = D.clubs.beta.events[+el.dataset.i]; S().events.push({ id: uid(), title: "Beta: " + ev.title, date: el.dataset.date, start: null, end: null, cat: "volunteer", sub: "Beta event" }); H.changed(); toast("Added to calendar"); }
  else if (act === "del-sch") { H.S.scholarships = S().scholarships.filter(x => x.id !== el.dataset.sid); H.changed(); }
  else if (act === "health") { const d = todayStr(); S().health[d] = S().health[d] || {}; S().health[d][el.dataset.k] = el.checked; H.changed(); }
  else if (act === "mic") { ad.listening ? (stopMic(), renderAdd()) : startMic(); }
  else if (act === "ai-go") addSend();
  else if (act === "r-del") { ad.items.splice(+el.closest(".ritem").dataset.i, 1); renderAdd(); }
  else if (act === "r-cancel") { ad.items = null; renderAdd(); }
  else if (act === "r-add") addCommit();
});
$("#addBtn").onclick = () => { if (location.hash && location.hash !== "#/") location.hash = "#/"; setTimeout(() => { scrollTo({ top: 0 }); $("#aiText")?.focus(); }, 30); };
$("#themeBtn").onclick = () => {
  const light = document.documentElement.dataset.theme !== "light";
  if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem("htd.theme", light ? "light" : "dark"); } catch { /* ignore */ }
};
document.addEventListener("input", e => {
  if (e.target.id === "aiText") { ad.text = e.target.value; autosize(e.target); }
  const r = e.target.dataset.r;
  if (r && ad.items) { const it = ad.items[+e.target.closest(".ritem").dataset.i]; if (r === "on") { it.off = !e.target.checked; renderAdd(); } else it[r] = e.target.value; }
});
document.addEventListener("keydown", e => {
  if (e.target.id === "aiText" && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addSend(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#addBtn").click(); }
  if (e.key === "Escape" && drawerDate && !dlg.open) closeDrawer();
});
document.addEventListener("submit", e => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries());
  const st = S();
  if (kind === "feed") {
    const label = { canvas: "Canvas", jobber: "Jobber", outlook: "Outlook" }[f.dataset.type] || "Calendar";
    const feed = { id: uid(), type: f.dataset.type, url: v.url.trim(), label };
    st.feeds.push(feed); H.save(); toast("Connecting");
    H.syncFeed(feed).then(n => toast(`${label} connected — ${n} items`)).catch(err => toast(`Couldn't sync — ${err.message}`));
  } else if (kind === "job") {
    const reps = Math.max(1, +v.rep || 1);
    const end = v.start ? H.fmtHM(toMin(v.start) + Math.round((+v.hrs || 1) * 60)) : null;
    for (let i = 0; i < reps; i++) st.events.push({ id: uid(), title: v.title, date: addDays(v.date, 7 * i), start: v.start || null, end, cat: "lawn", sub: "Lawn Lads" });
    H.changed(); toast(reps > 1 ? `Added ${reps} weekly jobs` : "Job added");
  } else if (kind === "hours") {
    const h = { id: uid(), title: v.title, date: v.date, hours: +v.hours, club: v.club, betaEvent: v.betaEvent === "1", submitted: false };
    st.hours.push(h);
    const due = h.club === "beta" ? addDays(h.date, 7) : addDays(h.date, 2);
    const forms = h.club === "both" ? "NHS validation (with photo) + Beta hours form" : h.club === "nhs" ? "NHS validation form (with photo)" : "Beta hours form";
    st.tasks.push({ id: uid(), hoursId: h.id, title: `Submit ${forms}: ${h.title}`, cat: "volunteer", org: h.club === "beta" ? "beta" : "nhs", due, mins: 10, pri: 3, done: false, source: "me" });
    H.changed(); toast("Logged — form reminder added");
  } else if (kind === "training") { Object.assign(st.training, v); H.changed(); toast("Training plan updated"); }
  else if (kind === "settings") {
    const s2 = st.settings; s2.wake = v.wake; s2.bed = v.bed; s2.dinner = v.dinner; s2.homeworkMins = +v.homeworkMins;
    s2.periods = s2.periods.map((p, i) => ({ start: v[`p${i}s`], end: v[`p${i}e`] }));
    H.changed(); toast("Settings saved");
  } else if (kind === "links") { Object.assign(st.settings.links, v); H.changed(); toast("Links saved"); }
  else if (kind === "college") { st.colleges.push({ id: uid(), name: v.name, status: "Planning to apply", portal: v.portal || "#", notes: "" }); H.changed(); }
  else if (kind === "scholarship") {
    st.scholarships.push({ id: uid(), name: v.name, amount: v.amount, due: v.due, url: v.url, status: "Researching" });
    if (v.due) st.tasks.push({ id: uid(), title: `Scholarship application: ${v.name}`, cat: "college", due: addDays(v.due, -2), mins: 120, pri: 2, done: false, source: "me", notes: v.url || "" });
    H.changed(); toast("Scholarship added");
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.r && ad.items) { const it = ad.items[+el.closest(".ritem").dataset.i]; if (el.dataset.r !== "on") it[el.dataset.r] = el.value; return; }
  if (el.dataset.college != null) { S().colleges[+el.dataset.college][el.dataset.field] = el.value; H.save(); toast("Saved"); }
  else if (el.dataset.sch) { const x = S().scholarships.find(s => s.id === el.dataset.sch); if (x) { x.status = el.value; H.changed(); } }
  else if (el.name === "file" && el.closest("[data-form=icsfile]")) {
    const file = el.files[0]; if (!file) return;
    const type = el.closest("form").dataset.type;
    file.text().then(txt => { const n = H.importFeed({ id: "file-" + type, type, label: file.name, url: "" }, txt); toast(`Imported ${n} items`); });
  } else if (el.id === "importFile") {
    const file = el.files[0]; if (!file) return;
    file.text().then(txt => { try { H.S = JSON.parse(txt); H.changed(); toast("Backup restored"); } catch { toast("Not an HTD backup"); } });
  }
});

// ---------- router ----------
const route = () => { const r = (location.hash || "").replace(/^#\/?/, "").split("/")[0]; return P[r] ? r : ""; };
function render() {
  const r = route();
  const y = scrollY;
  $("#view").innerHTML = P[r]();
  $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.r === r));
  document.title = `${r ? (CATS[r] || r.charAt(0).toUpperCase() + r.slice(1)) + " · " : ""}HTD`;
  autosize($("#aiText"));
  if (drawerDate) { const body = $("#drawerBody"), top = body.scrollTop; body.innerHTML = dayDrawer(drawerDate); body.scrollTop = top; }
  const f = S().feeds.filter(x => x.lastSync);
  $("#footSync").textContent = f.length ? `Calendars synced ${new Date(Math.max(...f.map(x => +new Date(x.lastSync)))).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Saved in this browser";
  scrollTo(0, y);
}
window.addEventListener("hashchange", () => { closeDrawer(); render(); scrollTo(0, 0); $("#nav a.on")?.scrollIntoView({ inline: "nearest", block: "nearest" }); });
H.onChange(render);
render();
H.autoSync();
setInterval(() => { const bc = $("#bigClock"); if (bc) { const c = clockText(); bc.textContent = `${c.h}:${c.m}`; } }, 5000);
setInterval(() => { if (!dlg.open && !drawerDate && !document.activeElement.matches("input,select,textarea") && route() === "") render(); }, 60000);
})();

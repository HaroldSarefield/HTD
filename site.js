/* HTD website mode — same idea as the Storage Unit editor password, but everything is locked.
   - The GitHub access key is saved in the repo encrypted with your password (PBKDF2 + AES-GCM).
   - Your tasks/schedule are saved in the repo encrypted with the same password.
   - Nothing is readable without the password. Saves go to the "data" branch so the site doesn't rebuild.
   Only active on *.github.io (or with ?site=1 for testing). */
(() => {
"use strict";
const H = window.HTD;
if (!H.SITE) return;

const REPO = "HaroldSarefield/HTD", BRANCH = "data", CFG = "htd-config.json", DATA = "htd-data.json";
const ITER = 600000;
const $ = s => document.querySelector(s);
const b64e = s => btoa(unescape(encodeURIComponent(s)));
const b64d = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
const u8b64 = u => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const b64u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

let key = null, token = null, cfg = null, dataSha = null, dirty = false, timer = null, busy = false, ready = false;

// ---------- crypto ----------
async function pwKey(pw, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(text, k) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(text)));
  return { iv: u8b64(iv), ct: u8b64(ct) };
}
async function open(box, k) { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u8(box.iv) }, k, b64u8(box.ct))); }

// ---------- remember this device (non-extractable key kept in IndexedDB) ----------
const idb = () => new Promise((res, rej) => { const r = indexedDB.open("htd-site", 1); r.onupgradeneeded = () => r.result.createObjectStore("k"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idbGet() { try { const db = await idb(); return await new Promise(res => { const q = db.transaction("k").objectStore("k").get("key"); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; } }
async function idbSet(v) { try { const db = await idb(); await new Promise(res => { const t = db.transaction("k", "readwrite"); v ? t.objectStore("k").put(v, "key") : t.objectStore("k").delete("key"); t.oncomplete = res; t.onerror = res; }); } catch { /* ignore */ } }

// ---------- GitHub ----------
async function gh(path, opts = {}, tok = token) {
  const headers = { Accept: "application/vnd.github+json", ...(tok ? { Authorization: "Bearer " + tok } : {}), ...(opts.body ? { "Content-Type": "application/json" } : {}) };
  return fetch("https://api.github.com/repos/" + REPO + path, { ...opts, headers, cache: "no-store" });
}
async function ghRead(file, tok = token) {
  const r = await gh(`/contents/${file}?ref=${BRANCH}&t=${Date.now()}`, {}, tok);
  if (r.status === 404) return { sha: null, text: null };
  if (!r.ok) throw new Error("read " + r.status);
  const j = await r.json();
  return { sha: j.sha, text: b64d(j.content) };
}
const ghWrite = (file, text, sha, message) => gh(`/contents/${file}`, { method: "PUT", body: JSON.stringify({ message, content: b64e(text), branch: BRANCH, ...(sha ? { sha } : {}) }) });
async function ensureBranch() {
  const r = await gh(`/git/ref/heads/${BRANCH}`);
  if (r.ok) return;
  const repo = await (await gh("")).json();
  const main = await (await gh(`/git/ref/heads/${repo.default_branch || "main"}`)).json();
  const c = await gh("/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main.object.sha }) });
  if (!c.ok && c.status !== 422) throw new Error("branch " + c.status);
}

// ---------- status ----------
function status(t) { const el = $("#syncState"); if (el) el.textContent = t; }

// ---------- saving ----------
H.onSave(() => { if (!ready) return; dirty = true; status("Saving…"); clearTimeout(timer); timer = setTimeout(flush, 1500); });
async function flush() {
  if (busy) { timer = setTimeout(flush, 800); return; }
  if (!dirty || !key || !token) return;
  busy = true; dirty = false;
  try {
    const box = JSON.stringify({ v: 1, ...(await seal(JSON.stringify(H.S), key)) });
    for (let i = 0; i < 4; i++) {
      const r = await ghWrite(DATA, box, dataSha, "Update HTD data");
      if (r.ok) { dataSha = (await r.json()).content.sha; status("Saved"); busy = false; return; }
      if (r.status === 401 || r.status === 403) { status("Saving refused — the GitHub access key may have expired"); break; }
      if (r.status === 409 || r.status === 422) { dataSha = (await ghRead(DATA)).sha; continue; }
      break;
    }
    dirty = true; status("Not saved — will retry");
  } catch { dirty = true; status("Offline — will retry"); }
  busy = false;
  timer = setTimeout(flush, 15000);
}
addEventListener("beforeunload", e => { if (dirty) { flush(); e.preventDefault(); e.returnValue = ""; } });

// ---------- pulling changes from other devices ----------
async function pull() {
  if (!key || !token || dirty || busy) return;
  try {
    const cur = await ghRead(DATA);
    if (!cur.text || cur.sha === dataSha) return;
    const box = JSON.parse(cur.text);
    const next = JSON.parse(await open(box, key));
    dataSha = cur.sha; ready = false; H.load(next); H.changed(); ready = true; status("Up to date");
  } catch { /* ignore */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
setInterval(pull, 60000);

// ---------- unlock ----------
async function unlockWith(k, remember) {
  token = await open(cfg, k); // throws if wrong password
  const t = await gh("", {}, token);
  if (!t.ok) {
    // password was right but the GitHub key expired: load data read-only, then ask for a new key
    key = k; const cur = await ghRead(DATA, null);
    if (cur.text) { H.load(JSON.parse(await open(JSON.parse(cur.text), key))); dataSha = cur.sha; H.changed(); }
    showSetup(false, "Your GitHub access token expired or was removed. Make a new one and re-enter your password.");
    throw Object.assign(new Error("token"), { handled: true });
  }
  key = k;
  const cur = await ghRead(DATA);
  if (cur.text) { H.load(JSON.parse(await open(JSON.parse(cur.text), key))); dataSha = cur.sha; }
  window.HTD_REMEMBER = !!remember;
  if (remember) await idbSet(key); else await idbSet(null);
  ready = true;
  H.changed();
  hideGate(); status("Up to date");
}

// ---------- gate UI ----------
function gate(html) {
  let g = $("#gate");
  if (!g) { g = document.createElement("div"); g.id = "gate"; document.body.appendChild(g); }
  g.innerHTML = `<div class="gate-box"><div class="gate-logo"><i></i>HTD</div>${html}</div>`;
  document.body.classList.add("locked");
  setTimeout(() => g.querySelector("input")?.focus(), 30);
}
function hideGate() { $("#gate")?.remove(); document.body.classList.remove("locked"); }

function showLogin(msg = "") {
  gate(`<h1>Locked</h1><p class="gate-sub">Harry's To Do. Enter your password.</p>
    <form id="gateForm" class="gate-form">
      <label>Password<input type="password" id="gPw" autocomplete="current-password" required></label>
      <label class="gate-check"><input type="checkbox" id="gRem" checked> Remember this device</label>
      <p class="gate-err" id="gErr">${msg}</p>
      <button class="btn solid" type="submit">Unlock →</button>
    </form>`);
  $("#gateForm").onsubmit = async e => {
    e.preventDefault(); const err = $("#gErr"); err.textContent = "Unlocking…";
    try { await unlockWith(await pwKey($("#gPw").value, b64u8(cfg.salt)), $("#gRem").checked); }
    catch (x) { if (!x.handled) err.textContent = "That password isn't right."; }
  };
}

function showSetup(change, note) {
  const first = !change && !key;
  gate(`<h1>${change ? "Change password" : first ? "Set up HTD" : "New access token"}</h1>
    <p class="gate-sub">${note || (change ? "Pick a new password. Your data is re-locked with it." : "One-time setup, same as Storage Unit editing. Everything you save is encrypted with your password, so only you can read it.")}</p>
    ${change ? "" : `<ol class="gate-steps">
      <li>On GitHub: Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token.</li>
      <li>Repository access: <b>Only select repositories</b> → <b>HTD</b>. Permissions: <b>Contents → Read and write</b>. Set the expiration as long as GitHub allows.</li>
      <li>Copy the token and paste it below with a password you'll remember.</li></ol>`}
    <form id="gateForm" class="gate-form">
      ${change ? "" : `<label>GitHub access token<input type="password" id="gTok" autocomplete="off" required></label>`}
      <label>${change ? "New password" : "Password"}<input type="password" id="gP1" autocomplete="new-password" minlength="10" required></label>
      <label>Type it again<input type="password" id="gP2" autocomplete="new-password" minlength="10" required></label>
      ${first ? `<label>Bring over your current tasks (optional)<input type="file" id="gImport" accept=".json"><span class="gate-hint">On your Mac's HTD, Settings → Backup → Export, then pick that file here.</span></label>` : ""}
      <label class="gate-check"><input type="checkbox" id="gRem" checked> Remember this device</label>
      <p class="gate-err" id="gErr"></p>
      <div class="gate-actions"><button class="btn solid" type="submit">${change ? "Change password" : "Lock it & save"} →</button>${change ? `<button class="btn ghost" type="button" id="gCancel">Cancel</button>` : ""}</div>
    </form>`);
  if (change) $("#gCancel").onclick = hideGate;
  $("#gateForm").onsubmit = async e => {
    e.preventDefault(); const err = $("#gErr");
    const p1 = $("#gP1").value, p2 = $("#gP2").value;
    if (p1 !== p2) { err.textContent = "The two passwords don't match."; return; }
    const tok = change ? token : $("#gTok").value.trim();
    err.textContent = "Saving…";
    try {
      const f = $("#gImport")?.files?.[0];
      if (f) { try { H.load(JSON.parse(await f.text())); } catch { throw new Error("That backup file couldn't be read."); } }
      const t = await gh("", {}, tok); if (!t.ok) throw new Error("That token didn't work. Check it has access to the HTD repo.");
      token = tok; await ensureBranch();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const k = await pwKey(p1, salt);
      const newCfg = { v: 1, salt: u8b64(salt), ...(await seal(tok, k)) };
      const curCfg = await ghRead(CFG);
      const w1 = await ghWrite(CFG, JSON.stringify(newCfg), curCfg.sha, change ? "Change HTD password" : "Set up HTD");
      if (!w1.ok) throw new Error("GitHub refused the save (" + w1.status + "). The token needs Contents: Read and write on HTD.");
      cfg = newCfg; key = k;
      const cur = await ghRead(DATA); dataSha = cur.sha;
      window.HTD_REMEMBER = $("#gRem").checked;
      await idbSet(window.HTD_REMEMBER ? key : null);
      ready = true; dirty = true; await flush();
      hideGate(); H.changed(); status("Saved");
    } catch (x) { err.textContent = x.message || "Something went wrong."; }
  };
}

window.HTD_SITE = {
  card() {
    return `<div><div class="cell-h"><h3>Website & password</h3><span class="label" id="syncState2">${ready ? "Unlocked" : ""}</span></div>
      <div class="small muted" style="margin-bottom:12px">Your data is encrypted with your password and saved to GitHub, so it's the same on every device. Nobody can read it without the password.</div>
      <div class="links"><button class="btn sm" data-site="lock">Lock now</button><button class="btn sm" data-site="change">Change password</button><button class="btn sm danger" data-site="reset">Reset access key</button></div></div>`;
  },
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-site]"); if (!b) return;
  const a = b.dataset.site;
  if (a === "lock") { await flush(); await idbSet(null); try { localStorage.removeItem("htd.v1"); } catch { /* ignore */ } location.reload(); }
  if (a === "change") showSetup(true);
  if (a === "reset") showSetup(false);
});

// ---------- boot ----------
(async () => {
  document.body.classList.add("locked");
  gate(`<h1>Loading…</h1>`);
  try {
    const r = await ghRead(CFG, null);
    if (!r.text) { showSetup(false); return; }
    cfg = JSON.parse(r.text);
  } catch { gate(`<h1>Can't reach GitHub</h1><p class="gate-sub">Check your connection and reload.</p>`); return; }
  const saved = await idbGet();
  if (saved) { try { await unlockWith(saved, true); return; } catch { await idbSet(null); } }
  showLogin();
})();
})();

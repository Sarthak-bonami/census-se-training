/* SE Family Autofill — content script (injected into the active tab, all frames).
   Fills the SE form for ONE selected household member.
   Primary strategy: match fields by data-se="<key>" (exact, used by SE-Replica).
   Fallback: label / placeholder / name text matching (best-effort for the live
   census site, which has no data-se attributes).
   Classic script (no modules); injected via chrome.scripting.executeScript. */
if (!window.__seFamilyInstalled) {
  window.__seFamilyInstalled = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").toString().toLowerCase()
    .replace(/[ ]/g, " ").replace(/[*:?_,.()\[\]/-]/g, " ").replace(/\s+/g, " ").trim();

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.type === "hidden" || el.disabled) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };

  /* ---- write a value so React/Vue/Angular notice ------------------------ */
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
  }
  function fire(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function fillTextLike(el, value) {
    el.focus();
    setNativeValue(el, "");
    fire(el);
    setNativeValue(el, value == null ? "" : String(value));
    fire(el);
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function fillSelect(el, value) {
    const want = norm(value);
    let o = [...el.options].find((x) => norm(x.value) === want || norm(x.textContent) === want)
         || [...el.options].find((x) => norm(x.textContent).includes(want) && want);
    if (!o) return false;
    setNativeValue(el, o.value); el.selectedIndex = o.index; fire(el);
    return true;
  }
  function clickRadio(nodes, value) {
    const want = norm(value);
    const hit = nodes.find((n) => norm(n.value) === want)
             || nodes.find((n) => norm(n.value).includes(want) && want)
             || nodes.find((n) => {
                  const lab = n.closest("label") || (n.labels && n.labels[0]);
                  return lab && norm(lab.textContent).includes(want);
                });
    if (!hit) return false;
    hit.click();
    if (!hit.checked) { hit.checked = true; fire(hit); }
    return true;
  }

  /* ---- fallback: find a control by describing text --------------------- */
  function describe(el) {
    const out = [];
    const push = (t) => { const n = norm(t); if (n && n.length < 200) out.push(n); };
    if (el.labels) for (const l of el.labels) push(l.textContent);
    push(el.getAttribute("aria-label")); push(el.placeholder); push(el.name); push(el.id);
    push(el.closest("label")?.textContent);
    let p = el.parentElement, hops = 0;
    while (p && hops++ < 3) { if (p.childElementCount < 12) push(p.textContent); p = p.parentElement; }
    return out;
  }
  function findByText(matches) {
    const controls = [...document.querySelectorAll("input,textarea,select")].filter(visible)
      .filter((el) => !/^(submit|button|reset|image|file)$/i.test(el.type || ""));
    let best = null, score = 0;
    for (const el of controls) {
      const desc = describe(el);
      for (let i = 0; i < matches.length; i++) {
        const m = norm(matches[i]); if (!m) continue;
        for (const d of desc) {
          let s = d === m ? 1000 - i * 10 : d.includes(m) ? 700 - i * 10 : 0;
          if (s > score) { score = s; best = el; }
        }
      }
    }
    return best;
  }

  /* ---- fill one key ---------------------------------------------------- */
  function fillKey(key, value, matchHints) {
    if (value === "" || value === null || value === undefined) return "skipped";
    const nodes = [...document.querySelectorAll('[data-se="' + CSS.escape(key) + '"]')].filter(visible);

    if (nodes.length) {
      // radio group (multiple radios sharing the key)
      const radios = nodes.filter((n) => n.tagName === "INPUT" && n.type === "radio");
      if (radios.length) return clickRadio(radios, value) ? "filled" : "option_not_found";
      const checks = nodes.filter((n) => n.tagName === "INPUT" && n.type === "checkbox");
      if (checks.length) {
        if (Array.isArray(value)) {           // multiselect
          let any = false;
          // Re-query per option: some frameworks re-render on each toggle, which
          // would detach the other checkboxes if we held a stale list.
          value.forEach((opt) => {
            const want = norm(opt);
            const c = [...document.querySelectorAll('[data-se="' + CSS.escape(key) + '"]')]
              .filter((n) => n.tagName === "INPUT" && n.type === "checkbox")
              .find((n) => norm(n.value) === want);
            if (c && !c.checked) { c.click(); if (!c.checked) { c.checked = true; fire(c); } }
            if (c) any = true;
          });
          return any ? "filled" : "option_not_found";
        }
        const on = value === true || /^(yes|true|1)$/i.test(String(value));
        const c = checks[0];
        if (c.checked !== on) { c.click(); if (c.checked !== on) { c.checked = on; fire(c); } }
        return "filled";
      }
      const el = nodes[0];
      if (el.tagName === "SELECT") return fillSelect(el, value) ? "filled" : "option_not_found";
      fillTextLike(el, value); return "filled";
    }

    // fallback for the live site
    if (matchHints && matchHints.length) {
      const el = findByText(matchHints);
      if (el) {
        if (el.tagName === "SELECT") return fillSelect(el, value) ? "filled" : "option_not_found";
        fillTextLike(el, value); return "filled";
      }
    }
    return "not_found";
  }

  function flash(el, ok) {
    if (!el) return;
    const prev = el.style.outline;
    el.style.outline = ok ? "2px solid #1f8a4c" : "2px dashed #c0392b";
    setTimeout(() => (el.style.outline = prev), 2500);
  }

  function fillAll(answers, hints) {
    const results = {};
    for (const key in answers) {
      let status;
      try { status = fillKey(key, answers[key], hints && hints[key]); }
      catch (e) { status = "error:" + e.message; }
      results[key] = status;
      const n = document.querySelector('[data-se="' + CSS.escape(key) + '"]');
      if (n && status === "filled") flash(n, true);
    }
    return results;
  }

  /* ---- button helpers (for auto-advance) ------------------------------- */
  function findButton(texts) {
    const btns = [...document.querySelectorAll("button, [role=button], input[type=button], input[type=submit]")].filter(visible);
    for (const t of texts) {
      const want = norm(t);
      const b = btns.find((x) => norm(x.textContent || x.value).includes(want));
      if (b) return b;
    }
    return null;
  }
  function errorModalOpen() {
    const m = document.querySelector(".overlay .modal, [role=dialog]");
    return m && /validation|required|invalid|error/i.test(m.textContent || "");
  }

  async function autorunSections(answers, hints) {
    const log = [];
    for (let step = 0; step < 12; step++) {
      const res = fillAll(answers, hints);
      const filled = Object.values(res).filter((s) => s === "filled").length;
      log.push("section fill: " + filled + " field(s)");
      await sleep(120);
      const finish = findButton(["save & finish member", "save and finish"]);
      const cont = findButton(["save & continue", "save and continue"]);
      const btn = finish || cont;
      if (!btn) { log.push("no advance button — stopping"); break; }
      btn.click();
      await sleep(400);
      if (errorModalOpen()) { log.push("stopped: validation modal (missing data) — fill the rest manually"); break; }
      if (finish) { log.push("finished member"); break; }
    }
    return log;
  }

  async function addAllMembers(members) {
    const log = [];
    for (let i = 0; i < members.length; i++) {
      fillAll(members[i], null);
      await sleep(150);
      const btn = findButton(["save & add member", "save and add member"]);
      if (!btn) { log.push("no 'Save & Add Member' button — are you on the Basic Information screen?"); break; }
      btn.click();
      await sleep(400);
      if (errorModalOpen()) {
        const ok = findButton(["ok"]); if (ok) ok.click();
        log.push("member " + (i + 1) + " (" + (members[i].name || "?") + "): validation error — check dependent fields");
      } else {
        log.push("added member " + (i + 1) + ": " + (members[i].name || "(unnamed)"));
      }
      await sleep(200);
    }
    return log;
  }

  /* ---- messaging ------------------------------------------------------- */
  chrome.runtime.onMessage.addListener((msg, _s, respond) => {
    if (!msg) return;
    if (msg.cmd === "PING") { respond({ ok: true }); return; }
    if (msg.cmd === "FILL") {
      const results = fillAll(msg.answers || {}, msg.hints || null);
      chrome.runtime.sendMessage({ type: "FILL_RESULT", frame: location.href, top: window === window.top, results });
      respond({ ok: true }); return;
    }
    if (msg.cmd === "AUTORUN_SECTIONS") {
      autorunSections(msg.answers || {}, msg.hints || null).then((log) =>
        chrome.runtime.sendMessage({ type: "RUN_LOG", log }));
      respond({ ok: true }); return true;
    }
    if (msg.cmd === "ADD_ALL_MEMBERS") {
      addAllMembers(msg.members || []).then((log) =>
        chrome.runtime.sendMessage({ type: "RUN_LOG", log }));
      respond({ ok: true }); return true;
    }
  });
}

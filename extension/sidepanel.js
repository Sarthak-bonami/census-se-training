/* SE Family Autofill — side panel logic.
   Families (household + members with full Q1–Q40 answers) are persisted in
   chrome.storage.local. The member editor is rendered from the SAME schema the
   replica uses, so keys line up 1:1 with data-se on the page. */
(function () {
  "use strict";
  var DATA = window.SE_DATA, SCHEMA = window.SE_SCHEMA, OPT = window.SE_OPT;
  var STORE = "se_family_state_v1";

  var state = { families: [], currentFamilyId: null, currentMemberId: null };
  var openSections = { basic: true };   // which editor accordions are open

  // Minimal text hints for the LIVE census site fallback (replica uses data-se).
  var HINTS = {
    name: ["name of the person", "name"], relationship: ["relationship to head", "relationship"],
    sex: ["sex", "gender"], dob: ["date of birth", "dob"], age: ["age in completed years", "age"],
    marital: ["current marital status", "marital"], spouse_name: ["spouse name"],
    nationality: ["nationality"], religion: ["religion"], mother_tongue: ["mother tongue"],
    mobile_number: ["mobile number"], aadhaar_number: ["aadhaar"], bank_accounts: ["bank accounts"]
  };

  /* ---- storage --------------------------------------------------------- */
  function persist() { chrome.storage.local.set({ [STORE]: state }); }
  function loadState(cb) {
    chrome.storage.local.get(STORE, function (r) {
      if (r && r[STORE] && Array.isArray(r[STORE].families)) state = r[STORE];
      cb();
    });
  }
  function uid() { return "id" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---- model helpers --------------------------------------------------- */
  function currentFamily() { return state.families.filter(function (f) { return f.id === state.currentFamilyId; })[0] || null; }
  function currentMember() {
    var f = currentFamily(); if (!f) return null;
    return f.members.filter(function (m) { return m.id === state.currentMemberId; })[0] || null;
  }
  function newFamily() {
    var f = { id: uid(), name: "Family " + (state.families.length + 1), phone: "", household: {}, members: [] };
    state.families.push(f); state.currentFamilyId = f.id;
    addMember(); persist();
  }
  function addMember() {
    var f = currentFamily(); if (!f) return;
    var m = { id: uid(), relationship: f.members.length === 0 ? "Head" : "" };
    f.members.push(m); state.currentMemberId = m.id; persist();
  }

  /* ---- tiny DOM helper ------------------------------------------------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  var opt = function (f, m) { return f.optionsFn ? (f.optionsFn(m, m) || []) : (f.options || []); };
  var vis = function (f, m) { return f.visibleIf ? !!f.visibleIf(m, m) : true; };
  var req = function (f, m) { return f.required === true || (f.reqFn ? !!f.reqFn(m, m) : false); };

  /* ---- field renderer -------------------------------------------------- */
  // rec = object to read/write; o.deps = object used for visibility/options
  // (defaults to rec); o.locked renders a read-only "auto-filled" row.
  function field(f, rec, o) {
    o = o || {};
    var deps = o.deps || rec;
    if (f.type === "heading") return el("div", { class: "qhead", text: f.label });
    if (f.type === "note") return el("div", { class: "hint", text: f.label });
    if (!o.locked && !vis(f, deps)) return null;
    var lbl = (f.q ? el("span", { class: "qn", text: f.q + "." }) : null);

    if (o.locked) {
      var v = o.value, disp = Array.isArray(v) ? v.join(", ") : (v === true ? "Yes" : v === false ? "No" : (v == null || v === "" ? "" : String(v)));
      return el("div", { class: "f locked" }, [
        el("label", {}, [lbl, f.label]),
        el("div", { class: "lockrow" }, [
          el("div", { class: "lockval" }, [disp !== "" ? disp : el("span", { class: "empty", text: "—" })]),
          el("div", { style: "display:flex;gap:8px;align-items:center" }, [
            el("span", { class: "lockchip " + (o.reason || ""), text: "🔒 " + (OPT ? OPT.reasonLabel(o.reason) : o.reason) }),
            o.onUnlock ? el("button", { class: "override", onclick: o.onUnlock }, ["Edit"]) : null
          ])
        ])
      ]);
    }

    var cur = rec[f.key];
    var reRender = function () { persist(); renderAll(); };
    if (f.type === "checkbox") {
      var cb = el("input", { type: "checkbox", onchange: function (e) { rec[f.key] = e.target.checked; reRender(); } });
      if (cur) cb.checked = true;
      return el("div", { class: "f chk" }, [cb, el("label", {}, [lbl, f.label])]);
    }
    var wrap = el("div", { class: "f" }, [el("label", {}, [lbl, f.label, req(f, deps) ? " *" : ""])]);
    if (f.type === "select") {
      var s = el("select", { onchange: function (e) { rec[f.key] = e.target.value; reRender(); } });
      s.appendChild(el("option", { value: "" }, ["— Select —"]));
      (f.optionsFn ? (f.optionsFn(deps, deps) || []) : (f.options || [])).forEach(function (op2) {
        var oo = el("option", { value: op2 }, [op2]); if (op2 === cur) oo.selected = true; s.appendChild(oo);
      });
      wrap.appendChild(s);
    } else if (f.type === "radio") {
      var rc = el("div", { class: "choices" });
      (f.options || []).forEach(function (op2) {
        var r = el("input", { type: "radio", name: "r_" + f.key + "_" + (rec.id || "hh"), onchange: function () { rec[f.key] = op2; reRender(); } });
        if (op2 === cur) r.checked = true;
        rc.appendChild(el("label", {}, [r, op2]));
      });
      wrap.appendChild(rc);
    } else if (f.type === "multiselect") {
      var arr = Array.isArray(cur) ? cur : [];
      var mc = el("div", { class: "choices" });
      (f.options || []).forEach(function (op2) {
        var c = el("input", { type: "checkbox", onchange: function (e) {
          var a2 = Array.isArray(rec[f.key]) ? rec[f.key].slice() : [];
          if (e.target.checked) { if (f.max && a2.length >= f.max) { e.target.checked = false; return; } a2.push(op2); }
          else a2 = a2.filter(function (x) { return x !== op2; });
          rec[f.key] = a2; reRender();
        } });
        if (arr.indexOf(op2) >= 0) c.checked = true;
        mc.appendChild(el("label", {}, [c, op2]));
      });
      wrap.appendChild(mc);
    } else {
      var t = f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text";
      var inp = el("input", { type: t, placeholder: f.placeholder || "", value: cur == null ? "" : cur,
        oninput: function (e) { rec[f.key] = e.target.value; persist(); updateChips(); } });
      // Date/age changes drive derivations (age, minor defaults) — re-render on commit.
      if (t === "date" || t === "number") inp.addEventListener("change", function () { persist(); renderAll(); });
      wrap.appendChild(inp);
    }
    if (f.hint) wrap.appendChild(el("div", { class: "hint", text: f.hint }));
    return wrap;
  }

  // resolved answers = member's own values + household/derived (respecting overrides)
  function effective(fam, m) {
    var der = OPT.deriveMember(fam, m), eff = {};
    Object.keys(m).forEach(function (k) { if (k !== "id" && k !== "overrides") eff[k] = m[k]; });
    Object.keys(der.values).forEach(function (k) { if (!(m.overrides && m.overrides[k])) eff[k] = der.values[k]; });
    return { der: der, eff: eff };
  }

  /* ---- rendering ------------------------------------------------------- */
  function renderFamilyBar() {
    var sel = document.getElementById("familySelect");
    clear(sel);
    if (!state.families.length) { sel.appendChild(el("option", { value: "" }, ["No families yet"])); }
    state.families.forEach(function (f) {
      var o = el("option", { value: f.id }, [f.name + (f.phone ? " · " + f.phone : "")]);
      if (f.id === state.currentFamilyId) o.selected = true; sel.appendChild(o);
    });
    var f = currentFamily();
    document.getElementById("familyName").value = f ? f.name : "";
    document.getElementById("familyPhone").value = f ? f.phone : "";
    document.getElementById("deleteFamily").disabled = !f;
  }

  function memberLabel(m, i) {
    return (m.name && m.name.trim()) ? m.name : ("Member " + (i + 1));
  }
  function updateChips() {
    var box = document.getElementById("memberChips"); clear(box);
    var f = currentFamily();
    if (!f) { box.appendChild(el("div", { class: "empty", text: "Create a family to begin." })); return; }
    if (!f.members.length) { box.appendChild(el("div", { class: "empty", text: "No members yet." })); return; }
    f.members.forEach(function (m, i) {
      var chip = el("div", { class: "chip" + (m.id === state.currentMemberId ? " active" : ""), onclick: function () { state.currentMemberId = m.id; persist(); renderAll(); } }, [
        el("span", { text: memberLabel(m, i) }),
        m.relationship ? el("span", { class: "badge", text: m.relationship === "Head" ? "HEAD" : (m.relationship.split(" ")[0]) }) : null,
        el("button", { class: "x", title: "Remove", onclick: function (e) {
          e.stopPropagation();
          f.members = f.members.filter(function (x) { return x.id !== m.id; });
          if (state.currentMemberId === m.id) state.currentMemberId = f.members.length ? f.members[0].id : null;
          persist(); renderAll();
        } }, ["×"])
      ]);
      box.appendChild(chip);
    });
  }

  // The household "fill once" panel (shared by everyone).
  function renderHousehold() {
    var box = document.getElementById("householdFields"); if (!box) return; clear(box);
    var fam = currentFamily(); if (!fam) return;
    if (!fam.household) fam.household = {};
    OPT.HOUSEHOLD_FIELDS.forEach(function (f) { var n = field(f, fam.household); if (n) box.appendChild(n); });
  }

  // Member editor — "what's left" first, auto-filled details tucked in a drawer.
  function renderEditor() {
    var box = document.getElementById("editor"); clear(box);
    var fam = currentFamily(), m = currentMember();
    if (!m) { box.appendChild(el("div", { class: "empty", text: "Add a member to edit their details." })); return; }
    var r = effective(fam, m), der = r.der, eff = r.eff;
    var overridden = function (k) { return m.overrides && m.overrides[k]; };
    var mIdx = fam.members.indexOf(m);

    var groups = [{ id: "basic", title: "Basic details", fields: SCHEMA.MEMBER_FIELDS }].concat(
      SCHEMA.SECTIONS.filter(function (s) { return !(s.appliesTo && !s.appliesTo(eff)); })
        .map(function (s) { return { id: s.id, title: s.title, fields: s.questions }; }));

    var autoCount = Object.keys(der.locks).filter(function (k) { return !overridden(k); }).length;

    // "Still to fill" — only editable, visible, unanswered/answerable fields.
    var toFill = el("div", {}), toFillCount = 0;
    groups.forEach(function (g) {
      var rows = [];
      g.fields.forEach(function (f) {
        if (f.type === "heading" || f.type === "note") return;
        if (der.locks[f.key] && !overridden(f.key)) return;   // auto-filled -> drawer
        if (!vis(f, eff)) return;
        var n = field(f, m, { deps: eff }); if (!n) return;
        rows.push(n);
        var val = m[f.key]; if (val == null || val === "" || (Array.isArray(val) && !val.length)) toFillCount++;
      });
      if (rows.length) { toFill.appendChild(el("div", { class: "qhead", text: g.title })); rows.forEach(function (x) { toFill.appendChild(x); }); }
    });

    box.appendChild(el("div", { class: "savings", text: "✅ " + autoCount + " details auto-filled for " + memberLabel(m, mIdx) + "." + (toFillCount ? (" Please fill " + toFillCount + " more below.") : " Nothing left to fill 🎉") }));
    box.appendChild(toFill);

    // "Auto-filled for you" drawer — locked, viewable, with per-field Edit override.
    var doneBody = el("div", { class: "body" }); var anyDone = false;
    groups.forEach(function (g) {
      g.fields.forEach(function (f) {
        if (f.type === "heading" || f.type === "note") return;
        if (der.locks[f.key] && !overridden(f.key)) {
          anyDone = true;
          doneBody.appendChild(field(f, m, {
            locked: true, reason: der.locks[f.key], value: der.values[f.key],
            onUnlock: function () { if (!m.overrides) m.overrides = {}; m.overrides[f.key] = true; if (m[f.key] === undefined || m[f.key] === "") m[f.key] = der.values[f.key]; persist(); renderAll(); }
          }));
        }
      });
    });
    if (anyDone) {
      var open = !!openSections.done;
      box.appendChild(el("div", { class: "acc" + (open ? " open" : "") }, [
        el("div", { class: "ah", onclick: function () { openSections.done = !openSections.done; renderEditor(); } },
          [el("span", { text: "Auto-filled for you (" + autoCount + ")" }), el("span", { class: "rng", text: open ? "hide" : "show" })]),
        doneBody
      ]));
    }
  }

  function renderAll() { renderFamilyBar(); renderHousehold(); updateChips(); renderEditor(); }

  /* ---- talking to the page -------------------------------------------- */
  function say(text, cls) {
    var s = document.getElementById("status"); s.hidden = false; s.textContent = text;
    s.style.background = cls === "err" ? "#fdeceb" : "#eef4ec";
    s.style.borderColor = cls === "err" ? "#f1c9c5" : "#cfe3d3";
  }
  function appendSay(text) { var s = document.getElementById("status"); s.hidden = false; s.textContent += "\n" + text; }

  function activeTab(cb) { chrome.tabs.query({ active: true, currentWindow: true }, function (t) { cb(t[0]); }); }
  function withContent(cb) {
    activeTab(function (tab) {
      if (!tab || /^(chrome|edge|about|chrome-extension|devtools):/i.test(tab.url || "")) { say("Open the SE form (replica or live site) in a normal tab first.", "err"); return; }
      chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] }, function () {
        if (chrome.runtime.lastError) { say("Can't run on this page: " + chrome.runtime.lastError.message, "err"); return; }
        cb(tab);
      });
    });
  }
  // Values sent to the page = member's own answers + household/derived (respecting overrides).
  function resolvedAnswers(fam, m) {
    var eff = effective(fam, m).eff, out = {};
    Object.keys(eff).forEach(function (k) { var v = eff[k]; if (v !== "" && v != null && !(Array.isArray(v) && !v.length)) out[k] = v; });
    return out;
  }

  function fillScreen() {
    var f = currentFamily(), m = currentMember(); if (!m) { say("Select a member first.", "err"); return; }
    withContent(function (tab) {
      say("Filling this screen for " + memberLabel(m, 0) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "FILL", answers: resolvedAnswers(f, m), hints: HINTS }, function () { void chrome.runtime.lastError; });
    });
  }
  function autoRun() {
    var f = currentFamily(), m = currentMember(); if (!m) { say("Select a member first.", "err"); return; }
    withContent(function (tab) {
      say("Filling all questions for " + memberLabel(m, 0) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "AUTORUN_SECTIONS", answers: resolvedAnswers(f, m), hints: HINTS }, function () { void chrome.runtime.lastError; });
    });
  }
  function addAll() {
    var f = currentFamily(); if (!f || !f.members.length) { say("No members to add.", "err"); return; }
    withContent(function (tab) {
      say("Adding " + f.members.length + " member(s) to the roster…");
      chrome.tabs.sendMessage(tab.id, { cmd: "ADD_ALL_MEMBERS", members: f.members.map(function (m) { return resolvedAnswers(f, m); }) }, function () { void chrome.runtime.lastError; });
    });
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg) return;
    if (msg.type === "FILL_RESULT") {
      var r = msg.results || {};
      var filled = Object.keys(r).filter(function (k) { return r[k] === "filled"; }).length;
      var missed = Object.keys(r).filter(function (k) { return r[k] !== "filled" && r[k] !== "skipped"; });
      say("Filled " + filled + " field(s)." + (missed.length ? "\nNot found on this screen: " + missed.join(", ") : ""));
    }
    if (msg.type === "RUN_LOG") { say((msg.log || []).join("\n")); }
  });

  /* ---- auto-recognition by phone -------------------------------------- */
  // Runs IN THE PAGE (serialized by executeScript). Returns the household phone
  // visible on screen + a coarse screen type, so we can pick the right family.
  function readContext() {
    var q = function (s) { return document.querySelector(s); };
    var val = function (s) { var e = q(s); return e ? (e.value || "") : ""; };
    var phone = (val('[data-se="login_mobile"]') || val('[data-se="mobile_number"]')).replace(/\D/g, "");
    if (!/^\d{10}$/.test(phone)) {
      var tel = [].slice.call(document.querySelectorAll('input[type=tel]'))
        .map(function (e) { return (e.value || "").replace(/\D/g, ""); })
        .filter(function (v) { return /^\d{10}$/.test(v); })[0];
      if (tel) phone = tel;
    }
    var screen = "other";
    if (q('[data-se="login_mobile"]') || q('[data-se="otp"]')) screen = "login";
    else if (q('[data-se="name"]') && q('[data-se="relationship"]')) screen = "members";
    else if (document.querySelector(".stepper") || q('[data-se="nationality"]')) screen = "questionnaire";
    return { phone: /^\d{10}$/.test(phone) ? phone : "", screen: screen };
  }

  var detectTimer = null, lastAutoFillKey = "";
  function startDetect() { stopDetect(); detectTick(); detectTimer = setInterval(detectTick, 1500); }
  function stopDetect() { if (detectTimer) { clearInterval(detectTimer); detectTimer = null; } }
  function detectTick() {
    if (!document.getElementById("autoDetect").checked) return;
    activeTab(function (tab) {
      if (!tab || /^(chrome|edge|about|chrome-extension|devtools):/i.test(tab.url || "")) return;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readContext }, function (res) {
        if (chrome.runtime.lastError || !res || !res[0]) return;
        handleContext(res[0].result || {});
      });
    });
  }
  function handleContext(ctx) {
    var banner = document.getElementById("detectBanner");
    if (!ctx.phone) { banner.hidden = true; return; }
    var match = state.families.filter(function (f) { return (f.phone || "") === ctx.phone; })[0];
    if (!match) {
      banner.hidden = false; banner.className = "detect warn";
      banner.textContent = "📱 " + ctx.phone + " — no saved family. Set this number as a family's phone to auto-fill it.";
      return;
    }
    // Recognised — select that family automatically.
    if (state.currentFamilyId !== match.id) {
      state.currentFamilyId = match.id;
      state.currentMemberId = match.members[0] ? match.members[0].id : null;
      persist(); renderAll();
    }
    banner.hidden = false; banner.className = "detect";
    banner.textContent = "📱 Recognised " + match.name + " (" + ctx.phone + ") · " + match.members.length + " member(s)";

    // Optional auto-fill, once per (phone + screen) so it doesn't loop.
    if (document.getElementById("autoFillMatch").checked) {
      var key = ctx.phone + ":" + ctx.screen;
      if (key !== lastAutoFillKey && (ctx.screen === "members" || ctx.screen === "questionnaire")) {
        lastAutoFillKey = key;
        if (ctx.screen === "members") addAll();
        else autoRun();
      }
    }
  }

  /* ---- import / export ------------------------------------------------- */
  function exportFamily() {
    var f = currentFamily(); if (!f) return;
    navigator.clipboard.writeText(JSON.stringify(f, null, 2)).then(function () { say("Family JSON copied to clipboard."); });
  }
  function importFamily() {
    navigator.clipboard.readText().then(function (txt) {
      try {
        var f = JSON.parse(txt);
        if (!f || !Array.isArray(f.members)) throw new Error("not a family");
        f.id = uid(); state.families.push(f); state.currentFamilyId = f.id;
        state.currentMemberId = f.members[0] ? f.members[0].id : null;
        persist(); renderAll(); say("Imported family: " + (f.name || "(unnamed)"));
      } catch (e) { say("Clipboard isn't a valid family JSON.", "err"); }
    });
  }

  /* ---- boot ------------------------------------------------------------ */
  function bind() {
    document.getElementById("newFamily").onclick = function () { newFamily(); renderAll(); };
    document.getElementById("deleteFamily").onclick = function () {
      var f = currentFamily(); if (!f) return;
      if (!confirm("Delete " + f.name + "?")) return;
      state.families = state.families.filter(function (x) { return x.id !== f.id; });
      state.currentFamilyId = state.families.length ? state.families[0].id : null;
      state.currentMemberId = currentFamily() && currentFamily().members[0] ? currentFamily().members[0].id : null;
      persist(); renderAll();
    };
    document.getElementById("familySelect").onchange = function (e) {
      state.currentFamilyId = e.target.value;
      var f = currentFamily(); state.currentMemberId = f && f.members[0] ? f.members[0].id : null;
      persist(); renderAll();
    };
    document.getElementById("familyName").oninput = function (e) { var f = currentFamily(); if (f) { f.name = e.target.value; persist(); renderFamilyBar(); } };
    document.getElementById("familyPhone").oninput = function (e) { var f = currentFamily(); if (f) { f.phone = e.target.value.replace(/\D/g, "").slice(0, 10); e.target.value = f.phone; persist(); renderFamilyBar(); } };
    document.getElementById("addMember").onclick = function () { if (!currentFamily()) newFamily(); addMember(); renderAll(); };
    document.getElementById("fillScreen").onclick = fillScreen;
    document.getElementById("autoRun").onclick = autoRun;
    document.getElementById("addAll").onclick = addAll;
    document.getElementById("exportFamily").onclick = exportFamily;
    document.getElementById("importFamily").onclick = importFamily;
    document.getElementById("autoDetect").onchange = function (e) {
      if (e.target.checked) startDetect();
      else { stopDetect(); document.getElementById("detectBanner").hidden = true; }
    };
    document.getElementById("toggleHousehold").onclick = function () {
      var box = document.getElementById("householdFields"); box.hidden = !box.hidden;
    };
  }

  loadState(function () {
    if (!state.families.length) newFamily();
    if (!state.currentFamilyId && state.families[0]) state.currentFamilyId = state.families[0].id;
    var f = currentFamily(); if (f && !state.currentMemberId && f.members[0]) state.currentMemberId = f.members[0].id;
    bind(); renderAll();
    if (document.getElementById("autoDetect").checked) startDetect();
  });
})();

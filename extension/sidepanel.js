/* SE Family Autofill — side panel logic.
   Families (household + members with full Q1–Q40 answers) are persisted in
   chrome.storage.local. The member editor is rendered from the SAME schema the
   replica uses, so keys line up 1:1 with data-se on the page. */
(function () {
  "use strict";
  var DATA = window.SE_DATA, SCHEMA = window.SE_SCHEMA;
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
    var f = { id: uid(), name: "Family " + (state.families.length + 1), phone: "", members: [] };
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

  /* ---- field renderer (writes to member[key]) -------------------------- */
  function field(f, m) {
    if (f.type === "heading") return el("div", { class: "qhead", text: f.label });
    if (f.type === "note") return el("div", { class: "hint", text: f.label });
    if (!vis(f, m)) return null;
    var cur = m[f.key];
    var lbl = (f.q ? el("span", { class: "qn", text: f.q + "." }) : null);
    var reRender = function () { persist(); renderEditor(); };

    if (f.type === "checkbox") {
      var cb = el("input", { type: "checkbox", onchange: function (e) { m[f.key] = e.target.checked; reRender(); } });
      if (cur) cb.checked = true;
      return el("div", { class: "f chk" }, [cb, el("label", {}, [lbl, f.label])]);
    }
    var wrap = el("div", { class: "f" }, [el("label", {}, [lbl, f.label, req(f, m) ? " *" : ""])]);
    if (f.type === "select") {
      var s = el("select", { onchange: function (e) { m[f.key] = e.target.value; reRender(); } });
      s.appendChild(el("option", { value: "" }, ["— Select —"]));
      opt(f, m).forEach(function (o) { var op = el("option", { value: o }, [o]); if (o === cur) op.selected = true; s.appendChild(op); });
      wrap.appendChild(s);
    } else if (f.type === "radio") {
      var rc = el("div", { class: "choices" });
      opt(f, m).forEach(function (o) {
        var r = el("input", { type: "radio", name: "r_" + f.key + "_" + m.id, onchange: function () { m[f.key] = o; reRender(); } });
        if (o === cur) r.checked = true;
        rc.appendChild(el("label", {}, [r, o]));
      });
      wrap.appendChild(rc);
    } else if (f.type === "multiselect") {
      var arr = Array.isArray(cur) ? cur : [];
      var mc = el("div", { class: "choices" });
      opt(f, m).forEach(function (o) {
        var c = el("input", { type: "checkbox", onchange: function (e) {
          var a2 = Array.isArray(m[f.key]) ? m[f.key].slice() : [];
          if (e.target.checked) { if (f.max && a2.length >= f.max) { e.target.checked = false; return; } a2.push(o); }
          else a2 = a2.filter(function (x) { return x !== o; });
          m[f.key] = a2; reRender();
        } });
        if (arr.indexOf(o) >= 0) c.checked = true;
        mc.appendChild(el("label", {}, [c, o]));
      });
      wrap.appendChild(mc);
    } else {
      var t = f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text";
      var inp = el("input", { type: t, placeholder: f.placeholder || "", value: cur == null ? "" : cur,
        oninput: function (e) { m[f.key] = e.target.value; persist(); updateChips(); } });
      wrap.appendChild(inp);
    }
    if (f.hint) wrap.appendChild(el("div", { class: "hint", text: f.hint }));
    return wrap;
  }

  function accordion(id, title, range, fields, m, disabledNote) {
    var body = el("div", { class: "body" });
    if (disabledNote) body.appendChild(el("div", { class: "disabled-note", text: disabledNote }));
    else fields.forEach(function (f) { var n = field(f, m); if (n) body.appendChild(n); });
    var head = el("div", { class: "ah", onclick: function () { openSections[id] = !openSections[id]; renderEditor(); } },
      [el("span", { text: title }), el("span", { class: "rng", text: range || "" })]);
    return el("div", { class: "acc" + (openSections[id] ? " open" : "") }, [head, body]);
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

  function renderEditor() {
    var box = document.getElementById("editor"); clear(box);
    var m = currentMember();
    if (!m) { box.appendChild(el("div", { class: "empty", text: "Add a member to edit their details." })); return; }
    // Basic Information (Q1–6)
    box.appendChild(accordion("basic", "Basic Information", "Q1–Q6", SCHEMA.MEMBER_FIELDS, m));
    // Questionnaire sections (Q7–Q40)
    SCHEMA.SECTIONS.forEach(function (s) {
      var disabled = (s.appliesTo && !s.appliesTo(m)) ? "Not applicable for this member (based on sex / marital status). This section is skipped on the form." : null;
      box.appendChild(accordion(s.id, s.title, s.range, s.questions, m, disabled));
    });
  }

  function renderAll() { renderFamilyBar(); updateChips(); renderEditor(); }

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
  function flatAnswers(m) {
    var out = {};
    Object.keys(m).forEach(function (k) { if (k !== "id" && m[k] !== "" && m[k] != null) out[k] = m[k]; });
    return out;
  }

  function fillScreen() {
    var m = currentMember(); if (!m) { say("Select a member first.", "err"); return; }
    withContent(function (tab) {
      say("Filling current screen for " + memberLabel(m, 0) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "FILL", answers: flatAnswers(m), hints: HINTS }, function () { void chrome.runtime.lastError; });
    });
  }
  function autoRun() {
    var m = currentMember(); if (!m) { say("Select a member first.", "err"); return; }
    withContent(function (tab) {
      say("Auto-filling all sections for " + memberLabel(m, 0) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "AUTORUN_SECTIONS", answers: flatAnswers(m), hints: HINTS }, function () { void chrome.runtime.lastError; });
    });
  }
  function addAll() {
    var f = currentFamily(); if (!f || !f.members.length) { say("No members to add.", "err"); return; }
    withContent(function (tab) {
      say("Adding " + f.members.length + " member(s) to the roster…");
      chrome.tabs.sendMessage(tab.id, { cmd: "ADD_ALL_MEMBERS", members: f.members.map(flatAnswers) }, function () { void chrome.runtime.lastError; });
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
  }

  loadState(function () {
    if (!state.families.length) newFamily();
    if (!state.currentFamilyId && state.families[0]) state.currentFamilyId = state.families[0].id;
    var f = currentFamily(); if (f && !state.currentMemberId && f.members[0]) state.currentMemberId = f.members[0].id;
    bind(); renderAll();
    if (document.getElementById("autoDetect").checked) startDetect();
  });
})();

/* SE Family Autofill — side panel logic.
   Families (household + members with full Q1–Q40 answers) are persisted in
   chrome.storage.local. The member editor is rendered from the SAME schema the
   replica uses, so keys line up 1:1 with data-se on the page. */
(function () {
  "use strict";
  var DATA = window.SE_DATA, SCHEMA = window.SE_SCHEMA, OPT = window.SE_OPT;
  var STORE = "se_family_state_v1";

  var state = { families: [], currentFamilyId: null, currentMemberId: null };
  var openSections = {};        // which per-member "auto-filled" drawers are open (by member id)
  var openMember = {};          // which member cards are expanded (by member id)
  var lastCtx = { phone: "", screen: "other", member: "" };  // last page context seen

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
    var f = { id: uid(), name: "Family " + (state.families.length + 1), phone: "", household: { religion: "Jain" }, members: [] };
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
    return (m.name && m.name.trim()) ? m.name : ("Person " + (i + 1));
  }
  function updateChips() { /* no-op: counts refresh on the next full render (keeps text focus) */ }
  function norm(s) { return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim(); }
  function memberByName(fam, name) {
    var w = norm(name); if (!fam || !w) return null;
    return fam.members.filter(function (m) { return norm(m.name) === w; })[0]
        || fam.members.filter(function (m) { return norm(m.name) && (w.indexOf(norm(m.name)) >= 0 || norm(m.name).indexOf(w) >= 0); })[0] || null;
  }

  // The household "fill once" panel (shared by everyone).
  function renderHousehold() {
    var box = document.getElementById("householdFields"); if (!box) return; clear(box);
    var fam = currentFamily(); if (!fam) return;
    if (!fam.household) fam.household = {};
    if (!fam.household.religion) fam.household.religion = "Jain";  // default religion
    OPT.HOUSEHOLD_FIELDS.forEach(function (f) { var n = field(f, fam.household); if (n) box.appendChild(n); });
  }

  // Build one member's body: "what's left" fields + an "auto-filled" drawer.
  function buildMemberBody(fam, m) {
    var r = effective(fam, m), der = r.der, eff = r.eff;
    var overridden = function (k) { return m.overrides && m.overrides[k]; };
    var groups = [{ id: "basic", title: "Basic details", fields: SCHEMA.MEMBER_FIELDS }].concat(
      SCHEMA.SECTIONS.filter(function (s) { return !(s.appliesTo && !s.appliesTo(eff)); })
        .map(function (s) { return { id: s.id, title: s.title, fields: s.questions }; }));
    var autoCount = Object.keys(der.locks).filter(function (k) { return !overridden(k); }).length;

    var body = el("div", { class: "body", style: "display:block" });
    var toFillCount = 0;
    groups.forEach(function (g) {
      var rows = [];
      g.fields.forEach(function (f) {
        if (f.type === "heading" || f.type === "note") return;
        if (der.locks[f.key] && !overridden(f.key)) return;
        if (!vis(f, eff)) return;
        var n = field(f, m, { deps: eff }); if (!n) return;
        rows.push(n);
        var val = m[f.key]; if (val == null || val === "" || (Array.isArray(val) && !val.length)) toFillCount++;
      });
      if (rows.length) { body.appendChild(el("div", { class: "qhead", text: g.title })); rows.forEach(function (x) { body.appendChild(x); }); }
    });

    // auto-filled drawer
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
      var dk = "d_" + m.id, open = !!openSections[dk];
      body.appendChild(el("div", { class: "acc" + (open ? " open" : "") }, [
        el("div", { class: "ah", onclick: function () { openSections[dk] = !openSections[dk]; renderPeople(); } },
          [el("span", { text: "Auto-filled for you (" + autoCount + ")" }), el("span", { class: "rng", text: open ? "hide" : "show" })]),
        doneBody
      ]));
    }
    return { body: body, autoCount: autoCount, toFillCount: toFillCount };
  }

  // People list — one form per family, each person a compact expandable card.
  function renderPeople() {
    var box = document.getElementById("editor"); clear(box);
    var fam = currentFamily();
    if (!fam) { box.appendChild(el("div", { class: "empty", text: "Create a family to begin." })); return; }
    if (!fam.members.length) { box.appendChild(el("div", { class: "empty", text: "No people yet — click “+ Add member”." })); return; }
    fam.members.forEach(function (m, i) {
      var built = buildMemberBody(fam, m);
      var open = !!openMember[m.id];
      var summary = "✅ " + built.autoCount + " auto" + (built.toFillCount ? " · " + built.toFillCount + " to fill" : " · done");
      var head = el("div", { class: "ah", onclick: function () { openMember[m.id] = !openMember[m.id]; state.currentMemberId = m.id; persist(); renderPeople(); } }, [
        el("div", {}, [
          el("strong", { text: memberLabel(m, i) }), " ",
          m.relationship ? el("span", { class: "badge" + (m.relationship === "Head" ? " head" : ""), text: m.relationship === "Head" ? "HEAD" : m.relationship.split(" ")[0] }) : null
        ]),
        el("div", { style: "display:flex;align-items:center;gap:8px" }, [
          el("span", { class: "rng", text: summary }),
          el("button", { class: "x", title: "Remove", onclick: function (e) { e.stopPropagation(); if (!confirm("Remove " + memberLabel(m, i) + "?")) return; fam.members = fam.members.filter(function (x) { return x.id !== m.id; }); persist(); renderPeople(); } }, ["×"])
        ])
      ]);
      var card = el("div", { class: "acc member" + (open ? " open" : "") }, [head]);
      if (open) card.appendChild(built.body);
      box.appendChild(card);
    });
  }

  function renderAll() { renderFamilyBar(); renderHousehold(); renderPeople(); }

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

  // The member to fill: whoever the SE page is currently on (matched by name),
  // else the last-opened card, else the first person.
  function targetMember(fam) {
    return memberByName(fam, lastCtx.member) || currentMember() || (fam && fam.members[0]) || null;
  }

  // ONE smart button: does the right thing for whatever SE screen is open.
  function autofillPage() {
    var f = currentFamily(); if (!f) { say("Create a family first.", "err"); return; }
    withContent(function (tab) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readContext }, function (res) {
        var ctx = (res && res[0] && res[0].result) || { screen: "other", member: "" };
        lastCtx = { phone: ctx.phone || lastCtx.phone, screen: ctx.screen, member: ctx.member };
        if (ctx.screen === "members") {
          say("Adding " + f.members.length + " member(s) to the roster…");
          chrome.tabs.sendMessage(tab.id, { cmd: "ADD_ALL_MEMBERS", members: f.members.map(function (m) { return resolvedAnswers(f, m); }) }, function () { void chrome.runtime.lastError; });
        } else if (ctx.screen === "questionnaire") {
          var m = targetMember(f); if (!m) { say("No matching person for this page.", "err"); return; }
          say("Filling all questions for " + memberLabel(m, f.members.indexOf(m)) + "…");
          chrome.tabs.sendMessage(tab.id, { cmd: "AUTORUN_SECTIONS", answers: resolvedAnswers(f, m), hints: HINTS }, function () { void chrome.runtime.lastError; });
        } else {
          var m2 = targetMember(f); if (!m2) { say("Open the SE members or questionnaire screen, then press this.", "err"); return; }
          say("Filling this screen for " + memberLabel(m2, f.members.indexOf(m2)) + "…");
          chrome.tabs.sendMessage(tab.id, { cmd: "FILL", answers: resolvedAnswers(f, m2), hints: HINTS }, function () { void chrome.runtime.lastError; });
        }
      });
    });
  }

  // "Fill just this screen" — fills the current screen for the matched/target person.
  function fillScreen() {
    var f = currentFamily(); if (!f) { say("Create a family first.", "err"); return; }
    var m = targetMember(f); if (!m) { say("Add a person first.", "err"); return; }
    withContent(function (tab) {
      say("Filling this screen for " + memberLabel(m, f.members.indexOf(m)) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "FILL", answers: resolvedAnswers(f, m), hints: HINTS }, function () { void chrome.runtime.lastError; });
    });
  }
  function addAll() {
    var f = currentFamily(); if (!f || !f.members.length) { say("No members to add.", "err"); return; }
    withContent(function (tab) {
      say("Adding " + f.members.length + " member(s) to the roster…");
      chrome.tabs.sendMessage(tab.id, { cmd: "ADD_ALL_MEMBERS", members: f.members.map(function (m) { return resolvedAnswers(f, m); }) }, function () { void chrome.runtime.lastError; });
    });
  }
  function autoRun() {
    var f = currentFamily(); var m = targetMember(f); if (!m) { say("Add a person first.", "err"); return; }
    withContent(function (tab) {
      say("Filling all questions for " + memberLabel(m, f.members.indexOf(m)) + "…");
      chrome.tabs.sendMessage(tab.id, { cmd: "AUTORUN_SECTIONS", answers: resolvedAnswers(f, m), hints: HINTS }, function () { void chrome.runtime.lastError; });
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
    // Who the site is currently on: "Completing details for <name>" / "details for <name>".
    var member = "";
    var t = [].slice.call(document.querySelectorAll("h1,h2,h3,.se-title")).map(function (e) { return e.textContent || ""; })
      .filter(function (x) { return /details for\s+/i.test(x); })[0];
    if (t) member = t.replace(/^.*details for\s+/i, "").replace(/\s+$/, "").trim();
    return { phone: /^\d{10}$/.test(phone) ? phone : "", screen: screen, member: member };
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
    lastCtx = { phone: ctx.phone || "", screen: ctx.screen || "other", member: ctx.member || "" };
    var banner = document.getElementById("detectBanner");
    if (!ctx.phone) { banner.hidden = true; return; }
    var match = state.families.filter(function (f) { return (f.phone || "") === ctx.phone; })[0];
    if (!match) {
      banner.hidden = false; banner.className = "detect warn";
      banner.textContent = "📱 " + ctx.phone + " — no saved family yet. Set this number as a family's phone to autofill it.";
      return;
    }
    // Recognised — select that family automatically.
    if (state.currentFamilyId !== match.id) {
      state.currentFamilyId = match.id;
      state.currentMemberId = match.members[0] ? match.members[0].id : null;
      persist(); renderAll();
    }
    var onPerson = ctx.member ? (memberByName(match, ctx.member) ? " · on " + ctx.member : " · on “" + ctx.member + "” (not in this family)") : "";
    banner.hidden = false; banner.className = "detect";
    banner.textContent = "📱 " + match.name + " (" + ctx.phone + ") · " + match.members.length + " member(s)" + onPerson;

    // Optional auto-fill, once per (phone + screen + person) so it doesn't loop.
    if (document.getElementById("autoFillMatch").checked) {
      var key = ctx.phone + ":" + ctx.screen + ":" + ctx.member;
      if (key !== lastAutoFillKey && (ctx.screen === "members" || ctx.screen === "questionnaire")) {
        lastAutoFillKey = key;
        if (ctx.screen === "members") addAll();
        else { var m = targetMember(match); if (m) autoRun(); }
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
    document.getElementById("addMember").onclick = function () {
      if (!currentFamily()) newFamily(); addMember();
      var f = currentFamily(); if (f && f.members.length) { openMember = {}; openMember[f.members[f.members.length - 1].id] = true; }
      renderAll();
    };
    document.getElementById("autofillPage").onclick = autofillPage;
    document.getElementById("fillScreen").onclick = fillScreen;
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

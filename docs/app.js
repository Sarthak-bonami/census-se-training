/* ============================================================================
   SE-Replica — application engine (vanilla JS, no build, runs from file://)
   Flow: State/UT → consent → mobile+captcha → OTP+language → location →
         members → dashboard → per-member questionnaire → review → submit.
   Every input carries data-se="<key>" so the autofill extension can target it.
   ============================================================================ */
(function () {
  "use strict";
  var DATA = window.SE_DATA, SCHEMA = window.SE_SCHEMA;
  var app = document.getElementById("app");
  var modalRoot = document.getElementById("modal-root");
  var STORE_KEY = "se_replica_state_v1";

  // ---- state --------------------------------------------------------------
  var S = {
    screen: "stateSelect",
    session: { stateUT: "", consent: false, mobile: "", language: "", languageLocked: false, verified: false },
    location: { state: "", district: "", tehsil: "", village: "", locality: "", confirmed: false },
    members: [],            // each: {name,relationship,sex,dob,age,marital,ageAtMarriage,answers:{},status:{}}
    currentMember: 0,
    section: 0,
    draft: null,            // member-roster draft
    errors: {},
    captcha: "",
    seId: ""
  };
  var DEMO_OTP = "123456";

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { var r = localStorage.getItem(STORE_KEY); if (r) { var o = JSON.parse(r); if (o && o.screen) return o; } } catch (e) {} return null; }
  function resetAll() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} location.reload(); }

  // ---- small helpers ------------------------------------------------------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function randCaptcha() {
    var s = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", o = "";
    for (var i = 0; i < 6; i++) o += s[Math.floor(Math.random() * s.length)];
    return o;
  }
  function genSeId() { var d = ""; for (var i = 0; i < 11; i++) d += Math.floor(Math.random() * 10); return "P" + d; }
  function opt(fieldOrArr, m, a) {
    if (Array.isArray(fieldOrArr)) return fieldOrArr;
    if (fieldOrArr.optionsFn) return fieldOrArr.optionsFn(m, a) || [];
    return fieldOrArr.options || [];
  }
  function visible(field, m, a) { return field.visibleIf ? !!field.visibleIf(m, a) : true; }
  function required(field, m, a) { return field.required === true || (field.reqFn ? !!field.reqFn(m, a) : false); }

  // ---- modal --------------------------------------------------------------
  function modal(o) {
    clear(modalRoot);
    var buttons = (o.buttons || [{ label: "OK", cls: "primary", act: closeModal }]).map(function (b) {
      return el("button", { class: "btn " + (b.cls || ""), onclick: function () { if (b.act) b.act(); } }, [b.label]);
    });
    var m = el("div", { class: "overlay" }, [
      el("div", { class: "modal" }, [
        o.icon ? el("div", { class: "ic " + o.icon }, [o.icon === "ok" ? "✓" : o.icon === "err" ? "!" : "i"]) : null,
        el("h3", { text: o.title || "" }),
        o.body ? el("p", { text: o.body }) : null,
        el("div", { class: "btnbar" }, buttons)
      ])
    ]);
    modalRoot.appendChild(m);
  }
  function closeModal() { clear(modalRoot); }

  // ---- field renderer (schema-driven) ------------------------------------
  // record = object holding values; extra = second arg for optionsFn/visibleIf.
  function renderField(field, record, mForDeps, aForDeps) {
    if (field.type === "heading") return el("div", { class: "q-head", text: field.label });
    if (field.type === "note") return el("div", { class: "note-line", text: field.label });
    if (!visible(field, mForDeps, aForDeps)) return null;

    var id = "f_" + field.key;
    var isReq = required(field, mForDeps, aForDeps);
    var wrap = el("div", { class: "field" + (S.errors[field.key] ? " invalid" : "") });
    var labelText = (field.q ? field.q + ". " : "") + field.label;
    wrap.appendChild(el("label", { for: id }, [labelText, isReq ? el("span", { class: "req", text: " *" }) : null]));

    var onSel = function (v) { record[field.key] = v; delete S.errors[field.key]; save(); render(); };
    var onText = function (v) { record[field.key] = v; delete S.errors[field.key]; save(); };
    var cur = record[field.key];

    if (field.type === "select") {
      var sel = el("select", { id: id, "data-se": field.key, onchange: function (e) { onSel(e.target.value); } });
      sel.appendChild(el("option", { value: "" }, ["— Select —"]));
      opt(field, mForDeps, aForDeps).forEach(function (o) {
        var op = el("option", { value: o }, [o]); if (o === cur) op.selected = true; sel.appendChild(op);
      });
      // first member defaults to Head (editable — you can change it)
      if (field.headFirst && S.screen === "members" && S.members.length === 0 && !record[field.key]) {
        record[field.key] = "Head"; sel.value = "Head";
      }
      wrap.appendChild(sel);
    } else if (field.type === "radio") {
      var rc = el("div", { class: "choices" });
      opt(field, mForDeps, aForDeps).forEach(function (o) {
        var input = el("input", { type: "radio", name: id, value: o, "data-se": field.key, onchange: function () { onSel(o); } });
        if (o === cur) input.checked = true;
        rc.appendChild(el("label", {}, [input, " " + o]));
      });
      wrap.appendChild(rc);
    } else if (field.type === "checkbox") {
      var cbx = el("input", { type: "checkbox", id: id, "data-se": field.key, onchange: function (e) { onSel(e.target.checked); } });
      if (cur) cbx.checked = true;
      var lab = el("label", {}, [cbx, " " + field.label]);
      wrap.innerHTML = ""; wrap.appendChild(lab); // checkbox shows its own inline label
      if (S.errors[field.key]) wrap.classList.add("invalid");
    } else if (field.type === "multiselect") {
      var arr = Array.isArray(cur) ? cur.slice() : [];
      var mc = el("div", { class: "choices" });
      opt(field, mForDeps, aForDeps).forEach(function (o) {
        var input = el("input", {
          type: "checkbox", value: o, "data-se": field.key,
          onchange: function (e) {
            var a2 = Array.isArray(record[field.key]) ? record[field.key].slice() : [];
            if (e.target.checked) { if (field.max && a2.length >= field.max) { e.target.checked = false; toast("Max " + field.max + " allowed"); return; } a2.push(o); }
            else { a2 = a2.filter(function (x) { return x !== o; }); }
            // No full re-render here: nothing depends on a multiselect value, and
            // re-rendering would detach sibling checkboxes during a rapid multi-fill.
            record[field.key] = a2; delete S.errors[field.key]; save();
          }
        });
        if (arr.indexOf(o) >= 0) input.checked = true;
        mc.appendChild(el("label", {}, [input, " " + o]));
      });
      wrap.appendChild(mc);
    } else {
      var t = (field.type === "number") ? "number" : (field.type === "date") ? "date" : (field.type === "tel") ? "tel" : (field.type === "email") ? "email" : "text";
      var input2 = el("input", { type: t, id: id, "data-se": field.key, placeholder: field.placeholder || "", value: cur == null ? "" : cur, oninput: function (e) { onText(e.target.value); } });
      if (field.min != null) input2.min = field.min; if (field.max != null && field.type === "number") input2.max = field.max;
      wrap.appendChild(input2);
    }
    if (field.hint) wrap.appendChild(el("div", { class: "hint", text: field.hint }));
    if (S.errors[field.key]) wrap.appendChild(el("div", { class: "err", text: S.errors[field.key] }));
    return wrap;
  }

  // ---- screen: header date -----------------------------------------------
  function setHeaderDate() {
    var d = new Date();
    document.getElementById("hdr-date").textContent =
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // ---- screens ------------------------------------------------------------
  function scrStateSelect() {
    var sel = el("select", { "data-se": "state_ut", onchange: function (e) { S.session.stateUT = e.target.value; save(); render(); } });
    sel.appendChild(el("option", { value: "" }, ["Select State/UT"]));
    DATA.STATES.forEach(function (s) { var o = el("option", { value: s }, [s]); if (s === S.session.stateUT) o.selected = true; sel.appendChild(o); });
    return el("div", { class: "wrap narrow" }, [
      el("div", { class: "card" }, [
        el("div", { class: "brandmark", text: "PE" }),
        el("h2", { class: "se-title", text: "Self-Enumeration (PE)" }),
        el("p", { class: "sub", text: "Begin by selecting your State / Union Territory." }),
        el("div", { class: "field" }, [el("label", {}, ["State/UT ", el("span", { class: "req", text: "*" })]), sel]),
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn primary", disabled: !S.session.stateUT, onclick: function () { S.screen = "consent"; save(); render(); } }, ["Continue →"])
        ])
      ])
    ]);
  }

  function scrConsent() {
    var pts = [
      "Please provide complete and correct information for yourself and every member of your household.",
      "Please provide the mobile number given during the first phase of Houselisting for your household.",
      "The information provided will be used as evidence; only aggregate data will be published by the Government.",
      "Ensure that no eligible member of your household is left uncounted.",
      "For giving answers to Questions No. 1 to 40, you may refer to the details for every person in the household on a later screen using Save & Continue."
    ];
    var cb = el("input", { type: "checkbox", "data-se": "consent", onchange: function (e) { S.session.consent = e.target.checked; save(); render(); } });
    if (S.session.consent) cb.checked = true;
    return el("div", { class: "wrap" }, [
      el("div", { class: "card" }, [
        el("h2", { class: "se-title", text: "Important Information" }),
        el("p", { class: "sub", text: "Please read carefully before proceeding · State/UT: " + S.session.stateUT }),
        el("ul", {}, pts.map(function (p) { return el("li", { text: p }); })),
        el("label", { class: "choices", style: "margin-top:10px" }, [cb, " I Understood"]),
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn link", onclick: function () { S.screen = "stateSelect"; save(); render(); } }, ["‹ Change State"]),
          el("div", { class: "spacer" }),
          el("button", { class: "btn primary", disabled: !S.session.consent, onclick: function () { S.captcha = randCaptcha(); S.screen = "mobileCaptcha"; save(); render(); } }, ["OTP-Verify / Continue →"])
        ])
      ])
    ]);
  }

  function scrMobileCaptcha() {
    if (!S.captcha) S.captcha = randCaptcha();
    var mob = el("input", { type: "tel", "data-se": "login_mobile", maxlength: "10", placeholder: "Enter 10-digit mobile number", value: S.session.mobile, oninput: function (e) { S.session.mobile = e.target.value.replace(/\D/g, "").slice(0, 10); e.target.value = S.session.mobile; } });
    var capIn = el("input", { type: "text", "data-se": "login_captcha", placeholder: "Enter the code shown", maxlength: "6" });
    return el("div", { class: "wrap narrow" }, [
      el("div", { class: "card" }, [
        el("div", { class: "brandmark", text: "PE" }),
        el("h2", { class: "se-title", text: "Self-Enumeration (PE)" }),
        el("p", { class: "sub", text: "State/UT: " + S.session.stateUT }),
        el("div", { class: "field" }, [el("label", {}, ["Mobile Number ", el("span", { class: "req", text: "*" })]), mob,
          el("div", { class: "hint", text: "Accepted only if the first digit is between 5 and 9." })]),
        el("div", { class: "field" }, [el("label", {}, ["Captcha ", el("span", { class: "req", text: "*" })]),
          el("div", { class: "captcha" }, [
            el("div", { class: "code", text: S.captcha }),
            el("button", { class: "refresh", title: "Refresh", onclick: function () { S.captcha = randCaptcha(); render(); } }, ["⟳"]),
            capIn
          ])]),
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn link", onclick: function () { S.screen = "stateSelect"; save(); render(); } }, ["‹ Change State"]),
          el("div", { class: "spacer" }),
          el("button", {
            class: "btn primary", onclick: function () {
              var m = S.session.mobile;
              if (!/^[5-9]\d{9}$/.test(m)) { modal({ icon: "err", title: "Invalid mobile number", body: "Enter a 10-digit number starting with a digit from 5 to 9.", buttons: [{ label: "OK", cls: "primary", act: closeModal }] }); return; }
              if (capIn.value.trim() !== S.captcha) { modal({ icon: "err", title: "Invalid Captcha", body: "The captcha you entered is incorrect. Please try again.", buttons: [{ label: "OK", cls: "primary", act: function () { S.captcha = randCaptcha(); closeModal(); render(); } }] }); return; }
              modal({ icon: "ok", title: "OTP Sent", body: "An OTP has been sent to your mobile. (Demo OTP: " + DEMO_OTP + ")", buttons: [{ label: "OK", cls: "primary", act: function () { closeModal(); S.captcha = randCaptcha(); S.screen = "otp"; save(); render(); } }] });
            }
          }, ["Verify and Proceed →"])
        ])
      ])
    ]);
  }

  function scrOtp() {
    if (!S.captcha) S.captcha = randCaptcha();
    var lang = el("select", { "data-se": "language", disabled: S.session.languageLocked, onchange: function (e) { S.session.language = e.target.value; save(); } });
    lang.appendChild(el("option", { value: "" }, ["Please select language"]));
    DATA.LANGUAGES_UI.forEach(function (l) { var o = el("option", { value: l }, [l]); if (l === S.session.language) o.selected = true; lang.appendChild(o); });
    var capIn = el("input", { type: "text", "data-se": "otp_captcha", placeholder: "Enter the code shown", maxlength: "6" });
    var otpIn = el("input", { type: "tel", "data-se": "otp", placeholder: "Enter 6-digit OTP", maxlength: "6" });
    return el("div", { class: "wrap narrow" }, [
      el("div", { class: "card" }, [
        el("div", { class: "brandmark", text: "PE" }),
        el("h2", { class: "se-title", text: "OTP Verification" }),
        el("p", { class: "sub", text: "Mobile: " + S.session.mobile + (S.session.languageLocked ? " · language locked from previous step" : "") }),
        el("div", { class: "field" }, [el("label", {}, ["Select Language ", el("span", { class: "req", text: "*" })]), lang,
          el("div", { class: "hint", text: "Only three languages are supported." })]),
        el("div", { class: "field" }, [el("label", {}, ["Captcha ", el("span", { class: "req", text: "*" })]),
          el("div", { class: "captcha" }, [el("div", { class: "code", text: S.captcha }), el("button", { class: "refresh", onclick: function () { S.captcha = randCaptcha(); render(); } }, ["⟳"]), capIn])]),
        el("div", { class: "field" }, [el("label", {}, ["Enter OTP ", el("span", { class: "req", text: "*" })]), otpIn,
          el("div", { class: "hint", text: "Demo OTP: " + DEMO_OTP })]),
        el("div", { class: "btnbar" }, [
          el("div", { class: "spacer" }),
          el("button", {
            class: "btn primary", onclick: function () {
              if (!S.session.language) { toast("Please select a language"); return; }
              if (capIn.value.trim() !== S.captcha) { modal({ icon: "err", title: "Invalid Captcha", body: "Please re-enter the captcha.", buttons: [{ label: "OK", cls: "primary", act: function () { S.captcha = randCaptcha(); closeModal(); render(); } }] }); return; }
              if (otpIn.value.trim() !== DEMO_OTP) {
                S.session.languageLocked = true; // retain language, non-editable, on return
                modal({ icon: "err", title: "Verification Failed", body: "Invalid OTP. You will be returned to the mobile-number page.", buttons: [{ label: "OK", cls: "primary", act: function () { closeModal(); S.captcha = randCaptcha(); S.screen = "mobileCaptcha"; save(); render(); } }] });
                return;
              }
              S.session.verified = true; save();
              modal({
                icon: "info", title: "Proceed to Self-Enumeration?", body: "Your mobile number has been verified. Do you want to continue?",
                buttons: [
                  { label: "Cancel", cls: "ghost", act: closeModal },
                  { label: "Yes, Continue", cls: "primary", act: function () {
                      modal({ icon: "info", title: "Before you begin", body: "Complete the Household member list first, then answer Questions 1–40 for each member. Nothing is submitted until you review and submit the household.",
                        buttons: [{ label: "OK, I Understood", cls: "primary", act: function () { closeModal(); S.location.state = S.session.stateUT; S.screen = "location"; save(); render(); } }] });
                    } }
                ]
              });
            }
          }, ["Verify OTP →"])
        ])
      ])
    ]);
  }

  function scrLocation() {
    var L = S.location;
    function dd(labelKey, key, options, disabled) {
      var s = el("select", { "data-se": "loc_" + key, disabled: disabled, onchange: function (e) { L[key] = e.target.value; if (key === "state") { L.district = L.tehsil = L.village = L.locality = ""; } save(); render(); } });
      s.appendChild(el("option", { value: "" }, ["Select " + labelKey]));
      options.forEach(function (o) { var op = el("option", { value: o }, [o]); if (o === L[key]) op.selected = true; s.appendChild(op); });
      return el("div", { class: "field" }, [el("label", { text: labelKey }), s]);
    }
    function ti(labelKey, key) {
      var i = el("input", { type: "text", "data-se": "loc_" + key, placeholder: "Enter " + labelKey, value: L[key] || "", oninput: function (e) { L[key] = e.target.value; save(); } });
      return el("div", { class: "field" }, [el("label", { text: labelKey }), i]);
    }
    var ready = L.state && L.district && L.village;
    return el("div", { class: "wrap wide" }, [
      el("div", { class: "card" }, [
        el("h2", { class: "se-title", text: "Location Mapping" }),
        el("p", { class: "sub", text: "Select your City/District, then enter Tehsil, Village/Town and Locality, and confirm." }),
        el("div", { class: "split" }, [
          el("div", {}, [
            el("div", { class: "grid2" }, [
              dd("State/UT", "state", DATA.STATES, true),
              dd("City / District", "district", DATA.districtsFor(L.state), false),
              ti("Tehsil", "tehsil"),
              ti("Village / Town", "village"),
              ti("Locality", "locality")
            ]),
            el("div", { class: "btnbar" }, [
              el("button", { class: "btn ghost", onclick: function () { L.district = L.tehsil = L.village = L.locality = ""; save(); render(); toast("Cleared City, Tehsil, Village and Locality"); } }, ["Reset"]),
              el("button", {
                class: "btn primary", disabled: !ready, onclick: function () {
                  modal({
                    icon: "info", title: "Confirm Location",
                    body: [L.state, L.district, L.tehsil, L.village, L.locality].filter(Boolean).join(" · "),
                    buttons: [
                      { label: "Cancel", cls: "ghost", act: closeModal }, // stays on page
                      { label: "Confirm Location", cls: "primary", act: function () { L.confirmed = true; closeModal(); S.draft = newDraft(); S.screen = "members"; save(); render(); } }
                    ]
                  });
                }
              }, ["Confirm Location →"])
            ])
          ]),
          el("div", { class: "map-mock" }, [el("div", { class: "tag", text: "Satellite map (simulated)" }), el("div", { class: "pin", text: "📍" })])
        ])
      ])
    ]);
  }

  // ---- member roster ------------------------------------------------------
  function newDraft() { return { name: "", relationship: S.members.length === 0 ? "Head" : "", sex: "", dob: "", age: "", marital: "", ageAtMarriage: "" }; }
  function blankStatus() { var st = {}; SCHEMA.SECTIONS.forEach(function (s) { st[s.id] = "pending"; }); return st; }

  function scrMembers() {
    if (!S.draft) S.draft = newDraft();
    var form = el("div", { class: "grid2" });
    SCHEMA.MEMBER_FIELDS.forEach(function (f) {
      // sex/marital depend on relationship; ageAtMarriage depends on marital
      var node = renderField(f, S.draft, S.draft, S.draft);
      if (node) form.appendChild(node);
    });

    var list = el("div", { class: "member-list" });
    if (!S.members.length) list.appendChild(el("div", { class: "empty", text: "No members added yet. Added members will appear here." }));
    S.members.forEach(function (m, i) {
      list.appendChild(el("div", { class: "member-item" }, [
        el("div", {}, [
          el("div", { class: "who" }, [m.name || "(unnamed)", " ", el("span", { class: "badge " + (m.relationship === "Head" ? "head" : ""), text: m.relationship === "Head" ? "HEAD" : "" })]),
          el("div", { class: "meta", text: (m.age !== "" ? m.age + " yrs" : "age N/A") + " · " + (m.sex || "—") + " · " + m.relationship })
        ]),
        el("button", { class: "btn link", onclick: function () { S.members.splice(i, 1); save(); render(); } }, ["Remove"])
      ]));
    });

    return el("div", { class: "wrap wide" }, [
      el("div", { class: "split" }, [
        el("div", { class: "card" }, [
          el("h2", { class: "se-title", text: "Basic Information" }),
          el("p", { class: "sub", text: "Start with Head of Household and then add all other members." }),
          form,
          el("div", { class: "btnbar" }, [
            el("button", { class: "btn ghost", onclick: function () { S.draft = newDraft(); S.errors = {}; save(); render(); } }, ["Clear Current Page"]),
            el("button", { class: "btn primary", onclick: saveAddMember }, ["Save & Add Member"])
          ])
        ]),
        el("div", { class: "card" }, [
          el("h2", { class: "se-title", text: "Added Members" }),
          list,
          el("div", { class: "btnbar" }, [
            el("button", {
              class: "btn green", disabled: !S.members.length, onclick: function () {
                modal({ icon: "info", title: "Go to Dashboard?", body: "You can add more members later from the dashboard.", buttons: [{ label: "Cancel", cls: "ghost", act: closeModal }, { label: "Yes, Continue", cls: "primary", act: function () { closeModal(); S.currentMember = 0; S.screen = "dashboard"; save(); render(); } }] });
              }
            }, ["Go to Dashboard for filling Question 7 to 40 →"])
          ])
        ])
      ])
    ]);
  }

  function saveAddMember() {
    S.errors = {};
    SCHEMA.MEMBER_FIELDS.forEach(function (f) {
      if (!visible(f, S.draft, S.draft)) return;
      if (required(f, S.draft, S.draft) && !S.draft[f.key]) S.errors[f.key] = f.label + " is required";
    });
    if (Object.keys(S.errors).length) {
      var blank = SCHEMA.MEMBER_FIELDS.every(function (f) { return !S.draft[f.key] || (f.key === "relationship" && S.draft[f.key] === "Head"); });
      modal({ icon: "err", title: "Validation Error", body: blank ? "Please fill the member details before saving." : "Please complete all mandatory fields.", buttons: [{ label: "OK", cls: "primary", act: closeModal }] });
      render(); return;
    }
    var m = {};
    SCHEMA.MEMBER_FIELDS.forEach(function (f) { m[f.key] = S.draft[f.key]; });
    m.answers = {}; m.status = blankStatus();
    S.members.push(m);
    S.draft = newDraft(); S.errors = {}; save(); render();
    toast("Member saved");
  }

  // ---- dashboard ----------------------------------------------------------
  function scrDashboard() {
    var m = S.members[S.currentMember];
    var sel = el("select", { onchange: function (e) { S.currentMember = +e.target.value; save(); render(); } });
    S.members.forEach(function (mm, i) { var o = el("option", { value: i }, [(mm.name || "(unnamed)") + " — " + mm.relationship]); if (i === S.currentMember) o.selected = true; sel.appendChild(o); });

    applyFertilityAutostatus(m);
    var cards = el("div", { class: "section-cards" });
    SCHEMA.SECTIONS.forEach(function (s, i) {
      var st = m.status[s.id] || "pending";
      cards.appendChild(el("div", { class: "section-card" }, [
        el("div", { class: "name", text: s.tab }),
        el("div", { class: "rng", text: s.range }),
        el("div", { class: "status " + (st === "completed" ? "completed" : st === "progress" ? "progress" : "pending"), text: st === "completed" ? "Completed" : st === "progress" ? "In Progress" : "Pending" })
      ]));
    });

    var allDone = S.members.every(function (mm) { applyFertilityAutostatus(mm); return SCHEMA.SECTIONS.every(function (s) { return mm.status[s.id] === "completed"; }); });

    return el("div", { class: "wrap wide" }, [
      el("div", { class: "card" }, [
        el("h2", { class: "se-title", text: "General Information — Dashboard" }),
        el("p", { class: "sub", text: "Manage and complete details for each household member." }),
        el("div", { class: "grid2" }, [
          el("div", { class: "field" }, [el("label", { text: "Select Member to View" }), sel]),
          el("div", { class: "field" }, [el("label", { text: "Member" }),
            el("div", {}, [el("span", { class: "badge head", text: m.relationship }), " ",
              el("span", { class: "badge " + (m.sex === "Male" ? "male" : m.sex === "Female" ? "female" : ""), text: (m.age !== "" ? m.age + " yrs" : "") + " " + (m.sex || "") })])])
        ]),
        cards,
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn ghost", onclick: function () { S.draft = newDraft(); S.screen = "members"; save(); render(); } }, ["+ Add Member"]),
          el("div", { class: "spacer" }),
          el("button", { class: "btn primary", onclick: function () { S.section = firstIncompleteSection(m); S.errors = {}; S.screen = "questionnaire"; save(); render(); } }, ["Continue Self Enumeration →"]),
          el("button", { class: "btn green", onclick: function () { S.screen = "review"; save(); render(); } }, ["Review & Submit Household"])
        ]),
        allDone ? el("div", { class: "note-line", text: "All members completed — you can Review & Submit the household." }) : null
      ])
    ]);
  }

  function firstIncompleteSection(m) {
    for (var i = 0; i < SCHEMA.SECTIONS.length; i++) { if (m.status[SCHEMA.SECTIONS[i].id] !== "completed") return i; }
    return 0;
  }
  function applyFertilityAutostatus(m) {
    var fs = SCHEMA.SECTIONS.filter(function (s) { return s.id === "fertility"; })[0];
    if (fs && fs.appliesTo && !fs.appliesTo(m)) { if (m.status.fertility !== "completed") m.status.fertility = "completed"; }
  }

  // ---- questionnaire ------------------------------------------------------
  function scrQuestionnaire() {
    var m = S.members[S.currentMember];
    var section = SCHEMA.SECTIONS[S.section];
    var a = m.answers;

    // stepper
    var stepper = el("div", { class: "stepper" });
    SCHEMA.SECTIONS.forEach(function (s, i) {
      var cls = "step" + (i === S.section ? " active" : "") + (m.status[s.id] === "completed" ? " done" : "");
      stepper.appendChild(el("div", { class: cls, onclick: function () { S.section = i; S.errors = {}; save(); render(); } }, [
        el("div", { class: "dot", text: String(i + 1) }), el("div", { class: "lbl", text: s.tab })
      ]));
    });

    var body = el("div", {});
    var disabledFertility = section.appliesTo && !section.appliesTo(m);
    body.appendChild(el("h2", { class: "se-title", text: section.title }));
    if (section.note) body.appendChild(el("p", { class: "sub", text: section.note }));
    if (disabledFertility) {
      body.appendChild(el("div", { class: "note-line", text: "Based on the selected demographics (sex/marital status), this section is not applicable and is disabled for this member." }));
    } else {
      section.questions.forEach(function (q) { var node = renderField(q, a, m, a); if (node) body.appendChild(node); });
    }

    var isLast = !!section.last;
    return el("div", { class: "wrap wide" }, [
      el("div", { class: "card" }, [
        el("div", { style: "display:flex;justify-content:space-between;align-items:center" }, [
          el("h2", { class: "se-title", text: "Completing details for " + (m.name || "member") }),
          el("button", { class: "btn link", onclick: function () { S.screen = "dashboard"; save(); render(); } }, ["‹ Dashboard"])
        ]),
        stepper,
        body,
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn ghost", disabled: S.section === 0, onclick: function () { S.section = Math.max(0, S.section - 1); S.errors = {}; save(); render(); } }, ["‹ Previous"]),
          el("button", { class: "btn ghost", onclick: function () { clearSection(section, a); render(); toast("Current page cleared"); } }, ["Clear Current Page"]),
          el("div", { class: "spacer" }),
          el("button", { class: "btn primary", onclick: function () { saveContinue(m, section, isLast); } }, [isLast ? "Save & Finish Member ✓" : "Save & Continue →"])
        ])
      ])
    ]);
  }

  function clearSection(section, a) { section.questions.forEach(function (q) { if (q.type !== "heading" && q.type !== "note") delete a[q.key]; }); S.errors = {}; save(); }

  function saveContinue(m, section, isLast) {
    S.errors = {};
    if (!(section.appliesTo && !section.appliesTo(m))) {
      section.questions.forEach(function (q) {
        if (q.type === "heading" || q.type === "note") return;
        if (!visible(q, m, m.answers)) return;
        if (required(q, m, m.answers)) {
          var v = m.answers[q.key];
          var empty = v == null || v === "" || (Array.isArray(v) && !v.length);
          if (empty) S.errors[q.key] = q.label + " is required";
        }
      });
    }
    if (Object.keys(S.errors).length) { modal({ icon: "err", title: "Validation Error", body: "Ensure all mandatory fields are filled before saving.", buttons: [{ label: "OK", cls: "primary", act: closeModal }] }); render(); return; }

    m.status[section.id] = "completed";
    if (isLast) {
      applyFertilityAutostatus(m);
      toast("Member completed"); S.screen = "dashboard"; save(); render();
    } else {
      // mark next visited section as progress if still pending
      var next = Math.min(SCHEMA.SECTIONS.length - 1, S.section + 1);
      if (m.status[SCHEMA.SECTIONS[next].id] === "pending") m.status[SCHEMA.SECTIONS[next].id] = "progress";
      S.section = next; save(); render();
    }
  }

  // ---- review & submit ----------------------------------------------------
  function scrReview() {
    var membersUi = S.members.map(function (m, i) {
      var groups = el("div", {});
      // Basic info group
      groups.appendChild(reviewGroup("Basic Information", SCHEMA.MEMBER_FIELDS.map(function (f) { return { label: (f.q ? f.q + ". " : "") + f.label, val: fmt(m[f.key]) }; }).filter(function (r) { return r.val !== ""; })));
      // questionnaire groups
      SCHEMA.SECTIONS.forEach(function (s) {
        var rows = [];
        s.questions.forEach(function (q) {
          if (q.type === "heading" || q.type === "note") return;
          if (!visible(q, m, m.answers)) return;
          var v = m.answers[q.key];
          if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
          rows.push({ label: (q.q ? q.q + ". " : "") + q.label, val: fmt(v) });
        });
        if (rows.length) groups.appendChild(reviewGroup(s.title, rows));
      });
      var open = i === S.currentMember;
      var head = el("div", { class: "head", onclick: function () { S.currentMember = i; save(); render(); } }, [
        el("div", {}, [el("strong", { text: m.name || "(unnamed)" }), " ", el("span", { class: "meta", text: (m.age !== "" ? m.age + " yrs · " : "") + (m.sex || "") + " · " + m.relationship })]),
        el("button", { class: "btn link", onclick: function (e) { e.stopPropagation(); S.currentMember = i; S.section = 0; S.screen = "questionnaire"; save(); render(); } }, ["Edit"])
      ]);
      return el("div", { class: "rev-member" }, [head, open ? groups : null]);
    });

    return el("div", { class: "wrap wide" }, [
      el("div", { class: "card" }, [
        el("div", { style: "display:flex;justify-content:space-between;align-items:center" }, [
          el("h2", { class: "se-title", text: "Household Review & Submission" }),
          el("button", { class: "btn link", onclick: function () { S.screen = "dashboard"; save(); render(); } }, ["‹ Back to Dashboard"])
        ]),
        el("p", { class: "sub", text: "Review all completed details below. If everything is correct, submit the household." }),
        el("div", {}, membersUi),
        el("div", { class: "note-line", text: "Submission Warning: once submitted you will not be able to edit these census details." }),
        el("div", { class: "btnbar" }, [
          el("button", { class: "btn green", onclick: function () { modal({ icon: "info", title: "Submit Household Data?", body: "Confirm final submission of the household.", buttons: [{ label: "Cancel", cls: "ghost", act: closeModal }, { label: "Submit", cls: "green", act: function () { closeModal(); S.seId = genSeId(); S.screen = "submitted"; save(); render(); } }] }); } }, ["Submit Household Data"])
        ])
      ])
    ]);
  }
  function reviewGroup(title, rows) {
    return el("div", { class: "rev-group" }, [
      el("div", { class: "gh" }, [el("span", { text: title }), el("span", { class: "pill-ok", text: "COMPLETED" })]),
      el("div", { class: "rows" }, rows.map(function (r) { return el("div", { class: "rev-row" }, [el("div", { class: "k", text: r.label }), el("div", { class: "v", text: r.val })]); }))
    ]);
  }
  function fmt(v) { if (v == null) return ""; if (Array.isArray(v)) return v.join(", "); if (v === true) return "Yes"; if (v === false) return ""; return String(v); }

  function scrSubmitted() {
    return el("div", { class: "wrap narrow" }, [
      el("div", { class: "card", style: "text-align:center" }, [
        el("div", { class: "ic ok", style: "width:60px;height:60px;border-radius:50%;background:#e7f6ec;color:#1f8a4c;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px" }, ["✓"]),
        el("h2", { class: "se-title", text: "Submission Successful" }),
        el("p", { class: "sub", text: "Your Self-Enumeration (SE) has been successfully submitted." }),
        el("div", { class: "field" }, [el("label", { text: "Your Self-Enumeration ID (SE ID)" }), el("div", { class: "code", style: "font-size:20px;letter-spacing:3px;text-decoration:none;font-style:normal", text: S.seId })]),
        el("p", { class: "hint", text: "Share the SE ID with other household members so it can be provided to the enumerator. (In the real portal this is also sent via SMS.)" }),
        el("div", { class: "btnbar" }, [el("button", { class: "btn primary", onclick: resetAll }, ["Start a New Household"])])
      ])
    ]);
  }

  // ---- router -------------------------------------------------------------
  function render() {
    clear(app);
    var node;
    switch (S.screen) {
      case "stateSelect": node = scrStateSelect(); break;
      case "consent": node = scrConsent(); break;
      case "mobileCaptcha": node = scrMobileCaptcha(); break;
      case "otp": node = scrOtp(); break;
      case "location": node = scrLocation(); break;
      case "members": node = scrMembers(); break;
      case "dashboard": node = scrDashboard(); break;
      case "questionnaire": node = scrQuestionnaire(); break;
      case "review": node = scrReview(); break;
      case "submitted": node = scrSubmitted(); break;
      default: S.screen = "stateSelect"; node = scrStateSelect();
    }
    app.appendChild(node);
    window.scrollTo(0, 0);
  }

  // ---- boot ---------------------------------------------------------------
  document.getElementById("hdr-logout").addEventListener("click", function (e) { e.preventDefault(); if (confirm("Reset this training session and clear saved progress?")) resetAll(); });
  setHeaderDate();
  var restored = load();
  if (restored) { S = restored; }
  render();
})();

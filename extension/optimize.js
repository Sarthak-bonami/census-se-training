/* SE Family Autofill — question-reduction engine.
   Classifies fields into: HOUSEHOLD (fill once, shared by all members),
   DERIVED (computed from the roster/relationships or the member's own DOB), and
   MEMBER (unique — the only ones actually asked per person).
   deriveMember() returns the prefilled values + why each is locked, so the editor
   can show them read-only per member and the autofill still sends them. */
(function (g) {
  "use strict";
  var SC = g.SE_SCHEMA, D = g.SE_DATA;
  var REF_YEAR = 2026; // reference year for age math (training tool)

  // key -> field definition (from the shared schema)
  var idx = {};
  SC.MEMBER_FIELDS.forEach(function (f) { idx[f.key] = f; });
  SC.SECTIONS.forEach(function (s) { s.questions.forEach(function (q) { if (q.type !== "heading" && q.type !== "note") idx[q.key] = q; }); });

  // Shared across the whole household — entered once on the family.
  var HOUSEHOLD_KEYS = [
    "nationality", "nationality_other", "religion", "religion_other",
    "is_sc", "sc_name", "is_st", "st_name", "caste_declaration",
    "mother_tongue", "language1", "language2"
  ];
  // Household usual residence (reused for birthplace / permanent address / covid place).
  var NATIVE = [
    { key: "home_state", label: "Usual residence — State", type: "select", options: D.STATES },
    { key: "home_district", label: "Usual residence — District", type: "select",
      optionsFn: function (m, a) { return D.districtsFor(a.home_state); } },
    { key: "home_village", label: "Usual residence — Village/Town (with locality)", type: "text" }
  ];
  var HOUSEHOLD_FIELDS = HOUSEHOLD_KEYS.map(function (k) { return idx[k]; }).filter(Boolean).concat(NATIVE);

  function ageOf(member) {
    var a = parseInt(member.age, 10);
    if (!isNaN(a)) return a;
    if (member.dob) { var y = parseInt(String(member.dob).slice(0, 4), 10); if (!isNaN(y)) return REF_YEAR - y; }
    return null;
  }
  function byRel(fam, rels) { return (fam.members || []).filter(function (x) { return rels.indexOf(x.relationship) >= 0; }); }

  // Returns { values:{key:val}, locks:{key:reason} }  reason: family|spouse|parent|auto
  function deriveMember(fam, member) {
    var H = fam.household || {}, values = {}, locks = {};
    function put(k, v, why) { if (v !== undefined && v !== "" && v !== null) { values[k] = v; locks[k] = why; } }

    // 1) household-shared
    HOUSEHOLD_KEYS.concat(NATIVE.map(function (f) { return f.key; })).forEach(function (k) { put(k, H[k], "family"); });

    // 2) age from DOB
    if ((member.age === "" || member.age == null) && member.dob) { var a = ageOf(member); if (a != null) put("age", String(a), "auto"); }
    var age = ageOf(member);

    // 3) spouse name (Head <-> Husband/Wife)
    var head = byRel(fam, ["Head"])[0], spouse = byRel(fam, ["Husband/ Wife"])[0];
    if (member.relationship === "Head" && spouse && spouse.name) put("spouse_name", spouse.name, "spouse");
    if (member.relationship === "Husband/ Wife" && head && head.name) put("spouse_name", head.name, "spouse");

    // 4) parents for a Son/Daughter -> the Head + spouse
    if (member.relationship === "Son/ Daughter") {
      var parents = [head, spouse].filter(Boolean);
      var father = parents.filter(function (p) { return p.sex === "Male"; })[0];
      var mother = parents.filter(function (p) { return p.sex === "Female"; })[0];
      if (father) { put("father_is_member", true, "parent"); put("father_name", father.name, "parent"); put("father_dob", father.dob, "parent"); put("father_religion", H.religion, "family"); }
      if (mother) { put("mother_is_member", true, "parent"); put("mother_name", mother.name, "parent"); put("mother_dob", mother.dob, "parent"); put("mother_religion", H.religion, "family"); }
    }

    // 5) permanent address = same as head (everyone except the head)
    if (member.relationship && member.relationship !== "Head") put("perm_same_as_head", true, "auto");

    // 6) birthplace: default born in this village/town (not outside)
    if (member.born_outside === undefined) put("born_outside", false, "auto");

    // 7) age-based defaults
    if (age != null) {
      if (age < 18) {
        if (!member.marital) put("marital", "Never Married", "auto");
        put("has_voterid", "No", "auto"); put("has_passport", "No", "auto"); put("has_dl", "No", "auto");
      }
      if (age < 15) { put("worked_last_year", "No", "auto"); put("non_econ_activity", "Student", "auto"); }
      if (age < 7) { put("attendance", "Not Attending", "auto"); }
      else if (age <= 17) { put("attendance", "Attending", "auto"); put("attend_institution", "School", "auto"); }
    }

    // 8) head's mobile = the household registered phone
    if (member.relationship === "Head" && fam.phone) { put("has_mobile", "Yes", "auto"); put("mobile_number", fam.phone, "auto"); }

    // 9) covid vaccination place -> household usual residence (when vaccinated)
    if ((member.covid_vax || values.covid_vax) === "Yes" && H.home_state) {
      put("covid_place_scope", "Within India", "family"); put("covid_state", H.home_state, "family"); put("covid_district", H.home_district, "family");
    }
    return { values: values, locks: locks };
  }

  var REASON_LABEL = { family: "from family", spouse: "from spouse", parent: "from parent", auto: "auto" };

  g.SE_OPT = {
    fieldIndex: idx,
    HOUSEHOLD_KEYS: HOUSEHOLD_KEYS,
    HOUSEHOLD_FIELDS: HOUSEHOLD_FIELDS,
    NATIVE_KEYS: NATIVE.map(function (f) { return f.key; }),
    deriveMember: deriveMember,
    ageOf: ageOf,
    reasonLabel: function (r) { return REASON_LABEL[r] || r; }
  };
})(window);

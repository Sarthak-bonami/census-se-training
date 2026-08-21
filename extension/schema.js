/* ============================================================================
   SE-Replica — form schema
   ----------------------------------------------------------------------------
   Drives rendering, validation, skip-logic, review and the extension mapping.
   Every field has a unique `key`; the engine renders it with data-se="<key>"
   so the companion autofill extension can target it deterministically.

   Field shapes:
     { key, q, label, type, options|optionsFn(member,ans), required|reqFn,
       max, hint, visibleIf(member,ans) }
   type ∈ text | tel | email | number | date | select | radio | checkbox
        | multiselect | heading | note
   ============================================================================ */
(function (global) {
  "use strict";
  const D = global.SE_DATA;

  const yesno = ["Yes", "No"];
  const isEverMarried = (m) => m && m.marital && m.marital !== "Never Married";
  const isFemale = (m) => m && m.sex === "Female";
  const everMarriedWoman = (m) => isFemale(m) && isEverMarried(m);

  // ---- Basic Information (member roster) : Q1–Q6 ---------------------------
  const MEMBER_FIELDS = [
    { key: "name", q: "1", label: "Name of the person", type: "text", required: true,
      placeholder: "Enter member's full name" },
    { key: "relationship", q: "2", label: "Relationship to Head", type: "select",
      required: true, options: D.RELATIONSHIPS, headFirst: true },
    { key: "sex", q: "3", label: "Sex", type: "select", required: true,
      optionsFn: function (m) {
        const r = m.relationship;
        if (D.FEMALE_ONLY_REL.indexOf(r) >= 0) return ["Female", "Transgender Person"];
        if (D.MALE_ONLY_REL.indexOf(r) >= 0) return ["Male", "Transgender Person"];
        return D.SEX;
      } },
    { key: "dob", q: "4(a)", label: "Date of Birth", type: "date", required: true },
    { key: "age", q: "4(b)", label: "Age (in Completed Years)", type: "number", required: true,
      placeholder: "Enter Age", min: 0, max: 120 },
    { key: "marital", q: "5", label: "Current Marital Status", type: "select", required: true,
      optionsFn: function (m) {
        return D.EVER_MARRIED_REL.indexOf(m.relationship) >= 0
          ? D.MARITAL.filter(function (x) { return x !== "Never Married"; })
          : D.MARITAL;
      } },
    { key: "ageAtMarriage", q: "6", label: "Age at marriage (In completed years)", type: "number",
      placeholder: "Enter age at marriage", min: 0, max: 120,
      reqFn: isEverMarried,                       // required unless Never Married
      visibleIf: function (m) { return m.marital !== "Never Married"; } }
  ];

  // ---- Questionnaire : Q7–Q40 across 8 sections ---------------------------
  const SECTIONS = [
    {
      id: "general", tab: "General Info", title: "General Information", range: "Q7–Q10",
      questions: [
        { key: "spouse_name", q: "7", label: "Spouse Name", type: "text",
          placeholder: "Select or type spouse name",
          hint: "Applicable for currently married / widowed / separated / divorced persons",
          visibleIf: function (m) { return isEverMarried(m); } },
        { key: "nationality", q: "8", label: "Nationality as declared", type: "select",
          required: true, options: D.NATIONALITY },
        { key: "nationality_other", q: "8", label: "Specify Nationality", type: "text",
          visibleIf: function (m, a) { return a.nationality === "Other"; }, required: true },
        { key: "religion", q: "9", label: "Religion", type: "select", required: true, options: D.RELIGION },
        { key: "religion_other", q: "9", label: "Specify Other Religion", type: "text",
          visibleIf: function (m, a) { return a.religion === "Other"; }, required: true },
        { key: "q10_head", q: "10", label: "Scheduled Caste(SC) / Scheduled Tribe(ST) / Caste", type: "heading" },
        { key: "is_sc", q: "10(a)", label: "Is this person Scheduled Caste (SC)?", type: "radio",
          options: yesno, required: true },
        { key: "sc_name", q: "10(a)", label: "Name of the Scheduled Caste (SC)", type: "select",
          options: D.SC_LIST, required: true, visibleIf: function (m, a) { return a.is_sc === "Yes"; } },
        { key: "is_st", q: "10(b)", label: "Is this person Scheduled Tribe (ST)?", type: "radio",
          options: yesno, required: true },
        { key: "st_name", q: "10(b)", label: "Name of the Scheduled Tribe (ST)", type: "select",
          options: D.ST_LIST, required: true, visibleIf: function (m, a) { return a.is_st === "Yes"; } },
        { key: "caste_declaration", q: "10(c)", label: "If not SC/ST in this State/UT", type: "radio",
          options: D.CASTE_DECL,
          visibleIf: function (m, a) { return a.is_sc === "No" && a.is_st === "No"; } }
      ]
    },
    {
      id: "household", tab: "Household Info", title: "Family Particulars", range: "Q11–Q12",
      questions: [
        { key: "father_heading", q: "11", label: "Father's Particulars", type: "heading" },
        { key: "father_is_member", q: "11", label: "Father is a member of this Household", type: "checkbox" },
        { key: "father_name", q: "11(a)", label: "Father — Name", type: "text", required: true },
        { key: "father_dob", q: "11(b)", label: "Father — Date of birth", type: "date", required: true },
        { key: "father_pob", q: "11(c)", label: "Father — Place of Birth", type: "radio",
          options: ["Within India", "Outside India"], required: true },
        { key: "father_state", q: "11(c)", label: "Father — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return a.father_pob === "Within India"; } },
        { key: "father_district", q: "11(c)", label: "Father — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.father_state); },
          visibleIf: function (m, a) { return a.father_pob === "Within India"; } },
        { key: "father_village", q: "11(c)", label: "Father — Village/Town (With Locality) Name", type: "text",
          visibleIf: function (m, a) { return a.father_pob === "Within India"; } },
        { key: "father_country", q: "11(c)", label: "Father — Country", type: "select", options: D.COUNTRIES,
          visibleIf: function (m, a) { return a.father_pob === "Outside India"; } },
        { key: "father_religion", q: "11(d)", label: "Father — Religion", type: "select", options: D.RELIGION, required: true },
        { key: "father_religion_other", q: "11(d)", label: "Father — Other religion name", type: "text",
          visibleIf: function (m, a) { return a.father_religion === "Other"; } },

        { key: "mother_heading", q: "12", label: "Mother's Particulars", type: "heading" },
        { key: "mother_is_member", q: "12", label: "Mother is a member of this Household", type: "checkbox" },
        { key: "mother_name", q: "12(a)", label: "Mother — Name", type: "text", required: true },
        { key: "mother_dob", q: "12(b)", label: "Mother — Date of birth", type: "date", required: true },
        { key: "mother_pob", q: "12(c)", label: "Mother — Place of Birth", type: "radio",
          options: ["Within India", "Outside India"], required: true },
        { key: "mother_state", q: "12(c)", label: "Mother — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return a.mother_pob === "Within India"; } },
        { key: "mother_district", q: "12(c)", label: "Mother — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.mother_state); },
          visibleIf: function (m, a) { return a.mother_pob === "Within India"; } },
        { key: "mother_village", q: "12(c)", label: "Mother — Village/Town (With Locality) Name", type: "text",
          visibleIf: function (m, a) { return a.mother_pob === "Within India"; } },
        { key: "mother_country", q: "12(c)", label: "Mother — Country", type: "select", options: D.COUNTRIES,
          visibleIf: function (m, a) { return a.mother_pob === "Outside India"; } },
        { key: "mother_religion", q: "12(d)", label: "Mother — Religion", type: "select", options: D.RELIGION, required: true },
        { key: "mother_religion_other", q: "12(d)", label: "Mother — Other religion name", type: "text",
          visibleIf: function (m, a) { return a.mother_religion === "Other"; } }
      ]
    },
    {
      id: "disability", tab: "Disability", title: "Disability", range: "Q13",
      questions: [
        { key: "has_disability", q: "13(a)", label: "Does this person have any disability?", type: "radio",
          options: yesno, required: true },
        { key: "disability_types", q: "13(b)", label: "Select type of disability (Max. 3)", type: "multiselect",
          options: D.DISABILITY_TYPES, max: 3, required: true,
          visibleIf: function (m, a) { return a.has_disability === "Yes"; } }
      ]
    },
    {
      id: "education", tab: "Education & Language", title: "Languages & Education", range: "Q14–Q17",
      questions: [
        { key: "mother_tongue", q: "14(a)", label: "Mother Tongue", type: "select", options: D.MOTHER_TONGUES, required: true },
        { key: "language1", q: "14(b)", label: "Other language known — Language 1", type: "select", options: D.MOTHER_TONGUES },
        { key: "language2", q: "14(c)", label: "Other language known — Language 2", type: "select", options: D.MOTHER_TONGUES },
        { key: "literacy", q: "15(a)", label: "Literacy Status (For 7 years of age & above)", type: "radio",
          options: D.LITERACY, required: true },
        { key: "digitally_literate", q: "15(b)", label: "Whether digitally literate?", type: "radio",
          options: yesno, visibleIf: function (m, a) { return a.literacy === "Literate"; } },
        { key: "attendance", q: "16", label: "Status of Attendance in educational institution", type: "radio",
          options: D.ATTEND_STATUS, required: true },
        { key: "attend_institution", q: "16", label: "Institution currently attending", type: "select",
          options: D.ATTEND_INSTITUTION, visibleIf: function (m, a) { return a.attendance === "Attending"; } },
        { key: "not_attend_reason", q: "16", label: "Attendance history", type: "select",
          options: D.NOT_ATTEND_REASON, visibleIf: function (m, a) { return a.attendance === "Not Attending"; } },
        { key: "education_level", q: "17(a)", label: "Highest educational level", type: "select",
          options: D.EDUCATION_LEVEL, required: true },
        { key: "stream", q: "17(b)", label: "Stream/Discipline", type: "select", options: D.STREAM,
          visibleIf: function (m, a) {
            var higher = ["Diploma / Certificate", "Bachelor/ undergraduate", "PG Diploma",
              "Masters/ Postgraduate", "MPhil", "Doctorate & above"];
            return higher.indexOf(a.education_level) >= 0;
          } }
      ]
    },
    {
      id: "economic", tab: "Economic Activity", title: "Economic Activity", range: "Q18–Q25",
      questions: [
        { key: "worked_last_year", q: "18", label: "Worked any time during last year?", type: "radio",
          options: yesno, required: true },
        { key: "work_status", q: "18", label: "Work Status", type: "select", options: D.WORK_STATUS, required: true },
        { key: "econ_category", q: "19", label: "Category of economic activity", type: "select",
          options: D.ECON_CATEGORY, visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "note_worker", q: "", label: "Fill for worker in household industry or other worker", type: "note",
          visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "occupation", q: "20", label: "Occupation", type: "select", options: D.OCCUPATION,
          hint: "e.g., Accountant", visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "industry", q: "21", label: "Nature of Industry, Trade or Service", type: "select", options: D.INDUSTRY,
          visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "class_of_worker", q: "22", label: "Class of worker (For worker in household industry or other worker)",
          type: "select", options: D.CLASS_OF_WORKER, visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "non_econ_activity", q: "23", label: "Non-economic activity", type: "select",
          options: D.NON_ECON_ACTIVITY, visibleIf: function (m, a) { return a.worked_last_year === "No"; } },
        { key: "seeking_work", q: "24", label: "Seeking or available for work", type: "radio",
          options: D.SEEKING_WORK, visibleIf: function (m, a) { return a.worked_last_year === "No"; } },
        { key: "travel_heading", q: "25", label: "Travel to place of work", type: "heading",
          visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "travel_distance", q: "25(a)", label: "One-way distance from residence to place of work (in km)",
          type: "number", visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "travel_time", q: "25(a)", label: "One-way travel time to the place of work (minutes)",
          type: "number", visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } },
        { key: "travel_mode", q: "25(b)", label: "Mode of travel to place of work", type: "select",
          options: D.TRAVEL_MODE, visibleIf: function (m, a) { return a.worked_last_year === "Yes"; } }
      ]
    },
    {
      id: "migration", tab: "Migration", title: "Migration", range: "Q26–Q30",
      questions: [
        { key: "born_outside", q: "26", label: "If person born outside this Village/Town", type: "checkbox" },
        { key: "birth_scope", q: "26", label: "Birth place", type: "radio", options: ["Within India", "Outside India"],
          visibleIf: function (m, a) { return a.born_outside; } },
        { key: "birth_state", q: "26", label: "Birth — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return a.born_outside && a.birth_scope === "Within India"; } },
        { key: "birth_district", q: "26", label: "Birth — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.birth_state); },
          visibleIf: function (m, a) { return a.born_outside && a.birth_scope === "Within India"; } },
        { key: "birth_village", q: "26", label: "Birth — Village/Town (With Locality) Name", type: "text",
          visibleIf: function (m, a) { return a.born_outside && a.birth_scope === "Within India"; } },
        { key: "birth_country", q: "26", label: "Birth — Country", type: "select", options: D.COUNTRIES,
          visibleIf: function (m, a) { return a.born_outside && a.birth_scope === "Outside India"; } },

        { key: "came_from_elsewhere", q: "27", label: "If person has come to this Village/Town from elsewhere", type: "checkbox" },
        { key: "lastres_scope", q: "27(a)", label: "Place of Last Residence", type: "radio",
          options: ["Within India", "Outside India"], visibleIf: function (m, a) { return a.came_from_elsewhere; } },
        { key: "lastres_state", q: "27(a)", label: "Last Residence — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return a.came_from_elsewhere && a.lastres_scope === "Within India"; } },
        { key: "lastres_district", q: "27(a)", label: "Last Residence — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.lastres_state); },
          visibleIf: function (m, a) { return a.came_from_elsewhere && a.lastres_scope === "Within India"; } },
        { key: "lastres_village", q: "27(a)", label: "Last Residence — Village/Town (With Locality) Name", type: "text",
          visibleIf: function (m, a) { return a.came_from_elsewhere && a.lastres_scope === "Within India"; } },
        { key: "lastres_country", q: "27(a)", label: "Last Residence — Country", type: "select", options: D.COUNTRIES,
          visibleIf: function (m, a) { return a.came_from_elsewhere && a.lastres_scope === "Outside India"; } },
        { key: "migration_ruralurban", q: "27(b)", label: "At the time of migration", type: "radio",
          options: D.RURAL_URBAN, visibleIf: function (m, a) { return a.came_from_elsewhere; } },
        { key: "migration_reason", q: "28", label: "Reason for Migration", type: "select", options: D.MIGRATION_REASON,
          visibleIf: function (m, a) { return a.came_from_elsewhere; } },
        { key: "migration_duration", q: "29", label: "Duration of stay in this Village/Town since last Migration (years)",
          type: "number", visibleIf: function (m, a) { return a.came_from_elsewhere; } },

        { key: "perm_addr_heading", q: "30", label: "Permanent Residential Address", type: "heading" },
        { key: "perm_same_as_head", q: "30", label: "Permanent Address is same as head of Household (Not applicable for head)",
          type: "checkbox", visibleIf: function (m) { return m.relationship !== "Head"; } },
        { key: "perm_state", q: "30", label: "Permanent — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return !a.perm_same_as_head; } },
        { key: "perm_district", q: "30", label: "Permanent — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.perm_state); },
          visibleIf: function (m, a) { return !a.perm_same_as_head; } },
        { key: "perm_town", q: "30", label: "Permanent — Town/Village", type: "text",
          visibleIf: function (m, a) { return !a.perm_same_as_head; } },
        { key: "perm_house", q: "30", label: "Permanent — House Number & Locality", type: "text",
          visibleIf: function (m, a) { return !a.perm_same_as_head; } }
      ]
    },
    {
      id: "fertility", tab: "Fertility", title: "Fertility Particulars", range: "Q31–Q33",
      note: "These questions are only applicable for currently married, widowed, divorced or separated women.",
      appliesTo: everMarriedWoman,
      questions: [
        { key: "children_surviving_d", q: "31", label: "Children surviving at present — Daughter", type: "number" },
        { key: "children_surviving_s", q: "31", label: "Children surviving at present — Son", type: "number" },
        { key: "children_born_d", q: "32", label: "Children ever born alive — Daughter", type: "number" },
        { key: "children_born_s", q: "32", label: "Children ever born alive — Son", type: "number" },
        { key: "children_lastyear_d", q: "33",
          label: "Children born alive during last one year (1 Oct 2025 – 30 Sep 2026) — Daughter", type: "number",
          visibleIf: function (m) { return m.marital === "Currently Married"; } },
        { key: "children_lastyear_s", q: "33",
          label: "Children born alive during last one year (1 Oct 2025 – 30 Sep 2026) — Son", type: "number",
          visibleIf: function (m) { return m.marital === "Currently Married"; } }
      ]
    },
    {
      id: "other", tab: "Other Particulars", title: "Other Particulars", range: "Q34–Q40",
      last: true,
      questions: [
        { key: "covid_vax", q: "34", label: "Whether vaccination for Covid-19 taken?", type: "radio",
          options: yesno, required: true },
        { key: "covid_place_scope", q: "34", label: "Place of Covid-19 vaccination", type: "radio",
          options: ["Within India", "Outside India"], visibleIf: function (m, a) { return a.covid_vax === "Yes"; } },
        { key: "covid_state", q: "34", label: "Covid vaccination — State", type: "select", options: D.STATES,
          visibleIf: function (m, a) { return a.covid_vax === "Yes" && a.covid_place_scope === "Within India"; } },
        { key: "covid_district", q: "34", label: "Covid vaccination — District", type: "select",
          optionsFn: function (m, a) { return D.districtsFor(a.covid_state); },
          visibleIf: function (m, a) { return a.covid_vax === "Yes" && a.covid_place_scope === "Within India"; } },
        { key: "covid_country", q: "34", label: "Covid vaccination — Country", type: "select", options: D.COUNTRIES,
          visibleIf: function (m, a) { return a.covid_vax === "Yes" && a.covid_place_scope === "Outside India"; } },
        { key: "bank_accounts", q: "35", label: "Total Number of Bank Accounts", type: "number",
          hint: "Enter 0 if none", required: true },
        { key: "has_mobile", q: "36", label: "Whether Mobile Number available?", type: "radio", options: yesno, required: true },
        { key: "mobile_number", q: "36", label: "Mobile Number", type: "tel", placeholder: "Enter 10-digit number",
          visibleIf: function (m, a) { return a.has_mobile === "Yes"; } },
        { key: "has_aadhaar", q: "37", label: "Whether Aadhaar Number available?", type: "radio", options: yesno, required: true },
        { key: "aadhaar_number", q: "37", label: "Aadhaar Number", type: "text",
          visibleIf: function (m, a) { return a.has_aadhaar === "Yes"; } },
        { key: "has_voterid", q: "38", label: "Whether Voter ID number available?", type: "radio", options: yesno, required: true },
        { key: "voterid_number", q: "38", label: "Voter ID Number", type: "text",
          visibleIf: function (m, a) { return a.has_voterid === "Yes"; } },
        { key: "has_passport", q: "39", label: "Whether Indian Passport holder?", type: "radio", options: yesno, required: true },
        { key: "passport_number", q: "39", label: "Passport Number", type: "text",
          visibleIf: function (m, a) { return a.has_passport === "Yes"; } },
        { key: "has_dl", q: "40", label: "Whether Driving License available?", type: "radio", options: yesno, required: true },
        { key: "dl_number", q: "40", label: "Driving License Number", type: "text",
          visibleIf: function (m, a) { return a.has_dl === "Yes"; } }
      ]
    }
  ];

  // Flat list of every autofillable key (used by the extension mapping export).
  function allKeys() {
    const keys = MEMBER_FIELDS.map(function (f) { return f.key; });
    SECTIONS.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (q.type !== "heading" && q.type !== "note") keys.push(q.key);
      });
    });
    return keys;
  }

  global.SE_SCHEMA = {
    MEMBER_FIELDS: MEMBER_FIELDS,
    SECTIONS: SECTIONS,
    allKeys: allKeys,
    helpers: { isEverMarried: isEverMarried, everMarriedWoman: everMarriedWoman }
  };
})(window);

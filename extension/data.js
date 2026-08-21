/* ============================================================================
   SE-Replica — reference data (option lists)
   ----------------------------------------------------------------------------
   Small enumerations (sex, marital status, religion, disability, education,
   migration, travel, etc.) are reproduced in FULL from the source screenshots.

   The huge government code lists — Occupation (NCO), Industry (NIC), the full
   SC/ST caste registers, and every State→District→Tehsil→Village row — run to
   tens of thousands of entries. For a TEST/TRAINING replica those are shipped
   here as clearly-marked REPRESENTATIVE SAMPLES. Add more by editing the arrays
   below; nothing else needs to change.
   ============================================================================ */
(function (global) {
  "use strict";

  // ---- Geography (sample) --------------------------------------------------
  // A small but realistic State → District map. Extend freely.
  const STATES = [
    "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  // Districts per state (sample — a handful each; add the rest as needed).
  const DISTRICTS = {
    "Andhra Pradesh": ["Alluri Sitharama Raju", "Anakapalli", "Guntur", "Krishna", "Visakhapatnam"],
    "Assam": ["Kamrup", "Dibrugarh", "Nagaon", "Cachar"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
    "Delhi": ["Central Delhi", "New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Belagavi", "Dakshina Kannada"],
    "Kerala": ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
    "Maharashtra": ["Mumbai City", "Mumbai Suburban", "Pune", "Nagpur", "Nashik"],
    "Meghalaya": ["East Khasi Hills", "West Khasi Hills", "Ri Bhoi"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
    "Telangana": ["Hyderabad", "Rangareddy", "Warangal", "Karimnagar"],
    "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Varanasi", "Agra", "Prayagraj"],
    "West Bengal": ["Kolkata", "Howrah", "North 24 Parganas", "Darjeeling"]
  };
  const DEFAULT_DISTRICTS = ["District 1", "District 2", "District 3"];

  // Location-mapping cascade (sample) beneath District.
  const TEHSILS = ["Tehsil A", "Tehsil B", "Tehsil C"];
  const VILLAGES = ["Village / Town 1", "Village / Town 2", "Village / Town 3"];
  const LOCALITIES = ["Locality North", "Locality South", "Ward 12", "Sector 7"];

  const COUNTRIES = [
    "Afghanistan", "Australia", "Bangladesh", "Bhutan", "Canada", "China",
    "France", "Germany", "Myanmar", "Nepal", "Pakistan", "Saudi Arabia",
    "Sri Lanka", "United Arab Emirates", "United Kingdom", "United States",
    "Other"
  ];

  // ---- Login flow ----------------------------------------------------------
  const LANGUAGES_UI = ["English", "हिन्दी (Hindi)", "ਪੰਜਾਬੀ (Punjabi)"]; // exactly three

  // ---- Member roster (Basic Information) -----------------------------------
  const RELATIONSHIPS = [
    "Head",
    "Husband/ Wife",
    "Son/ Daughter",
    "Daughter-in-law (Son's Wife)",
    "Son-in-law (Daughter's Husband)",
    "Grand Child (Son's Son/ Son's Daughter)",
    "Grand Child (Daughter's Son/ Daughter's Daughter)",
    "Son's Son's Wife",
    "Son's Daughter's Husband",
    "Daughter's Son's Wife",
    "Daughter's Daughter's Husband",
    "Parents (Father/ Mother)",
    "Brother/ Sister",
    "Brother's Wife",
    "Father's Brother/ Father's Sister",
    "Father's Brother's Wife",
    "Father's Sister's Husband",
    "Mother's Brother/ Mother's Sister",
    "Mother's Brother's Wife",
    "Mother's Sister's Husband",
    "Grandparents (Father's Father/ Father's Mother)",
    "Grandparents (Mother's Father/ Mother's Mother)",
    "Other Relative (Male/ Female)",
    "Domestic Servant (Male/ Female)",
    "Other Unrelated Person/ Visitor/ Guest (Male/ Female)"
  ];

  // Relationships that fix the sex of the person.
  const FEMALE_ONLY_REL = [
    "Daughter-in-law (Son's Wife)", "Son's Son's Wife", "Daughter's Son's Wife",
    "Brother's Wife", "Father's Brother's Wife", "Mother's Brother's Wife"
  ];
  const MALE_ONLY_REL = [
    "Son-in-law (Daughter's Husband)", "Son's Daughter's Husband",
    "Daughter's Daughter's Husband", "Father's Sister's Husband",
    "Mother's Sister's Husband"
  ];
  // Relationships that imply the person is (or has been) married → no "Never Married".
  const EVER_MARRIED_REL = [
    "Husband/ Wife", "Daughter-in-law (Son's Wife)", "Son-in-law (Daughter's Husband)",
    "Son's Son's Wife", "Son's Daughter's Husband", "Daughter's Son's Wife",
    "Daughter's Daughter's Husband", "Brother's Wife", "Father's Brother's Wife",
    "Father's Sister's Husband", "Mother's Brother's Wife", "Mother's Sister's Husband"
  ];

  const SEX = ["Male", "Female", "Transgender Person"];
  const MARITAL = ["Never Married", "Currently Married", "Widowed", "Separated", "Divorced"];

  // ---- General information --------------------------------------------------
  const NATIONALITY = ["Indian", "Afghanistan", "Australia", "Bangladesh", "Nepal", "Sri Lanka", "Other"];
  const RELIGION = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
  const SC_LIST = ["Bairwa", "Chamar", "Balai", "Bhangi", "Meghwal", "Raigar", "Other (SC)"]; // sample
  const ST_LIST = ["Bhil", "Mina", "Garasia", "Gond", "Santhal", "Naga", "Other (ST)"];       // sample
  const CASTE_DECL = ["Does not want to declare Caste", "No Caste"];

  // ---- Disability ----------------------------------------------------------
  const DISABILITY_TYPES = [
    "In Seeing", "In Hearing", "In Speech", "In Mobility",
    "Intellectual Disability", "Mental Illness", "Due to Acid attack",
    "Due to chronic neurological disease", "Due to Blood Disorder",
    "Multiple Disability", "Any Other"
  ];

  // ---- Languages & education ----------------------------------------------
  const MOTHER_TONGUES = [
    "Assamese", "Bengali", "Bodo", "Chakma", "Dogri", "English", "Gujarati",
    "Haijong", "Hindi", "Kannada", "Kashmiri", "Konkani", "Maithili", "Malayalam",
    "Manipuri", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali",
    "Sindhi", "Tamil", "Telugu", "Urdu", "Other"
  ];
  const LITERACY = ["Literate", "Illiterate"];
  const ATTEND_STATUS = ["Attending", "Not Attending"];
  const ATTEND_INSTITUTION = ["School", "College", "Vocational", "Professional",
    "Special Institution for disabled", "Literacy Centre", "Other Institution"];
  const NOT_ATTEND_REASON = ["Attended Before", "Never Attended"];
  const EDUCATION_LEVEL = [
    "Pre-primary", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
    "Diploma / Certificate", "Bachelor/ undergraduate", "PG Diploma",
    "Masters/ Postgraduate", "MPhil", "Doctorate & above"
  ];
  const STREAM = ["Arts/Social Science", "Science", "Commerce", "IT & Computer",
    "Engineering / Technology", "Medicine", "Management", "Law", "Education", "Other"];

  // ---- Economic activity ---------------------------------------------------
  const WORK_STATUS = [
    "Main worker (if worked for 6 months or more)",
    "Marginal Worker (if worked for 3 months or more but less than 6 months)",
    "Semi-marginal Worker (if worked for less than 3 months)",
    "Non-worker"
  ];
  const ECON_CATEGORY = [
    "Cultivator", "Agricultural Labourer", "Worker in household industry",
    "Plantation, livestock, forestry, fishing, hunting & allied activities",
    "Manufacturing activities", "Construction activities", "Services activities",
    "Other activities"
  ];
  // Occupation (NCO) — SAMPLE
  const OCCUPATION = [
    "Legislators (MPs, MLAs, Municipal Councillors, etc)",
    "Senior Government Officials (Central, State, Local Bodies, Diplomat, etc)",
    "Managing Directors and Chief Executives",
    "Finance Managers (Bank, Insurance, Finance, etc)",
    "Human Resource Managers",
    "Civil Engineers", "Mechanical Engineers", "Industrial and Production Engineers",
    "Environmental Engineers", "Environmental Protection Professionals",
    "Accountant", "School Teacher", "Doctor", "Nurse", "Farmer", "Shopkeeper",
    "Driver", "Electrician", "Plumber", "Other"
  ];
  // Industry / Trade / Service (NIC) — SAMPLE
  const INDUSTRY = [
    "Growing of cereals (except rice), leguminous crops and oil seeds",
    "Growing of rice",
    "Growing of vegetables and melons, roots and tubers",
    "Growing of sugar cane",
    "Support activities for fishing and aquaculture",
    "Mining of hard coal", "Mining of lignite",
    "Extraction of crude petroleum", "Extraction of natural gas",
    "Manufacture of food products", "Construction of buildings",
    "Retail trade", "Education services", "Human health activities", "Other"
  ];
  const CLASS_OF_WORKER = ["Employer", "Employee", "Single Worker", "Family Worker"];
  const NON_ECON_ACTIVITY = ["Student", "Pensioner", "Rentier", "Other"];
  const SEEKING_WORK = ["Yes - Full time work", "Yes - Part time work", "No"];
  const TRAVEL_MODE = [
    "On foot", "Bicycle", "Moped / Scooter / Motor Cycle", "Car / Jeep / Van",
    "Tempo / Auto-rickshaw / Taxi", "Bus", "Train / Metro rail",
    "Water Transport", "Any Other"
  ];

  // ---- Migration -----------------------------------------------------------
  const MIGRATION_REASON = [
    "Work / Employment", "Business", "Education", "Marriage", "Moved after birth",
    "Moved with Household", "Natural Calamities", "Any Other"
  ];
  const RURAL_URBAN = ["Rural", "Urban"];

  global.SE_DATA = {
    STATES, DISTRICTS, DEFAULT_DISTRICTS, TEHSILS, VILLAGES, LOCALITIES, COUNTRIES,
    LANGUAGES_UI,
    RELATIONSHIPS, FEMALE_ONLY_REL, MALE_ONLY_REL, EVER_MARRIED_REL, SEX, MARITAL,
    NATIONALITY, RELIGION, SC_LIST, ST_LIST, CASTE_DECL,
    DISABILITY_TYPES,
    MOTHER_TONGUES, LITERACY, ATTEND_STATUS, ATTEND_INSTITUTION, NOT_ATTEND_REASON,
    EDUCATION_LEVEL, STREAM,
    WORK_STATUS, ECON_CATEGORY, OCCUPATION, INDUSTRY, CLASS_OF_WORKER,
    NON_ECON_ACTIVITY, SEEKING_WORK, TRAVEL_MODE,
    MIGRATION_REASON, RURAL_URBAN,
    districtsFor: function (state) { return DISTRICTS[state] || DEFAULT_DISTRICTS; }
  };
})(window);

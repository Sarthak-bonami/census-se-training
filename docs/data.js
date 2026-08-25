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
  // Real India geography — 37 States/UTs, ~730 districts (community dataset + Ladakh & A&N).
  // Tehsil / Village / Locality are entered as free text (real names), shared once per household.
  const STATES = [
    "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
    "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu",
    "Delhi", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala",
    "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal",
  ];

  const DISTRICTS = {
    "Andaman & Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kra Daadi", "Kurung Kumey", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Papum Pare", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran (Motihari)", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur (Bhabua)", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger (Monghyr)", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia (Purnea)", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chandigarh": ["Chandigarh"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada (South Bastar)", "Dhamtari", "Durg", "Gariyaband", "Janjgir-Champa", "Jashpur", "Kabirdham (Kawardha)", "Kanker (North Bastar)", "Kondagaon", "Korba", "Korea (Koriya)", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Dadra and Nagar Haveli": ["Dadra & Nagar Haveli"],
    "Daman and Diu": ["Daman", "Diu"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha (Palanpur)", "Bharuch", "Bhavnagar", "Botad", "Chhota Udepur", "Dahod", "Dangs (Ahwa)", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kachchh", "Kheda (Nadiad)", "Mahisagar", "Mehsana", "Morbi", "Narmada (Rajpipla)", "Navsari", "Panchmahal (Godhra)", "Patan", "Porbandar", "Rajkot", "Sabarkantha (Himmatnagar)", "Surat", "Surendranagar", "Tapi (Vyara)", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurgaon", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Mewat", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul & Spiti", "Mandi", "Shimla", "Sirmaur (Sirmour)", "Solan", "Una"],
    "Jammu and Kashmir": ["Anantnag", "Bandipore", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kargil", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Leh", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribag", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkot", "Ballari (Bellary)", "Belagavi (Belgaum)", "Bengaluru (Bangalore) Rural", "Bengaluru (Bangalore) Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru (Chikmagalur)", "Chitradurga", "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi (Gulbarga)", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru (Mysore)", "Raichur", "Ramanagara", "Shivamogga (Shimoga)", "Tumakuru (Tumkur)", "Udupi", "Uttara Kannada (Karwar)", "Vijayapura (Bijapur)", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Ladakh": ["Kargil", "Leh"],
    "Lakshadweep": ["Agatti", "Amini", "Androth", "Bithra", "Chethlath", "Kadmath", "Kalpeni", "Kavaratti", "Kilthan", "Minicoy"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghapur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar (Keonjhar)", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh"],
    "Puducherry": ["Karaikal", "Mahe", "Pondicherry", "Yanam"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr (Shahid Bhagat Singh Nagar)", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar (Mohali)", "Sangrur", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
    "Tamil Nadu": ["Ariyalur", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Salem", "Sivaganga", "Thanjavur", "Theni", "Thoothukudi (Tuticorin)", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhoopalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal", "Nagarkurnool", "Nalgonda", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal (Rural)", "Warangal (Urban)", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Allahabad", "Ambedkar Nagar", "Amethi (Chatrapati Sahuji Mahraj Nagar)", "Amroha (J.P. Nagar)", "Auraiya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Faizabad", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur (Panchsheel Nagar)", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kanshiram Nagar (Kasganj)", "Kaushambi", "Kushinagar (Padrauna)", "Lakhimpur - Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "RaeBareli", "Rampur", "Saharanpur", "Sambhal (Bhim Nagar)", "Sant Kabir Nagar", "Shahjahanpur", "Shamali (Prabuddh Nagar)", "Shravasti", "Siddharth Nagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Burdwan (Bardhaman)", "Cooch Behar", "Dakshin Dinajpur (South Dinajpur)", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Medinipur (West Medinipur)", "Purba Medinipur (East Medinipur)", "Purulia", "South 24 Parganas", "Uttar Dinajpur (North Dinajpur)"],
  };
  const DEFAULT_DISTRICTS = [];

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
    STATES, DISTRICTS, DEFAULT_DISTRICTS, COUNTRIES,
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

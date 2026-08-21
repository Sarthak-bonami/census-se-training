# SE-Replica — Self-Enumeration (PE) training & test app

A self-contained replica of the Census of India 2027 **Self-Enumeration** journey,
rebuilt from the handover guide so the team can **practise and test the full flow**
without touching the live portal (no real OTP/SMS needed). It pairs with the
**SE Family Autofill** extension (`../self-enumeration-autofill`).

## Run it
- **Simplest:** double-click `index.html` (opens via `file://`).
- **For use with the autofill extension over http** (recommended):
  ```
  cd SE-Replica
  python3 -m http.server 8765
  ```
  then open http://localhost:8765/ . (The extension can inject into `file://` pages only
  if you enable "Allow access to file URLs" for it; http avoids that.)

Progress autosaves in the browser (localStorage). **Logout** (top-right) clears it and
starts a fresh household.

## What it reproduces (from the handover guide)
- **Login:** State/UT → consent ("I Understood") → mobile + captcha → OTP + language.
  - Mobile accepted only if the **first digit is 5–9**; wrong captcha and wrong OTP show
    error states; wrong OTP returns to the mobile page with the **language retained &
    locked**; only **three languages**. *(Captcha & OTP are simulated — the demo OTP is
    shown on screen as `123456`.)*
- **Location Mapping:** cascading City/District → Tehsil → Village → Locality, **Reset**
  clears all four, **Confirm/Cancel** behaviour, simulated map panel.
- **Household members (Q1–6):** name, relationship-to-head (full list), sex, DOB, age,
  marital status, age-at-marriage, with the documented dependencies:
  - **Sex options depend on relationship** (e.g. *Daughter-in-law* → Female/Transgender;
    *Son-in-law* → Male/Transgender; *Husband/Wife*, *Son/Daughter* → all three).
  - **Marital-status options depend on relationship + sex** (spouse-type relations exclude
    *Never Married*).
  - **Age at marriage** is hidden/optional for *Never Married*, required otherwise.
  - Mandatory-field validation on **Save & Add Member**.
- **Per-member questionnaire (Q7–Q40)** across 8 sections — General Info, Household/Family
  Particulars, Disability, Education & Language, Economic Activity, Migration, Fertility,
  Other Particulars — with **Save & Continue / Previous**, and skip-logic
  (e.g. **Fertility** only for ever-married women; Q33 only for currently-married women).
- **Dashboard** with per-section status, add-more-members, **Review & Submit Household**
  with expandable per-member detail and **Edit**, and a **Submission Successful** screen
  with a generated **SE ID**.

## Fidelity note
Small enumerations (sex, marital, religion, disability, education, migration, travel, …)
are reproduced in full. The giant government code lists — **Occupation (NCO), Industry
(NIC), full SC/ST caste registers, and every State→District→Tehsil→Village** — are shipped
as clearly-marked **representative samples**; extend the arrays in `data.js` if you need
more. The captcha/OTP/map are simulated by design.

## Files
| File | Role |
|---|---|
| `index.html` | App shell. |
| `styles.css` | Census-style theme (tricolour header, saffron buttons, stepper, cards). |
| `data.js` | Option lists (full for small enums; samples for the big code lists). |
| `schema.js` | Member fields (Q1–6) + questionnaire (Q7–40): types, options, dependency rules. |
| `app.js` | Flow engine: screens, validation, dependencies, review, submit. |

Every input carries a stable `data-se="<key>"` so the companion extension fills it exactly.

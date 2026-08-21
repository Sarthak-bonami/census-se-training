# Reducing what people fill — the optimization model

The SE form asks ~40 questions **per person**. Most of a household's answers are
either the **same for everyone** or **derivable** from who's who and a date of birth.
The extension exploits this: you fill the shared bits once, and each member's screen
then leads with *"✅ N auto-filled — please fill the few that are left."* Auto-filled
values are shown per member, **locked (read-only)**, tagged by where they came from,
with a small **Edit** to override the odd exception.

Below are the reductions, grouped by how the value is obtained. (A 10-year-old child in
a 3-person family goes from ~40 questions to ~16 — the rest are auto-filled.)

## A. Fill once for the whole household → locked on every member  (tag: 🔒 from family)
1. **Religion** (Q9) — one value for the home; **defaults to Jain** (change it in the
   household panel if a family differs).
2. **Nationality** (Q8) — household default (usually Indian).
3. **Scheduled Caste? / Scheduled Tribe?** (Q10a/b) — caste status is family-wide.
4. **Caste / Tribe name** (Q10a/b name) — filled once when SC/ST is Yes.
5. **Caste declaration** (Q10c) — household-wide.
6. **Mother tongue** (Q14a) — the home language.
7. **Other languages known** (Q14b/c) — household default (overridable per person).
8. **Usual residence** (state / district / village) — entered once and reused for
   birthplace, permanent address, and Covid-vaccination place below.

## B. Derived from the roster / relationships → no entry at all  (tag: from parent / from spouse)
9. **Father's Particulars** (Q11: name, DOB, religion) — pulled from the father member.
10. **Mother's Particulars** (Q12: name, DOB, religion) — pulled from the mother member.
11. **Spouse Name** (Q7) — the paired member; reciprocal (fill the couple once, both get it).
12. **"Father/Mother is a member of this household"** — ticked automatically for children.
13. **Permanent address = same as head** (Q30) — set for everyone except the head.
14. **Head's mobile** (Q36) — defaults to the household's registered phone number.
15. **Sex options** (Q3) — constrained by relationship (Daughter-in-law → Female, Son-in-law → Male…).

## C. Derived from the member's own DOB / age → computed, never asked  (tag: auto)
16. **Age** (Q4b) — computed from Date of Birth (ask one, not both).
17. **Minors (<18): Marital status = Never Married**, and **Voter ID / Passport / Driving
    License = No** (they can't hold these).
18. **Children (<15): Worked last year = No**, and **Non-economic activity = Student**.
19. **School-age (6–17): Attending → School**; **under-7 → Not Attending**.
20. **Birthplace** (Q26) — defaults to "born in this village/town" (the common case).
21. **Age at marriage** (Q6) — hidden / not-applicable when Never Married.
22. **Fertility section** (Q31–33) — auto-skipped for anyone who isn't an ever-married woman.
23. **Covid-19 vaccination place** (Q34) — defaults to the household's usual residence.

## How it shows up
- **Household panel** ("Household — shared by all members"): fill A once.
- **Member view**: a green banner counts what's auto-filled; only the **remaining** fields
  are shown to fill; the rest sit in an **"Auto-filled for you"** drawer — visible per
  member, locked, each tagged 🔒 *from family / from parent / from spouse / auto*, with
  **Edit** to override an exception.
- **On the form**: every auto-filled value is sent along with the few you typed, so
  autofill still completes the whole schedule.

## Safe by design
All derivations are **defaults you can override**, nothing is invented that changes a
person's identity, and the extension still never submits — you review and submit yourself.

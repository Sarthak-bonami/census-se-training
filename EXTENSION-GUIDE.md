# How to access & use the SE Family Autofill extension

A Chrome (or Edge) extension that stores a whole household once — keyed by phone number —
and autofills the Self-Enumeration form **member by member**. Everything stays on the
device (`chrome.storage`); nothing is sent to any server, and it never clicks Submit.

---

## 1. Get the files

**Option A — clone the repo**
```bash
git clone https://github.com/<owner>/census-se-training.git
```
The extension is in the `extension/` folder.

**Option B — download the ZIP**
Download `extension/se-family-autofill.zip` from this repo and unzip it to a folder you'll
keep (don't delete it later — Chrome loads it from that folder).

---

## 2. Load it into the browser (one time)

1. Open **`chrome://extensions`** (or `edge://extensions`).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the **`extension`** folder (the one containing `manifest.json`).
5. Pin **SE Family Autofill** to the toolbar (puzzle-piece icon → pin).

> **Updating later:** after pulling new code, return to `chrome://extensions` and click the
> **↻ reload** icon on the extension card.

---

## 3. Open the side panel

Click the pinned **SE Family Autofill** icon → the side panel opens on the right.
Keep it open while you work on the form (unlike a popup, it stays alive).

---

## 4. Build a family (once per household)

1. **+ Family** → give it a **name** ("Family 1") and the household **phone number**.
2. **+ Add member** for each person (Head, spouse, children …). For each member, fill:
   - **Basic Information (Q1–6):** name, relationship to head, sex, DOB, age, marital status,
     age at marriage.
   - **Q7–Q40 sections:** expand each section and fill what applies.
   It **autosaves** as you type. Repeat for every member.

Tip: **Export family (JSON)** copies the whole household to the clipboard so you can back it
up or move it to another machine (**Import family** pastes it back).

---

## 5. Autofill the form

Open the SE form (the replica for training, or the live portal), then in the panel:

- **Add all members to roster** — on the *Basic Information* screen, adds every member (Q1–6)
  in turn.
- **Auto-fill all sections** — on a member's questionnaire, fills Q7–Q40 and clicks *Save &
  Continue* through all 8 sections.
- **Fill current screen** — fills just the visible screen for the selected member (you click
  the buttons yourself).

Then **review the page and submit it yourself** — the extension never submits.

---

## 6. Auto-recognition by phone

- **Auto-detect family by phone** (on by default): the panel watches the open form for the
  household mobile number. When it matches a saved family, that family is selected
  automatically and a banner shows *"Recognised Family 1 …"*. If the number isn't saved yet,
  the banner says so.
- **Auto-fill when recognised** (off by default): when a family is recognised *and* you're on
  the members or questionnaire screen, it fills automatically. Leave it off if you'd rather
  press **Fill** yourself.

---

## Notes & limits
- **Reliable, exact filling works on the replica** (every field is tagged for the extension).
  On the **live census site** it's *best-effort* (matches fields by their visible labels),
  since that site doesn't expose the same field tags.
- **`file://` pages:** if you open the replica as a local file, enable *"Allow access to file
  URLs"* for the extension on `chrome://extensions`. Serving over `http://localhost` avoids this.
- **Auto-advance** stops if the form shows a validation error (missing data for that member) —
  fill that field and continue.
- Shadow-DOM / canvas fields can't be autofilled (true of any autofill tool).

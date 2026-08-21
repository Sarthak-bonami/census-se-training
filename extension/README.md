# SE Family Autofill (v2)

A Chrome extension that stores a **whole household once** — keyed by the family's
phone number — and autofills the Self-Enumeration (SE) form **member by member**.
Built to work hand-in-hand with the **SE-Replica** training app (see `../SE-Replica`),
and best-effort on the live census portal.

## What changed from v1
- v1 held a single flat set of answers. v2 holds **families → members → all Q1–Q40 answers**.
- Families are **saved on the device** (`chrome.storage.local`) — so it now requests the
  `storage` permission. Everything still stays local; nothing is sent to any server.
- **Auto-recognition by phone:** when the phone number on the page matches a saved
  family, the extension selects that family automatically (and can auto-fill).
- The member editor is generated from the **same schema** the replica renders, so every
  field maps 1:1 to the form via `data-se` keys.

## Install
1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this folder
3. Pin it, open the SE form (the replica or the live site), click the icon → the side panel opens

## Everyday flow — one form per family
1. **Create a family** (`+ Family`), give it a **name** ("Family 1") and the household
   **phone number**.
2. **Fill the household basics once** — open *"Household — shared by all members"* and set
   caste (SC/ST), mother tongue, nationality and usual residence. **Religion defaults to
   Jain.** These are shared by everyone and locked on each member.
3. **Add people** (`+ Add member`). Each person is a compact card that leads with
   *"✅ N auto · M to fill"* and shows only what's left; everything shared or derivable
   (parents, spouse, age from DOB, children's defaults) is pre-filled and tucked in the
   **"Auto-filled for you"** drawer — locked, tagged by source, with **Edit** to override.
   See [`OPTIMIZATIONS.md`](OPTIMIZATIONS.md).

Then, filling the census site — **family by family, one press per screen**:
4. Open the SE site. The panel **recognises the phone** and loads that family; on the
   questionnaire it also reads **who the page is on** (by name).
5. Press **⚡ Autofill this page** as you go: on the *Basic Information* screen it adds
   everyone; on a person's questions it fills **that** person; elsewhere it fills the open
   screen. (Turn on *Auto-fill when recognised* to have it happen automatically.)
6. Review the page and submit it yourself. **The extension never submits.**

## Auto-recognition by phone
- **Auto-detect family by phone** (on by default): the panel watches the open SE page for
  the household mobile number. When it matches a saved family's phone, that family is
  selected automatically and a banner shows *"Recognised Family 1 …"*. If the number isn't
  saved yet, the banner tells you so.
- **Auto-fill when recognised** (off by default): when a family is recognised *and* you're
  on the members or questionnaire screen, it fills automatically (once per screen). Leave it
  off if you'd rather click **Fill** yourself.

## How filling works
- **Primary — exact match by key.** Every field in the replica carries `data-se="<key>"`
  (e.g. `name`, `relationship`, `sex`, `nationality`, `disability_types`). The content script
  fills by that key, so it is exact and order-independent. Values are written with the native
  setter + `input`/`change` events so React notices them; selects match by option text,
  radios by value, multiselects check each option (respecting the max).
- **Fallback — label text.** On the live census site (no `data-se`), it falls back to
  matching by visible label / placeholder / name text. This is best-effort; use the replica
  for reliable end-to-end runs and training.

## Editing the field set
The questions, options and dependency rules live in `schema.js` + `data.js` (shared with the
replica). Add a question or option there and both the panel editor and the page-fill mapping
pick it up. Large government code lists (occupation/NCO, industry/NIC, full caste registers,
every district) ship as **representative samples** — extend the arrays in `data.js` as needed.

## Files
| File | Role |
|---|---|
| `manifest.json` | MV3 config. Adds `storage` for saved families. |
| `data.js` / `schema.js` | Shared field model (options, questions, dependency rules). |
| `sidepanel.html/.css/.js` | Family manager: families, members, the Q1–Q40 editor, fill actions, phone auto-detect. |
| `content.js` | Injected into the page: fills by `data-se` (label fallback), auto-advances the wizard, adds all members. |
| `background.js` | Opens the side panel on icon click. |

## Notes & limits
- **file:// pages** need "Allow access to file URLs" enabled for the extension. Easier: serve
  the replica over http (e.g. `python3 -m http.server` in the SE-Replica folder).
- **Auto-advance** stops if the form shows a validation modal (missing data for that member) —
  finish that field manually, then continue.
- **Shadow DOM / canvas** fields are not reachable (same as any autofill).

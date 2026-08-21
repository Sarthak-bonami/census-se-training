# Census 2027 · Self-Enumeration — Training Replica & Family Autofill

Internal tooling to **test and train a team** on the Census of India 2027
**Self-Enumeration (PE)** form, without touching the live portal.

> ⚠️ **For testing & training only.** This is a practice replica, **not** the real
> Census portal (`se-snowbound.census.gov.in`). Nothing is submitted anywhere;
> captcha and OTP are simulated.

## What's in here

| Folder | What it is |
|---|---|
| [`docs/`](docs/) | The **SE-Replica** — a self-contained web app that reproduces the full SE journey (login → location → household members → per-member Q7–Q40 → review → submit). Served as a live site via GitHub Pages. |
| [`extension/`](extension/) | The **SE Family Autofill** Chrome extension — store a household once (by phone number) and autofill the form member-by-member. Includes `se-family-autofill.zip`. |
| [`EXTENSION-GUIDE.md`](EXTENSION-GUIDE.md) | Step-by-step guide to install and use the extension. |

## Live replica (after GitHub Pages is enabled)

`https://<owner>.github.io/census-se-training/`

(Enable in **Settings → Pages → Build from branch → `main` / `/docs`**. The link goes
live a minute or two later.)

## Run the replica locally instead

- Double-click `docs/index.html`, **or**
- Serve it (recommended when using the extension):
  ```bash
  cd docs && python3 -m http.server 8765
  # then open http://localhost:8765/
  ```

## Quick start for the team
1. Install the extension — see [`EXTENSION-GUIDE.md`](EXTENSION-GUIDE.md).
2. Open the replica (live link or local).
3. In the extension side panel, create **Family 1** (name + phone + members with their
   answers). On the form's *Basic Information* screen use **Add all members to roster**,
   then on the dashboard open a member and **Auto-fill all sections**.
4. Review and submit — the replica generates a demo SE ID. Nothing leaves the device.

## Fidelity note
Small option lists (sex, marital status, religion, disability, education, migration, …)
are reproduced in full. The very large government code lists — Occupation (NCO), Industry
(NIC), full SC/ST caste registers, and every State→District→Tehsil→Village — ship as
clearly-marked **representative samples**; extend the arrays in `docs/data.js` /
`extension/data.js` as needed. Captcha/OTP/map are simulated by design.

_Built from the supplied SE Form user-flow & replica handover guide._

# Spark Station

A small, self-contained activity generator for teachers working with special-needs and ADHD kids. It suggests safe, hands-on activities — science mini-experiments, sensory play, art, movement, calm-down tools, fine motor work, and social-emotional games — filtered by age band, and shows the developmental skill each one builds.

## How to use it

No install, no build, no account. It's plain HTML/CSS/JS.

- **Just open it:** double-click `index.html` to open it in any browser.
- **Or host it for free:** push this folder to GitHub and enable GitHub Pages (Settings → Pages → deploy from the main branch), or drag the folder into a static host like Netlify. It'll work from any URL.

## What it does

- **Age Band** — filter to 3–5, 5–7, or 7–9 (or all ages).
- **Activity Type** — science, sensory, art & craft, movement, calm-down, fine motor, social-emotional.
- **Skill Focus** — pick what you want the activity to build (focus & attention, fine motor, self-regulation, social-emotional skills, etc.) and each result shows which skills it targets.
- **Max Duration** and a **low-dexterity-friendly** toggle for kids who need adapted materials or steps.
- **Generate Activities** — pulls a fresh batch of 4 matching activities; hit ↻ on a single card to swap just that one. It won't repeat an activity until it's shown everything else that matches your filters.
- **View Full Details** — materials, step-by-step setup, safety notes, and tips for keeping a short attention span engaged.
- **Weekly Plan** — add activities to a running list for the week, then **Print Plan** for a clean printable page. The plan and your filter choices are remembered in the browser (`localStorage`) so they're still there next time.

## Editing the activity library

All activity content lives in `js/activities-data.js` as plain JavaScript objects — no build step needed. Copy an existing entry to add a new one; the fields are: `title`, `category`, `ages`, `duration`, `dexterityFriendly`, `benefits`, `materials`, `setup`, `steps`, `safety`, `attentionTips`, `dexterityNotes`.

## Files

- `index.html` — page structure
- `css/styles.css` — styling, including a print stylesheet for the weekly plan
- `js/activities-data.js` — the activity library (edit this to add/change activities)
- `js/app.js` — filtering, generation, and weekly plan logic

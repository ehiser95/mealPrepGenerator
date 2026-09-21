# mealPrepGenerator

Generates meal preps based on calorie count, amount of meals to make, and macros.

A client-side meal prep planner and calorie/macro calculator. No backend, no
account system, no data leaves your browser — everything is stored in
`localStorage` on your own device.

## Features

- **Recipes** — add your own recipes with a per-ingredient macro autopopulate
  (type "chicken breast, cooked", "bell pepper", etc. and nutrition per 100g
  fills in automatically from a built-in food database). Any ingredient not
  in the database can have its macros entered manually.
- **Weight units** — every ingredient amount can be entered in grams,
  kilograms, ounces, or pounds; conversions happen automatically.
- **Recipe scaling** — scale a whole recipe batch with a slider, quick
  1x/2x/3x buttons, or a manual multiplier; per-serving macros stay
  correct, total ingredient amounts and servings scale together.
- **Meal plan generator** — choose 2/4/6/8/10 meals/day and a daily calorie
  target (weight loss, maintenance, or weight gain), and it assembles a plan
  from your saved recipes, scaling portions to hit the target.
- **Profile & calorie targets** — local, on-device profiles compute BMR/TDEE
  (Mifflin-St Jeor) and a goal calorie target from age/sex/height/weight/
  activity level, in either metric or imperial units.
- **Recommended meals** — a curated starter list referencing trusted recipe
  sites (by root domain) and a ready-made YouTube search per idea, since we
  can't safely guess a specific working video link.
- **Import from a link/text** — paste a recipe/YouTube URL and the app will
  try to fetch it directly; most sites block this via CORS, so there's a
  fallback to paste the recipe text (or a YouTube description/transcript)
  and auto-extract any ingredient lines that include an explicit weight
  (e.g. "200g chicken breast").
- **Sharing** — generate a copy-paste share code for any recipe (or a full
  backup file) that another person imports into their own copy of the app.
  There's no server, so this is peer-to-peer, not real-time.
- **Folder export** — in Chrome/Edge, export your whole recipe library into
  real `Meals/<Category>/*.json` folders on disk via the File System Access
  API; other browsers fall back to a single downloadable backup file.
- **Reset button** — wipes all locally stored data after confirmation.

### What's intentionally *not* real

- **Google Sign-In**: real OAuth needs a client ID registered in Google
  Cloud Console plus a hosted domain/backend — that can't be provisioned
  inside a static local file. Instead, the app uses local on-device
  profiles (Profile tab); "private" means "stored only in your browser,"
  not password-protected.
- **Automatic recipe/video scraping**: browsers block cross-origin `fetch()`
  to arbitrary sites (CORS), so most recipe/YouTube pages can't be read
  directly. The app tries anyway, and falls back to a paste-and-parse flow
  when it's blocked.

## How to run it locally

This is a static site (HTML/CSS/JS, no build step), so any local web server
works. A plain `file://` double-click mostly works too, but some features
(the recipe URL fetch attempt, folder export) need a real `http://` origin,
so a local server is recommended.

**Option A — Python (usually already installed):**

```bash
cd mealPrepGenerator
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

**Option B — Node.js:**

```bash
cd mealPrepGenerator
npx serve .
```

Then open the URL it prints (typically **http://localhost:3000**).

Use Chrome or Edge for full feature support (the Meals/ folder export uses
the File System Access API, which Firefox/Safari don't support — those
browsers can still use the plain backup-file export/import instead).

Press `Ctrl+C` in the terminal to stop the server when you're done.

## Project structure

```
index.html          Page shell, nav, Tailwind (via CDN) + small custom styles
js/data.js           Built-in food database, recommended meals, constants
js/utils.js          Shared helpers (unit conversion, toasts, formatting)
js/storage.js        localStorage read/write helpers
js/recipes.js        Recipe CRUD, macro math, ingredient parsing, editor UI
js/profile.js        Local profiles, BMR/TDEE calculation
js/mealplan.js       Meal plan generator
js/recommended.js    Curated recommended-meals tab
js/share.js          Share codes, backup export/import, folder export, reset
js/app.js            App state, tab router, global event wiring
```

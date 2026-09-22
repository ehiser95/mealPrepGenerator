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
- **Recipe steps & timing** — numbered cooking steps alongside numbered
  ingredients, plus prep time / cook time fields shown as prep + cook =
  total everywhere the recipe appears.
- **Meal Prep Planner** — plans *one* batch-cooked lunch or dinner, portioned
  into however many meal-prep containers you want. Set calories per portion
  and a portion count (slider + dropdown, kept in sync) and the whole batch
  scales so total batch calories = cal/portion × portions exactly. Optional
  filters: a diet (keto, Atkins-style, low carb, high volume/low calorie,
  carnivore — see below), target macros per portion, and a max prep/cook
  time. Generates several candidate recipes as tiles; click one to open a
  full-screen detail view (numbered ingredients + steps, source/YouTube
  links, and meal-prep tips like which ingredients are commonly available
  frozen or pre-chopped) — closes on the X, a click outside, or Esc.
- **Diet filters** — each option's exact definition and threshold is shown
  under the dropdown so you can verify it yourself: Keto (~70-75% fat,
  5-10% carb by calories), Atkins-style (low carb, approximated — this app
  can't model induction/maintenance phases), Low carb (≤26% of calories from
  carbs), High volume/low calorie (ranked by calories per gram, after the
  Volumetrics concept), and Carnivore (animal products only, checked
  ingredient-by-ingredient against the food database — so it only works for
  recipes built from known ingredients).
- **Protein filter** — narrow the Meal Prep Planner to a specific protein
  (chicken, beef, pork, turkey, fish/seafood, egg, plant-based, or dairy),
  matched by ingredient for your own recipes or a tagged protein for
  Recommended tab items.
- **Profile & calorie targets** — local, on-device profiles compute BMR/TDEE
  (Mifflin-St Jeor) and a goal calorie target from age/sex/height/weight/
  activity level, in either metric or imperial units.
- **Light/dark theme** — toggle in the header, persisted across sessions,
  and respects your OS preference on first visit.
- **Recommended meals** — a library of 28 curated starter recipes spanning
  breakfast/lunch/dinner/snack and every protein category, referencing
  trusted recipe sites (by root domain) and a ready-made YouTube search per
  idea, since we can't safely guess a specific working video link. Searchable
  by name, ingredient (e.g. "ground beef", "chicken breast"), protein, or
  meal type. The Meal Prep Planner draws from this library alongside your
  own recipes for real variety, even with an empty library.
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
js/mealplan.js       Meal Prep Planner: diet/macro/time filters, candidate tiles + detail modal
js/recommended.js    Curated recommended-meals tab
js/share.js          Share codes, backup export/import, folder export, reset
js/app.js            App state, tab router, global event wiring
```

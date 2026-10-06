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
- **Recommended meals** — a library of 60 starter recipes with estimated
  macros, spanning breakfast/lunch/dinner/snack and every protein category,
  drawn from 20 trusted recipe sites. Each recipe links to a search for that
  dish on its site and on YouTube, so you can find the full recipe and check
  the numbers. Searchable by name, ingredient (e.g. "ground beef"), protein,
  or meal type. The Meal Prep Planner draws from this library alongside your
  own recipes, showing results 9 per page.
- **Find more on other sites** — under the planner results, one-click links
  run your current filters (e.g. "keto chicken dinner meal prep") as a search
  on 22 recipe sites plus YouTube. A static page can't read other websites
  itself, so these open each site's own search in a new tab.
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

- **Account sync without Firebase**: until you set up Firebase (below),
  everything is saved in this browser only, with nothing shared between
  browsers or devices.
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

## Setting up Firebase (optional: accounts and sync)

Without this, the app works fully and saves everything in your browser.
With it, people sign in with Google and their recipes and profiles save to
their own private area in Cloud Firestore, so they follow them to any device.
Firebase's free Spark plan is plenty for a handful of users.

1. **Create the project.** In the [Firebase console](https://console.firebase.google.com/),
   click **Add project** (you can pick an existing Google Cloud project).
2. **Turn on Google sign-in.** Build → **Authentication** → Get started →
   Sign-in method → **Google** → Enable → Save. `localhost` is already an
   authorized domain, so local testing works without extra setup.
3. **Create the database.** Build → **Firestore Database** → Create database →
   start in **production mode** and pick a location near you.
4. **Add the security rules.** Firestore → **Rules** tab → replace everything
   with the contents of [`firestore.rules`](firestore.rules) → **Publish**.
   These allow only invited people, and each person can only read and write
   their own data.
5. **Invite people.** Firestore → **Data** → Start collection `allowedUsers`.
   Add one document per person, with the **Document ID** set to their Google
   email address in lowercase (any field works, e.g. `name`). Add yourself
   first. Anyone not on this list gets a clear "not on the invite list"
   message and nothing is saved.
6. **Connect the app.** Project settings → Your apps → **Web** (`</>`) →
   register an app → copy the `firebaseConfig` values. Copy
   `js/config.example.js` to `js/config.local.js` and paste them in.
   `js/config.local.js` is gitignored, so it never reaches GitHub.
7. **Run it from a local server** (see above) and open the app from that
   address. Google blocks sign-in on files opened directly (`file://`).
   Click **Sign in** in the header.

The first time someone signs in, the app offers to copy what's already saved
in that browser into their account. Signing out switches back to the browser
copy, which is never changed while you're signed in.

If Google says the app is "in testing" or blocks access, open Google Cloud
Console → APIs & Services → **OAuth consent screen** and either add each
person under **Test users** or publish the app (basic sign-in needs no
review).

**About the config values.** Firebase's web config (API key, project ID, and
so on) isn't secret: every visitor's browser needs it to reach your project,
and Firebase's docs say it's safe to expose. Your data is protected by the
security rules and the invite list. Never put an OAuth client secret or a
service-account key in this app.

### Hosting it so your users can reach it (free)

Running it on `localhost` only works on your own PC. To give your users a web
address, use Firebase Hosting (included in the free plan):

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project; creates .firebaserc (gitignored)
firebase deploy           # uploads the site and firestore.rules
```

Your app is then at `https://<your-project-id>.web.app`, which is already an
authorized sign-in domain. Deploy from the folder that has your
`js/config.local.js`, since the hosted site needs it.

## Project structure

```
index.html          Page shell, nav, Tailwind (via CDN) + small custom styles
js/data.js           Built-in food database, recommended meals, constants
js/utils.js          Shared helpers (unit conversion, toasts, formatting)
js/storage.js        Saves to the browser, or to Firestore when signed in
js/recipes.js        Recipe CRUD, macro math, ingredient parsing, editor UI
js/profile.js        Profiles, BMR/TDEE calculation
js/cloud.js          Firebase: Google sign-in, per-user Firestore storage, account UI
js/config.example.js Template for js/config.local.js (gitignored; holds your Firebase config)
firestore.rules      Firestore security rules (invite list + own-data-only)
firebase.json        Firebase Hosting / rules deploy config
js/mealplan.js       Meal Prep Planner: diet/macro/time filters, candidate tiles + detail modal
js/recommended.js    Curated recommended-meals tab
js/share.js          Share codes, backup export/import, folder export, reset
js/app.js            App state, tab router, global event wiring
```

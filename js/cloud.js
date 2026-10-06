// Firebase: Google sign-in (Firebase Authentication) + per-user storage
// (Cloud Firestore). Settings come from js/config.local.js (gitignored).
//
// Firestore layout, one private area per person:
//   users/{uid}                  -> { settings }
//   users/{uid}/recipes/{id}     -> recipe
//   users/{uid}/profiles/{id}    -> profile
//   allowedUsers/{email}         -> invite list, managed in the Firebase console
// firestore.rules enforces "only invited people, and only their own data".

const FIREBASE_VERSION = "10.12.2";
const FIREBASE_BASE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

const Cloud = {
  status: "unconfigured", // unconfigured | needs-server | loading | ready | error
  error: "",
  syncing: false,
  user: null, // { uid, name, email, picture } once signed in AND their data has loaded
  sdk: null,
  // Last-saved JSON per document id, so saves only write what changed.
  synced: { recipes: new Map(), profiles: new Map() },
};

function firebaseConfig() {
  const c = window.APP_CONFIG && window.APP_CONFIG.firebase;
  return c && c.apiKey && c.projectId ? c : null;
}

function isCloudMode() {
  return !!Cloud.user;
}

async function initCloud() {
  // Clean up the key left by the earlier Google-only sign-in.
  try {
    localStorage.removeItem("mpg_google_user_v1");
  } catch (e) {
    // Storage blocked: nothing to clean up.
  }
  const config = firebaseConfig();
  if (!config) {
    Cloud.status = "unconfigured";
    return;
  }
  if (location.protocol === "file:") {
    Cloud.status = "needs-server";
    return;
  }
  Cloud.status = "loading";
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${FIREBASE_BASE_URL}/firebase-app.js`),
      import(`${FIREBASE_BASE_URL}/firebase-auth.js`),
      import(`${FIREBASE_BASE_URL}/firebase-firestore.js`),
    ]);
    const app = appMod.initializeApp(config);
    Cloud.sdk = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    Cloud.status = "ready";
    authMod.onAuthStateChanged(Cloud.sdk.auth, handleAuthChange);
  } catch (e) {
    Cloud.status = "error";
    Cloud.error = "Couldn't load Firebase. Check your internet connection or any ad/tracker blocker.";
  }
  renderApp();
}

function cloudSignIn() {
  if (Cloud.status !== "ready") return;
  const { authMod, auth } = Cloud.sdk;
  // Called straight from the click so the browser allows the popup.
  authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider()).catch((e) => {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
    if (e.code === "auth/popup-blocked") {
      toast("Your browser blocked the sign-in popup. Allow popups for this site and try again.", "error");
    } else if (e.code === "auth/unauthorized-domain") {
      toast(`Sign-in isn't allowed from ${location.hostname}. Add it in Firebase console → Authentication → Settings → Authorized domains.`, "error");
    } else {
      toast("Sign-in failed: " + (e.message || e.code), "error");
    }
  });
}

function cloudSignOut() {
  if (Cloud.sdk) Cloud.sdk.authMod.signOut(Cloud.sdk.auth);
}

async function handleAuthChange(fbUser) {
  if (!fbUser) {
    const wasSignedIn = isCloudMode();
    Cloud.user = null;
    Cloud.syncing = false;
    if (wasSignedIn) {
      applyDataset(loadRecipes(), loadProfiles(), loadSettings());
      toast("Signed out. Showing the data saved in this browser.", "success");
    }
    renderApp();
    return;
  }

  const user = {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email || "Google user",
    email: fbUser.email || "",
    picture: fbUser.photoURL || "",
  };
  Cloud.syncing = true;
  renderApp();
  try {
    let data = await fetchCloudData(user.uid);
    const firstSignIn = data.recipes.length === 0 && data.profiles.length === 0 && !data.settings;
    if (firstSignIn) {
      const local = { recipes: loadRecipes(), profiles: loadProfiles(), settings: loadSettings() };
      const count = local.recipes.length + local.profiles.length;
      if (
        count > 0 &&
        confirm(
          `Your account has no data yet. Copy the ${local.recipes.length} recipe(s) and ${local.profiles.length} profile(s) saved in this browser into your account?\n\nCancel starts your account empty. The browser copy stays either way.`
        )
      ) {
        Cloud.user = user; // writes below go to this account
        await cloudSaveCollection("recipes", local.recipes, true);
        await cloudSaveCollection("profiles", local.profiles, true);
        await cloudSaveSettings(local.settings, true);
        data = local;
      }
    }
    Cloud.user = user;
    applyDataset(data.recipes, data.profiles, data.settings || { activeProfileId: null });
    toast(`Signed in as ${user.name}. Your recipes and profiles now save to your account.`, "success");
  } catch (e) {
    Cloud.user = null;
    if (e.code === "permission-denied") {
      toast(`${user.email || "This account"} isn't on this app's invite list. Ask the owner to add it, then sign in again.`, "error");
    } else {
      toast("Couldn't load your data from Firebase, so you've been signed out to keep it safe: " + (e.message || e.code), "error");
    }
    if (Cloud.sdk) Cloud.sdk.authMod.signOut(Cloud.sdk.auth);
  } finally {
    Cloud.syncing = false;
    renderApp();
  }
}

async function fetchCloudData(uid) {
  const { fsMod, db } = Cloud.sdk;
  const [recipeSnap, profileSnap, userSnap] = await Promise.all([
    fsMod.getDocs(fsMod.collection(db, "users", uid, "recipes")),
    fsMod.getDocs(fsMod.collection(db, "users", uid, "profiles")),
    fsMod.getDoc(fsMod.doc(db, "users", uid)),
  ]);
  const recipes = recipeSnap.docs.map((d) => d.data());
  const profiles = profileSnap.docs.map((d) => d.data());
  Cloud.synced.recipes = new Map(recipes.map((r) => [r.id, JSON.stringify(r)]));
  Cloud.synced.profiles = new Map(profiles.map((p) => [p.id, JSON.stringify(p)]));
  return { recipes, profiles, settings: userSnap.exists() ? userSnap.data().settings || null : null };
}

// Swap the app over to a different set of data (browser copy or account).
function applyDataset(recipes, profiles, settings) {
  AppState.recipes = (recipes || []).map(normalizeRecipe);
  AppState.profiles = profiles || [];
  AppState.settings = settings || { activeProfileId: null };
  AppState.activeProfileId = AppState.settings.activeProfileId || null;
  if (!AppState.profiles.some((p) => p.id === AppState.activeProfileId)) {
    AppState.activeProfileId = AppState.profiles[0] ? AppState.profiles[0].id : null;
  }
  AppState.recipeEditorId = null;
  AppState.expandedIds.clear();
  AppState.planCandidates = [];
  AppState.planMeta = null;
  AppState.openPlanCandidateId = null;
  AppState.shareCodeOutput = null;
}

// Writes only documents that changed since the last save, and deletes ones
// that were removed. `rethrow` lets the first-sign-in copy report failures.
async function cloudSaveCollection(name, items, rethrow) {
  const { fsMod, db } = Cloud.sdk;
  const uid = Cloud.user.uid;
  const cache = Cloud.synced[name];
  const ops = [];
  const ids = new Set();
  for (const item of items) {
    ids.add(item.id);
    const json = JSON.stringify(item); // also drops undefined fields, which Firestore rejects
    if (cache.get(item.id) !== json) ops.push({ id: item.id, json });
  }
  for (const id of cache.keys()) if (!ids.has(id)) ops.push({ id, remove: true });
  if (ops.length === 0) return;
  try {
    // Firestore allows 500 writes per batch.
    for (let i = 0; i < ops.length; i += 450) {
      const batch = fsMod.writeBatch(db);
      for (const op of ops.slice(i, i + 450)) {
        const ref = fsMod.doc(db, "users", uid, name, op.id);
        if (op.remove) batch.delete(ref);
        else batch.set(ref, JSON.parse(op.json));
      }
      await batch.commit();
    }
    for (const op of ops) {
      if (op.remove) cache.delete(op.id);
      else cache.set(op.id, op.json);
    }
  } catch (e) {
    if (rethrow) throw e;
    toast(`Couldn't save your ${name} to your account: ${e.message || e.code}. Your changes are still on screen; try again.`, "error");
  }
}

async function cloudSaveSettings(settings, rethrow) {
  const { fsMod, db } = Cloud.sdk;
  try {
    await fsMod.setDoc(fsMod.doc(db, "users", Cloud.user.uid), { settings: JSON.parse(JSON.stringify(settings)) });
  } catch (e) {
    if (rethrow) throw e;
    toast("Couldn't save your settings to your account: " + (e.message || e.code), "error");
  }
}

async function cloudDeleteAll() {
  await cloudSaveCollection("recipes", [], true);
  await cloudSaveCollection("profiles", [], true);
  const { fsMod, db } = Cloud.sdk;
  const batch = fsMod.writeBatch(db);
  batch.delete(fsMod.doc(db, "users", Cloud.user.uid));
  await batch.commit();
}

function userInitial(user) {
  return escapeHtml((user.name || user.email || "?").trim().charAt(0).toUpperCase());
}

function renderAvatar(user, size) {
  return user.picture
    ? `<img src="${escapeHtml(user.picture)}" alt="" referrerpolicy="no-referrer" class="${size} rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800">`
    : `<span class="${size} rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">${userInitial(user)}</span>`;
}

// Small account control in the header.
function renderAccountSlot() {
  const slot = document.getElementById("account-slot");
  if (!slot) return;
  if (Cloud.user) {
    slot.innerHTML = `<button data-action="switch-tab" data-tab="profile" title="Signed in as ${escapeHtml(Cloud.user.email || Cloud.user.name)}. Your data saves to your account."
      class="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-indigo-300 transition">
      ${renderAvatar(Cloud.user, "w-7 h-7 text-xs")}
      <span class="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[8rem] truncate">${escapeHtml(Cloud.user.name.split(" ")[0])}</span>
    </button>`;
  } else if (Cloud.syncing) {
    slot.innerHTML = `<span class="text-xs text-slate-500 dark:text-slate-400">Loading your data…</span>`;
  } else if (Cloud.status === "ready") {
    slot.innerHTML = `<button data-action="cloud-signin" class="btn-secondary text-xs px-3 py-1.5">Sign in</button>`;
  } else {
    slot.innerHTML = "";
  }
}

// Account panel at the top of the Profile tab.
function renderAccountBox() {
  const code = (t) => `<code class="px-1 rounded bg-slate-200 dark:bg-slate-700">${t}</code>`;
  const box = (body) =>
    `<div class="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 text-sm text-slate-600 dark:text-slate-300">${body}</div>`;
  if (Cloud.user) {
    return `
    <div class="panel p-4 mb-5 flex flex-wrap items-center gap-4">
      ${renderAvatar(Cloud.user, "w-12 h-12 text-lg")}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(Cloud.user.name)}</div>
        <div class="text-sm text-slate-500 dark:text-slate-400 truncate">${escapeHtml(Cloud.user.email)}</div>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Your recipes and profiles save to your account, so they follow you to any device you sign in on. Only you can see them.</p>
      </div>
      <button data-action="cloud-signout" class="btn-secondary text-sm">Sign out</button>
    </div>`;
  }
  if (Cloud.syncing) return box("Loading your data from your account…");
  switch (Cloud.status) {
    case "ready":
      return `
      <div class="panel p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-semibold text-slate-800 dark:text-slate-100">Sign in to save to your account</div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Your recipes and profiles will follow you to any device. Until then, everything is saved in this browser only.</p>
        </div>
        <button data-action="cloud-signin" class="btn-primary text-sm">Sign in with Google</button>
      </div>`;
    case "loading":
      return box("Connecting to Firebase…");
    case "needs-server":
      return box(`<strong>Sign-in needs the app running on a local server.</strong> Google blocks sign-in on files opened directly.
        In the app folder, run ${code("npx serve .")} or ${code("python -m http.server 8000")}, then open the address it prints.`);
    case "error":
      return box(`<strong>Sign-in isn't available right now.</strong> ${escapeHtml(Cloud.error)} Your data is still saved in this browser.`);
    default:
      return box(`<strong>Account sync isn't set up on this copy.</strong> Everything is saved in this browser.
        To turn it on, follow "Setting up Firebase" in the README.`);
  }
}

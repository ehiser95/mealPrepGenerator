// Where the app's data lives:
//  - Signed out (or Firebase not set up): this browser's localStorage.
//  - Signed in with Firebase: Firestore, under your account (see cloud.js).
// The load* functions always read the browser copy; the save* functions
// write to whichever copy is active, so the rest of the app doesn't care.
const STORAGE_KEYS = {
  RECIPES: "mpg_recipes_v1",
  PROFILES: "mpg_profiles_v1",
  SETTINGS: "mpg_settings_v1",
};

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Couldn't read " + key + " from this browser", e);
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    toast("Couldn't save in this browser (storage may be full or blocked). Download a backup from Share & Backup.", "error");
  }
}

function loadRecipes() {
  return readLocal(STORAGE_KEYS.RECIPES, []);
}

function loadProfiles() {
  return readLocal(STORAGE_KEYS.PROFILES, []);
}

function loadSettings() {
  return readLocal(STORAGE_KEYS.SETTINGS, { activeProfileId: null });
}

function saveRecipes(recipes) {
  if (isCloudMode()) return cloudSaveCollection("recipes", recipes);
  writeLocal(STORAGE_KEYS.RECIPES, recipes);
}

function saveProfiles(profiles) {
  if (isCloudMode()) return cloudSaveCollection("profiles", profiles);
  writeLocal(STORAGE_KEYS.PROFILES, profiles);
}

function saveSettings(settings) {
  AppState.settings = settings;
  if (isCloudMode()) return cloudSaveSettings(settings);
  writeLocal(STORAGE_KEYS.SETTINGS, settings);
}

function resetLocalData() {
  Object.values(STORAGE_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      // Storage blocked: nothing to clear.
    }
  });
}

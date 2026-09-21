// Everything the app persists lives in localStorage under these keys.
// All data stays on this device/browser only — nothing is ever sent anywhere.
const STORAGE_KEYS = {
  RECIPES: "mpg_recipes_v1",
  PROFILES: "mpg_profiles_v1",
  SETTINGS: "mpg_settings_v1",
};

function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECIPES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load recipes", e);
    return [];
  }
}

function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load profiles", e);
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : { activeProfileId: null };
  } catch (e) {
    console.error("Failed to load settings", e);
    return { activeProfileId: null };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function resetAllData() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

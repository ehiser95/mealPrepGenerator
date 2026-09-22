// Local, on-device profiles + BMR/TDEE calculation.
// There is no real authentication here — see renderGoogleInfoBox() for why,
// and treat "private" as meaning "stored only in this browser", not secured.

function blankProfile() {
  return {
    id: uid(),
    name: "New Profile",
    sex: "female",
    age: 30,
    heightCm: 170,
    heightUnit: "cm",
    weightKg: 70,
    weightUnit: "kg",
    activityLevel: "moderate",
    goal: "maintain",
    goalRateKcal: 500,
  };
}

function cmToDisplay(cm, unit) {
  return unit === "in" ? cm / 2.54 : cm;
}
function displayToCm(value, unit) {
  return unit === "in" ? value * 2.54 : value;
}
function kgToDisplay(kg, unit) {
  return unit === "lb" ? kg * 2.20462 : kg;
}
function displayToKg(value, unit) {
  return unit === "lb" ? value / 2.20462 : value;
}

function computeBMR(profile) {
  const sexOffset = profile.sex === "male" ? 5 : -161;
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
}

function computeTDEE(profile) {
  const mult = (ACTIVITY_LEVELS[profile.activityLevel] || ACTIVITY_LEVELS.moderate).mult;
  return computeBMR(profile) * mult;
}

function computeGoalCalories(profile) {
  const tdee = computeTDEE(profile);
  if (profile.goal === "lose") return tdee - (Number(profile.goalRateKcal) || 500);
  if (profile.goal === "gain") return tdee + (Number(profile.goalRateKcal) || 500);
  return tdee;
}

function getActiveProfile() {
  return AppState.profiles.find((p) => p.id === AppState.activeProfileId) || null;
}

function startNewProfile() {
  const p = blankProfile();
  AppState.profiles.push(p);
  AppState.activeProfileId = p.id;
  saveProfiles(AppState.profiles);
  saveSettings({ ...AppState.settings, activeProfileId: p.id });
  toast("New profile created", "success");
  renderApp();
}

function confirmDeleteProfile(id) {
  const p = AppState.profiles.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Delete profile "${p.name}"?`)) return;
  AppState.profiles = AppState.profiles.filter((x) => x.id !== id);
  if (AppState.activeProfileId === id) {
    AppState.activeProfileId = AppState.profiles[0]?.id || null;
  }
  saveProfiles(AppState.profiles);
  saveSettings({ ...AppState.settings, activeProfileId: AppState.activeProfileId });
  toast("Profile deleted", "success");
  renderApp();
}

function saveProfileFromForm() {
  const p = getActiveProfile();
  if (!p) return;
  p.name = document.getElementById("profile-name")?.value.trim() || "Profile";
  p.sex = document.getElementById("profile-sex")?.value || "female";
  p.age = parseFloat(document.getElementById("profile-age")?.value) || 30;
  p.heightUnit = document.getElementById("profile-height-unit")?.value || "cm";
  const heightVal = parseFloat(document.getElementById("profile-height")?.value) || 170;
  p.heightCm = displayToCm(heightVal, p.heightUnit);
  p.weightUnit = document.getElementById("profile-weight-unit")?.value || "kg";
  const weightVal = parseFloat(document.getElementById("profile-weight")?.value) || 70;
  p.weightKg = displayToKg(weightVal, p.weightUnit);
  p.activityLevel = document.getElementById("profile-activity")?.value || "moderate";
  p.goal = document.getElementById("profile-goal")?.value || "maintain";
  p.goalRateKcal = parseFloat(document.getElementById("profile-goal-rate")?.value) || 500;

  saveProfiles(AppState.profiles);
  toast("Profile saved", "success");
  renderApp();
}

function useGoalAsTarget() {
  const p = getActiveProfile();
  if (!p) return;
  const goalCal = computeGoalCalories(p);
  // The planner targets a single lunch or dinner, not the whole day, so we
  // suggest roughly a third of the daily goal as a starting point.
  AppState.plannerCalPerPortion = Math.round(goalCal / 3);
  AppState.activeTab = "planner";
  toast(`Set meal prep target to ~${AppState.plannerCalPerPortion} cal/portion (about 1/3 of your ${Math.round(goalCal)} cal/day goal) — adjust as needed`, "success");
  renderApp();
}

function showGoogleSigninInfo() {
  toast(
    "Google Sign-In needs an OAuth client registered in Google Cloud Console plus a real backend/domain — that can't be spun up inside a static local file. This app uses local on-device profiles instead: your data never leaves this browser.",
    "info"
  );
}

function renderProfileTab() {
  const profiles = AppState.profiles;
  const active = getActiveProfile();

  const switcher = `
    <div class="flex items-center gap-2 mb-5">
      <select id="profile-switcher" class="border rounded-lg px-3 py-2 text-sm flex-1">
        ${profiles.length === 0 ? `<option>No profiles yet</option>` : profiles.map((p) => `<option value="${p.id}" ${p.id === AppState.activeProfileId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
      </select>
      <button data-action="new-profile" class="btn-secondary text-sm whitespace-nowrap">+ New Profile</button>
      ${active ? `<button data-action="delete-profile" data-id="${active.id}" class="icon-btn" title="Delete profile">🗑️</button>` : ""}
    </div>
  `;

  const googleBox = `
    <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5 text-sm text-amber-800 dark:text-amber-300">
      <div class="flex items-center justify-between gap-3">
        <div>
          <strong>Sign in with Google</strong> — not available in a static local file.
          <p class="text-xs mt-1 text-amber-700 dark:text-amber-300">Real Google OAuth needs a registered client ID and a hosted domain/backend.
          Profiles below are private in the sense that they live only in this browser's local storage — nobody else can
          see them, but they also aren't password-protected.</p>
        </div>
        <button data-action="google-signin" class="btn-secondary text-xs whitespace-nowrap bg-white dark:bg-slate-800">Why not?</button>
      </div>
    </div>
  `;

  if (!active) {
    return `<h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Profile</h2>${switcher}${googleBox}
      <div class="empty-state"><p class="text-lg font-medium text-slate-600 dark:text-slate-300">No profile yet</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Create one to get personalized calorie targets.</p></div>`;
  }

  const bmr = computeBMR(active);
  const tdee = computeTDEE(active);
  const goalCal = computeGoalCalories(active);
  const heightDisplay = cmToDisplay(active.heightCm, active.heightUnit);
  const weightDisplay = kgToDisplay(active.weightKg, active.weightUnit);

  return `
    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Profile</h2>
    ${switcher}
    ${googleBox}
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
      <div class="grid sm:grid-cols-2 gap-3">
        <label class="field-label">Name
          <input type="text" id="profile-name" value="${escapeHtml(active.name)}" class="field-input">
        </label>
        <label class="field-label">Sex (for BMR formula)
          <select id="profile-sex" class="field-input">
            <option value="female" ${active.sex === "female" ? "selected" : ""}>Female</option>
            <option value="male" ${active.sex === "male" ? "selected" : ""}>Male</option>
          </select>
        </label>
        <label class="field-label">Age
          <input type="number" id="profile-age" min="10" max="100" value="${active.age}" class="field-input">
        </label>
        <label class="field-label">Activity level
          <select id="profile-activity" class="field-input">
            ${Object.entries(ACTIVITY_LEVELS).map(([k, v]) => `<option value="${k}" ${active.activityLevel === k ? "selected" : ""}>${v.label}</option>`).join("")}
          </select>
        </label>
        <label class="field-label">Height
          <div class="flex gap-2">
            <input type="number" id="profile-height" step="0.1" value="${formatNum(heightDisplay, 1)}" class="field-input flex-1">
            <select id="profile-height-unit" class="border rounded-lg px-2 text-sm">
              <option value="cm" ${active.heightUnit === "cm" ? "selected" : ""}>cm</option>
              <option value="in" ${active.heightUnit === "in" ? "selected" : ""}>in</option>
            </select>
          </div>
        </label>
        <label class="field-label">Weight
          <div class="flex gap-2">
            <input type="number" id="profile-weight" step="0.1" value="${formatNum(weightDisplay, 1)}" class="field-input flex-1">
            <select id="profile-weight-unit" class="border rounded-lg px-2 text-sm">
              <option value="kg" ${active.weightUnit === "kg" ? "selected" : ""}>kg</option>
              <option value="lb" ${active.weightUnit === "lb" ? "selected" : ""}>lb</option>
            </select>
          </div>
        </label>
        <label class="field-label">Goal
          <select id="profile-goal" class="field-input">
            <option value="lose" ${active.goal === "lose" ? "selected" : ""}>Lose weight</option>
            <option value="maintain" ${active.goal === "maintain" ? "selected" : ""}>Maintain weight</option>
            <option value="gain" ${active.goal === "gain" ? "selected" : ""}>Gain weight</option>
          </select>
        </label>
        <label class="field-label">Daily deficit/surplus (cal)
          <input type="number" id="profile-goal-rate" min="0" step="50" value="${active.goalRateKcal}" class="field-input">
        </label>
      </div>
      <button data-action="save-profile" class="btn-primary mt-4">Save Profile</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h3 class="font-semibold text-slate-700 dark:text-slate-300 mb-3">Estimated Energy Needs</h3>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="macro-tile bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"><div class="text-xl font-bold">${formatNum(bmr, 0)}</div><div class="text-xs uppercase tracking-wide">BMR</div></div>
        <div class="macro-tile bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"><div class="text-xl font-bold">${formatNum(tdee, 0)}</div><div class="text-xs uppercase tracking-wide">Maintenance (TDEE)</div></div>
        <div class="macro-tile bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"><div class="text-xl font-bold">${formatNum(goalCal, 0)}</div><div class="text-xs uppercase tracking-wide">Goal calories/day</div></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-3">Mifflin-St Jeor estimate — a starting point, not medical advice.</p>
      <button data-action="use-goal-as-target" class="btn-secondary text-sm mt-3">Use as Meal Plan Target →</button>
    </div>
  `;
}

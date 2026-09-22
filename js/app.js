// App state, tab router, and global event delegation.

const AppState = {
  activeTab: "recipes",
  recipes: [],
  profiles: [],
  activeProfileId: null,
  settings: {},

  recipeEditorId: null, // null | "new" | <id>
  editorDraft: null,
  cardScales: {}, // recipeId -> scale multiplier
  expandedIds: new Set(), // recipeId set, scale panel open

  plannerMealType: "Lunch",
  plannerPortions: 5,
  plannerCalPerPortion: 500,
  plannerMaxPrepMin: 0,
  plannerMaxCookMin: 0,
  planLast: null,

  shareCodeOutput: null,
  shareCodeRecipeName: "",
};

const TAB_LABELS = {
  recipes: "Recipes",
  planner: "Meal Planner",
  profile: "Profile",
  recommended: "Recommended",
  share: "Share & Backup",
};

const TAB_RENDERERS = {
  recipes: renderRecipesTab,
  planner: renderPlannerTab,
  profile: renderProfileTab,
  recommended: renderRecommendedTab,
  share: renderShareTab,
};

function renderNav() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;
  nav.innerHTML = Object.keys(TAB_LABELS)
    .map(
      (tab) =>
        `<button data-action="switch-tab" data-tab="${tab}" class="nav-btn ${AppState.activeTab === tab ? "nav-btn-active" : ""}">${TAB_LABELS[tab]}</button>`
    )
    .join("");
}

function populateFoodDatalist() {
  const dl = document.getElementById("food-datalist");
  if (!dl) return;
  dl.innerHTML = Object.keys(FOOD_DB)
    .map((k) => `<option value="${escapeHtml(k)}"></option>`)
    .join("");
}

function renderApp() {
  renderNav();
  const root = document.getElementById("app-root");
  root.innerHTML = TAB_RENDERERS[AppState.activeTab]();
  updateEditorTotalsDisplay();
}

function switchTab(tab) {
  if (!TAB_RENDERERS[tab]) return;
  AppState.activeTab = tab;
  AppState.recipeEditorId = null;
  renderApp();
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    case "switch-tab":
      switchTab(btn.dataset.tab);
      break;
    case "new-recipe":
      startNewRecipe();
      break;
    case "edit-recipe":
      startEditRecipe(id);
      break;
    case "delete-recipe":
      confirmDeleteRecipe(id);
      break;
    case "cancel-recipe-edit":
      AppState.recipeEditorId = null;
      renderApp();
      break;
    case "save-recipe":
      saveRecipeFromForm();
      break;
    case "add-ingredient-row":
      addIngredientRow();
      break;
    case "remove-ingredient-row":
      removeIngredientRow(id);
      break;
    case "add-step-row":
      addStepRow();
      break;
    case "remove-step-row":
      removeStepRow(id);
      break;
    case "toggle-scale":
      toggleScale(id);
      break;
    case "scale-quick":
      setCardScale(id, Number(btn.dataset.value));
      break;
    case "share-recipe":
      showShareCode(id);
      break;
    case "fetch-recipe-url":
      await tryFetchRecipeUrl();
      break;
    case "parse-pasted-text":
      parsePastedText();
      break;
    case "google-signin":
      showGoogleSigninInfo();
      break;
    case "new-profile":
      startNewProfile();
      break;
    case "save-profile":
      saveProfileFromForm();
      break;
    case "delete-profile":
      confirmDeleteProfile(id);
      break;
    case "use-goal-as-target":
      useGoalAsTarget();
      break;
    case "generate-plan":
      onGeneratePlan();
      break;
    case "copy-share-code":
      await copyShareCodeToClipboard();
      break;
    case "import-share-code":
      importShareCodeFromInput();
      break;
    case "add-recommended":
      addRecommendedToLibrary(id);
      break;
    case "export-all":
      exportAllData();
      break;
    case "export-folder":
      await exportRecipesToFolder();
      break;
    case "reset-all":
      handleResetAll();
      break;
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches("[data-ing-field]")) handleIngredientFieldInput(el);
  if (el.matches("[data-step-field]")) handleStepFieldInput(el);
  if (el.matches("[data-scale-live]")) handleScaleLiveInput(el);
  if (el.matches("[data-planner-field]")) handlePlannerFieldInput(el);
  if (el.matches('[data-planner-live="portions"]')) handlePlannerPortionsInput(el);
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.matches("[data-ing-select]")) handleIngredientFieldInput(el);
  if (el.matches("[data-planner-field]")) handlePlannerFieldInput(el);
  if (el.matches('[data-planner-live="portions"]')) handlePlannerPortionsInput(el);
  if (el.id === "import-file-input") importAllDataFile(el.files[0]);
  if (el.id === "profile-switcher") {
    AppState.activeProfileId = el.value;
    saveSettings({ ...AppState.settings, activeProfileId: el.value });
    renderApp();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  AppState.recipes = loadRecipes().map(normalizeRecipe);
  AppState.profiles = loadProfiles();
  AppState.settings = loadSettings();
  AppState.activeProfileId =
    AppState.settings.activeProfileId || (AppState.profiles[0] && AppState.profiles[0].id) || null;
  populateFoodDatalist();
  renderApp();
});

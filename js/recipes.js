// Recipe data model, macro math, ingredient parsing, and the Recipes tab UI.

function blankIngredient() {
  return { id: uid(), name: "", amount: 100, unit: "g", cal: 0, protein: 0, carbs: 0, fat: 0 };
}

function blankRecipeDraft() {
  return {
    id: null,
    name: "",
    category: "Dinner",
    servings: 4,
    sourceUrl: "",
    prepTimeMin: 15,
    cookTimeMin: 20,
    steps: [{ id: uid(), text: "" }],
    ingredients: [blankIngredient()],
  };
}

// Migrates older saved recipes (plain `instructions` string, no time fields)
// to the current shape so old localStorage/backup/share data doesn't break.
function normalizeRecipe(r) {
  const steps = Array.isArray(r.steps)
    ? r.steps.map((s) => (typeof s === "string" ? { id: uid(), text: s } : { id: s.id || uid(), text: s.text || "" }))
    : r.instructions
    ? String(r.instructions)
        .split(/\n+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ id: uid(), text }))
    : [];
  return {
    id: r.id || uid(),
    name: r.name || "",
    category: r.category || "Other",
    servings: Number(r.servings) || 1,
    sourceUrl: r.sourceUrl || "",
    prepTimeMin: r.prepTimeMin != null ? Number(r.prepTimeMin) || 0 : 0,
    cookTimeMin: r.cookTimeMin != null ? Number(r.cookTimeMin) || 0 : 0,
    steps,
    ingredients: Array.isArray(r.ingredients) && r.ingredients.length ? r.ingredients : [blankIngredient()],
  };
}

function computeIngredientMacros(ing) {
  const grams = toGrams(ing.amount, ing.unit);
  const factor = grams / 100;
  return {
    cal: (Number(ing.cal) || 0) * factor,
    protein: (Number(ing.protein) || 0) * factor,
    carbs: (Number(ing.carbs) || 0) * factor,
    fat: (Number(ing.fat) || 0) * factor,
  };
}

function computeRecipeTotals(recipe) {
  return recipe.ingredients.reduce(
    (acc, ing) => {
      const m = computeIngredientMacros(ing);
      acc.cal += m.cal;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
      return acc;
    },
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function computePerServing(recipe) {
  const totals = computeRecipeTotals(recipe);
  const servings = Math.max(Number(recipe.servings) || 1, 0.01);
  return {
    cal: totals.cal / servings,
    protein: totals.protein / servings,
    carbs: totals.carbs / servings,
    fat: totals.fat / servings,
  };
}

// Best-effort parser: pulls "amount unit name" lines out of pasted text.
// Only lines with an explicit weight unit (g/kg/oz/lb) are recognized —
// cup/tbsp measures aren't weight-convertible, so those need manual entry.
function parseIngredientsFromText(text) {
  const unitWords = {
    g: "g", gram: "g", grams: "g",
    kg: "kg", kilogram: "kg", kilograms: "kg",
    oz: "oz", ounce: "oz", ounces: "oz",
    lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  };
  const re = /^[-*•\d.)\s]*?(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(g|gram|grams|kg|kilograms?|oz|ounces?|lb|lbs|pounds?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s,'-]{2,60})$/i;
  const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    let amountStr = m[1].trim();
    let amount;
    if (amountStr.includes("/")) {
      const [a, b] = amountStr.split("/").map((s) => parseFloat(s.trim()));
      amount = b ? a / b : a;
    } else {
      amount = parseFloat(amountStr.replace(",", "."));
    }
    if (!isFinite(amount) || amount <= 0) continue;
    const unit = unitWords[m[2].toLowerCase()] || "g";
    let name = m[3].trim().toLowerCase().replace(/[.,;:]+$/, "");
    if (!name || name.length < 2) continue;
    const dbMatch = FOOD_DB[name];
    results.push({
      id: uid(),
      name,
      amount,
      unit,
      cal: dbMatch ? dbMatch.cal : 0,
      protein: dbMatch ? dbMatch.protein : 0,
      carbs: dbMatch ? dbMatch.carbs : 0,
      fat: dbMatch ? dbMatch.fat : 0,
    });
    if (results.length >= 25) break;
  }
  return results;
}

// Best-effort parser: pulls numbered/bulleted lines out of pasted text as
// cooking steps, skipping anything that already looks like an ingredient line.
function parseStepsFromText(text) {
  const ingredientLikeRe = /^[-*•\d.)\s]*?\d+(?:[.,]\d+)?\s*(g|gram|grams|kg|kilograms?|oz|ounces?|lb|lbs|pounds?)\s+/i;
  const stepLeadRe = /^(?:\d+[.)]|step\s*\d+[:.)]?|[-*•])\s*(.{8,300})$/i;
  const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    if (ingredientLikeRe.test(line)) continue;
    const m = line.match(stepLeadRe);
    if (m) results.push(m[1].trim());
    if (results.length >= 20) break;
  }
  return results;
}

// ---------- Recipes tab ----------

function renderRecipesTab() {
  if (AppState.recipeEditorId !== null) return renderRecipeEditor();

  const recipes = AppState.recipes;
  const cards = recipes.map(renderRecipeCard).join("");

  return `
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">My Recipes</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">${recipes.length} saved recipe${recipes.length === 1 ? "" : "s"}</p>
      </div>
      <button data-action="new-recipe" class="btn-primary">+ New Recipe</button>
    </div>
    ${recipes.length === 0
      ? `<div class="empty-state">
           <p class="text-lg font-medium text-slate-600 dark:text-slate-300">No recipes yet</p>
           <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Add your own recipe, or check the Recommended tab for starter ideas.</p>
         </div>`
      : `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`}
  `;
}

function renderRecipeCard(r) {
  const per = computePerServing(r);
  const scale = AppState.cardScales[r.id] || 1;
  const expanded = AppState.expandedIds.has(r.id);
  return `
  <div class="card-anim bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4" data-id="${r.id}">
    <div class="flex justify-between items-start gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold text-lg text-slate-800 dark:text-slate-100 truncate">${escapeHtml(r.name)}</h3>
        <span class="badge">${escapeHtml(r.category)}</span>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">⏱ ${formatNum(r.prepTimeMin, 0)}m prep · ${formatNum(r.cookTimeMin, 0)}m cook · ${formatNum((Number(r.prepTimeMin) || 0) + (Number(r.cookTimeMin) || 0), 0)}m total</div>
        ${r.sourceUrl ? `<a href="${escapeHtml(r.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline block mt-1 truncate">Source link ↗</a>` : ""}
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(r.name + " recipe")}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline block truncate">Search YouTube ↗</a>
      </div>
      <div class="flex gap-1 shrink-0">
        <button data-action="edit-recipe" data-id="${r.id}" title="Edit" class="icon-btn">✏️</button>
        <button data-action="delete-recipe" data-id="${r.id}" title="Delete" class="icon-btn">🗑️</button>
      </div>
    </div>
    <div class="grid grid-cols-4 gap-2 text-center my-3">
      <div class="macro-tile bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"><div class="font-bold">${formatNum(per.cal, 0)}</div><div class="text-[10px] uppercase tracking-wide">cal</div></div>
      <div class="macro-tile bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"><div class="font-bold">${formatNum(per.protein, 0)}g</div><div class="text-[10px] uppercase tracking-wide">protein</div></div>
      <div class="macro-tile bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><div class="font-bold">${formatNum(per.carbs, 0)}g</div><div class="text-[10px] uppercase tracking-wide">carbs</div></div>
      <div class="macro-tile bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300"><div class="font-bold">${formatNum(per.fat, 0)}g</div><div class="text-[10px] uppercase tracking-wide">fat</div></div>
    </div>
    <div class="text-xs text-slate-500 dark:text-slate-400 mb-3">per serving · ${formatNum(r.servings, 1)} servings total</div>
    <div class="flex items-center gap-2">
      <button data-action="toggle-scale" data-id="${r.id}" class="btn-secondary text-xs flex-1">${expanded ? "Hide Scaling" : "Scale Batch"}</button>
      <button data-action="share-recipe" data-id="${r.id}" class="btn-secondary text-xs flex-1">Share</button>
    </div>
    ${expanded ? renderScalePanel(r, scale) : ""}
  </div>`;
}

function renderScalePanel(r, scale) {
  const scaledServings = (Number(r.servings) || 1) * scale;
  return `
  <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 scale-panel">
    <div class="flex items-center gap-3">
      <input type="range" min="0.25" max="5" step="0.25" value="${scale}"
        data-scale-live="slider" data-id="${r.id}" class="flex-1 accent-indigo-600">
      <input type="number" min="0.25" max="20" step="0.25" value="${scale}"
        data-scale-live="number" data-id="${r.id}" class="w-20 border rounded-lg px-2 py-1 text-sm">
    </div>
    <div class="flex gap-2 mt-2">
      ${[1, 2, 3].map((x) => `<button data-action="scale-quick" data-id="${r.id}" data-value="${x}" class="btn-chip">${x}x</button>`).join("")}
    </div>
    <p class="text-sm mt-2">Batch makes <strong>${formatNum(scaledServings, 1)}</strong> servings</p>
    <ol class="text-sm mt-1 list-decimal list-inside text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto">
      ${r.ingredients.map((ing) => `<li>${formatNum(ing.amount * scale, 2)} ${escapeHtml(ing.unit)} ${escapeHtml(ing.name)}</li>`).join("")}
    </ol>
    <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-3 mb-1">Steps</h4>
    <ol class="text-sm list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-0.5">
      ${r.steps && r.steps.length ? r.steps.map((s) => `<li>${escapeHtml(s.text)}</li>`).join("") : `<li class="text-slate-400 dark:text-slate-500 list-none -ml-5">No steps added yet.</li>`}
    </ol>
  </div>`;
}

function toggleScale(id) {
  if (AppState.expandedIds.has(id)) AppState.expandedIds.delete(id);
  else AppState.expandedIds.add(id);
  renderApp();
}

function setCardScale(id, value) {
  AppState.cardScales[id] = clamp(value, 0.25, 20);
  renderApp();
}

function handleScaleLiveInput(el) {
  const id = el.dataset.id;
  const value = clamp(parseFloat(el.value) || 1, 0.25, 20);
  AppState.cardScales[id] = value;
  const card = document.querySelector(`.card-anim[data-id="${id}"]`);
  if (!card) return;
  const panel = card.querySelector(".scale-panel");
  if (panel) panel.outerHTML = renderScalePanel(AppState.recipes.find((r) => r.id === id), value);
  // keep the two inputs (slider/number) in sync without a full re-render
  card.querySelectorAll('[data-scale-live]').forEach((input) => {
    if (input !== el) input.value = value;
  });
}

function confirmDeleteRecipe(id) {
  const recipe = AppState.recipes.find((r) => r.id === id);
  if (!recipe) return;
  if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return;
  AppState.recipes = AppState.recipes.filter((r) => r.id !== id);
  saveRecipes(AppState.recipes);
  toast("Recipe deleted", "success");
  renderApp();
}

// ---------- Recipe editor ----------

function startNewRecipe() {
  AppState.editorDraft = blankRecipeDraft();
  AppState.recipeEditorId = "new";
  renderApp();
}

function startEditRecipe(id) {
  const recipe = AppState.recipes.find((r) => r.id === id);
  if (!recipe) return;
  AppState.editorDraft = normalizeRecipe(JSON.parse(JSON.stringify(recipe)));
  AppState.recipeEditorId = id;
  renderApp();
}

function addIngredientRow() {
  readEditorFormIntoDraft();
  AppState.editorDraft.ingredients.push(blankIngredient());
  renderApp();
}

function removeIngredientRow(id) {
  readEditorFormIntoDraft();
  AppState.editorDraft.ingredients = AppState.editorDraft.ingredients.filter((i) => i.id !== id);
  if (AppState.editorDraft.ingredients.length === 0) AppState.editorDraft.ingredients.push(blankIngredient());
  renderApp();
}

function addStepRow() {
  readEditorFormIntoDraft();
  AppState.editorDraft.steps.push({ id: uid(), text: "" });
  renderApp();
}

function removeStepRow(id) {
  readEditorFormIntoDraft();
  AppState.editorDraft.steps = AppState.editorDraft.steps.filter((s) => s.id !== id);
  renderApp();
}

function handleStepFieldInput(el) {
  const id = el.dataset.id;
  const step = AppState.editorDraft.steps.find((s) => s.id === id);
  if (!step) return;
  step.text = el.value;
}

function handleIngredientFieldInput(el) {
  const id = el.dataset.id;
  const field = el.dataset.ingField || el.dataset.ingSelect;
  const ing = AppState.editorDraft.ingredients.find((i) => i.id === id);
  if (!ing) return;

  if (field === "name") {
    ing.name = el.value;
    const match = FOOD_DB[el.value.trim().toLowerCase()];
    if (match) {
      ing.cal = match.cal;
      ing.protein = match.protein;
      ing.carbs = match.carbs;
      ing.fat = match.fat;
      const row = el.closest("[data-ing-row]");
      if (row) {
        row.querySelector('[data-ing-field="cal"]').value = match.cal;
        row.querySelector('[data-ing-field="protein"]').value = match.protein;
        row.querySelector('[data-ing-field="carbs"]').value = match.carbs;
        row.querySelector('[data-ing-field="fat"]').value = match.fat;
        row.classList.add("autofill-flash");
        setTimeout(() => row.classList.remove("autofill-flash"), 700);
      }
    }
  } else if (field === "unit") {
    ing.unit = el.value;
  } else {
    ing[field] = parseFloat(el.value) || 0;
  }
  updateEditorTotalsDisplay();
}

function updateEditorTotalsDisplay() {
  const el = document.getElementById("editor-totals");
  if (!el) return;
  const totals = computeRecipeTotals(AppState.editorDraft);
  const servings = Math.max(Number(document.getElementById("recipe-servings")?.value) || 1, 0.01);
  el.innerHTML = `
    Recipe total: <strong>${formatNum(totals.cal, 0)}</strong> cal ·
    ${formatNum(totals.protein, 0)}g protein ·
    ${formatNum(totals.carbs, 0)}g carbs ·
    ${formatNum(totals.fat, 0)}g fat
    &nbsp;→&nbsp; per serving: <strong>${formatNum(totals.cal / servings, 0)}</strong> cal
  `;
}

function renderIngredientRow(ing) {
  return `
  <div class="ingredient-row grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-100 dark:border-slate-700" data-ing-row data-id="${ing.id}">
    <input type="text" list="food-datalist" placeholder="Ingredient name" value="${escapeHtml(ing.name)}"
      data-ing-field="name" data-id="${ing.id}" class="col-span-3 border rounded-lg px-2 py-1.5 text-sm">
    <input type="number" min="0" step="any" value="${ing.amount}" placeholder="Amt"
      data-ing-field="amount" data-id="${ing.id}" class="col-span-2 border rounded-lg px-2 py-1.5 text-sm">
    <select data-ing-select="unit" data-id="${ing.id}" class="col-span-1 border rounded-lg px-1 py-1.5 text-sm">
      ${Object.keys(UNIT_TO_GRAMS).map((u) => `<option value="${u}" ${ing.unit === u ? "selected" : ""}>${u}</option>`).join("")}
    </select>
    <input type="number" min="0" step="any" value="${ing.cal}" title="Calories per 100g"
      data-ing-field="cal" data-id="${ing.id}" class="col-span-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="cal/100g">
    <input type="number" min="0" step="any" value="${ing.protein}" title="Protein per 100g"
      data-ing-field="protein" data-id="${ing.id}" class="col-span-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="P">
    <input type="number" min="0" step="any" value="${ing.carbs}" title="Carbs per 100g"
      data-ing-field="carbs" data-id="${ing.id}" class="col-span-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="C">
    <input type="number" min="0" step="any" value="${ing.fat}" title="Fat per 100g"
      data-ing-field="fat" data-id="${ing.id}" class="col-span-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="F">
    <button data-action="remove-ingredient-row" data-id="${ing.id}" class="col-span-2 icon-btn justify-self-end" title="Remove">🗑️</button>
  </div>`;
}

function renderStepRow(step, index) {
  return `
  <div class="flex items-center gap-2 py-1.5" data-step-row data-id="${step.id}">
    <span class="w-6 text-sm text-slate-400 dark:text-slate-500 font-medium text-right">${index + 1}.</span>
    <input type="text" placeholder="e.g. Preheat oven to 400°F" value="${escapeHtml(step.text)}"
      data-step-field="text" data-id="${step.id}" class="flex-1 border rounded-lg px-3 py-1.5 text-sm">
    <button data-action="remove-step-row" data-id="${step.id}" class="icon-btn" title="Remove step">🗑️</button>
  </div>`;
}

function renderRecipeEditor() {
  const d = AppState.editorDraft;
  const isNew = AppState.recipeEditorId === "new";
  return `
  <div class="flex items-center justify-between mb-5">
    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">${isNew ? "New Recipe" : "Edit Recipe"}</h2>
    <button data-action="cancel-recipe-edit" class="btn-secondary text-sm">← Back to Recipes</button>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
    <h3 class="font-semibold text-slate-700 dark:text-slate-300 mb-3">Import from a link or pasted text</h3>
    <p class="text-xs text-slate-400 dark:text-slate-500 mb-2">
      We'll try to fetch the page directly, but most recipe/YouTube sites block cross-origin
      requests (CORS) from a page like this one — if that happens, paste the ingredient list
      or video description below instead. Auto-detection only works on lines with an explicit
      weight (grams/oz/lb); everything else you can add or fix manually below.
    </p>
    <div class="flex gap-2 mb-3">
      <input type="url" id="recipe-source-url" placeholder="https://... recipe or YouTube link"
        value="${escapeHtml(d.sourceUrl)}"
        class="flex-1 border rounded-lg px-3 py-2 text-sm">
      <button data-action="fetch-recipe-url" class="btn-secondary text-sm whitespace-nowrap">Try Fetch</button>
    </div>
    <textarea id="paste-recipe-text" rows="3" placeholder="Or paste the recipe text / ingredient list / video description here…"
      class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
    <button data-action="parse-pasted-text" class="btn-secondary text-sm mt-2">Parse Ingredients from Text</button>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
    <div class="grid sm:grid-cols-4 gap-3 mb-2">
      <input type="text" id="recipe-name" placeholder="Recipe name" value="${escapeHtml(d.name)}"
        class="sm:col-span-2 border rounded-lg px-3 py-2 text-sm font-medium">
      <select id="recipe-category" class="border rounded-lg px-3 py-2 text-sm">
        ${RECIPE_CATEGORIES.map((c) => `<option value="${c}" ${d.category === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
      <input type="number" id="recipe-servings" min="0.5" step="0.5" value="${d.servings}"
        oninput="updateEditorTotalsDisplay()" placeholder="Servings"
        class="border rounded-lg px-3 py-2 text-sm">
    </div>

    <div class="grid sm:grid-cols-2 gap-3 mt-2">
      <label class="field-label">Prep time (minutes)
        <input type="number" id="recipe-prep-time" min="0" step="5" value="${d.prepTimeMin}" class="field-input">
      </label>
      <label class="field-label">Cook time (minutes)
        <input type="number" id="recipe-cook-time" min="0" step="5" value="${d.cookTimeMin}" class="field-input">
      </label>
    </div>

    <h3 class="font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Ingredients</h3>
    <p class="text-xs text-slate-400 dark:text-slate-500 mb-2">
      Type a name — common ingredients (e.g. "bell pepper", "chicken breast, cooked") auto-fill
      nutrition per 100g. Choose any weight unit; values convert automatically.
    </p>
    <div class="grid grid-cols-12 gap-2 text-[10px] uppercase text-slate-400 dark:text-slate-500 px-1">
      <div class="col-span-3">Name</div><div class="col-span-2">Amount</div><div class="col-span-1">Unit</div>
      <div class="col-span-1">Cal</div><div class="col-span-1">Prot</div><div class="col-span-1">Carb</div>
      <div class="col-span-1">Fat</div><div class="col-span-2"></div>
    </div>
    <div id="ingredient-rows">
      ${d.ingredients.map(renderIngredientRow).join("")}
    </div>
    <button data-action="add-ingredient-row" class="btn-secondary text-sm mt-3">+ Add Ingredient</button>

    <div id="editor-totals" class="mt-4 text-sm bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300"></div>

    <h3 class="font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Steps (optional)</h3>
    <p class="text-xs text-slate-400 dark:text-slate-500 mb-2">Numbered cooking steps — shown alongside the ingredients, source, and YouTube search when this recipe is used in a meal prep plan.</p>
    <div id="step-rows">
      ${d.steps.map(renderStepRow).join("")}
    </div>
    <button data-action="add-step-row" class="btn-secondary text-sm mt-2">+ Add Step</button>
  </div>

  <div class="flex gap-2">
    <button data-action="save-recipe" class="btn-primary">Save Recipe</button>
    <button data-action="cancel-recipe-edit" class="btn-secondary">Cancel</button>
  </div>
  `;
}

function readEditorFormIntoDraft() {
  const d = AppState.editorDraft;
  d.name = document.getElementById("recipe-name")?.value.trim() || "";
  d.category = document.getElementById("recipe-category")?.value || "Other";
  d.servings = parseFloat(document.getElementById("recipe-servings")?.value) || 1;
  d.sourceUrl = document.getElementById("recipe-source-url")?.value.trim() || "";
  d.prepTimeMin = parseFloat(document.getElementById("recipe-prep-time")?.value) || 0;
  d.cookTimeMin = parseFloat(document.getElementById("recipe-cook-time")?.value) || 0;
}

function saveRecipeFromForm() {
  readEditorFormIntoDraft();
  const d = AppState.editorDraft;
  if (!d.name) {
    toast("Please enter a recipe name", "error");
    return;
  }
  const validIngredients = d.ingredients.filter((i) => i.name.trim());
  if (validIngredients.length === 0) {
    toast("Add at least one ingredient", "error");
    return;
  }
  d.ingredients = validIngredients;
  d.steps = d.steps.filter((s) => s.text.trim());

  if (AppState.recipeEditorId === "new") {
    d.id = uid();
    AppState.recipes.push(d);
    toast("Recipe saved", "success");
  } else {
    const idx = AppState.recipes.findIndex((r) => r.id === AppState.recipeEditorId);
    if (idx >= 0) AppState.recipes[idx] = d;
    toast("Recipe updated", "success");
  }
  saveRecipes(AppState.recipes);
  AppState.recipeEditorId = null;
  renderApp();
}

async function tryFetchRecipeUrl() {
  const url = document.getElementById("recipe-source-url")?.value.trim();
  if (!url) {
    toast("Enter a URL first", "error");
    return;
  }
  toast("Attempting to fetch the page…", "info");
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("Bad response status " + res.status);
    const html = await res.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<[^>]+>/g, "\n");
    const parsedIngredients = parseIngredientsFromText(stripped);
    const parsedSteps = parseStepsFromText(stripped);
    if (parsedIngredients.length || parsedSteps.length) {
      readEditorFormIntoDraft();
      AppState.editorDraft.ingredients.push(...parsedIngredients);
      AppState.editorDraft.steps.push(...parsedSteps.map((text) => ({ id: uid(), text })));
      toast(`Fetched the page — found ${parsedIngredients.length} possible ingredient line(s) and ${parsedSteps.length} possible step(s). Please review them.`, "success");
      renderApp();
    } else {
      toast("Fetched the page but couldn't auto-detect ingredients or steps. Paste the recipe text below instead.", "warning");
    }
  } catch (err) {
    toast("Couldn't fetch automatically (most sites block this via CORS). Paste the recipe text below instead.", "error");
  }
}

function parsePastedText() {
  const text = document.getElementById("paste-recipe-text")?.value || "";
  const parsedIngredients = parseIngredientsFromText(text);
  const parsedSteps = parseStepsFromText(text);
  if (parsedIngredients.length === 0 && parsedSteps.length === 0) {
    toast("No ingredient lines (with a weight) or numbered/bulleted steps were detected. Add them manually below.", "warning");
    return;
  }
  readEditorFormIntoDraft();
  AppState.editorDraft.ingredients.push(...parsedIngredients);
  AppState.editorDraft.steps.push(...parsedSteps.map((text) => ({ id: uid(), text })));
  toast(`Added ${parsedIngredients.length} ingredient(s) and ${parsedSteps.length} step(s) — double check them`, "success");
  renderApp();
}

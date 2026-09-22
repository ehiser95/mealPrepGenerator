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
    instructions: "",
    ingredients: [blankIngredient()],
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

// ---------- Recipes tab ----------

function renderRecipesTab() {
  if (AppState.recipeEditorId !== null) return renderRecipeEditor();

  const recipes = AppState.recipes;
  const cards = recipes.map(renderRecipeCard).join("");

  return `
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-2xl font-bold text-slate-800">My Recipes</h2>
        <p class="text-sm text-slate-500">${recipes.length} saved recipe${recipes.length === 1 ? "" : "s"}</p>
      </div>
      <button data-action="new-recipe" class="btn-primary">+ New Recipe</button>
    </div>
    ${recipes.length === 0
      ? `<div class="empty-state">
           <p class="text-lg font-medium text-slate-600">No recipes yet</p>
           <p class="text-sm text-slate-400 mt-1">Add your own recipe, or check the Recommended tab for starter ideas.</p>
         </div>`
      : `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`}
  `;
}

function renderRecipeCard(r) {
  const per = computePerServing(r);
  const scale = AppState.cardScales[r.id] || 1;
  const expanded = AppState.expandedIds.has(r.id);
  return `
  <div class="card-anim bg-white rounded-xl shadow-sm border border-slate-200 p-4" data-id="${r.id}">
    <div class="flex justify-between items-start gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold text-lg text-slate-800 truncate">${escapeHtml(r.name)}</h3>
        <span class="badge">${escapeHtml(r.category)}</span>
        ${r.sourceUrl ? `<a href="${escapeHtml(r.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline block mt-1 truncate">Source link ↗</a>` : ""}
      </div>
      <div class="flex gap-1 shrink-0">
        <button data-action="edit-recipe" data-id="${r.id}" title="Edit" class="icon-btn">✏️</button>
        <button data-action="delete-recipe" data-id="${r.id}" title="Delete" class="icon-btn">🗑️</button>
      </div>
    </div>
    <div class="grid grid-cols-4 gap-2 text-center my-3">
      <div class="macro-tile bg-indigo-50 text-indigo-700"><div class="font-bold">${formatNum(per.cal, 0)}</div><div class="text-[10px] uppercase tracking-wide">cal</div></div>
      <div class="macro-tile bg-rose-50 text-rose-700"><div class="font-bold">${formatNum(per.protein, 0)}g</div><div class="text-[10px] uppercase tracking-wide">protein</div></div>
      <div class="macro-tile bg-amber-50 text-amber-700"><div class="font-bold">${formatNum(per.carbs, 0)}g</div><div class="text-[10px] uppercase tracking-wide">carbs</div></div>
      <div class="macro-tile bg-teal-50 text-teal-700"><div class="font-bold">${formatNum(per.fat, 0)}g</div><div class="text-[10px] uppercase tracking-wide">fat</div></div>
    </div>
    <div class="text-xs text-slate-500 mb-3">per serving · ${formatNum(r.servings, 1)} servings total</div>
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
  <div class="mt-3 pt-3 border-t border-slate-100 scale-panel">
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
    <ul class="text-sm mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
      ${r.ingredients.map((ing) => `<li>${formatNum(ing.amount * scale, 2)} ${escapeHtml(ing.unit)} ${escapeHtml(ing.name)}</li>`).join("")}
    </ul>
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
  AppState.editorDraft = JSON.parse(JSON.stringify(recipe));
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
  <div class="ingredient-row grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-100" data-ing-row data-id="${ing.id}">
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

function renderRecipeEditor() {
  const d = AppState.editorDraft;
  const isNew = AppState.recipeEditorId === "new";
  return `
  <div class="flex items-center justify-between mb-5">
    <h2 class="text-2xl font-bold text-slate-800">${isNew ? "New Recipe" : "Edit Recipe"}</h2>
    <button data-action="cancel-recipe-edit" class="btn-secondary text-sm">← Back to Recipes</button>
  </div>

  <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
    <h3 class="font-semibold text-slate-700 mb-3">Import from a link or pasted text</h3>
    <p class="text-xs text-slate-400 mb-2">
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

  <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
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

    <h3 class="font-semibold text-slate-700 mt-4 mb-1">Ingredients</h3>
    <p class="text-xs text-slate-400 mb-2">
      Type a name — common ingredients (e.g. "bell pepper", "chicken breast, cooked") auto-fill
      nutrition per 100g. Choose any weight unit; values convert automatically.
    </p>
    <div class="grid grid-cols-12 gap-2 text-[10px] uppercase text-slate-400 px-1">
      <div class="col-span-3">Name</div><div class="col-span-2">Amount</div><div class="col-span-1">Unit</div>
      <div class="col-span-1">Cal</div><div class="col-span-1">Prot</div><div class="col-span-1">Carb</div>
      <div class="col-span-1">Fat</div><div class="col-span-2"></div>
    </div>
    <div id="ingredient-rows">
      ${d.ingredients.map(renderIngredientRow).join("")}
    </div>
    <button data-action="add-ingredient-row" class="btn-secondary text-sm mt-3">+ Add Ingredient</button>

    <div id="editor-totals" class="mt-4 text-sm bg-slate-50 rounded-lg px-3 py-2 text-slate-600"></div>

    <h3 class="font-semibold text-slate-700 mt-4 mb-1">Instructions (optional)</h3>
    <textarea id="recipe-instructions" rows="4" placeholder="Steps…"
      class="w-full border rounded-lg px-3 py-2 text-sm">${escapeHtml(d.instructions)}</textarea>
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
  d.instructions = document.getElementById("recipe-instructions")?.value || "";
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
    const parsed = parseIngredientsFromText(stripped);
    if (parsed.length) {
      AppState.editorDraft.ingredients.push(...parsed);
      toast(`Fetched the page and found ${parsed.length} possible ingredient line(s) — please review them`, "success");
      renderApp();
    } else {
      toast("Fetched the page but couldn't auto-detect ingredients. Paste the recipe text below instead.", "warning");
    }
  } catch (err) {
    toast("Couldn't fetch automatically (most sites block this via CORS). Paste the recipe text below instead.", "error");
  }
}

function parsePastedText() {
  const text = document.getElementById("paste-recipe-text")?.value || "";
  const parsed = parseIngredientsFromText(text);
  if (parsed.length === 0) {
    toast("No ingredient lines with a weight (g/oz/lb) were detected. Add ingredients manually below.", "warning");
    return;
  }
  AppState.editorDraft.ingredients.push(...parsed);
  toast(`Added ${parsed.length} parsed ingredient(s) — double check amounts and macros`, "success");
  renderApp();
}

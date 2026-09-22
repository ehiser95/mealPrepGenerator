// Meal Prep Planner: plans ONE batch-cooked lunch or dinner, portioned into
// however many meal-prep containers you want. You set the calories you want
// per container and how many containers you need — the whole batch (every
// ingredient amount) is scaled so total batch calories = cal/portion x portions.
// Generates several candidate recipes at once (tiles); clicking one opens a
// full-detail view (ingredients, steps, source/YouTube, tips).

const PLANNER_PORTION_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);
const MAX_PLAN_CANDIDATES = 6;
// A single recipe's macro ratio is fixed by its ingredients — scaling it to
// hit a calorie target scales protein/carbs/fat together, so an arbitrary
// macro target can only ever be matched approximately by picking the recipe
// whose ratio happens to be closest. This is how loose "close enough" is
// before a candidate is filtered out for missing the target outright.
const MACRO_TARGET_TOLERANCE = 0.3;

function buildCandidatePool(mealType) {
  let pool = AppState.recipes
    .filter((r) => r.category === mealType)
    .map((r) => ({ ref: r, type: "mine", totals: computeRecipeTotals(r) }));
  const usedOwn = pool.length > 0;
  if (!usedOwn) {
    pool = RECOMMENDED_MEALS.filter((m) => m.mealType === mealType).map((m) => ({
      ref: m,
      type: "recommended",
      totals: { cal: m.perServing.cal, protein: m.perServing.protein, carbs: m.perServing.carbs, fat: m.perServing.fat },
    }));
  }
  return { pool, usedOwn };
}

function passesDiet(dietKey, candidate) {
  const d = DIETS[dietKey];
  if (!d || !d.kind) return true; // "any" / unknown
  const totals = candidate.totals;
  if (d.kind === "macroRatio") {
    const carbCal = totals.carbs * 4;
    const fatCal = totals.fat * 9;
    const proteinCal = totals.protein * 4;
    const totalCal2 = carbCal + fatCal + proteinCal;
    if (totalCal2 <= 0) return false;
    const carbPct = (carbCal / totalCal2) * 100;
    const fatPct = (fatCal / totalCal2) * 100;
    if (d.maxCarbPct != null && carbPct > d.maxCarbPct) return false;
    if (d.minFatPct != null && fatPct < d.minFatPct) return false;
    return true;
  }
  if (d.kind === "density") {
    if (candidate.type !== "mine") return false;
    const totalGrams = candidate.ref.ingredients.reduce((sum, ing) => sum + toGrams(ing.amount, ing.unit), 0);
    if (totalGrams <= 0) return false;
    return totals.cal / totalGrams <= d.maxKcalPerGram;
  }
  if (d.kind === "ingredient") {
    if (candidate.type !== "mine") return false;
    return isCarnivoreCompliant(candidate.ref);
  }
  return true;
}

function isCarnivoreCompliant(recipe) {
  return (
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every((ing) => ANIMAL_FOOD_KEYS.has(String(ing.name || "").trim().toLowerCase()))
  );
}

function passesMacroTargets(perPortion, targets, tolerance) {
  if (targets.protein > 0 && Math.abs(perPortion.protein - targets.protein) / targets.protein > tolerance) return false;
  if (targets.carbs > 0 && Math.abs(perPortion.carbs - targets.carbs) / targets.carbs > tolerance) return false;
  if (targets.fat > 0 && Math.abs(perPortion.fat - targets.fat) / targets.fat > tolerance) return false;
  return true;
}

function scoreMacroFit(perPortion, targets) {
  let score = 0;
  let count = 0;
  if (targets.protein > 0) {
    score += Math.abs(perPortion.protein - targets.protein) / targets.protein;
    count++;
  }
  if (targets.carbs > 0) {
    score += Math.abs(perPortion.carbs - targets.carbs) / targets.carbs;
    count++;
  }
  if (targets.fat > 0) {
    score += Math.abs(perPortion.fat - targets.fat) / targets.fat;
    count++;
  }
  return count > 0 ? score / count : 0;
}

function buildScaledCandidate(choice, portions, calPerPortion) {
  const baseTotalCal = choice.totals.cal;
  if (baseTotalCal <= 0) return null;
  const scale = (calPerPortion * portions) / baseTotalCal;
  const scaledTotals = {
    cal: choice.totals.cal * scale,
    protein: choice.totals.protein * scale,
    carbs: choice.totals.carbs * scale,
    fat: choice.totals.fat * scale,
  };
  const perPortion = {
    cal: scaledTotals.cal / portions,
    protein: scaledTotals.protein / portions,
    carbs: scaledTotals.carbs / portions,
    fat: scaledTotals.fat / portions,
  };
  const ingredients =
    choice.type === "mine"
      ? choice.ref.ingredients.map((ing) => ({ ...ing, amount: (Number(ing.amount) || 0) * scale }))
      : [{ id: "rec", name: "estimated recipe — see source link for the exact ingredient list", amount: 0, unit: "g" }];
  const steps = (choice.ref.steps || []).map((s) => (typeof s === "string" ? s : s.text)).filter(Boolean);

  return {
    id: choice.ref.id + "-" + Math.random().toString(36).slice(2, 8),
    recipeName: choice.ref.name,
    type: choice.type,
    portions,
    scale,
    sourceUrl: choice.ref.sourceUrl || null,
    youtubeSearchUrl:
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(choice.ref.youtubeQuery || choice.ref.name + " meal prep recipe"),
    prepTimeMin: Number(choice.ref.prepTimeMin) || 0,
    cookTimeMin: Number(choice.ref.cookTimeMin) || 0,
    ingredients,
    steps,
    perPortion,
    totals: scaledTotals,
    targetCalPerPortion: calPerPortion,
    tips: getRecipeTips(ingredients),
  };
}

function getRecipeTips(ingredients) {
  const freezerMatches = [
    ...new Set(
      (ingredients || [])
        .map((ing) => String(ing.name || "").trim().toLowerCase())
        .filter((name) => FREEZABLE_OR_PRECUT_INGREDIENTS.has(name))
    ),
  ];
  const tips = [...GENERIC_MEAL_PREP_TIPS];
  if (freezerMatches.length > 0) {
    tips.unshift(
      `This recipe's ${freezerMatches.join(", ")} ${freezerMatches.length > 1 ? "are" : "is"} commonly sold pre-chopped or frozen — grabbing those instead of fresh can cut prep time with little difference in the finished dish.`
    );
  }
  return tips;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMealPrepCandidates(opts) {
  const { mealType, portions, calPerPortion, maxPrepMin, maxCookMin, diet, targetProteinG, targetCarbsG, targetFatG } = opts;
  const targets = { protein: targetProteinG || 0, carbs: targetCarbsG || 0, fat: targetFatG || 0 };
  const hasTargets = targets.protein > 0 || targets.carbs > 0 || targets.fat > 0;

  const { pool, usedOwn } = buildCandidatePool(mealType);
  if (pool.length === 0) {
    return { candidates: [], usedOwn, dietFiltered: false, usedFallbackTime: false, macroFiltered: false, targets, hasTargets };
  }

  let dietPool = pool.filter((c) => passesDiet(diet, c));
  const dietFiltered = dietPool.length === 0 && diet !== "any";
  if (dietFiltered) dietPool = pool;

  let timePool = dietPool.filter((c) => {
    const prep = Number(c.ref.prepTimeMin) || 0;
    const cook = Number(c.ref.cookTimeMin) || 0;
    if (maxPrepMin > 0 && prep > maxPrepMin) return false;
    if (maxCookMin > 0 && cook > maxCookMin) return false;
    return true;
  });
  const usedFallbackTime = timePool.length === 0 && (maxPrepMin > 0 || maxCookMin > 0);
  if (usedFallbackTime) timePool = dietPool;

  // Scale every remaining candidate to the calorie target BEFORE checking
  // macro targets, since per-portion protein/carbs/fat only exist post-scale.
  const scaled = shuffleArray(timePool)
    .map((c) => buildScaledCandidate(c, portions, calPerPortion))
    .filter(Boolean);

  let macroFiltered = false;
  let finalList = scaled;
  if (hasTargets) {
    const matching = scaled.filter((c) => passesMacroTargets(c.perPortion, targets, MACRO_TARGET_TOLERANCE));
    if (matching.length > 0) {
      finalList = matching;
    } else {
      macroFiltered = true; // nothing within tolerance -- fall back to everything, sorted by closeness
    }
  }

  finalList = [...finalList].sort((a, b) => scoreMacroFit(a.perPortion, targets) - scoreMacroFit(b.perPortion, targets));

  return {
    candidates: finalList.slice(0, MAX_PLAN_CANDIDATES),
    usedOwn,
    dietFiltered,
    usedFallbackTime,
    macroFiltered,
    targets,
    hasTargets,
  };
}

function onGeneratePlan() {
  const mealType = AppState.plannerMealType || "Lunch";
  const result = generateMealPrepCandidates({
    mealType,
    portions: AppState.plannerPortions || 5,
    calPerPortion: AppState.plannerCalPerPortion || 500,
    maxPrepMin: Number(AppState.plannerMaxPrepMin) || 0,
    maxCookMin: Number(AppState.plannerMaxCookMin) || 0,
    diet: AppState.plannerDiet || "any",
    targetProteinG: Number(AppState.plannerTargetProtein) || 0,
    targetCarbsG: Number(AppState.plannerTargetCarbs) || 0,
    targetFatG: Number(AppState.plannerTargetFat) || 0,
  });
  if (result.candidates.length === 0) {
    toast(`No ${mealType} recipes available yet — add one, or check the Recommended tab.`, "warning");
    AppState.planCandidates = [];
    AppState.planMeta = null;
    renderApp();
    return;
  }
  AppState.planCandidates = result.candidates;
  AppState.planMeta = result;
  renderApp();
}

function openPlanModal(id) {
  AppState.openPlanCandidateId = id;
  renderApp();
}

function closePlanModal() {
  AppState.openPlanCandidateId = null;
  renderApp();
}

function handlePlannerFieldInput(el) {
  const field = el.dataset.plannerField;
  const numericFields = ["calPerPortion", "maxPrepMin", "maxCookMin", "targetProtein", "targetCarbs", "targetFat"];
  const value = numericFields.includes(field) ? parseFloat(el.value) || 0 : el.value;
  const stateKey = "planner" + field.charAt(0).toUpperCase() + field.slice(1);
  AppState[stateKey] = value;
  if (field === "diet") {
    const descEl = document.getElementById("planner-diet-description");
    if (descEl) descEl.textContent = DIETS[value] ? DIETS[value].description : "";
  }
  updatePlannerLiveText();
}

function handlePlannerPortionsInput(el) {
  const value = clamp(parseInt(el.value, 10) || 1, 1, 20);
  AppState.plannerPortions = value;
  document.querySelectorAll('[data-planner-live="portions"]').forEach((input) => {
    if (input !== el) input.value = value;
  });
  updatePlannerLiveText();
}

function updatePlannerLiveText() {
  const totalTimeEl = document.getElementById("planner-total-time-text");
  if (totalTimeEl) {
    const total = (Number(AppState.plannerMaxPrepMin) || 0) + (Number(AppState.plannerMaxCookMin) || 0);
    totalTimeEl.textContent = "Total time filter: " + (total > 0 ? formatNum(total, 0) + " min" : "no limit set");
  }
  const batchEl = document.getElementById("planner-batch-target-text");
  if (batchEl) {
    const total = (Number(AppState.plannerCalPerPortion) || 0) * (Number(AppState.plannerPortions) || 1);
    batchEl.innerHTML = `Batch target: <strong>${formatNum(total, 0)}</strong> cal total (${formatNum(AppState.plannerCalPerPortion, 0)} cal × ${AppState.plannerPortions} portions)`;
  }
}

function deltaBadge(value, target) {
  const diffPct = target > 0 ? Math.abs(value - target) / target : 0;
  if (diffPct <= 0.02) return `<span class="text-emerald-600 dark:text-emerald-400 font-medium">exact match</span>`;
  if (diffPct <= 0.1) return `<span class="text-amber-600 dark:text-amber-400 font-medium">close</span>`;
  return `<span class="text-rose-600 dark:text-rose-400 font-medium">off target</span>`;
}

function renderPlannerTab() {
  const mealType = AppState.plannerMealType || "Lunch";
  const portions = AppState.plannerPortions || 5;
  const calPerPortion = AppState.plannerCalPerPortion || 500;
  const maxPrepMin = AppState.plannerMaxPrepMin || 0;
  const maxCookMin = AppState.plannerMaxCookMin || 0;
  const diet = AppState.plannerDiet || "any";
  const totalTime = (Number(maxPrepMin) || 0) + (Number(maxCookMin) || 0);
  const totalBatchCal = calPerPortion * portions;
  const candidates = AppState.planCandidates || [];

  return `
    <h2 class="page-title mb-1">Meal Prep Planner</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
      Plan <strong>one</strong> batch-cooked lunch or dinner, portioned into meal-prep containers.
      Set the calories you want <em>per container</em> and how many containers you need — the whole
      batch scales so total calories = cal/portion × portions.
    </p>

    <div class="panel p-5 mb-5">
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="field-label">Meal type
          <select id="planner-meal-type" data-planner-field="mealType" class="field-input">
            <option value="Lunch" ${mealType === "Lunch" ? "selected" : ""}>Lunch</option>
            <option value="Dinner" ${mealType === "Dinner" ? "selected" : ""}>Dinner</option>
          </select>
        </label>
        <label class="field-label">Calories per portion
          <input type="number" id="planner-cal-per-portion" min="50" step="10" value="${calPerPortion}" data-planner-field="calPerPortion" class="field-input">
        </label>
      </div>

      <div class="mt-4">
        <label class="field-label mb-1">Number of portions (meal-prep containers)</label>
        <div class="flex items-center gap-3">
          <input type="range" min="1" max="20" step="1" value="${portions}" data-planner-live="portions" class="flex-1 accent-indigo-600">
          <select data-planner-live="portions" class="field-input w-24">
            ${PLANNER_PORTION_OPTIONS.map((n) => `<option value="${n}" ${portions === n ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="mt-4">
        <label class="field-label">Diet (optional)
          <select id="planner-diet" data-planner-field="diet" class="field-input">
            ${Object.entries(DIETS).map(([key, d]) => `<option value="${key}" ${diet === key ? "selected" : ""}>${escapeHtml(d.label)}</option>`).join("")}
          </select>
        </label>
        <p id="planner-diet-description" class="text-xs text-slate-400 dark:text-slate-500 mt-1">${escapeHtml(DIETS[diet].description)}</p>
      </div>

      <div class="mt-4">
        <label class="field-label mb-1">Target macros per portion in grams (optional)</label>
        <div class="grid grid-cols-3 gap-3">
          <input type="number" min="0" step="1" placeholder="Protein" value="${AppState.plannerTargetProtein || ""}" data-planner-field="targetProtein" class="field-input">
          <input type="number" min="0" step="1" placeholder="Carbs" value="${AppState.plannerTargetCarbs || ""}" data-planner-field="targetCarbs" class="field-input">
          <input type="number" min="0" step="1" placeholder="Fat" value="${AppState.plannerTargetFat || ""}" data-planner-field="targetFat" class="field-input">
        </div>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Candidates within ~${Math.round(MACRO_TARGET_TOLERANCE * 100)}% of these are shown first; the calorie target above is still what gets scaled to exactly, so macros can only get as close as a recipe's own ratio allows.</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-4 mt-4">
        <label class="field-label">Max prep time in minutes (optional)
          <input type="number" id="planner-max-prep" min="0" step="5" value="${maxPrepMin || ""}" placeholder="Any" data-planner-field="maxPrepMin" class="field-input">
        </label>
        <label class="field-label">Max cook time in minutes (optional)
          <input type="number" id="planner-max-cook" min="0" step="5" value="${maxCookMin || ""}" placeholder="Any" data-planner-field="maxCookMin" class="field-input">
        </label>
      </div>
      <p id="planner-total-time-text" class="text-xs text-slate-400 dark:text-slate-500 mt-1">Total time filter: ${totalTime > 0 ? formatNum(totalTime, 0) + " min" : "no limit set"}</p>

      <div id="planner-batch-target-text" class="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 mt-4">
        Batch target: <strong>${formatNum(totalBatchCal, 0)}</strong> cal total (${formatNum(calPerPortion, 0)} cal × ${portions} portions)
      </div>

      <button data-action="generate-plan" class="btn-primary mt-4">${candidates.length ? "Show More Options" : "Generate Meal Prep Options"}</button>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">Tip: set up your Profile tab and click "Use as Meal Plan Target" for a starting calories/portion suggestion.</p>
    </div>

    ${candidates.length ? renderCandidateTiles() : ""}
    ${renderPlanModal()}
  `;
}

function macroTargetLine(actual, target, label) {
  if (!target) return "";
  const diffPct = Math.abs(actual - target) / target;
  const cls =
    diffPct <= 0.1
      ? "text-emerald-600 dark:text-emerald-400"
      : diffPct <= MACRO_TARGET_TOLERANCE
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";
  return `<span class="${cls} font-medium">${label} ${formatNum(actual, 0)}g<span class="text-slate-400 dark:text-slate-500 font-normal">/${formatNum(target, 0)}g</span></span>`;
}

function renderCandidateTiles() {
  const candidates = AppState.planCandidates || [];
  const meta = AppState.planMeta || {};
  const targets = meta.targets || {};
  const tiles = candidates
    .map((c) => {
      const targetLines = meta.hasTargets
        ? [
            macroTargetLine(c.perPortion.protein, targets.protein, "P"),
            macroTargetLine(c.perPortion.carbs, targets.carbs, "C"),
            macroTargetLine(c.perPortion.fat, targets.fat, "F"),
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
      return `
    <button data-action="open-plan-modal" data-id="${c.id}"
      class="card-anim text-left panel tile-hover p-4 cursor-pointer">
      <div class="flex justify-between items-start gap-2 mb-2">
        <h3 class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(c.recipeName)}</h3>
        ${c.type === "recommended" ? `<span class="badge bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shrink-0">recommended</span>` : `<span class="badge shrink-0">mine</span>`}
      </div>
      <div class="grid grid-cols-4 gap-1.5 text-center mb-2">
        <div class="macro-tile bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"><div class="font-bold text-sm">${formatNum(c.perPortion.cal, 0)}</div><div class="text-[9px] uppercase tracking-wide">cal</div></div>
        <div class="macro-tile bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"><div class="font-bold text-sm">${formatNum(c.perPortion.protein, 0)}g</div><div class="text-[9px] uppercase tracking-wide">protein</div></div>
        <div class="macro-tile bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><div class="font-bold text-sm">${formatNum(c.perPortion.carbs, 0)}g</div><div class="text-[9px] uppercase tracking-wide">carbs</div></div>
        <div class="macro-tile bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300"><div class="font-bold text-sm">${formatNum(c.perPortion.fat, 0)}g</div><div class="text-[9px] uppercase tracking-wide">fat</div></div>
      </div>
      ${targetLines ? `<div class="text-xs mb-1.5">${targetLines}</div>` : ""}
      <div class="text-xs text-slate-500 dark:text-slate-400">⏱ ${formatNum(c.prepTimeMin + c.cookTimeMin, 0)}m total · tap to view recipe</div>
    </button>`;
    })
    .join("");

  const warnings = [];
  if (meta.dietFiltered) {
    warnings.push(
      `No recipe matched the <strong>${escapeHtml((DIETS[AppState.plannerDiet] || {}).label || "selected")}</strong> diet filter, so it's ignored below — add recipes that fit, or pick "No specific diet".`
    );
  }
  if (meta.usedFallbackTime) {
    warnings.push(`No recipe matched your time filters, so they're ignored below.`);
  }
  if (meta.macroFiltered) {
    warnings.push(
      `None of your available recipes landed within ~${Math.round(MACRO_TARGET_TOLERANCE * 100)}% of your macro target(s), so the closest matches are shown below instead — a single recipe's macro ratio is fixed by its ingredients, so it can only get so close to an arbitrary target. Add a recipe with a closer ratio, or loosen/clear the target.`
    );
  }
  const warningBanner = warnings.length
    ? `<div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-sm text-amber-800 dark:text-amber-300 space-y-1.5">
        ${warnings.map((w) => `<p>⚠️ ${w}</p>`).join("")}
      </div>`
    : "";

  return `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-slate-700 dark:text-slate-300">Pick a recipe (${candidates.length} option${candidates.length === 1 ? "" : "s"})</h3>
    </div>
    ${warningBanner}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">${tiles}</div>
    ${!meta.usedOwn ? `<p class="text-xs text-slate-400 dark:text-slate-500 mt-1">No saved recipes for this meal type yet, so these are starter ideas from the Recommended tab.</p>` : ""}
  `;
}

function renderPlanModal() {
  const id = AppState.openPlanCandidateId;
  if (!id) return "";
  const plan = (AppState.planCandidates || []).find((c) => c.id === id);
  if (!plan) return "";

  const totalTime = plan.prepTimeMin + plan.cookTimeMin;
  const ingredientItems = plan.ingredients
    .map((ing) => `<li>${formatNum(ing.amount, 2)} ${escapeHtml(ing.unit)} ${escapeHtml(ing.name)}</li>`)
    .join("");
  const stepItems = plan.steps.length
    ? plan.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")
    : `<li class="text-slate-400 dark:text-slate-500 list-none -ml-5">No steps recorded — check the source link for the full method.</li>`;
  const tipItems = plan.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("");

  return `
  <div id="plan-modal-backdrop" data-action="close-plan-modal"
    class="modal-backdrop fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
    <div class="modal-panel bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl border-b border-slate-100 dark:border-slate-700 p-5 flex justify-between items-start gap-3">
        <div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">${escapeHtml(plan.recipeName)}</h3>
          ${plan.type === "recommended" ? `<span class="badge bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">recommended</span>` : `<span class="badge">mine</span>`}
        </div>
        <button data-action="close-plan-modal" class="icon-btn text-lg" title="Close (Esc)">✕</button>
      </div>

      <div class="p-5">
        <div class="text-right text-xs mb-3">
          ${plan.sourceUrl ? `<a href="${escapeHtml(plan.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline block">Source ↗</a>` : ""}
          <a href="${escapeHtml(plan.youtubeSearchUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline block">Search YouTube ↗</a>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div class="macro-tile bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"><div class="font-bold">${formatNum(plan.prepTimeMin, 0)}m</div><div class="text-[10px] uppercase tracking-wide">prep</div></div>
          <div class="macro-tile bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"><div class="font-bold">${formatNum(plan.cookTimeMin, 0)}m</div><div class="text-[10px] uppercase tracking-wide">cook</div></div>
          <div class="macro-tile bg-slate-800 dark:bg-slate-700 text-white"><div class="font-bold">${formatNum(totalTime, 0)}m</div><div class="text-[10px] uppercase tracking-wide">total</div></div>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center mb-1">
          <div class="macro-tile bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"><div class="font-bold">${formatNum(plan.perPortion.cal, 0)}</div><div class="text-[10px] uppercase tracking-wide">cal/portion</div></div>
          <div class="macro-tile bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"><div class="font-bold">${formatNum(plan.perPortion.protein, 0)}g</div><div class="text-[10px] uppercase tracking-wide">protein</div></div>
          <div class="macro-tile bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><div class="font-bold">${formatNum(plan.perPortion.carbs, 0)}g</div><div class="text-[10px] uppercase tracking-wide">carbs</div></div>
          <div class="macro-tile bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300"><div class="font-bold">${formatNum(plan.perPortion.fat, 0)}g</div><div class="text-[10px] uppercase tracking-wide">fat</div></div>
        </div>
        <p class="text-xs text-center mb-1">${formatNum(plan.perPortion.cal, 0)} cal vs ${formatNum(plan.targetCalPerPortion, 0)} cal target — ${deltaBadge(plan.perPortion.cal, plan.targetCalPerPortion)}</p>
        ${(AppState.planMeta && AppState.planMeta.hasTargets) ? `<p class="text-xs text-center mb-4">${[
          macroTargetLine(plan.perPortion.protein, AppState.planMeta.targets.protein, "Protein"),
          macroTargetLine(plan.perPortion.carbs, AppState.planMeta.targets.carbs, "Carbs"),
          macroTargetLine(plan.perPortion.fat, AppState.planMeta.targets.fat, "Fat"),
        ].filter(Boolean).join(" · ")}</p>` : `<div class="mb-4"></div>`}

        <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Ingredients (whole batch, ${plan.portions} portions)</h4>
        <ol class="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 space-y-0.5 mb-4">${ingredientItems}</ol>

        <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Steps</h4>
        <ol class="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-4">${stepItems}</ol>

        <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Tips &amp; tricks</h4>
        <ul class="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-2">${tipItems}</ul>

        <div class="bg-slate-800 dark:bg-slate-700 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div>
            <div class="text-xs text-slate-300">Total batch</div>
            <div class="text-xl font-bold">${formatNum(plan.totals.cal, 0)} cal <span class="text-xs font-normal text-slate-300">across ${plan.portions} portions</span></div>
          </div>
          <div class="text-xs">${formatNum(plan.totals.protein, 0)}g protein · ${formatNum(plan.totals.carbs, 0)}g carbs · ${formatNum(plan.totals.fat, 0)}g fat</div>
        </div>
        ${plan.type === "recommended" ? `<p class="text-xs text-slate-400 dark:text-slate-500 mt-3">This is a starter idea from the Recommended tab — its ingredient list is a placeholder; add it to My Recipes and fill in real ingredients for full accuracy.</p>` : ""}
      </div>
    </div>
  </div>`;
}

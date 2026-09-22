// Meal Prep Planner: plans ONE batch-cooked lunch or dinner, portioned into
// however many meal-prep containers you want. You set the calories you want
// per container and how many containers you need — the whole batch (every
// ingredient amount) is scaled so total batch calories = cal/portion x portions.

const PLANNER_PORTION_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

function pickPlanCandidate(mealType, maxPrepMin, maxCookMin) {
  let pool = AppState.recipes
    .filter((r) => r.category === mealType)
    .map((r) => ({ ref: r, type: "mine", totals: computeRecipeTotals(r) }));

  if (pool.length === 0) {
    pool = RECOMMENDED_MEALS.filter((m) => m.mealType === mealType).map((m) => ({
      ref: m,
      type: "recommended",
      totals: { cal: m.perServing.cal, protein: m.perServing.protein, carbs: m.perServing.carbs, fat: m.perServing.fat },
    }));
  }
  if (pool.length === 0) return { pool: [], choice: null };

  const timeFiltered = pool.filter((p) => {
    const prep = Number(p.ref.prepTimeMin) || 0;
    const cook = Number(p.ref.cookTimeMin) || 0;
    if (maxPrepMin > 0 && prep > maxPrepMin) return false;
    if (maxCookMin > 0 && cook > maxCookMin) return false;
    return true;
  });
  const finalPool = timeFiltered.length > 0 ? timeFiltered : pool;
  const choice = finalPool[Math.floor(Math.random() * finalPool.length)];
  return { pool: finalPool, usedFallbackPool: timeFiltered.length === 0 && maxPrepMin + maxCookMin > 0, choice };
}

function generateMealPrepPlan({ mealType, portions, calPerPortion, maxPrepMin, maxCookMin }) {
  const { choice, usedFallbackPool } = pickPlanCandidate(mealType, maxPrepMin, maxCookMin);
  if (!choice) return null;

  const baseTotalCal = choice.totals.cal;
  const targetTotalCal = calPerPortion * portions;
  const scale = baseTotalCal > 0 ? targetTotalCal / baseTotalCal : 1;

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
      : [
          {
            id: "rec",
            name: "estimated recipe — see source link for the exact ingredient list",
            amount: 0,
            unit: "g",
          },
        ];

  const steps = (choice.ref.steps || []).map((s) => (typeof s === "string" ? s : s.text)).filter(Boolean);

  return {
    recipeName: choice.ref.name,
    type: choice.type,
    mealType,
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
    usedFallbackPool,
  };
}

function onGeneratePlan() {
  const mealType = AppState.plannerMealType || "Lunch";
  const plan = generateMealPrepPlan({
    mealType,
    portions: AppState.plannerPortions || 5,
    calPerPortion: AppState.plannerCalPerPortion || 500,
    maxPrepMin: Number(AppState.plannerMaxPrepMin) || 0,
    maxCookMin: Number(AppState.plannerMaxCookMin) || 0,
  });
  if (!plan) {
    toast(`No ${mealType} recipes available yet — add one, or check the Recommended tab.`, "warning");
    return;
  }
  AppState.planLast = plan;
  renderApp();
}

function handlePlannerFieldInput(el) {
  const field = el.dataset.plannerField;
  const numericFields = ["calPerPortion", "maxPrepMin", "maxCookMin"];
  const value = numericFields.includes(field) ? parseFloat(el.value) || 0 : el.value;
  const stateKey = "planner" + field.charAt(0).toUpperCase() + field.slice(1);
  AppState[stateKey] = value;
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

function deltaBadge(perPortionCal, target) {
  const diffPct = target > 0 ? Math.abs(perPortionCal - target) / target : 0;
  if (diffPct <= 0.02) return `<span class="text-emerald-600 font-medium">exact match</span>`;
  if (diffPct <= 0.1) return `<span class="text-amber-600 font-medium">close</span>`;
  return `<span class="text-rose-600 font-medium">off target</span>`;
}

function renderPlannerTab() {
  const mealType = AppState.plannerMealType || "Lunch";
  const portions = AppState.plannerPortions || 5;
  const calPerPortion = AppState.plannerCalPerPortion || 500;
  const maxPrepMin = AppState.plannerMaxPrepMin || 0;
  const maxCookMin = AppState.plannerMaxCookMin || 0;
  const totalTime = (Number(maxPrepMin) || 0) + (Number(maxCookMin) || 0);
  const totalBatchCal = calPerPortion * portions;
  const plan = AppState.planLast;

  return `
    <h2 class="text-2xl font-bold text-slate-800 mb-1">Meal Prep Planner</h2>
    <p class="text-sm text-slate-500 mb-5">
      Plan <strong>one</strong> batch-cooked lunch or dinner, portioned into meal-prep containers.
      Set the calories you want <em>per container</em> and how many containers you need — the whole
      batch scales so total calories = cal/portion × portions.
    </p>

    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
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
          <select data-planner-live="portions" class="border rounded-lg px-2 py-2 text-sm w-24">
            ${PLANNER_PORTION_OPTIONS.map((n) => `<option value="${n}" ${portions === n ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4 mt-4">
        <label class="field-label">Max prep time in minutes (optional)
          <input type="number" id="planner-max-prep" min="0" step="5" value="${maxPrepMin || ""}" placeholder="Any" data-planner-field="maxPrepMin" class="field-input">
        </label>
        <label class="field-label">Max cook time in minutes (optional)
          <input type="number" id="planner-max-cook" min="0" step="5" value="${maxCookMin || ""}" placeholder="Any" data-planner-field="maxCookMin" class="field-input">
        </label>
      </div>
      <p id="planner-total-time-text" class="text-xs text-slate-400 mt-1">Total time filter: ${totalTime > 0 ? formatNum(totalTime, 0) + " min" : "no limit set"}</p>

      <div id="planner-batch-target-text" class="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600 mt-4">
        Batch target: <strong>${formatNum(totalBatchCal, 0)}</strong> cal total (${formatNum(calPerPortion, 0)} cal × ${portions} portions)
      </div>

      <button data-action="generate-plan" class="btn-primary mt-4">${plan ? "Regenerate Plan" : "Generate Meal Prep Plan"}</button>
      <p class="text-xs text-slate-400 mt-2">Tip: set up your Profile tab and click "Use as Meal Plan Target" for a starting calories/portion suggestion.</p>
    </div>

    ${plan ? renderPlanResults(plan) : ""}
  `;
}

function renderPlanResults(plan) {
  const totalTime = plan.prepTimeMin + plan.cookTimeMin;
  const ingredientItems = plan.ingredients
    .map((ing) => `<li>${formatNum(ing.amount, 2)} ${escapeHtml(ing.unit)} ${escapeHtml(ing.name)}</li>`)
    .join("");
  const stepItems = plan.steps.length
    ? plan.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")
    : `<li class="text-slate-400 list-none -ml-5">No steps recorded — check the source link for the full method.</li>`;

  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 card-anim">
      <div class="flex justify-between items-start gap-2 mb-3">
        <div>
          <h3 class="text-xl font-bold text-slate-800">${escapeHtml(plan.recipeName)}</h3>
          <span class="badge">${escapeHtml(plan.mealType)}</span>
          ${plan.type === "recommended" ? `<span class="badge bg-purple-100 text-purple-700">recommended</span>` : `<span class="badge">mine</span>`}
        </div>
        <div class="text-right text-xs">
          ${plan.sourceUrl ? `<a href="${escapeHtml(plan.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline block">Source ↗</a>` : ""}
          <a href="${escapeHtml(plan.youtubeSearchUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline block">Search YouTube ↗</a>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center mb-3">
        <div class="macro-tile bg-slate-50 text-slate-700"><div class="font-bold">${formatNum(plan.prepTimeMin, 0)}m</div><div class="text-[10px] uppercase tracking-wide">prep</div></div>
        <div class="macro-tile bg-slate-50 text-slate-700"><div class="font-bold">${formatNum(plan.cookTimeMin, 0)}m</div><div class="text-[10px] uppercase tracking-wide">cook</div></div>
        <div class="macro-tile bg-slate-800 text-white"><div class="font-bold">${formatNum(totalTime, 0)}m</div><div class="text-[10px] uppercase tracking-wide">total</div></div>
      </div>

      <div class="grid grid-cols-4 gap-2 text-center mb-1">
        <div class="macro-tile bg-indigo-50 text-indigo-700"><div class="font-bold">${formatNum(plan.perPortion.cal, 0)}</div><div class="text-[10px] uppercase tracking-wide">cal/portion</div></div>
        <div class="macro-tile bg-rose-50 text-rose-700"><div class="font-bold">${formatNum(plan.perPortion.protein, 0)}g</div><div class="text-[10px] uppercase tracking-wide">protein</div></div>
        <div class="macro-tile bg-amber-50 text-amber-700"><div class="font-bold">${formatNum(plan.perPortion.carbs, 0)}g</div><div class="text-[10px] uppercase tracking-wide">carbs</div></div>
        <div class="macro-tile bg-teal-50 text-teal-700"><div class="font-bold">${formatNum(plan.perPortion.fat, 0)}g</div><div class="text-[10px] uppercase tracking-wide">fat</div></div>
      </div>
      <p class="text-xs text-center mb-4">${formatNum(plan.perPortion.cal, 0)} cal vs ${formatNum(plan.targetCalPerPortion, 0)} cal target — ${deltaBadge(plan.perPortion.cal, plan.targetCalPerPortion)}</p>

      <h4 class="font-semibold text-slate-700 mb-1">Ingredients (whole batch, ${plan.portions} portions)</h4>
      <ol class="list-decimal list-inside text-sm text-slate-600 space-y-0.5 mb-4">${ingredientItems}</ol>

      <h4 class="font-semibold text-slate-700 mb-1">Steps</h4>
      <ol class="list-decimal list-inside text-sm text-slate-600 space-y-1">${stepItems}</ol>
    </div>

    <div class="bg-slate-800 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-3 mt-4">
      <div>
        <div class="text-sm text-slate-300">Total batch</div>
        <div class="text-2xl font-bold">${formatNum(plan.totals.cal, 0)} cal <span class="text-sm font-normal text-slate-300">across ${plan.portions} portions</span></div>
      </div>
      <div class="text-sm">${formatNum(plan.totals.protein, 0)}g protein · ${formatNum(plan.totals.carbs, 0)}g carbs · ${formatNum(plan.totals.fat, 0)}g fat</div>
    </div>
    ${plan.type === "recommended" ? `<p class="text-xs text-slate-400 mt-3">No saved ${escapeHtml(plan.mealType)} recipes yet, so this used a starter idea from the Recommended tab — its ingredient list is a placeholder; add your own recipes for a fully personalized plan.</p>` : ""}
    ${plan.usedFallbackPool ? `<p class="text-xs text-slate-400 mt-1">No ${escapeHtml(plan.mealType)} recipe matched your time filters, so this ignores them — add faster recipes or loosen the filters.</p>` : ""}
  `;
}

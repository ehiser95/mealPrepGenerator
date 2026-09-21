// Meal plan generator: picks recipes (yours, or recommended if you don't
// have enough yet) and scales each one so the day lands near your calorie target.

function generateMealPlan(mealsCount, calorieTarget) {
  let pool = AppState.recipes
    .map((r) => ({ ref: r, type: "mine", per: computePerServing(r) }))
    .filter((p) => p.per.cal > 0);

  if (pool.length < mealsCount) {
    pool = pool.concat(
      RECOMMENDED_MEALS.map((r) => ({ ref: r, type: "recommended", per: r.perServing }))
    );
  }
  if (pool.length === 0) return null;

  const perMealTarget = calorieTarget / mealsCount;
  const slots = [];
  let recentlyUsed = [];

  for (let i = 0; i < mealsCount; i++) {
    let available = pool.filter((p) => !recentlyUsed.includes(p));
    if (available.length === 0) {
      recentlyUsed = [];
      available = pool;
    }
    const choice = available[Math.floor(Math.random() * available.length)];
    recentlyUsed.push(choice);

    const rawScale = choice.per.cal > 0 ? perMealTarget / choice.per.cal : 1;
    const scale = clamp(rawScale, 0.5, 3);

    slots.push({
      name: choice.ref.name,
      type: choice.type,
      sourceUrl:
        choice.type === "mine"
          ? choice.ref.sourceUrl || null
          : choice.ref.sourceUrl || null,
      youtubeSearchUrl:
        choice.type === "recommended"
          ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(choice.ref.youtubeQuery)
          : null,
      scale,
      cal: choice.per.cal * scale,
      protein: choice.per.protein * scale,
      carbs: choice.per.carbs * scale,
      fat: choice.per.fat * scale,
    });
  }

  const totals = slots.reduce(
    (a, s) => ({ cal: a.cal + s.cal, protein: a.protein + s.protein, carbs: a.carbs + s.carbs, fat: a.fat + s.fat }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { slots, totals, target: calorieTarget, usedRecommended: pool.some((p) => p.type === "recommended") };
}

function onGeneratePlan() {
  const mealsCount = parseInt(document.getElementById("planner-meals")?.value, 10) || 4;
  const calorieTarget = parseFloat(document.getElementById("planner-calories")?.value) || 2000;
  AppState.plannerMealsCount = mealsCount;
  AppState.plannerCalorieTarget = calorieTarget;

  const plan = generateMealPlan(mealsCount, calorieTarget);
  if (!plan) {
    toast("Add at least one recipe first, or check the Recommended tab.", "warning");
    return;
  }
  AppState.planLast = plan;
  renderApp();
}

function deltaBadge(totalCal, target) {
  const diffPct = Math.abs(totalCal - target) / target;
  if (diffPct <= 0.05) return `<span class="text-emerald-600 font-medium">on target</span>`;
  if (diffPct <= 0.15) return `<span class="text-amber-600 font-medium">close</span>`;
  return `<span class="text-rose-600 font-medium">off target</span>`;
}

function renderPlannerTab() {
  const mealsCount = AppState.plannerMealsCount || 4;
  const calorieTarget = AppState.plannerCalorieTarget || 2000;
  const plan = AppState.planLast;

  return `
    <h2 class="text-2xl font-bold text-slate-800 mb-1">Meal Plan Generator</h2>
    <p class="text-sm text-slate-500 mb-5">Pick how many meals you want to prep and your daily calorie target — we'll pull from your saved recipes (and recommended ideas if needed) and scale portions to fit.</p>

    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <div class="grid sm:grid-cols-3 gap-3 items-end">
        <label class="field-label">Number of meals
          <select id="planner-meals" class="field-input">
            ${[2, 4, 6, 8, 10].map((n) => `<option value="${n}" ${mealsCount === n ? "selected" : ""}>${n} meals</option>`).join("")}
          </select>
        </label>
        <label class="field-label">Daily calorie target
          <input type="number" id="planner-calories" min="500" step="50" value="${calorieTarget}" class="field-input">
        </label>
        <button data-action="generate-plan" class="btn-primary h-[42px]">${plan ? "Regenerate Plan" : "Generate Plan"}</button>
      </div>
      <p class="text-xs text-slate-400 mt-2">Tip: set up your Profile tab and click "Use as Meal Plan Target" to base this on your BMR/TDEE.</p>
    </div>

    ${plan ? renderPlanResults(plan) : ""}
  `;
}

function renderPlanResults(plan) {
  const rows = plan.slots
    .map(
      (s, i) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 card-anim">
      <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">${i + 1}</div>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-slate-800 truncate">${escapeHtml(s.name)}
          ${s.type === "recommended" ? `<span class="badge bg-purple-100 text-purple-700">recommended</span>` : `<span class="badge">mine</span>`}
        </div>
        <div class="text-xs text-slate-500">${formatNum(s.scale, 2)}x portion
          ${s.sourceUrl ? ` · <a href="${escapeHtml(s.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">source</a>` : ""}
          ${s.youtubeSearchUrl ? ` · <a href="${escapeHtml(s.youtubeSearchUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">search YouTube</a>` : ""}
        </div>
      </div>
      <div class="text-right shrink-0 text-sm">
        <div class="font-bold text-slate-800">${formatNum(s.cal, 0)} cal</div>
        <div class="text-xs text-slate-500">${formatNum(s.protein, 0)}P / ${formatNum(s.carbs, 0)}C / ${formatNum(s.fat, 0)}F</div>
      </div>
    </div>`
    )
    .join("");

  return `
    <div class="space-y-3 mb-5">${rows}</div>
    <div class="bg-slate-800 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-sm text-slate-300">Total for the day</div>
        <div class="text-2xl font-bold">${formatNum(plan.totals.cal, 0)} cal <span class="text-sm font-normal text-slate-300">/ target ${formatNum(plan.target, 0)}</span></div>
      </div>
      <div class="text-sm">
        ${formatNum(plan.totals.protein, 0)}g protein · ${formatNum(plan.totals.carbs, 0)}g carbs · ${formatNum(plan.totals.fat, 0)}g fat
        <div class="mt-1">${deltaBadge(plan.totals.cal, plan.target)}</div>
      </div>
    </div>
    ${plan.usedRecommended ? `<p class="text-xs text-slate-400 mt-3">Not enough saved recipes yet, so some slots used starter ideas from the Recommended tab — add more of your own recipes for a fully personalized plan.</p>` : ""}
  `;
}

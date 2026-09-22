// Recommended tab: curated starter meal ideas (see data.js for sources/caveats).

function renderRecommendedTab() {
  const cards = RECOMMENDED_MEALS.map((m) => `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 card-anim">
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(m.name)}</h3>
          <span class="badge">${escapeHtml(m.mealType)}</span>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">⏱ ${formatNum(m.prepTimeMin, 0)}m prep · ${formatNum(m.cookTimeMin, 0)}m cook</div>
        </div>
        <button data-action="add-recommended" data-id="${m.id}" class="btn-secondary text-xs whitespace-nowrap">+ Add to My Recipes</button>
      </div>
      <div class="grid grid-cols-4 gap-2 text-center my-3">
        <div class="macro-tile bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"><div class="font-bold">${formatNum(m.perServing.cal, 0)}</div><div class="text-[10px] uppercase tracking-wide">cal</div></div>
        <div class="macro-tile bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"><div class="font-bold">${formatNum(m.perServing.protein, 0)}g</div><div class="text-[10px] uppercase tracking-wide">protein</div></div>
        <div class="macro-tile bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><div class="font-bold">${formatNum(m.perServing.carbs, 0)}g</div><div class="text-[10px] uppercase tracking-wide">carbs</div></div>
        <div class="macro-tile bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300"><div class="font-bold">${formatNum(m.perServing.fat, 0)}g</div><div class="text-[10px] uppercase tracking-wide">fat</div></div>
      </div>
      <div class="text-xs text-slate-500 dark:text-slate-400 space-x-2">
        <a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline">${escapeHtml(m.sourceLabel)} ↗</a>
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(m.youtubeQuery)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline">Search YouTube ↗</a>
      </div>
    </div>
  `).join("");

  return `
    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Recommended Meals</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
      Starter ideas from well-known meal-prep sites, plus a ready-made YouTube search for each —
      macros here are estimates, not scraped data, so double check against the source before you rely on them.
      Add any of these to your library to use them in the Meal Plan Generator.
    </p>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
  `;
}

function addRecommendedToLibrary(id) {
  const m = RECOMMENDED_MEALS.find((x) => x.id === id);
  if (!m) return;
  const recipe = {
    id: uid(),
    name: m.name,
    category: m.mealType,
    servings: 1,
    sourceUrl: m.sourceUrl,
    prepTimeMin: m.prepTimeMin || 0,
    cookTimeMin: m.cookTimeMin || 0,
    steps: [
      { id: uid(), text: `Estimated macros only — see the original source (${m.sourceLabel}) for the exact method and ingredient list.` },
      ...(m.steps || []).map((text) => ({ id: uid(), text })),
    ],
    ingredients: [
      {
        id: uid(),
        name: "estimated recipe (edit ingredients to match source)",
        amount: 100,
        unit: "g",
        cal: m.perServing.cal,
        protein: m.perServing.protein,
        carbs: m.perServing.carbs,
        fat: m.perServing.fat,
      },
    ],
  };
  AppState.recipes.push(recipe);
  saveRecipes(AppState.recipes);
  toast(`Added "${m.name}" to My Recipes — edit its ingredients for accuracy`, "success");
  renderApp();
}

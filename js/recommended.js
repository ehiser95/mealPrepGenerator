// Recommended tab: curated starter meal ideas (see data.js for sources/caveats),
// with a live search over name / meal type / protein / ingredient keywords.

function filterRecommendedMeals(query) {
  const q = query.trim().toLowerCase();
  if (!q) return RECOMMENDED_MEALS;
  return RECOMMENDED_MEALS.filter((m) => {
    const haystack = [
      m.name,
      m.mealType,
      m.sourceLabel,
      ...(m.proteinTypes || []).map((p) => PROTEIN_TYPES[p] || p),
      ...(m.searchKeywords || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function renderRecommendedCard(m) {
  return `
    <div class="panel tile-hover p-4 card-anim">
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
      ${
        (m.proteinTypes || []).length
          ? `<div class="mb-2">${m.proteinTypes.map((p) => `<span class="badge mr-1">${escapeHtml(PROTEIN_TYPES[p] || p)}</span>`).join("")}</div>`
          : ""
      }
      <div class="text-xs text-slate-500 dark:text-slate-400 space-x-2">
        <a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline">${escapeHtml(m.sourceLabel)} ↗</a>
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(m.youtubeQuery)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline">Search YouTube ↗</a>
      </div>
    </div>
  `;
}

function renderRecommendedTiles(list) {
  if (list.length === 0) {
    return `<div class="empty-state"><p class="text-lg font-medium text-slate-600 dark:text-slate-300">No matches</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Try a different ingredient, protein, or meal type.</p></div>`;
  }
  return `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${list.map(renderRecommendedCard).join("")}</div>`;
}

function handleRecommendedSearchInput(el) {
  AppState.recommendedSearchQuery = el.value;
  const grid = document.getElementById("recommended-tiles-grid");
  if (grid) grid.innerHTML = renderRecommendedTiles(filterRecommendedMeals(el.value));
  const countEl = document.getElementById("recommended-count");
  if (countEl) {
    const n = filterRecommendedMeals(el.value).length;
    countEl.textContent = `${n} recipe${n === 1 ? "" : "s"}`;
  }
}

function renderRecommendedTab() {
  const query = AppState.recommendedSearchQuery || "";
  const filtered = filterRecommendedMeals(query);

  return `
    <h2 class="page-title mb-1">Recommended Meals</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
      Starter ideas from well-known meal-prep sites, plus a ready-made YouTube search for each —
      macros here are estimates, not scraped data, so double check against the source before you rely on them.
      Add any of these to your library to use them in the Meal Prep Planner.
    </p>

    <div class="panel p-4 mb-5">
      <input type="text" id="recommended-search-input" placeholder="Search by name, ingredient (e.g. ground beef, chicken breast), protein, or meal type…"
        value="${escapeHtml(query)}" class="field-input w-full">
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-1"><span id="recommended-count">${filtered.length} recipe${filtered.length === 1 ? "" : "s"}</span> · searches this built-in library, not the live web</p>
    </div>

    <div id="recommended-tiles-grid">${renderRecommendedTiles(filtered)}</div>
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

// Sharing & backup. There's no server, so "sharing with other users" works by
// generating a copy-paste code (or a downloaded file) that another person
// imports into their own copy of the app — nothing is transmitted anywhere.

function encodeShareCode(payload) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeShareCode(code) {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function showShareCode(id) {
  const recipe = AppState.recipes.find((r) => r.id === id);
  if (!recipe) return;
  AppState.activeTab = "share";
  AppState.shareCodeOutput = encodeShareCode({ type: "mpg-recipe", v: 1, recipe });
  AppState.shareCodeRecipeName = recipe.name;
  renderApp();
  toast(`Share code for "${recipe.name}" generated below`, "success");
}

async function copyShareCodeToClipboard() {
  const code = document.getElementById("share-code-output")?.value;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast("Copied to clipboard", "success");
  } catch (e) {
    toast("Couldn't access the clipboard — select and copy the text manually", "warning");
  }
}

function importShareCodeFromInput() {
  const code = document.getElementById("share-code-input")?.value;
  if (!code || !code.trim()) {
    toast("Paste a share code first", "error");
    return;
  }
  const data = decodeShareCode(code);
  if (!data) {
    toast("That code doesn't look valid", "error");
    return;
  }
  if (data.type === "mpg-recipe" && data.recipe) {
    const recipe = normalizeRecipe({ ...data.recipe, id: uid() });
    AppState.recipes.push(recipe);
    saveRecipes(AppState.recipes);
    toast(`Imported recipe "${recipe.name}"`, "success");
  } else if (data.type === "mpg-backup") {
    if (!confirm("This will add the recipes and profiles from this backup to your existing data. Continue?")) return;
    (data.recipes || []).forEach((r) => AppState.recipes.push(normalizeRecipe({ ...r, id: uid() })));
    (data.profiles || []).forEach((p) => AppState.profiles.push({ ...p, id: uid() }));
    saveRecipes(AppState.recipes);
    saveProfiles(AppState.profiles);
    toast("Backup imported", "success");
  } else {
    toast("Unrecognized code format", "error");
    return;
  }
  const input = document.getElementById("share-code-input");
  if (input) input.value = "";
  renderApp();
}

function exportAllData() {
  const payload = { type: "mpg-backup", v: 1, exportedAt: new Date().toISOString(), recipes: AppState.recipes, profiles: AppState.profiles };
  downloadJson(`meal-prep-generator-backup-${Date.now()}.json`, payload);
  toast("Backup downloaded", "success");
}

function importAllDataFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm("This will add the recipes and profiles from this file to your existing data. Continue?")) return;
      (data.recipes || []).forEach((r) => AppState.recipes.push(normalizeRecipe({ ...r, id: uid() })));
      (data.profiles || []).forEach((p) => AppState.profiles.push({ ...p, id: uid() }));
      saveRecipes(AppState.recipes);
      saveProfiles(AppState.profiles);
      toast("Backup file imported", "success");
      renderApp();
    } catch (e) {
      toast("That file doesn't look like a valid backup", "error");
    }
  };
  reader.readAsText(file);
}

async function exportRecipesToFolder() {
  if (!("showDirectoryPicker" in window)) {
    toast('Folder export needs a Chromium browser (Chrome/Edge) served over http(s). Use "Download Backup" instead.', "warning");
    return;
  }
  if (AppState.recipes.length === 0) {
    toast("No recipes to export yet", "warning");
    return;
  }
  try {
    const rootHandle = await window.showDirectoryPicker();
    const mealsHandle = await rootHandle.getDirectoryHandle("Meals", { create: true });
    for (const r of AppState.recipes) {
      const catHandle = await mealsHandle.getDirectoryHandle(r.category || "Other", { create: true });
      const fileHandle = await catHandle.getFileHandle(`${sanitizeFileName(r.name)}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(r, null, 2));
      await writable.close();
    }
    toast(`Exported ${AppState.recipes.length} recipe(s) into Meals/<category>/ folders`, "success");
  } catch (err) {
    if (err.name !== "AbortError") toast("Folder export failed: " + err.message, "error");
  }
}

function handleResetAll() {
  if (!confirm("This permanently deletes every recipe, profile, and setting stored in this browser. This can't be undone. Continue?")) return;
  resetAllData();
  toast("All data cleared", "success");
  setTimeout(() => location.reload(), 700);
}

function renderShareTab() {
  return `
    <h2 class="text-2xl font-bold text-slate-800 mb-1">Share &amp; Backup</h2>
    <p class="text-sm text-slate-500 mb-5">There's no shared server here, so sharing works peer-to-peer: generate a code (or a file) and send it to someone else running this same app — they paste/import it into their own copy.</p>

    ${AppState.shareCodeOutput ? `
    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <h3 class="font-semibold text-slate-700 mb-2">Share code for "${escapeHtml(AppState.shareCodeRecipeName)}"</h3>
      <textarea id="share-code-output" readonly rows="3" class="w-full border rounded-lg px-3 py-2 text-xs font-mono bg-slate-50">${escapeHtml(AppState.shareCodeOutput)}</textarea>
      <button data-action="copy-share-code" class="btn-secondary text-sm mt-2">Copy to Clipboard</button>
    </div>` : ""}

    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <h3 class="font-semibold text-slate-700 mb-2">Import a share code or backup</h3>
      <textarea id="share-code-input" rows="3" placeholder="Paste a share code here…" class="w-full border rounded-lg px-3 py-2 text-xs font-mono"></textarea>
      <button data-action="import-share-code" class="btn-primary text-sm mt-2">Import</button>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <h3 class="font-semibold text-slate-700 mb-2">Full backup</h3>
      <p class="text-xs text-slate-400 mb-3">Download everything (recipes + profiles) as a file, or export your recipes into real Meals/&lt;category&gt;/ folders on disk (Chrome/Edge only).</p>
      <div class="flex flex-wrap gap-2">
        <button data-action="export-all" class="btn-secondary text-sm">Download Backup (.json)</button>
        <label class="btn-secondary text-sm cursor-pointer">
          Import Backup File
          <input type="file" id="import-file-input" accept="application/json" class="hidden">
        </label>
        <button data-action="export-folder" class="btn-secondary text-sm">Export to Meals/ Folder</button>
      </div>
    </div>

    <div class="bg-rose-50 border border-rose-200 rounded-xl p-5">
      <h3 class="font-semibold text-rose-700 mb-2">Danger zone</h3>
      <p class="text-xs text-rose-500 mb-3">Deletes all recipes, profiles, and settings from this browser.</p>
      <button data-action="reset-all" class="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">Reset All Data</button>
    </div>
  `;
}

// Small shared helpers used across the app.

function toGrams(amount, unit) {
  const factor = UNIT_TO_GRAMS[unit] || 1;
  return (Number(amount) || 0) * factor;
}

function uid() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function formatNum(n, decimals) {
  const d = decimals === undefined ? 0 : decimals;
  const v = Number(n);
  if (!isFinite(v)) return (0).toFixed(d);
  return v.toFixed(d);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function sanitizeFileName(name) {
  const cleaned = String(name || "")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return cleaned || "recipe";
}

function toast(message, type) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const colors = {
    success: "bg-emerald-600",
    error: "bg-rose-600",
    warning: "bg-amber-500",
    info: "bg-slate-800",
  };
  const el = document.createElement("div");
  el.className =
    "toast-enter text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-sm " +
    (colors[type] || colors.info);
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-enter-active"));
  setTimeout(() => {
    el.classList.add("toast-exit");
    setTimeout(() => el.remove(), 300);
  }, 3600);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

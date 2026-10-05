// Google Sign-In via Google Identity Services, entirely in the browser.
// Uses only the OAuth client ID from js/config.local.js (gitignored). The
// client secret is never used: the sign-in button hands an ID token straight
// to the page, with no server-side code exchange.
// With no backend, the token's signature can't be verified, so sign-in
// decides which profiles this browser shows; it doesn't encrypt anything.

const GOOGLE_USER_KEY = "mpg_google_user_v1";
const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

// unconfigured | needs-server | loading | ready | error
const GoogleAuth = { status: "unconfigured", error: "" };

function googleClientId() {
  return String((window.APP_CONFIG && window.APP_CONFIG.googleClientId) || "").trim();
}

function loadStoredGoogleUser() {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function storeGoogleUser(user) {
  try {
    if (user) localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(GOOGLE_USER_KEY);
  } catch (e) {
    // Storage blocked (private window, etc.): sign-in still works for this visit.
  }
}

function initGoogleAuth() {
  AppState.googleUser = loadStoredGoogleUser();
  const clientId = googleClientId();
  if (!clientId) {
    GoogleAuth.status = "unconfigured";
    return;
  }
  // Google only accepts sign-in from http(s) origins listed on the OAuth client.
  if (location.protocol === "file:") {
    GoogleAuth.status = "needs-server";
    return;
  }
  GoogleAuth.status = "loading";
  const script = document.createElement("script");
  script.src = GSI_SCRIPT_URL;
  script.async = true;
  script.onload = () => {
    try {
      google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential, auto_select: false });
      GoogleAuth.status = "ready";
    } catch (e) {
      GoogleAuth.status = "error";
      GoogleAuth.error = "Google sign-in failed to start: " + e.message;
    }
    if (AppState.activeTab === "profile") renderApp();
  };
  script.onerror = () => {
    GoogleAuth.status = "error";
    GoogleAuth.error = "Couldn't load Google's sign-in script. Check your internet connection or any ad/tracker blocker.";
    if (AppState.activeTab === "profile") renderApp();
  };
  document.head.appendChild(script);
}

function decodeJwtPayload(token) {
  const part = String(token).split(".")[1] || "";
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function handleGoogleCredential(response) {
  let claims;
  try {
    claims = decodeJwtPayload(response.credential);
  } catch (e) {
    toast("Google returned a sign-in token this app couldn't read. Try signing in again.", "error");
    return;
  }
  if (claims.aud !== googleClientId()) {
    toast("That sign-in was issued for a different app. Check the client ID in js/config.local.js.", "error");
    return;
  }
  const user = {
    sub: claims.sub,
    name: claims.name || claims.email || "Google user",
    email: claims.email || "",
    picture: claims.picture || "",
  };
  AppState.googleUser = user;
  storeGoogleUser(user);
  const linked = linkProfileToGoogleUser(user);
  toast(linked ? `Signed in as ${user.name}. Your profile "${linked}" is now tied to this account.` : `Signed in as ${user.name}`, "success");
  renderApp();
}

function signOutGoogle() {
  const name = AppState.googleUser && AppState.googleUser.name;
  if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  AppState.googleUser = null;
  storeGoogleUser(null);
  ensureActiveProfileVisible();
  toast(name ? `Signed out of ${name}` : "Signed out", "success");
  renderApp();
}

// renderApp() replaces the page's HTML, so the Google button is re-rendered
// into its placeholder after every render.
function mountGoogleButton() {
  const el = document.getElementById("google-signin-btn");
  if (!el || GoogleAuth.status !== "ready" || !(window.google && google.accounts && google.accounts.id)) return;
  el.innerHTML = "";
  google.accounts.id.renderButton(el, {
    type: "standard",
    theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
  });
}

function renderGoogleBox() {
  const user = AppState.googleUser;
  if (user) {
    return `
    <div class="panel p-4 mb-5 flex flex-wrap items-center gap-4">
      ${user.picture ? `<img src="${escapeHtml(user.picture)}" alt="" referrerpolicy="no-referrer" class="w-12 h-12 rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800">` : ""}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(user.name)}</div>
        <div class="text-sm text-slate-500 dark:text-slate-400 truncate">${escapeHtml(user.email)}</div>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Only profiles tied to this Google account show up while you're signed in. They're still stored in this browser, not synced to other devices.</p>
      </div>
      <button data-action="google-signout" class="btn-secondary text-sm">Sign out</button>
    </div>`;
  }
  const box = (body) =>
    `<div class="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 text-sm text-slate-600 dark:text-slate-300">${body}</div>`;
  switch (GoogleAuth.status) {
    case "ready":
      return `
      <div class="panel p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-semibold text-slate-800 dark:text-slate-100">Sign in with Google</div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Keeps your profiles separate from anyone else who uses this browser.</p>
        </div>
        <div id="google-signin-btn"></div>
      </div>`;
    case "loading":
      return box("Loading Google sign-in…");
    case "needs-server":
      return box(`<strong>Google sign-in needs the app running on a local server.</strong> Google blocks sign-in on files opened directly.
        In the app folder, run <code class="px-1 rounded bg-slate-200 dark:bg-slate-700">npx serve .</code> or
        <code class="px-1 rounded bg-slate-200 dark:bg-slate-700">python -m http.server 8000</code>, then open the address it prints.`);
    case "error":
      return box(`<strong>Google sign-in isn't available right now.</strong> ${escapeHtml(GoogleAuth.error)}`);
    default:
      return box(`<strong>Google sign-in isn't set up on this copy.</strong> Copy <code class="px-1 rounded bg-slate-200 dark:bg-slate-700">js/config.example.js</code>
        to <code class="px-1 rounded bg-slate-200 dark:bg-slate-700">js/config.local.js</code> and add your OAuth client ID. The README has the steps.`);
  }
}

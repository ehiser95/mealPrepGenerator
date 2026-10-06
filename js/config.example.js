// Copy this file to js/config.local.js and paste in your Firebase web app
// settings (Firebase console → Project settings → Your apps → SDK setup and
// configuration → Config). js/config.local.js is gitignored, so these values
// stay out of GitHub.
//
// These values aren't passwords: Firebase uses them to find your project,
// and every visitor's browser needs them. What protects your data is
// firestore.rules (invited accounts only, each sees only their own data).
// Never put an OAuth client secret or a service-account key in this app.
window.APP_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
  },
};

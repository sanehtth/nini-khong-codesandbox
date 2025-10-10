/* public/js/nini-fb.mjs — ESM build (export default) */
/* eslint-disable */
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- init ----
const firebaseConfig = window.__NINI_FIREBASE_CONFIG__ || {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---- helpers ----
function apiBase() {
  return {
    sendReset: '/.netlify/functions/send-reset',
    sendVerify: '/.netlify/functions/send-verification-email',
    fallbackReset: '/api/send-reset',
    fallbackVerify: '/api/send-verification-email',
  };
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { msg = (await res.json()).message || msg; } catch(e) {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch(e) { return {}; }
}

// ---- auth flows ----
export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function loginEmailPass(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerEmailPass(email, password, displayName = '') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

// === email dùng mail pro ===
export async function resetPassword(email) {
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    continueUrl: location.origin + '/#/home',
    reason: 'user-forgot',
  };
  try {
    return await postJSON(base.sendReset, payload);
  } catch {
    return await postJSON(base.fallbackReset, payload);
  }
}

export async function sendEmailVerification(email) {
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    continueUrl: location.origin + '/#/home',
  };
  try {
    return await postJSON(base.sendVerify, payload);
  } catch {
    return await postJSON(base.fallbackVerify, payload);
  }
}

export async function logout() {
  await signOut(auth);
}

export function onUserChanged(cb) {
  return onAuthStateChanged(auth, (u) => cb ? cb(u || null) : null);
}

const NINI = {
  fb: {
    loginGoogle,
    loginEmailPass,
    registerEmailPass,
    resetPassword,
    sendEmailVerification,
    logout,
    onUserChanged,
    _auth: auth,
    _app: app,
  }
};

export default NINI;

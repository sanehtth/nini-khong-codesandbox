/* public/js/nini-fb.mjs — ESM + gắn global NINI */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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

/* Lấy config thật từ window (nini-config.js đã set) */
const firebaseConfig = window.__NINI_FIREBASE_CONFIG__ || {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* endpoints gửi mail qua server (mail pro) */
function apiBase() {
  return {
    sendReset: "/.netlify/functions/send-reset",
    sendVerify: "/.netlify/functions/send-verification-email",
    fallbackReset: "/api/send-reset",
    fallbackVerify: "/api/send-verification-email",
  };
}
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).message || msg; } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return {}; }
}

/* ====== API ====== */
export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}
export async function loginEmailPass(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
/* alias cho header cũ có thể gọi loginEmailPassword */
export const loginEmailPassword = loginEmailPass;

export async function registerEmailPass(email, password, displayName = "") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

/* Gửi mail bằng mail pro (Netlify Functions / fallback) */
export async function resetPassword(email) {
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    continueUrl: location.origin + "/#/home",
    reason: "user-forgot",
  };
  try { return await postJSON(base.sendReset, payload); }
  catch { return await postJSON(base.fallbackReset, payload); }
}
export async function sendEmailVerification(email) {
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    continueUrl: location.origin + "/#/home",
  };
  try { return await postJSON(base.sendVerify, payload); }
  catch { return await postJSON(base.fallbackVerify, payload); }
}

export async function logout() { await signOut(auth); }
export function onUserChanged(cb) { return onAuthStateChanged(auth, u => cb?.(u || null)); }

/* ====== GẮN GLOBAL để header.js / auth-modal.js truy cập ====== */
const _NINI = {
  fb: {
    loginGoogle,
    loginEmailPass,
    loginEmailPassword,  // alias
    registerEmailPass,
    resetPassword,
    sendEmailVerification,
    logout,
    onUserChanged,
    _auth: auth,
    _app: app,
  },
};
globalThis.NINI = Object.assign(globalThis.NINI || {}, _NINI);

/* default export (nếu bạn import từ module khác) */
export default globalThis.NINI;

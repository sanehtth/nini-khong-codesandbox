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

// ===== Mail Pro endpoints (không cần nini-config.js) =====
// Mặc định: Netlify Functions. Có thể override bằng window.NINI_MAIL_ENDPOINTS
const MAIL = Object.assign({
  reset:  "/.netlify/functions/send-reset",
  verify: "/.netlify/functions/send-verification-email",
  make:   "/.netlify/functions/make-reset-link",
  // 2 lựa chọn tuỳ hạ tầng (nếu chuyển qua Vercel/Cloudflare, chỉ cần override 1 chỗ này):
  // reset:  "/api/send-reset",
  // verify: "/api/send-verification-email",
  // make:   "/api/make-reset-link",
}, (window.NINI_MAIL_ENDPOINTS || {}));

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload||{})
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text || `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} at ${url}: ${msg}`);
  }
  return data || {};
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

// ====== Email-only signup flow ======
import {
  getAuth, createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Tạo mật khẩu tạm an toàn (16 ký tự)
function _genTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/,'') + 'A9!';
}

// endpoints mail pro (bạn đã có)
function apiBase() {
  return {
    sendVerify: "/.netlify/functions/send-verification-email",
    makeReset:  "/.netlify/functions/make-reset-link", // nếu bạn tách riêng
    // fallback (nếu có backend /api)
    sendVerify2: "/api/send-verification-email",
    makeReset2:  "/api/make-reset-link",
  };
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload||{})
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text || `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} at ${url}: ${msg}`);
  }
  return data || {};
}

// 1) Tạo user tạm (email + tempPass) rồi gửi mail xác minh qua mail pro
export async function registerEmailOnly(email) {
  await init(); // dùng init() hiện có của bạn
  const tempPass = _genTempPassword();
  const auth = getAuth(app);

  // Nếu user đã tồn tại ở trạng thái “chưa verify”, tạo lại sẽ 400 — ta ignore nếu mã lỗi là email-already-in-use
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, tempPass);
    // đặt displayName tối thiểu (không bắt buộc)
    try { await updateProfile(user, { displayName: email.split('@')[0] }); } catch {}
  } catch (e) {
    if (!String(e?.code).includes('email-already-in-use')) throw e;
  }

  // Gửi mail xác minh bằng mail pro
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    // trang xác minh xong sẽ mở (auth-action.html của bạn)
    continueUrl: location.origin + "/auth-action.html?mode=verifyEmail&email=" + encodeURIComponent(email)
  };
  try { await postJSON(base.sendVerify, payload); }
  catch { await postJSON(base.sendVerify2, payload); }

  return { ok: true };
}

// 2) Sau khi user bấm link xác minh → tạo link reset pass để user đặt mật khẩu thật
export async function makePasswordResetLink(email) {
  await init();
  const base = apiBase();
  const payload = {
    email,
    origin: location.origin,
    continueUrl: location.origin + "/reset-password.html" // hoặc profile.html/recover.html của bạn
  };
  try { return await postJSON(base.makeReset, payload); }
  catch { return await postJSON(base.makeReset2, payload); }
}


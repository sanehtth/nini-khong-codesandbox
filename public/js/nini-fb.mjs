/* ========================================================================
 * NiNi — Firebase + Mail Pro wrapper (ESM)
 * Single-file, KHÔNG cần /public/js/nini-config.js
 *
 * MỤC TIÊU:
 *  - Pro-first email (Mail Pro: verify / reset / make-reset-link)
 *  - Lỗi server → fallback Firebase SDK (không chặn người dùng)
 *  - API gọn + tương thích UI cũ qua alias
 * ===================================================================== */

/* =========================
 * 0) IMPORTS (Firebase v10)
 * ======================= */
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================================================
 * 1) CONFIG — điền của bạn ở đây (hoặc set window.__NINI_FIREBASE_CONFIG__)
 * ======================================================= */
const FIREBASE_CONFIG = window.__NINI_FIREBASE_CONFIG__ || {
  
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
  
};

/* =========================================================
 * 2) MAIL ENDPOINTS — ưu tiên Netlify, có thể override 1 chỗ
 * ======================================================= */
const MAIL = Object.assign({
  reset : "/.netlify/functions/send-reset",
  verify: "/.netlify/functions/send-verification-email",
  make  : "/.netlify/functions/make-reset-link",
}, (window.NINI_MAIL_ENDPOINTS || {}));

/* tiện ích POST JSON, trả error rõ ràng */
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload || {})
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text || `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} at ${url}: ${msg}`);
  }
  return data || {};
}

/* =========================================================
 * 3) EVENT BUS NHẸ — cho header/onoff nghe trạng thái
 * ======================================================= */
const N = (window.NINI = window.NINI || {});
if (!N.emit || !N.on) {
  const _map = new Map();
  N.emit = (evt, data) => { (_map.get(evt) || []).forEach(fn => { try{ fn(data); }catch{} }); };
  N.on   = (evt, fn) => { if(!_map.has(evt)) _map.set(evt, []); _map.get(evt).push(fn); };
}

/* =========================================================
 * 4) INIT — khởi tạo Firebase app/auth (một lần)
 * ======================================================= */
let app = null;
let auth = null;
let inited = false;
export async function init() {
  if (inited && app && auth) return { app, auth };

  const cfg = FIREBASE_CONFIG;
  const valid = cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
  if (!valid) {
    throw new Error("[NINI.fb] Thiếu Firebase config. Hãy điền FIREBASE_CONFIG trong nini-fb.mjs (mục 1).");
  }

  if (!getApps().length) app = initializeApp(cfg);
  else app = getApps()[0];
  auth = getAuth(app);
  inited = true;

  // gắn listener user change 1 lần
  if (!N._userWatcher) {
    onAuthStateChanged(auth, (user) => {
      N.emit('user:changed', user || null);
      if (!N.fb) N.fb = {};
      N.fb._user = user || null;   // ✅ KHÔNG dùng optional chaining ở vế trái
      if (user) console.log("[NINI] user:", user.email || user.uid);
      else console.log("[NINI] user: signed out");
    });
    N._userWatcher = true;
  }

  return { app, auth };
}

/* =========================================================
 * 5) SUBSCRIBE USER + HELPER TOKEN
 * ======================================================= */
export function onUserChanged(cb) { N.on('user:changed', cb); }
export function currentUser()    { return N.fb?._user || null; }
export async function getIdToken(force=false) {
  await init(); const u = currentUser(); if (!u) return null;
  return await u.getIdToken(force);
}

/* =========================================================
 * 6) ĐĂNG NHẬP: Google / Email
 * ======================================================= */
export async function googleLogin() {
  await init();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}
export async function login(email, password) {
  await init();
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

/* =========================================================
 * 7) ĐĂNG KÝ EMAIL-ONLY
 *    - tạo user tạm (email + mật khẩu ngẫu nhiên)
 *    - gửi mail xác minh qua Mail Pro
 * ======================================================= */
function _genTempPassword() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...b)).replace(/=+$/,'') + 'A9!';
}
export async function registerEmailOnly(email) {
  await init();
  email = String(email || '').trim().toLowerCase();
  if (!email) throw new Error("Vui lòng nhập email.");

  // 1) tạo user tạm
  const tmp = _genTempPassword();
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, tmp);
    try { await updateProfile(user, { displayName: email.split('@')[0] }); } catch {}
  } catch (e) {
    // nếu email đã tồn tại (chưa verify) thì bỏ qua
    if (!String(e?.code).includes('email-already-in-use')) throw e;
  }

  // 2) gửi verify qua Mail Pro
  await postJSON(MAIL.verify, {
    email,
    origin: location.origin,
    continueUrl: location.origin + "/auth-action.html?mode=verifyEmail&email=" + encodeURIComponent(email)
  });

  return { ok:true };
}

/* =========================================================
 * 8) QUÊN MẬT KHẨU (RESET)
 *    - Ưu tiên Mail Pro → lỗi thì fallback Firebase SDK
 * ======================================================= */
export async function resetPassword(email) {
  await init();
  email = String(email || '').trim().toLowerCase();
  if (!email) throw new Error("Vui lòng nhập email.");

  try {
    await postJSON(MAIL.reset, {
      email,
      origin: location.origin,
      continueUrl: location.origin + "/reset-password.html"
    });
    return { ok:true, via:"mail-pro" };
  } catch (e) {
    await sendPasswordResetEmail(auth, email, {
      url: location.origin + "/reset-password.html"
    });
    return { ok:true, via:"firebase-sdk" };
  }
}

/* =========================================================
 * 9) TẠO LINK RESET CHUẨN FIREBASE (qua function)
 *    - Server có thể trả { resetUrl } để redirect luôn
 * ======================================================= */
export async function makePasswordResetLink(email) {
  await init();
  email = String(email || '').trim().toLowerCase();
  if (!email) throw new Error("Thiếu email.");

  const r = await postJSON(MAIL.make, {
    email,
    origin: location.origin,
    continueUrl: location.origin + "/reset-password.html"
  });
  return r || { ok:true };
}

/* =========================================================
 * 10) ĐĂNG XUẤT
 * ======================================================= */
export async function logout() { await init(); await signOut(auth); }

/* =========================================================
 * 11) EXPOSE ra NINI.fb & ALIAS cho UI cũ
 * ======================================================= */
N.fb = Object.assign(N.fb || {}, {
  init,
  onUserChanged,
  googleLogin,
  login,
  registerEmailOnly,
  resetPassword,
  makePasswordResetLink,
  logout,
  currentUser,
  getIdToken,
  _app: () => app, _auth: () => auth
});

// --- Alias tương thích UI cũ (để không phải sửa modal cũ) ---
N.fb.loginEmailPass      = login;
N.fb.loginEmailPassword  = login;
N.fb.sendReset           = resetPassword;
N.fb.makeReset           = makePasswordResetLink;

// Tự init sớm (có thể bỏ nếu muốn chủ động gọi ở ngoài)
init().catch(err => console.error(err?.message || err));

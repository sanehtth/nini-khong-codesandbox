/* ========================================================================
 * NiNi — Firebase + Mail Pro wrapper (ESM)
 * Single-file: KHÔNG cần /public/js/nini-config.js nữa
 *
 * MỤC TIÊU:
 * - Cấp API gọn cho UI:
 *     NINI.fb.init()
 *     NINI.fb.onUserChanged(cb)
 *     NINI.fb.googleLogin()
 *     NINI.fb.login(email, password)
 *     NINI.fb.registerEmailOnly(email)           // đăng ký chỉ cần email
 *     NINI.fb.resetPassword(email)               // ưu tiên Mail Pro → fallback Firebase
 *     NINI.fb.makePasswordResetLink(email)       // tạo link reset chuẩn Firebase qua function
 *     NINI.fb.logout()
 *     NINI.fb.currentUser()
 *     NINI.fb.getIdToken(forceRefresh?)
 *
 * - ƯU TIÊN Mail Pro (Netlify/Vercel/Cloudflare): send-verify / send-reset / make-reset-link
 *   Khi server lỗi → fallback Firebase SDK để không block người dùng.
 *
 * - KHÔNG chứa URL ảnh/UI: chỉ lo phần auth & mail.
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
 * 1) CONFIG — điền của bạn vào đây (copy từ nini-config.js cũ)
 *    Nếu muốn giữ tách bạch, bạn có thể set trước:
 *      window.__NINI_FIREBASE_CONFIG__ = {...}  // ở <script> inline
 *    Khi không có, code sẽ dùng object dưới.
 * ======================================================= */
const FIREBASE_CONFIG = window.__NINI_FIREBASE_CONFIG__ || {
  /* TODO: THAY bằng config thật của bạn
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
  */
};

/* =========================================================
 * 2) MAIL PRO ENDPOINTS — pro-first, có thể override 1 chỗ
 *    Nếu deploy ở Vercel/Cloudflare, đổi sang /api/... cho phù hợp.
 *    Có thể override bằng:
 *       window.NINI_MAIL_ENDPOINTS = { reset:"/api/...", verify:"/api/...", make:"/api/..." }
 * ======================================================= */
const MAIL = Object.assign({
  reset : "/.netlify/functions/send-reset",
  verify: "/.netlify/functions/send-verification-email",
  make  : "/.netlify/functions/make-reset-link",
}, (window.NINI_MAIL_ENDPOINTS || {}));

/* tiện ích fetch JSON với error rõ ràng */
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
 * 3) STATE & EVENT BUS (nhẹ) — để header/onoff nghe trạng thái
 * ======================================================= */
const N = (window.NINI = window.NINI || {});
/* event bus đơn giản: N.emit('evt', data) / N.on('evt', cb) */
if (!N.emit || !N.on) {
  const _map = new Map();
  N.emit = (evt, data) => { (_map.get(evt) || []).forEach(fn => { try{ fn(data); }catch{} }); };
  N.on   = (evt, fn) => { if(!_map.has(evt)) _map.set(evt, []); _map.get(evt).push(fn); };
}

/* lưu đối tượng firebase */
let app = null;
let auth = null;
let inited = false;

/* =========================================================
 * 4) INIT — khởi tạo Firebase app/auth (một lần)
 * ======================================================= */
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
      N.emit('user:changed', user || null);     // phát sự kiện chung
      N.fb?._user = user || null;               // lưu
      if (user) console.log("[NINI] user:", user.email || user.uid);
      else console.log("[NINI] user: signed out");
    });
    N._userWatcher = true;
  }

  return { app, auth };
}

/* =========================================================
 * 5) SUBSCRIBE USER — cho UI nghe trạng thái đăng nhập
 * ======================================================= */
export function onUserChanged(cb) { N.on('user:changed', cb); }
export function currentUser() { return N.fb?._user || null; }
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
 *     - tạo user tạm (email + mật khẩu ngẫu nhiên)
 *     - gửi mail xác minh qua Mail Pro
 *     - UI (auth-action.html) sẽ tùy chọn tạo link reset sau verify
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
 *     - Ưu tiên Mail Pro
 *     - Lỗi → fallback Firebase SDK để vẫn gửi được
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
    // fallback qua Firebase SDK
    await sendPasswordResetEmail(auth, email, {
      url: location.origin + "/reset-password.html"
    });
    return { ok:true, via:"firebase-sdk" };
  }
}

/* =========================================================
 * 9) TẠO LINK RESET CHUẨN FIREBASE QUA FUNCTION
 *     - Dùng trong auth-action sau khi user đã verify
 *     - Server có thể trả { resetUrl } để redirect luôn
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
  // Có thể là { resetUrl } hoặc { ok:true } (nếu server đã gửi mail)
  return r || { ok:true };
}

/* =========================================================
 * 10) ĐĂNG XUẤT
 * ======================================================= */
export async function logout() {
  await init(); await signOut(auth);
}

/* =========================================================
 * 11) EXPOSE ra NINI.fb để code cũ dùng
 *     (đồng thời export qua ESM cho code mới)
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
  // nội bộ: giữ app/auth phục vụ debug nếu cần
  _app: () => app, _auth: () => auth
});

// Tự init sớm (optional). Có thể bỏ nếu muốn chủ động gọi ở ngoài.
init().catch(err => console.error(err?.message || err));

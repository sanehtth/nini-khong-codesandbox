/**
 * nini-fb.js (MODULE)
 * - Firebase Auth (Google popup)
 * - Expose API ra window.NINI.fb để code khác dùng
 * - Tự lắng nghe onAuthStateChanged và phát sự kiện + callback
 *
 * LƯU Ý: File này là "type=module". Dùng CDN của Firebase để chạy trên site tĩnh.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* -----------------------------------------------------
   1) Firebase config — THAY BẰNG CỦA BẠN
   Bạn có thể gán sẵn window.__NINI_FB_CONFIG ở HTML
   rồi khỏi sửa trong file: const firebaseConfig = window.__NINI_FB_CONFIG || {...}
----------------------------------------------------- */
const firebaseConfig = window.__NINI_FB_CONFIG || {
  apiKey:       "PASTE_YOUR_API_KEY",
  authDomain:   "PASTE_YOUR_AUTH_DOMAIN",
  projectId:    "PASTE_YOUR_PROJECT_ID",
  appId:        "PASTE_YOUR_APP_ID",
  // (các field khác nếu bạn có: storageBucket, messagingSenderId, measurementId…)
};

/* -----------------------------------------------------
   2) Khởi tạo lười
----------------------------------------------------- */
let _app, _auth, _provider, _inited = false;
const _listeners = new Set();          // các callback onAuth
let _lastUser = null;                   // cache user hiện tại

function _initOnce() {
  if (_inited) return;
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);

  // Lưu session vào localStorage để lần sau vẫn giữ đăng nhập
  setPersistence(_auth, browserLocalPersistence).catch(console.warn);

  _provider = new GoogleAuthProvider();
  _provider.setCustomParameters({ prompt: "select_account" });

  // Lắng nghe đổi trạng thái auth
  onAuthStateChanged(_auth, (user) => {
    _lastUser = user || null;

    // Phát sự kiện DOM để ai cần có thể bắt (tuỳ chọn)
    window.dispatchEvent(new CustomEvent("nini:auth", { detail: { user: _lastUser }}));

    // Gọi các callback đã đăng ký qua NINI.fb.onAuth()
    for (const cb of _listeners) {
      try { cb(_lastUser); } catch(e) { console.error(e); }
    }
  });

  _inited = true;
  console.info("[nini-fb] initialized");
}

/* -----------------------------------------------------
   3) API tiện dụng
----------------------------------------------------- */
async function signInGoogle() {
  _initOnce();
  try {
    const cred = await signInWithPopup(_auth, _provider);
    return cred.user;
  } catch (err) {
    // Trình duyệt chặn popup thường ném lỗi ở đây
    console.error("[nini-fb] signInGoogle error:", err);
    throw err;
  }
}

async function signOutUser() {
  _initOnce();
  try {
    await signOut(_auth);
  } catch (err) {
    console.error("[nini-fb] signOut error:", err);
    throw err;
  }
}

function getCurrentUser() {
  _initOnce();
  return _auth.currentUser || _lastUser || null;
}

/**
 * Đăng ký callback khi trạng thái đăng nhập thay đổi.
 * Trả về hàm hủy đăng ký.
 */
function onAuth(cb) {
  _initOnce();
  if (typeof cb === "function") {
    _listeners.add(cb);
    // gọi ngay lần đầu với user hiện tại (nếu đã có)
    try { cb(getCurrentUser()); } catch(e) {}
    return () => _listeners.delete(cb);
  }
  return () => {};
}

/* -----------------------------------------------------
   4) Expose ra global
----------------------------------------------------- */
window.NINI = window.NINI || {};
window.NINI.fb = {
  // Khởi tạo thủ công (nếu muốn) — thường không cần gọi
  initApp: _initOnce,

  // Auth helpers
  signInGoogle,
  signOut:       signOutUser,
  getCurrentUser,
  onAuth,
};

console.info("[nini-fb] loaded");

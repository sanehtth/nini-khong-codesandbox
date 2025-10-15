/**
 * nini-fb.mjs — Firebase Auth wrapper (1-file)
 * - Khởi tạo Firebase App/Auth (chỉ 1 lần)
 * - Cung cấp API: onUserChanged, currentUser, loginEmailPass, loginGoogle, logout
 * - Gọi mail-pro: registerEmailOnly(email), resetPassword(email)
 *
 * Cấu hình cần có (1 trong 2):
 * 1) window.__NINI_FIREBASE_CONFIG__ = { apiKey, authDomain, projectId, appId, ... }
 *    // (bạn đã nhét SDK thật vào file này rồi thì thôi không cần biến global)
 *
 * 2) Hoặc điền trực tiếp vào const FIREBASE_CONFIG bên dưới.
 *
 * Mail endpoints (có sẵn default hợp với Netlify):
 *   window.__NINI_MAIL_ENDPOINTS__ = {
 *     verify: "/.netlify/functions/send-verification-email",
 *     reset : "/.netlify/functions/send-reset"
 *   }
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence, // dev: không giữ phiên sau khi đóng trình duyệt
  // inMemoryPersistence,   // dev mạnh tay: mỗi reload là sạch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ======= CONFIG =======
const FIREBASE_CONFIG =
  (window.__NINI_FIREBASE_CONFIG__) || {
apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
  };
document.dispatchEvent(new Event('NiNi:fb-ready'));

const MAIL = Object.assign(
  {
    // Netlify function (mặc định)
    verify: "/.netlify/functions/send-verification-email",
    reset: "/.netlify/functions/send-reset",
  },
  window.__NINI_MAIL_ENDPOINTS__ || {}
);

// ======= INIT APP + AUTH (chỉ 1 lần) =======
let app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// Với môi trường dev, tránh “tự đăng nhập lại”:
await setPersistence(auth, browserSessionPersistence);
// // Nếu muốn mỗi reload luôn là khách thì dùng in-memory:
// await setPersistence(auth, inMemoryPersistence);

function expose(obj) {
  const N = (window.NINI = window.NINI || {});
  N.fb = Object.assign(N.fb || {}, obj);
}

// ======= API =======
function onUserChanged(cb) {
  // trả về unsubscriber để hủy nếu cần
  return onAuthStateChanged(auth, (u) => cb(u || null));
}

function currentUser() {
  return auth.currentUser || null;
}

async function loginEmailPass(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);
  return user;
}

async function logout() {
  await signOut(auth);
  // chờ state = null để UI chắc chắn về OUT
  await new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => {
      if (!u) {
        off();
        resolve();
      }
    });
  });
}

/**
 * Đăng ký email-only: tạo user tạm & gửi mail xác minh qua mail-pro.
 * Ở đây mình **chỉ** gọi mail endpoint (không tạo user Firebase ngay),
 * vì flow của bạn là xác minh xong mới reset pass -> set mật khẩu thật.
 */
async function registerEmailOnly(email) {
  const res = await fetch(MAIL.verify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    let msg = "Gửi email xác minh thất bại";
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return true;
}

async function resetPassword(email) {
  const res = await fetch(MAIL.reset, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    let msg = "Gửi link đặt lại mật khẩu thất bại";
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return true;
}

// ======= EXPOSE TO WINDOW =======
expose({
  onUserChanged,
  currentUser,
  loginEmailPass,
  loginGoogle,
  logout,
  registerEmailOnly,
  resetPassword,
});

export {
  onUserChanged,
  currentUser,
  loginEmailPass,
  loginGoogle,
  logout,
  registerEmailOnly,
  resetPassword,
};



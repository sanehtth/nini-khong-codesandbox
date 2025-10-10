// /public/js/nini-fb.js  (ESM)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// !!! ĐIỀN CẤU HÌNH DỰ ÁN CỦA BẠN
const firebaseConfig = {
  apiKey:        "YOUR_API_KEY",
  authDomain:    "YOUR_PROJECT.firebaseapp.com",
  projectId:     "YOUR_PROJECT_ID",
  appId:         "YOUR_APP_ID",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const google = new GoogleAuthProvider();

// --- helpers ---
function mapAuthError(err) {
  const c = err?.code || '';
  if (c.includes('user-not-found')) return 'Email chưa được đăng ký.';
  if (c.includes('invalid-email'))  return 'Email không hợp lệ.';
  if (c.includes('too-many-requests')) return 'Bạn thử quá nhiều lần, thử lại sau.';
  return err?.message || String(err);
}

// --- APIs bạn dùng ở header ---
async function loginGoogle() {
  const cred = await signInWithPopup(auth, google);
  return cred.user;
}

async function logout() {
  await signOut(auth);
}

function onUserChanged(cb) {
  return onAuthStateChanged(auth, (u) => cb(u || null));
}

function getCurrentUser() {
  return auth.currentUser || null;
}

async function resetPassword(email) {
  // Gửi mail reset thật
  await sendPasswordResetEmail(auth, email, {
    url: 'https://nini-funny.com/#/home',   // trang quay lại sau khi reset xong
    handleCodeInApp: false                  // để Firebase gửi link trực tiếp
  });
}

// Expose cho window (để header gọi)
window.NINI = window.NINI || {};
window.NINI.fb = {
  loginGoogle,
  logout,
  onUserChanged,
  getCurrentUser,
  resetPassword,
};

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
 apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
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


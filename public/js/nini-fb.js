// /public/js/nini-fb.js
// Module ESM – NHÚNG với: <script type="module" src="/public/js/nini-fb.js"></script>

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  setPersistence, browserLocalPersistence, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// !!! THAY bằng config của project bạn (Firebase console → Project settings):
const firebaseConfig = {
  apiKey:        'YOUR_API_KEY',
  authDomain:    'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:     'YOUR_PROJECT_ID',
  appId:         'YOUR_APP_ID',
};

let app, auth, _inited = false;

async function init() {
  if (_inited) return auth;
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence); // giữ đăng nhập
  _inited = true;
  return auth;
}

async function getCurrentUser() {
  await init();
  return auth.currentUser || new Promise(resolve => {
    const off = onAuthStateChanged(auth, u => { off(); resolve(u || null); });
  });
}

function onAuthChange(cb) {
  init().then(() => onAuthStateChanged(auth, u => cb(u || null)));
}

async function loginModal() {
  // Bản đơn giản: đăng nhập Google popup.
  // Bạn có thể thay bằng email/OTP/modal riêng nếu muốn.
  await init();
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.warn('Login error:', err?.message || err);
    alert('Đăng nhập không thành công. Vui lòng thử lại!');
  }
}

async function logout() {
  await init();
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Logout error:', err?.message || err);
  }
}

// Gắn vào global cho header gọi: NINI.fb.*
globalThis.NINI = globalThis.NINI || {};
globalThis.NINI.fb = {
  init,
  getCurrentUser,
  onAuthChange,
  loginModal,
  logout,
};

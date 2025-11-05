// /test/js/nini-fb.mjs
// Firebase Auth wrapper (1-file, thống nhất API & sự kiện)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- CONFIG ----
const FIREBASE_CONFIG = (window.__NINI_FIREBASE_CONFIG__) || {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
};

const MAIL = Object.assign(
  {
    verify: "/.netlify/functions/send-verification-email",
    reset : "/.netlify/functions/send-reset",
  },
  window.__NINI_MAIL_ENDPOINTS__ || {}
);

// ---- INIT (1 lần) ----
let app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
await setPersistence(auth, browserSessionPersistence);

// Provider dùng lại
const googleProvider = new GoogleAuthProvider();

// ---- Helper: hứng kết quả sau khi redirect quay lại ----
async function initAuthRedirectResult(){
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      // cập nhật global + phát event để UI (sidebar/profile) render
      window.NiNi = window.NiNi || {};
      window.NiNi.user = cred.user;
      document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: cred.user }));
      window.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: cred.user }));
    }
  } catch (_) {
    // im lặng, không ảnh hưởng luồng chính
  }
}
await initAuthRedirectResult();

// ---- Core API ----
function onUserChanged(cb){ return onAuthStateChanged(auth, u => cb(u || null)); }
function currentUser(){ return auth.currentUser || null; }

async function loginEmailPass(email, password){
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// Google login: thử popup → nếu bị chặn/huỷ thì fallback redirect
async function loginGoogle(){
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    return user;
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null; // sẽ quay lại trang & initAuthRedirectResult() sẽ hứng user
    }
    throw e;
  }
}

async function logout(){
  await signOut(auth);
  // đợi state null để UI chắc chắn đổi nút
  await new Promise(res => {
    const off = onAuthStateChanged(auth, u => { if(!u){ off(); res(); }});
  });
}

async function registerEmailOnly(email){
  const r = await fetch(MAIL.verify, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email })
  });
  if (!r.ok){
    let msg = "Gửi email xác minh thất bại";
    try{ const j = await r.json(); if(j?.error) msg = j.error; }catch{}
    throw new Error(msg);
  }
  return true;
}

async function resetPassword(email){
  const r = await fetch(MAIL.reset, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email })
  });
  if (!r.ok){
    let msg = "Gửi link đặt lại mật khẩu thất bại";
    try{ const j = await r.json(); if(j?.error) msg = j.error; }catch{}
    throw new Error(msg);
  }
  return true;
}

// ---- Expose vào window ----
(function(){
  const N = (window.N = window.N || {});
  N.fb = Object.assign(N.fb || {}, {
    // tên hàm “chuẩn” cho UI:
    onAuthChanged     : onUserChanged,     // subscribe
    currentUser       : currentUser,
    signInEmailPass   : loginEmailPass,
    signInGoogle      : loginGoogle,       // <— QUAN TRỌNG: đã có fallback
    signOut           : logout,
    sendSignInEmail   : registerEmailOnly,
    sendReset         : resetPassword,

    // alias ngắn (nếu code cũ gọi):
    signIn            : loginEmailPass,
  });

  // phát fb-ready **sau khi** đã gắn N.fb
  document.dispatchEvent(new Event("NiNi:fb-ready"));

  // broadcast khi auth đổi trạng thái (để sidebar/header/profile nghe)
  onUserChanged(user => {
    window.dispatchEvent(new CustomEvent("NiNi:auth-changed", { detail: user || null }));
    document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: user || null }));
  });
})();

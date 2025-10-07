// NiNi — AUTH (SMTP verify + resend + forgot) + toast + logs

/* ---------- Firebase ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ---------- Firebase Config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184"
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ---------- LocalStorage Keys ---------- */
const FLAG   = "NINI_AUTH_LOGGED_IN";
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

/* ---------- DOM helpers ---------- */
const byId = (id) => document.getElementById(id);

/* Header */
const headerAuthBtn = byId("authBtn");   // nút “Đăng nhập / Đăng ký”
const btnLogout     = byId("btnLogout");
const whoSpan       = byId("who");

/* Modal + Tabs */
const modal    = byId("authModal");
const authTabs = byId("authTabs");

/* Login (chấp nhận id cũ để không vỡ) */
const loginEmail = byId("loginEmail");
const login

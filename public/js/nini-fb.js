/* /public/js/fb.js  —  Firebase helper cho toàn site NiNi
   - Khởi tạo 1 lần, tái sử dụng
   - Cung cấp: app, auth, db
   - Tiện ích: onAuth, signInEmail, signInGoogle, logout, getIdToken,
               OTP phone (Recaptcha), Firestore users: readUser/saveUser
   - Re-export: EmailAuthProvider, GoogleAuthProvider, linkWithCredential,
                reauthenticateWithCredential, reauthenticateWithPopup, updatePassword
*/
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut,
  GoogleAuthProvider, EmailAuthProvider,
  linkWithCredential, reauthenticateWithCredential, reauthenticateWithPopup, updatePassword,
  RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* --- Config của NiNi (đổi nếu cần) --- */
export const firebaseConfig = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184"
};

let app, auth, db;
let _recaptcha = null;

/* Khởi tạo idempotent */
export function initFirebase(cfg = firebaseConfig) {
  app = getApps().length ? getApp() : initializeApp(cfg);
  auth = getAuth(app);
  db   = getFirestore(app);
  // Nhớ phiên đăng nhập trong trình duyệt
  setPersistence(auth, browserLocalPersistence).catch(()=>{});
  return { app, auth, db };
}

/* Trả về services (nếu cần gọi nhanh) */
export function getServices() {
  if (!app) initFirebase();
  return { app, auth, db };
}

/* ---------- AUTH cơ bản ---------- */
export function onAuth(handler) {
  if (!auth) initFirebase();
  return onAuthStateChanged(auth, handler);
}

export async function signInEmail(email, password) {
  if (!auth) initFirebase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInGoogle() {
  if (!auth) initFirebase();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logout() {
  if (!auth) initFirebase();
  await signOut(auth);
}

export async function getIdToken(force = false) {
  if (!auth) initFirebase();
  const u = auth.currentUser;
  return u ? await u.getIdToken(force) : null;
}

export function isEmailVerified(u = auth?.currentUser) {
  return !!(u && u.emailVerified);
}

/* ---------- OTP Phone (xác minh số điện thoại) ---------- */
export function ensureRecaptcha(containerId = "recaptcha-container", size = "invisible") {
  if (!auth) initFirebase();
  if (_recaptcha) return _recaptcha;
  // eslint-disable-next-line no-undef
  _recaptcha = new RecaptchaVerifier(auth, containerId, { size });
  return _recaptcha;
}

export async function sendPhoneOTP(phone, containerId = "recaptcha-container") {
  if (!auth) initFirebase();
  ensureRecaptcha(containerId);
  // Trả về confirmationResult để trang gọi confirm(code)
  return await signInWithPhoneNumber(auth, phone, _recaptcha);
}

export async function confirmPhoneOTP(confirmationResult, code) {
  const cred = await confirmationResult.confirm(code);
  return cred.user;
}

/* ---------- Firestore: users/<uid> ---------- */
export function userRef(uid) {
  if (!db) initFirebase();
  return doc(db, "users", uid);
}

export async function readUser(uid) {
  const s = await getDoc(userRef(uid));
  return s.exists() ? s.data() : null;
}

export async function saveUser(uid, data, merge = true) {
  await setDoc(userRef(uid), { ...data, updatedAt: Date.now() }, { merge });
}

/* ---------- Re-exports để dùng nơi khác (đổi/thêm mật khẩu, link account) ---------- */
export {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
};

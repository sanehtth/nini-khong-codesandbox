// /public/js/nini-fb.js  (type="module")
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

/* ==========
   CẤU HÌNH FIREBASE
   ========== */
const firebaseConfig = {
 apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
  // (các field khác nếu có)
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const google = new GoogleAuthProvider();

/* ==========
   HELPERS
   ========== */
function mapAuthError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'Email này đã được đăng ký.';
  if (code.includes('invalid-email'))        return 'Email không hợp lệ.';
  if (code.includes('weak-password'))        return 'Mật khẩu quá yếu (>= 6 ký tự).';
  if (code.includes('user-not-found'))       return 'Email chưa được đăng ký.';
  if (code.includes('wrong-password'))       return 'Mật khẩu không đúng.';
  if (code.includes('too-many-requests'))    return 'Bạn thao tác quá nhiều, thử lại sau.';
  return err?.message || String(err);
}

/* ==========
   API EXPOSE
   ========== */
async function loginGoogle() {
  const cred = await signInWithPopup(auth, google);
  return cred.user;
}

async function loginEmailPass(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function registerEmailPass(email, password, displayName = '') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

async function resetPassword(email) {
  // Gửi reset qua “mail pro” thay vì Firebase
  const res = await fetch('/api/send-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      origin: location.origin,
      continueUrl: location.origin + '/#/home',
      reason: 'user-forgot'
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Gửi email đặt lại mật khẩu thất bại');
  }

  // có thể return payload nếu server cần
  return res.json().catch(() => ({}));
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

/* ==========
   GẮN LÊN WINDOW
   ========== */
window.NINI = window.NINI || {};
window.NINI.fb = {
  loginGoogle,
  loginEmailPass,
  registerEmailPass,
  resetPassword,
  logout,
  onUserChanged,
  getCurrentUser,
};


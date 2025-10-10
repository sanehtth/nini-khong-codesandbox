/* public/js/nini-fb.js  —  Non-module build (attach to window.NINI.fb) */
/* eslint-disable */
(function () {
  // ---- Firebase core (giữ nguyên SDK bạn đang dùng) ----
  // Giả sử bạn đã load SDK firebase-app, firebase-auth ở index/profile
  const {
    initializeApp,
  } = window.firebase || {};
  const {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut,
  } = (window.firebase && window.firebase.auth) || {};

  // ---- Khởi tạo app/auth (dùng config của bạn) ----
  // Nếu bạn đang init ở nơi khác rồi thì bỏ duplicate:
  const firebaseConfig = window.__NINI_FIREBASE_CONFIG__ || {
     apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
  };
  const app = (window.__NINI_APP__) || initializeApp(firebaseConfig);
  const auth = getAuth(app);
  window.__NINI_APP__ = app;

  // ---- Helper: chọn base API cho mail pro (Netlify/Vercel/Custom) ----
  function apiBase() {
    // Thứ tự ưu tiên:
    // 1) /.netlify/functions   2) /api
    return {
      sendReset: '/.netlify/functions/send-reset',
      sendVerify: '/.netlify/functions/send-verification-email',
      fallbackReset: '/api/send-reset',
      fallbackVerify: '/api/send-verification-email',
    };
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      let msg = 'Request failed';
      try { msg = (await res.json()).message || msg; } catch(e) {}
      throw new Error(msg);
    }
    try { return await res.json(); } catch(e) { return {}; }
  }

  // ---- Auth helpers (giữ nguyên behaviour) ----
  async function loginGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
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

  // === CHỈNH QUAN TRỌNG: dùng MAIL PRO thay vì Firebase cho email ===

  // 1) Quên mật khẩu -> gọi hàm serverless gửi email reset (mail pro)
  async function resetPassword(email) {
    const base = apiBase();
    const payload = {
      email,
      origin: location.origin,
      // Sau khi người dùng đặt xong mật khẩu -> quay về đâu
      continueUrl: location.origin + '/#/home',
      reason: 'user-forgot',
    };

    // Thử Netlify functions trước
    try {
      return await postJSON(base.sendReset, payload);
    } catch (e) {
      // fallback /api
      return await postJSON(base.fallbackReset, payload);
    }
  }

  // 2) Gửi email verify qua mail pro
  async function sendEmailVerification(email) {
    const base = apiBase();
    const payload = {
      email,
      origin: location.origin,
      // Sau khi verify xong -> tự động set pass mặc định + send reset link (logic do serverless lo)
      continueUrl: location.origin + '/#/home',
    };

    try {
      return await postJSON(base.sendVerify, payload);
    } catch (e) {
      return await postJSON(base.fallbackVerify, payload);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  function onUserChanged(cb) {
    return onAuthStateChanged(auth, (u) => cb ? cb(u || null) : null);
  }

  // ---- Expose ra window.NINI.fb ----
  const api = {
    // sign-in / sign-up
    loginGoogle,
    loginEmailPass,
    registerEmailPass,
    // mail-pro flows
    resetPassword,             // <-- dùng MAIL PRO
    sendEmailVerification,     // <-- dùng MAIL PRO
    // session
    logout,
    onUserChanged,
    // để các nơi khác có thể truy cập auth app nếu cần
    _auth: auth,
    _app: app,
  };

  (window.NINI = window.NINI || {}).fb = api;
})();

// ===================== NiNi Auth JS (ONE FILE, SAFE) =====================
// Firebase (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Firebase config ---
const NINI_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
};

const NINI_APP  = initializeApp(NINI_FIREBASE_CONFIG);
const NINI_AUTH = getAuth(NINI_APP);

// ===== Guard: tránh init 2 lần nếu lỡ nhúng trùng =====
(() => {
  if (window.__NINI_AUTH_BOOTED__) {
    console.warn("[NiNi] auth.js already initialized — skip rewire");
    return;
  }
  window.__NINI_AUTH_BOOTED__ = true;

  // ---------- Helpers ----------
  const NINI_$id = (id) => document.getElementById(id);
  const NINI_setNote = (el, msg, ok=true) => { if(!el) return; el.textContent = msg || ""; el.style.color = ok ? "#0f5132" : "#7f1d1d"; };
  function NINI_cleanEmail(s) {
    return String(s || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/\s/g, "")                    // mọi khoảng trắng
      .toLowerCase();
  }
  function NINI_mapAuthErr(e) {
    const code = e?.code || "";
    return (
      code === "auth/invalid-email"     ? "Email không hợp lệ." :
      code === "auth/user-not-found"    ? "Email chưa đăng ký." :
      code === "auth/wrong-password"    ? "Mật khẩu sai." :
      code === "auth/too-many-requests" ? "Bạn thử quá nhiều lần, vui lòng thử lại sau." :
      e?.message || "Yêu cầu thất bại."
    );
  }
  function NINI_findEmailInput(root) {
    const qs = [
      "#loginEmail",
      'input[type="email"]',
      'input[name="loginEmail"]',
      'input[name="email"]',
      'input[id*="email" i]',
    ];
    for (const sel of qs) { const el = root.querySelector(sel); if (el) return el; }
    return null;
  }
  function NINI_findPasswordInput(root) {
    const qs = [
      "#loginPassword",
      'input[type="password"]',
      'input[name="loginPassword"]',
      'input[name="password"]',
      'input[id*="password" i]',
    ];
    for (const sel of qs) { const el = root.querySelector(sel); if (el) return el; }
    return null;
  }
  function NINI_noteElFor(root) {
    return root.querySelector("#loginNote, .login-note") || NINI_$id("loginNote");
  }

  // ---------- Endpoints ----------
  const NINI_VERIFY_API = "/.netlify/functions/send-verification-email";

  // ---------- API: gửi email xác minh (định nghĩa 1 lần) ----------
  async function NINI_sendVerify(emailInput) {
    const email = NINI_cleanEmail(
      typeof emailInput === "string"
        ? emailInput
        : emailInput?.email || emailInput?.user?.email || ""
    );
    const res = await fetch(NINI_VERIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const text = await res.text(); let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
    if (!res.ok) {
      console.error("[verify] FAILED", res.status, data, "sent=", email);
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    console.log("[verify] OK", data, "sent=", email);
    return data;
  }

  // ---------- LOGIN core ----------
  async function NINI_doLoginFrom(scope, source="unknown") {
    const emailEl = NINI_findEmailInput(scope) || NINI_$id("loginEmail");
    const pwEl    = NINI_findPasswordInput(scope) || NINI_$id("loginPassword");
    const note    = NINI_noteElFor(scope);

    const email = NINI_cleanEmail(emailEl?.value);
    const pw    = String(pwEl?.value || "");

    console.log("[login] source=", source, "emailEl=", !!emailEl, "pwEl=", !!pwEl, "email=", email);

    if (!email) { NINI_setNote(note, "Bạn chưa nhập email.", false); emailEl?.focus(); return; }
    if (!pw)    { NINI_setNote(note, "Bạn chưa nhập mật khẩu.", false); pwEl?.focus();   return; }

    try {
      NINI_setNote(note, "Đang đăng nhập...");
      const cred = await signInWithEmailAndPassword(NINI_AUTH, email, pw);
      console.log("[login] OK uid=", cred.user?.uid, "verified=", cred.user?.emailVerified);
      NINI_setNote(note, "Đăng nhập thành công!", true);
      // TODO: đóng modal / cập nhật UI tại đây nếu muốn
    } catch (e) {
      console.error("[login] FAIL:", e);
      NINI_setNote(note, NINI_mapAuthErr(e), false);
    }
  }

  // ---------- Delegation: submit form (Enter) ----------
  document.addEventListener("submit", (ev) => {
    const form = ev.target.closest("form");
    if (!form) return;
    // form login có ô mật khẩu
    if (NINI_findPasswordInput(form)) {
      ev.preventDefault();
      NINI_doLoginFrom(form, "form-submit");
    }
  }, true);

  // ---------- Delegation: click các nút ----------
  document.addEventListener("click", async (ev) => {
    // Đăng nhập
    const btnLogin = ev.target.closest(
      '#btnLogin, [data-role="btn-login"], button[name="login"], button[id*="login" i], button'
    );
    if (btnLogin) {
      const txt = (btnLogin.textContent || "").trim().toLowerCase();
      if (
        btnLogin.id === "btnLogin" ||
        btnLogin.getAttribute("data-role") === "btn-login" ||
        /đăng nhập/i.test(txt) || /login/.test(txt)
      ) {
        if (btnLogin.closest("form")) ev.preventDefault();
        const scope = btnLogin.closest(".auth-panel") || btnLogin.closest("form") || document;
        NINI_doLoginFrom(scope, "button-click");
        return;
      }
    }

    // Gửi email xác minh (đăng ký mới / gửi lại)
    const btnVerify = ev.target.closest('[data-role="btn-send-verify"], #btnSendVerify, #btnEmailSignup');
    if (btnVerify) {
      const scope  = btnVerify.closest(".auth-panel") || document;
      const emailEl = scope.querySelector('#signupEmail, #verifyEmail, #loginEmail') ||
                      NINI_$id('signupEmail') || NINI_$id('loginEmail');
      const noteEl  = scope.querySelector('#signupNote, .signup-note, #loginNote') ||
                      NINI_$id('signupNote') || NINI_$id('loginNote');
      try {
        const email = NINI_cleanEmail(emailEl?.value || "");
        if (!email) { NINI_setNote(noteEl, "Bạn chưa nhập email.", false); return; }
        await NINI_sendVerify(email);
        NINI_setNote(noteEl, "Đã gửi email xác minh – kiểm tra hộp thư nhé.", true);
      } catch (e) {
        NINI_setNote(noteEl, e.message || "Không gửi được email xác minh.", false);
      }
      return;
    }

    // Quên mật khẩu (nếu dùng flow này)
    const btnForgot = ev.target.closest('#btnForgotSend, [data-role="btn-forgot-send"]');
    if (btnForgot) {
      const scope  = btnForgot.closest(".auth-panel") || document;
      const emailEl = scope.querySelector('#forgot_email, #loginEmail') ||
                      NINI_$id('forgot_email') || NINI_$id('loginEmail');
      const noteEl  = scope.querySelector('#forgotNote, .forgot-note, #loginNote') ||
                      NINI_$id('forgotNote') || NINI_$id('loginNote');
      try {
        const email = NINI_cleanEmail(emailEl?.value || "");
        if (!email) { NINI_setNote(noteEl, "Bạn chưa nhập email.", false); return; }
        await sendPasswordResetEmail(NINI_AUTH, email, {
          url: "https://nini-funny.com/reset-password.html",
          handleCodeInApp: true,
        });
        NINI_setNote(noteEl, "Đã gửi link đặt lại mật khẩu – kiểm tra email nhé.", true);
      } catch (e) {
        console.error("[forgot] FAIL:", e);
        NINI_setNote(noteEl, NINI_mapAuthErr(e), false);
      }
      return;
    }

    // Google login (tuỳ chọn)
    const btnGoogle = ev.target.closest('#btnGoogleLogin, [data-role="btn-google"]');
    if (btnGoogle) {
      try {
        await signInWithPopup(NINI_AUTH, new GoogleAuthProvider());
        const note = NINI_noteElFor(btnGoogle.closest(".auth-panel") || document);
        NINI_setNote(note, "Đăng nhập Google thành công!", true);
      } catch (e) {
        console.error("[google] FAIL:", e);
        const note = NINI_noteElFor(btnGoogle.closest(".auth-panel") || document);
        NINI_setNote(note, "Đăng nhập Google thất bại.", false);
      }
    }
  });

  // ---------- Theo dõi trạng thái đăng nhập (tuỳ bạn update UI) ----------
  onAuthStateChanged(NINI_AUTH, (user) => {
    console.log("[auth] state:", user ? `IN (${user.email})` : "OUT");
    // ví dụ:
    // if (user) document.body.classList.add('logged-in');
    // else document.body.classList.remove('logged-in');
  });
})(); // END guard
// ================== END ==================

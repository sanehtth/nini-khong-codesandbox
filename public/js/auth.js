// ===================== NiNi Auth JS (FULL, SMTP reset) =====================
// Firebase (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
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

  // ---------- Endpoints ----------
  const VERIFY_API = "/.netlify/functions/send-verification-email";
  const RESET_API  = "/.netlify/functions/send-reset"; // << dùng SMTP mail pro

  // ---------- Helpers ----------
  const $id = (id) => document.getElementById(id);
  const setNote = (el, msg, ok = true) => {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "#0f5132" : "#7f1d1d";
  };
  function cleanEmail(s) {
    return String(s || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/\s/g, "")                    // xoá khoảng trắng
      .toLowerCase();
  }
  function mapAuthError(e) {
    const code = e?.code || "";
    return (
      code === "auth/invalid-email"     ? "Email không hợp lệ." :
      code === "auth/user-not-found"    ? "Email chưa đăng ký." :
      code === "auth/wrong-password"    ? "Mật khẩu sai." :
      code === "auth/too-many-requests" ? "Bạn thử quá nhiều lần, vui lòng thử lại sau." :
      code === "auth/invalid-credential"? "Email hoặc mật khẩu không đúng." :
      e?.message || "Yêu cầu thất bại."
    );
  }
  // Tìm input email/password linh hoạt (để Enter/submit cũng chạy)
  function findEmailInput(root) {
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
  function findPasswordInput(root) {
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
  function noteElFor(root) {
    return root.querySelector("#loginNote, .login-note") || $id("loginNote");
  }

  // --- AUTH FLAG for site (index/profile can read) ---
  const AUTH_FLAG_KEY = "NINI_AUTH_LOGGED_IN";
  function setAuthFlag(val) {
    const v = val ? "1" : "0";
    try { localStorage.setItem(AUTH_FLAG_KEY, v); } catch {}
    window.niniAuth = window.niniAuth || {};
    window.niniAuth.isLoggedIn = !!val;
    window.dispatchEvent(new CustomEvent("nini:authchange", { detail: { loggedIn: !!val }}));
  }
  function toggleAuthUI(user) {
    const loggedIn = !!user || (localStorage.getItem(AUTH_FLAG_KEY) === "1");
    document.querySelectorAll("[data-show='in']").forEach(el => el.style.display = loggedIn ? "" : "none");
    document.querySelectorAll("[data-show='out']").forEach(el => el.style.display = loggedIn ? "none" : "");
    document.querySelectorAll(".who").forEach(el => el.textContent = user?.displayName || user?.email || "");
  }

  // --- Redirect after login ---
  function NINI_goHome() {
    const url = new URLSearchParams(location.search).get("next") || "/index.html";
    location.replace(url);
  }

  // ---------- API callers ----------
  async function apiSendVerify(emailInput) {
    const email = cleanEmail(
      typeof emailInput === "string"
        ? emailInput
        : emailInput?.email || emailInput?.user?.email || ""
    );
    const res = await fetch(VERIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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

  async function apiSendReset(email) {
    const res = await fetch(RESET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const text = await res.text(); let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
    if (!res.ok) {
      console.error("[reset] FAILED", res.status, data);
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    console.log("[reset] OK", data);
    return data;
  }

  // ---------- LOGIN core ----------
  async function doLoginFrom(scope, source = "unknown") {
    const emailEl = findEmailInput(scope) || $id("loginEmail");
    const pwEl    = findPasswordInput(scope) || $id("loginPassword");
    const note    = noteElFor(scope);

    const email = cleanEmail(emailEl?.value);
    const pw    = String(pwEl?.value || "");

    console.log("[login] source=", source, "emailEl=", !!emailEl, "pwEl=", !!pwEl, "email=", email);

    if (!email) { setNote(note, "Bạn chưa nhập email.", false); emailEl?.focus(); return; }
    if (!pw)    { setNote(note, "Bạn chưa nhập mật khẩu.", false); pwEl?.focus();   return; }

    try {
      setNote(note, "Đang đăng nhập...");
      const cred = await signInWithEmailAndPassword(NINI_AUTH, email, pw);
      console.log("[login] OK uid=", cred.user?.uid, "verified=", cred.user?.emailVerified);

      setAuthFlag(true);
      toggleAuthUI(cred.user);
      setNote(note, "Đăng nhập thành công!", true);
      NINI_goHome(); // chuyển về index
    } catch (e) {
      console.error("[login] FAIL:", e);
      setNote(note, mapAuthError(e), false);
      setAuthFlag(false);
      toggleAuthUI(null);
      // Gợi ý hiện nút resend verify nếu cần (tuỳ hệ thống có chặn unverified hay không)
      const btnResend = $id("btnResendVerify");
      if (btnResend) btnResend.style.display = "";
    }
  }

  // ---------- Delegation: submit form (Enter) ----------
  document.addEventListener("submit", (ev) => {
    const form = ev.target.closest("form");
    if (!form) return;
    if (findPasswordInput(form)) {
      ev.preventDefault();
      doLoginFrom(form, "form-submit");
    }
  }, true);

  // ---------- Delegation: click các nút ----------
  document.addEventListener("click", async (ev) => {
    const target = ev.target;

    // Đăng nhập bằng email/password
    if (target.closest("#btnEmailLogin, [data-role='btn-login']")) {
      const scope = target.closest(".auth-panel, [data-pane='login']") || document;
      if (target.closest("form")) ev.preventDefault();
      doLoginFrom(scope, "button-click");
      return;
    }

    // Google login (optional)
    if (target.closest("#btnGoogleLogin, [data-role='btn-google']")) {
      const note = $id("loginNote");
      try {
        setNote(note, "Đang đăng nhập Google...");
        const cred = await signInWithPopup(NINI_AUTH, new GoogleAuthProvider());
        setAuthFlag(true);
        toggleAuthUI(cred.user);
        setNote(note, "Đăng nhập Google thành công!", true);
        NINI_goHome();
      } catch (e) {
        console.error("[google] FAIL:", e);
        setNote(note, "Đăng nhập Google thất bại.", false);
      }
      return;
    }

    // Gửi email xác minh (đăng ký mới / resend)
    if (target.closest("#btnEmailSignup, #btnResendVerify, [data-role='btn-send-verify']")) {
      const emailEl =
        $id("signupEmail") || $id("loginEmail");
      const noteEl =
        $id("signupNote") || $id("loginNote");
      try {
        const email = cleanEmail(emailEl?.value || "");
        if (!email) { setNote(noteEl, "Bạn chưa nhập email.", false); return; }
        await apiSendVerify(email);
        setNote(noteEl, "Đã gửi email xác minh – kiểm tra hộp thư nhé.", true);
      } catch (e) {
        setNote(noteEl, e.message || "Không gửi được email xác minh.", false);
      }
      return;
    }

    // Quên mật khẩu — gửi qua SMTP mail pro (Netlify function /send-reset)
    if (target.closest("#btnForgotSend, [data-role='btn-forgot-send']")) {
      const emailEl = $id("forgot_email") || $id("loginEmail");
      const noteEl  = $id("forgotNote") || $id("loginNote");
      const btn     = target.closest("#btnForgotSend, [data-role='btn-forgot-send']");
      const email   = cleanEmail(emailEl?.value || "");
      if (!email) { setNote(noteEl, "Bạn chưa nhập email.", false); return; }

      btn.disabled = true;
      setNote(noteEl, "Đang gửi email đặt lại mật khẩu…", true);
      try {
        await apiSendReset(email);
        setNote(noteEl, "Đã gửi link đặt lại mật khẩu – kiểm tra hộp thư nhé.", true);
      } catch (e) {
        setNote(noteEl, e?.message || "Không gửi được email đặt lại mật khẩu.", false);
      } finally {
        btn.disabled = false;
      }
      return;
    }

    // Đăng xuất
    if (target.closest("#btnLogout, [data-role='btn-logout'], .btn-logout")) {
      try { await signOut(NINI_AUTH); } catch {}
      finally {
        setAuthFlag(false);
        toggleAuthUI(null);
        console.log("[logout] OK");
      }
      return;
    }
  });

  // ---------- Theo dõi trạng thái đăng nhập ----------
  onAuthStateChanged(NINI_AUTH, (user) => {
    console.log("[auth] state:", user ? `IN (${user.email || user.displayName || "user"})` : "OUT");
    setAuthFlag(!!user);
    toggleAuthUI(user);
  });

  // ---------- Dev helpers ----------
  window.niniAuth = window.niniAuth || {};
  Object.assign(window.niniAuth, {
    isLoggedIn: localStorage.getItem(AUTH_FLAG_KEY) === "1",
    async hardReset() {
      try { await signOut(NINI_AUTH); } catch {}
      try { indexedDB.deleteDatabase("firebaseLocalStorageDb"); } catch {}
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
      location.reload();
    },
    async forceLogin(email, pass) {
      const note = $id("loginNote");
      try {
        const cred = await signInWithEmailAndPassword(NINI_AUTH, cleanEmail(email), String(pass || ""));
        setAuthFlag(true); toggleAuthUI(cred.user);
        setNote(note, "Đăng nhập thành công!", true);
        NINI_goHome();
      } catch (e) {
        console.error(e); setNote(note, mapAuthError(e), false);
      }
    },
  });
})(); // END guard
// ================== END ==================

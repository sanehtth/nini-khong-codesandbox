// ===================== NiNi Auth JS (final) =====================
// Import Firebase (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Config Firebase
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

// ======= Guard: tránh chạy 2 lần / redeclare (nếu lỡ nhúng script 2 lần)
(() => {
  if (window.__NINI_AUTH_WIRED__) {
    console.warn("[NiNi] auth.js already initialized — skipping rewire");
    return;
  }
  window.__NINI_AUTH_WIRED__ = true;

  // ---------- Helpers ----------
  const $id = (id) => document.getElementById(id);
  const setNote = (el, msg, ok = true) => { if(!el) return; el.textContent = msg || ""; el.style.color = ok ? "#0f5132" : "#7f1d1d"; };
  function cleanEmail(s) {
    return String(s || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/\s/g, "")                    // xoá mọi khoảng trắng
      .toLowerCase();
  }
  function mapAuthError(e) {
    const code = e?.code || "";
    return (
      code === "auth/invalid-email"     ? "Email không hợp lệ." :
      code === "auth/user-not-found"    ? "Email chưa đăng ký." :
      code === "auth/wrong-password"    ? "Mật khẩu sai." :
      code === "auth/too-many-requests" ? "Bạn thử quá nhiều lần, vui lòng thử lại sau." :
      e?.message || "Yêu cầu thất bại."
    );
  }

  // ---------- DOM refs ----------
  const loginEmail     = $id("loginEmail");
  const loginPassword  = $id("loginPassword");
  const loginNote      = $id("loginNote");
  const signupEmail    = $id("signupEmail");
  const signupNote     = $id("signupNote");
  const forgotEmail    = $id("forgot_email");
  const forgotNote     = $id("forgotNote");

  // ---------- Endpoints ----------
  const VERIFY_API = "/.netlify/functions/send-verification-email";

  // ---------- API: gửi email xác minh (định nghĩa 1 LẦN) ----------
  async function smtpSendVerify(emailInput) {
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

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

    if (!res.ok) {
      console.error("send-verification-email FAILED", res.status, data, "sent=", email);
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    console.log("send-verification-email OK", data, "sent=", email);
    return data;
  }

  // ---------- Event delegation: đảm bảo luôn bắt nút dù DOM render sau ----------
  document.addEventListener("click", async (ev) => {
    // Đăng nhập
    const btnLogin = ev.target.closest('[data-role="btn-login"], #btnLogin');
    if (btnLogin) {
      const email = cleanEmail(loginEmail?.value);
      const pw    = String(loginPassword?.value || "");
      if (!email) { setNote(loginNote, "Bạn chưa nhập email.", false); loginEmail?.focus(); return; }
      if (!pw)    { setNote(loginNote, "Bạn chưa nhập mật khẩu.", false); loginPassword?.focus(); return; }

      try {
        setNote(loginNote, "Đang đăng nhập...");
        const cred = await signInWithEmailAndPassword(auth, email, pw);
        console.log("login ok uid=", cred.user?.uid, "verified=", cred.user?.emailVerified);
        setNote(loginNote, "Đăng nhập thành công!", true);
        // TODO: đóng modal / chuyển trang nếu muốn
      } catch (e) {
        console.error("login fail:", e);
        setNote(loginNote, mapAuthError(e), false);
      }
      return;
    }

    // Gửi email xác minh (nút đăng ký mới hoặc gửi lại xác minh)
    const btnVerify = ev.target.closest('[data-role="btn-send-verify"], #btnSendVerify, #btnEmailSignup');
    if (btnVerify) {
      try {
        const email = cleanEmail(signupEmail?.value || loginEmail?.value || "");
        if (!email) { setNote(signupNote || loginNote, "Bạn chưa nhập email.", false); return; }
        await smtpSendVerify(email);
        setNote(signupNote || loginNote, "Đã gửi email xác minh – kiểm tra hộp thư nhé.", true);
      } catch (e) {
        setNote(signupNote || loginNote, e.message || "Không gửi được email xác minh.", false);
      }
      return;
    }

    // Quên mật khẩu (nếu vẫn dùng flow này)
    const btnForgot = ev.target.closest('[data-role="btn-forgot-send"], #btnForgotSend');
    if (btnForgot) {
      try {
        const email = cleanEmail(forgotEmail?.value || loginEmail?.value || "");
        if (!email) { setNote(forgotNote || loginNote, "Bạn chưa nhập email.", false); return; }
        await sendPasswordResetEmail(auth, email, {
          url: "https://nini-funny.com/reset-password.html",
          handleCodeInApp: true,
        });
        setNote(forgotNote || loginNote, "Đã gửi link đặt lại mật khẩu – kiểm tra email nhé.", true);
      } catch (e) {
        console.error("forgot fail:", e);
        setNote(forgotNote || loginNote, mapAuthError(e), false);
      }
      return;
    }

    // Google login (tuỳ chọn)
    const btnGoogle = ev.target.closest('#btnGoogleLogin, [data-role="btn-google"]');
    if (btnGoogle) {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        setNote(loginNote, "Đăng nhập Google thành công!", true);
      } catch (e) {
        console.error("google login fail:", e);
        setNote(loginNote, "Đăng nhập Google thất bại.", false);
      }
    }
  });

  // Theo dõi trạng thái đăng nhập (nếu cần cập nhật UI)
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // ví dụ: document.body.classList.add('logged-in');
    } else {
      // ví dụ: document.body.classList.remove('logged-in');
    }
  });
})(); // END guard-wrapper
// ================== END ==================

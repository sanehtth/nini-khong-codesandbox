// ===================== NiNi Auth JS (full) =====================
// Firebase imports (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- Firebase config ----------
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

// ---------- Helpers (đừng đổi tên; KHÔNG dùng $ để tránh trùng) ----------
const $id = (id) => document.getElementById(id);
const $$  = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);
const setText = (el, s) => { if (el) el.textContent = s ?? ""; };

function cleanEmail(s) {
  return String(s || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
    .replace(/\s/g, "")                    // mọi khoảng trắng
    .toLowerCase();
}
function setNote(el, msg, ok=true){ if(!el) return; el.textContent = msg || ""; el.style.color = ok ? "#0f5132" : "#7f1d1d"; }

// ---------- DOM refs ----------
const loginEmail   = $id("loginEmail");
const loginPw      = $id("loginPassword");
const btnLogin     = $id("btnLogin");
const loginNote    = $id("loginNote");

const signupEmail  = $id("signupEmail");
const btnEmailSignup = $id("btnEmailSignup");
const btnSendVerify  = $id("btnSendVerify");
const signupNote     = $id("signupNote");

const forgotEmail  = $id("forgot_email");
const btnForgotSend= $id("btnForgotSend");
const forgotNote   = $id("forgotNote");

const btnGoogleLogin = $id("btnGoogleLogin");

// ---------- API endpoints ----------
const VERIFY_API = "/.netlify/functions/send-verification-email"; // giữ nguyên tên này

// ---------- Call server: gửi email xác minh ----------
async function smtpSendVerify(emailInput) {
  const email = cleanEmail(
    typeof emailInput === "string" ? emailInput
      : emailInput?.email || emailInput?.user?.email || ""
  );

  const res = await fetch(VERIFY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
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

// ---------- Events ----------

// Đăng nhập (email/password)
on(btnLogin, "click", async () => {
  const email = cleanEmail(loginEmail?.value);
  const pw    = String(loginPw?.value || "");

  if (!email) { setNote(loginNote, "Bạn chưa nhập email.", false); return; }
  if (!pw)    { setNote(loginNote, "Bạn chưa nhập mật khẩu.", false); return; }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    console.log("login ok", cred.user?.uid);
    setNote(loginNote, "Đăng nhập thành công!", true);
    // TODO: đóng modal / refresh UI
  } catch (e) {
    console.error("login error:", e);
    const code = e.code || "";
    const msg =
      code === "auth/invalid-email"  ? "Email không hợp lệ." :
      code === "auth/user-not-found" ? "Email chưa đăng ký." :
      code === "auth/wrong-password" ? "Mật khẩu sai." :
      code === "auth/too-many-requests" ? "Bạn thử quá nhiều lần, vui lòng thử lại sau." :
      (e.message || "Đăng nhập thất bại.");
    setNote(loginNote, msg, false);
  }
});

// Gửi email xác minh (khi đăng ký mới hoặc yêu cầu gửi lại)
on(btnSendVerify, "click", async () => {
  try {
    const email = cleanEmail(signupEmail?.value || loginEmail?.value || "");
    if (!email) { setNote(signupNote, "Bạn chưa nhập email.", false); return; }
    await smtpSendVerify(email);
    setNote(signupNote, "Đã gửi email xác minh – kiểm tra hộp thư nhé.", true);
  } catch (e) {
    setNote(signupNote, e.message || "Không gửi được email xác minh.", false);
  }
});

// Nút "Đăng ký mới" (chỉ gửi verify; server sẽ auto-create user nếu chưa có)
on(btnEmailSignup, "click", async () => {
  try {
    const email = cleanEmail(signupEmail?.value || "");
    if (!email) { setNote(signupNote, "Bạn chưa nhập email.", false); return; }
    await smtpSendVerify(email);
    setNote(signupNote, "Đã gửi email xác minh – kiểm tra hộp thư nhé.", true);
  } catch (e) {
    setNote(signupNote, e.message || "Không gửi được email xác minh.", false);
  }
});

// Quên mật khẩu (gửi email reset trực tiếp từ client)
on(btnForgotSend, "click", async () => {
  try {
    const email = cleanEmail(forgotEmail?.value || "");
    if (!email) { setNote(forgotNote, "Bạn chưa nhập email.", false); return; }
    await sendPasswordResetEmail(auth, email, {
      url: "https://nini-funny.com/reset-password.html",
      handleCodeInApp: true,
    });
    setNote(forgotNote, "Đã gửi link đặt lại mật khẩu – kiểm tra email nhé.", true);
  } catch (e) {
    console.error("forgot error:", e);
    const code = e.code || "";
    const msg =
      code === "auth/invalid-email"  ? "Email không hợp lệ." :
      code === "auth/user-not-found" ? "Email chưa đăng ký." :
      (e.message || "Không gửi được link đặt lại mật khẩu.");
    setNote(forgotNote, msg, false);
  }
});

// Google login (nếu có nút)
on(btnGoogleLogin, "click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // TODO: close modal / update UI
  } catch (e) {
    console.error("google login error:", e);
    setNote(loginNote, "Đăng nhập Google thất bại.", false);
  }
});

// Theo dõi trạng thái đăng nhập (tuỳ bạn xử lý UI)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Ví dụ: hiển thị tên/email
    $$(".who").forEach(el => setText(el, user.displayName || user.email || "user"));
    // localStorage.setItem("NINI_AUTH_LOGGED_IN", "1");
  } else {
    $$(".who").forEach(el => setText(el, "khách"));
    // localStorage.removeItem("NINI_AUTH_LOGGED_IN");
  }
});

// (tuỳ chọn) Sign out cho button nào đó:
// on($id('btnLogout'), 'click', () => signOut(auth));

// ================== END ==================

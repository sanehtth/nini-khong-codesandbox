/* ========== BEGIN PATCH (/public/js/auth.js) ========== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- Firebase config ----
const firebaseConfig = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184"
};

// ---- Init ----
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---- UI helpers ----
const $ = (id) => document.getElementById(id);
const setNote = (el, msg, ok=true) => {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d";
};

// ---- Keys in localStorage to toggle 2 buttons ----
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  const whoSpan = $("who");
  if (whoSpan) whoSpan.textContent = logged && who ? `(${who})` : "";
  const btnLogin  = $("btnLogin");
  const btnLogout = $("btnLogout");
  if (btnLogin)  btnLogin.hidden  = logged;
  if (btnLogout) btnLogout.hidden = !logged;
}
function openAuth(){ $("authModal")?.setAttribute("aria-hidden","false"); }
function closeAuth(){ $("authModal")?.setAttribute("aria-hidden","true"); }

// ---- Elements ----
const authTabs   = $("authTabs");

// Login
const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

// Signup
const signupEmail = $("signupEmail");
const signupPw    = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

// Forgot (giữ nguyên flow nếu bạn đang dùng server riêng)
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

// ---- Tabs switching ----
authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]"); if(!t) return;
  document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.remove("is-active"));
  document.querySelectorAll("#authModal .form").forEach(p=>p.classList.remove("is-active"));
  t.classList.add("is-active");
  const pane = t.getAttribute("data-auth");
  const panel = document.querySelector(`#authModal [data-pane="${pane}"]`) || (pane==="forgot" && $("forgotForm"));
  panel?.classList.add("is-active");
});

// ---- Open/close ----
$("btnLogin")?.addEventListener("click", openAuth);
$("btnLogout")?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});
$("authModal")?.querySelectorAll("[data-close], .modal__backdrop")
  .forEach(el=>el.addEventListener("click", closeAuth));

// ---- Login with Email/Password ----
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  const email = (loginEmail.value||"").trim();
  const pw    = loginPw.value||"";
  if (!email || !pw) return setNote(loginNote, "Vui lòng nhập email và mật khẩu.", false);

  try{
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      // Gửi lại email xác minh, rồi đăng xuất
      try{
        await sendEmailVerification(cred.user, { url: "https://nini-funny.com/#home" });
      }catch(_){}
      await signOut(auth);
      return setNote(
        loginNote,
        "Tài khoản chưa xác minh email. Mình vừa gửi lại email xác minh — hãy kiểm tra hộp thư rồi đăng nhập lại.",
        false
      );
    }
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, niceAuthError(e) || "Không đăng nhập được", false);
  }
});

// ---- Login with Google (không yêu cầu verify email) ----
btnGoogleLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, niceAuthError(e) || "Không đăng nhập được với Google", false);
  }
});

// ---- Sign up: tạo user → gửi email xác minh → signOut ----
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");

  const email = (signupEmail.value||"").trim();
  const pw    = signupPw.value||"";
  if (!email || !pw) return setNote(signupNote, "Vui lòng nhập email và mật khẩu.", false);
  if (pw.length < 8)  return setNote(signupNote, "Mật khẩu tối thiểu 8 ký tự.", false);

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    try{
      await sendEmailVerification(cred.user, { url: "https://nini-funny.com/#home" });
    }catch(_){}
    // đăng xuất để buộc user xác minh xong mới đăng nhập lại
    await signOut(auth);
    setNote(
      signupNote,
      "Đã tạo tài khoản. Vui lòng kiểm tra email để xác minh trước khi đăng nhập!",
      true
    );
  }catch(e){
    const nice = {
      "auth/email-already-in-use": "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng 'Quên mật khẩu'.",
      "auth/invalid-email":       "Email không hợp lệ.",
      "auth/weak-password":       "Mật khẩu quá yếu (ít nhất 8 ký tự).",
    };
    setNote(signupNote, nice[e?.code] || (e?.code || e?.message || "Không tạo được tài khoản"), false);
  }
});

// ---- Forgot password (nếu bạn đang dùng API riêng) ----
const FORGOT_API = "/api/send-reset";
btnForgot?.addEventListener("click", async (e) => {
  e?.preventDefault?.();
  const email = (forgotInput?.value || "").trim();
  if (!email) return setNote(forgotNote, "Vui lòng nhập email.", false);

  setNote(forgotNote, "Đang gửi...", true);
  try {
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, link: "https://nini-funny.com/reset-password.html" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    } else {
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  } catch {
    setNote(forgotNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
  }
});

// ---- Auth state ----
function afterLogin(user){
  const who = user.displayName || user.email || user.phoneNumber || "user";
  localStorage.setItem(FLAG,"1");
  localStorage.setItem(WHOKEY, who);
  setAuthUI(); closeAuth();
  location.href = "/profile.html";
}
onAuthStateChanged(auth, (user)=>{
  if (user){
    const who = user.displayName || user.email || user.phoneNumber || "user";
    localStorage.setItem(FLAG,"1"); localStorage.setItem(WHOKEY, who);
  }
  setAuthUI();
});
window.addEventListener("storage", (e)=>{
  if (e.key===FLAG || e.key===WHOKEY || e.key===SIGNAL) setAuthUI();
});
setAuthUI();

// ---- Error prettifier ----
function niceAuthError(e){
  const map = {
    "auth/email-already-in-use": "Email này đã được đăng ký.",
    "auth/invalid-email": "Email không hợp lệ.",
    "auth/weak-password": "Mật khẩu quá yếu (ít nhất 8 ký tự).",
    "auth/invalid-credential": "Thông tin đăng nhập không đúng.",
    "auth/too-many-requests": "Bạn thao tác quá nhanh. Vui lòng thử lại sau."
  };
  return map[e?.code] || e?.code || e?.message;
}
/* ========== END PATCH (/public/js/auth.js) ========== */

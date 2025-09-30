/* ========== BEGIN PATCH (/public/js/auth.js) ========== */
// /public/js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail, sendEmailVerification
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

// ---- Endpoints (Netlify Functions) ----
const SEND_OTP_URL   = "/.netlify/functions/auth-email-send-otp";
const VERIFY_OTP_URL = "/.netlify/functions/auth-email-verify-otp";

// ---- Keys in localStorage to toggle 2 buttons ----
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

// ---- Helpers ----
const $ = (id) => document.getElementById(id);
const setNote = (el, msg, ok=true) => {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d";
};

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

const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

// Đăng ký (OTP)
const signupEmail   = $("signupEmail");
const signupPw      = $("signupPassword");
const signupPw2     = $("signupPassword2");
const btnSendOtp    = $("btnSendOtp");
const signupOtp     = $("signupOtp");
const btnCreate     = $("btnCreateAccount");
const signupNote    = $("signupNote");

// Quên mật khẩu (giữ nguyên flow cũ của bạn, gọi server riêng)
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

// ---- Login ----
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const cred = await signInWithEmailAndPassword(auth, (loginEmail.value||"").trim(), loginPw.value||"");
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, niceAuthError(e), false);
  }
});
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

// ---- SIGNUP WITH OTP FLOW ----
let __tx = null;

// 1) Gửi OTP
btnSendOtp?.addEventListener("click", async ()=>{
  setNote(signupNote,"");

  const email = (signupEmail.value||"").trim();
  const pw1   = signupPw.value || "";
  const pw2   = signupPw2.value || "";

  if (!email)      return setNote(signupNote, "Vui lòng nhập email.", false);
  if (pw1.length < 8) return setNote(signupNote, "Mật khẩu tối thiểu 8 ký tự.", false);
  if (pw1 !== pw2) return setNote(signupNote, "Mật khẩu xác nhận chưa khớp.", false);

  // Check email đã tồn tại trên Firebase chưa
  try{
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (Array.isArray(methods) && methods.length > 0){
      return setNote(signupNote, "Email đã có tài khoản. Hãy đăng nhập hoặc chọn 'Quên mật khẩu'.", false);
    }
  }catch(_){ /* an toàn nếu Firebase chặn tạm thời */ }

  // Gửi OTP
  try{
    const res = await fetch(SEND_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok || !data.ok){
      return setNote(signupNote, data.msg || "Không gửi được OTP.", false);
    }
    __tx = data.tx;
    signupOtp.disabled = false;
    btnCreate.disabled = false;
    setNote(signupNote, "OTP đã gửi tới email. Vui lòng kiểm tra và nhập mã.", true);
  }catch(e){
    setNote(signupNote, "Lỗi mạng khi gửi OTP.", false);
  }
});

// 2) Xác nhận OTP & tạo tài khoản
btnCreate?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  const email = (signupEmail.value||"").trim();
  const pw    = signupPw.value || "";
  const code  = (signupOtp.value||"").trim();

  if (!__tx)  return setNote(signupNote, "Hãy bấm 'Gửi OTP' trước.", false);
  if (!code)  return setNote(signupNote, "Vui lòng nhập mã OTP.", false);

  // Verify OTP server-side
  try{
    const res = await fetch(VERIFY_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, tx: __tx })
    });
    const data = await res.json();
    if (!res.ok || !data.ok){
      return setNote(signupNote, data.msg || "OTP không hợp lệ.", false);
    }
  }catch(e){
    return setNote(signupNote, "Không xác minh được OTP.", false);
  }

  // Tạo tài khoản trên Firebase (sau khi OTP OK)
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    // (tuỳ chọn) gửi email verify của Firebase
    try{
      await sendEmailVerification(cred.user, {
        url: "https://nini-funny.com/#home",
        handleCodeInApp: true,
      });
    }catch(_){}

    setNote(signupNote, "Tạo tài khoản thành công! Hãy đăng nhập.", true);
    // Chuyển về Home/đăng nhập
    setTimeout(()=>{ 
      closeAuth();
      location.href = "/#home";
    }, 1200);

  }catch(e){
    // Trường hợp hiếm: trong lúc chờ OTP, tài khoản đã được tạo
    if (e?.code === "auth/email-already-in-use"){
      return setNote(signupNote, "Email đã có tài khoản. Hãy dùng 'Quên mật khẩu' để đặt lại.", false);
    }
    setNote(signupNote, niceAuthError(e) || "Không tạo được tài khoản.", false);
  }
});

// ---- Forgot password (server riêng của bạn) ----
const FORGOT_API = "/api/send-reset";
btnForgot?.addEventListener("click", async (e)=>{
  e?.preventDefault?.();
  const email = (forgotInput?.value || "").trim();
  if (!email) return setNote(forgotNote, "Vui lòng nhập email.", false);

  setNote(forgotNote, "Đang gửi...", true);
  try{
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetLink: "https://nini-funny.com/reset-password.html" })
    });
    const data = await res.json().catch(()=>({}));
    if (res.ok){
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    }else{
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  }catch(_){
    setNote(forgotNote, "Không kết nối được máy chủ.", false);
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
    "auth/invalid-credential": "Thông tin đăng nhập không đúng."
  };
  return map[e?.code] || e?.code || e?.message;
}
/* ========== END PATCH (/public/js/auth.js) ========== */

// /public/js/auth.js  — Email/Password + Email Verification flow
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ================= Firebase ================= */
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

/* ================= Helpers ================= */
const $ = (id) => document.getElementById(id);
const setNote = (el, msg, ok = true) => {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d";
};

const FLAG   = "NINI_AUTH_LOGGED_IN";
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

/* ================= Elements ================= */
const authTabs = $("authTabs");
// Login
const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");
// Signup
const signupEmail   = $("signupEmail");
const signupPw      = $("signupPassword");
const signupPw2     = $("signupPassword2");
const btnSendVerify = $("btnSendVerify");   // “Gửi xác thực email”
const signupNote    = $("signupNote");
// Forgot (nếu bạn dùng API riêng)
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

/* ================= Tabs ================= */
authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]"); if(!t) return;
  document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.remove("is-active"));
  document.querySelectorAll("#authModal .form").forEach(p=>p.classList.remove("is-active"));
  t.classList.add("is-active");
  const pane = t.getAttribute("data-auth");
  const panel = document.querySelector(`#authModal [data-pane="${pane}"]`) || (pane==="forgot" && $("forgotForm"));
  panel?.classList.add("is-active");
});

/* ================= Open/Close ================= */
$("btnLogin")?.addEventListener("click", (e)=>{ e.preventDefault(); openAuth(); });
$("btnLogout")?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){/* ignore */ }
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});
$("authModal")?.querySelectorAll("[data-close], .modal__backdrop")
  .forEach(el=>el.addEventListener("click", closeAuth));

/* ================= Login ================= */
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  const email = (loginEmail.value||"").trim();
  const pw    = loginPw.value||"";
  if (!email || !pw) return setNote(loginNote, "Vui lòng nhập email và mật khẩu.", false);

  try{
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      // Gửi lại email xác minh rồi signOut (bắt buộc xác minh trước khi dùng)
      try { await sendEmailVerification(cred.user, { url: "https://nini-funny.com/#home" }); } catch(_){}
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

/* ================= Google ================= */
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

/* ============= Signup (Send verification email) ============= */
btnSendVerify?.addEventListener("click", async ()=>{
  const email = (signupEmail.value||"").trim();
  const pw1   = signupPw.value || "";
  const pw2   = signupPw2?.value || "";

  if (!email)       return setNote(signupNote, "Vui lòng nhập email.", false);
  if (pw1.length<8) return setNote(signupNote, "Mật khẩu tối thiểu 8 ký tự.", false);
  if (signupPw2 && pw1 !== pw2) return setNote(signupNote, "Mật khẩu xác nhận chưa khớp.", false);

  btnSendVerify.disabled = true;
  setNote(signupNote, "Đang xử lý…");

  try{
    // tránh trùng email
    const methods = await fetchSignInMethodsForEmail(auth, email).catch(()=>[]);
    if (methods && methods.length > 0) {
      btnSendVerify.disabled = false;
      return setNote(signupNote, "Email đã có tài khoản. Hãy đăng nhập hoặc dùng 'Quên mật khẩu'.", false);
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pw1);
    try { await sendEmailVerification(cred.user, { url: "https://nini-funny.com/#home" }); } catch(_){}
    await signOut(auth);

    // đếm lùi để rõ nút đã gửi
    let s = 25;
    setNote(signupNote, `Đã gửi email xác minh tới ${email}. Vui lòng kiểm tra hộp thư và bấm liên kết để kích hoạt.`, true);
    const timer = setInterval(()=>{
      s--;
      btnSendVerify.textContent = `Đã gửi (${s}s)`;
      if (s<=0){ clearInterval(timer); btnSendVerify.textContent = "Gửi lại xác thực email"; btnSendVerify.disabled = false; }
    }, 1000);

  }catch(e){
    const map = {
      "auth/email-already-in-use": "Email này đã được đăng ký.",
      "auth/invalid-email": "Email không hợp lệ.",
      "auth/weak-password": "Mật khẩu quá yếu (ít nhất 8 ký tự).",
      "auth/too-many-requests": "Bạn thao tác quá nhanh, thử lại sau."
    };
    setNote(signupNote, map[e?.code] || e?.code || e?.message || "Không tạo được tài khoản.", false);
    btnSendVerify.disabled = false;
  }
});

/* ================= Forgot password (nếu dùng API riêng) ================= */
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
      body: JSON.stringify({ email, link: "https://nini-funny.com/reset-password.html" }),
    });
    const data = await res.json().catch(()=>({}));
    if (res.ok) setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    else       setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
  }catch{
    setNote(forgotNote, "Không kết nối được máy chủ.", false);
  }
});

/* ================= Auth state ================= */
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

/* ================= Error prettifier ================= */
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

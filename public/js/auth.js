<!-- file: /public/js/auth.js -->
<script type="module">
/* =========================================================
   NiNi — Auth (Firebase v10)
   - ĐÃ SỬA: cơ chế TAB (login / signup / forgot) chỉ hiển thị 1 pane
   - ĐÃ SỬA: setNote() kiểu toast nằm trong khung modal
   - Giữ nguyên logic đăng nhập/đăng ký/Google/Quên mật khẩu
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* === BEGIN: Firebase config (giữ nguyên project của bạn) === */
const firebaseConfig = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184"
};
/* === END: Firebase config === */

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* === BEGIN: localStorage flags để bật/tắt 2 nút header === */
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";
/* === END: localStorage flags === */

/* === BEGIN: DOM refs === */
const $ = (id) => document.getElementById(id);

const btnLogin   = $("btnLogin");
const btnLogout  = $("btnLogout");
const whoSpan    = $("who");

const modal      = $("authModal");
const authTabs   = $("authTabs");

/* Login pane */
const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

/* Signup pane */
const signupEmail = $("signupEmail");
const signupPw    = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

/* Forgot pane */
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");
/* === END: DOM refs === */

/* === BEGIN: setNote() dạng toast trong modal === */
function setNote(el, msg, ok = true){
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d";
}
/* === END: setNote() === */

/* === BEGIN: Toggle header auth buttons === */
function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  whoSpan && (whoSpan.textContent = logged && who ? `(${who})` : "");
  btnLogin && (btnLogin.hidden  = logged);
  btnLogout && (btnLogout.hidden = !logged);
}
setAuthUI();
/* === END: Toggle header auth buttons === */

/* === BEGIN: Tabs trong modal (đã sửa: luôn chỉ 1 pane hiển thị) === */
function switchAuth(which) {
  // Bỏ active tất cả tab + pane
  document.querySelectorAll("#authModal .tab-line").forEach(b => {
    b.classList.toggle("is-active", b.dataset.auth === which);
  });
  document.querySelectorAll("#authModal .form").forEach(p => {
    p.classList.toggle("is-active", p.getAttribute("data-pane") === which);
  });
}

function openAuth(which = "login"){
  if (!modal) return;
  modal.setAttribute("aria-hidden","false");
  switchAuth(which);
}
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }

/* gắn event cho tabs */
authTabs?.addEventListener("click", (e)=>{
  const btn = e.target.closest(".tab-line");
  if (!btn) return;
  switchAuth(btn.dataset.auth || "login");
});

/* gắn close */
modal?.querySelectorAll("[data-close], .modal__backdrop")
  .forEach(el => el.addEventListener("click", closeAuth));
/* === END: Tabs trong modal === */

/* === BEGIN: Header buttons === */
btnLogin?.addEventListener("click", () => openAuth("login"));
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});
/* === END: Header buttons === */

/* === BEGIN: Login / Google / Signup / Forgot === */
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const cred = await signInWithEmailAndPassword(
      auth, (loginEmail.value||"").trim(), loginPw.value||""
    );
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được", false);
  }
});
btnGoogleLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được với Google", false);
  }
});
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  try{
    const email = (signupEmail.value||"").trim();
    const pass  = signupPw.value||"";
    const cred  = await createUserWithEmailAndPassword(auth, email, pass);

    // gửi mail xác minh (Firebase)
    await sendEmailVerification(cred.user, {
      url: "https://nini-funny.com/#home",
      handleCodeInApp: true
    });
    setNote(
      signupNote,
      "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác thực trước khi đăng nhập!",
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
/* gửi link reset qua Netlify Function của bạn */
const FORGOT_API = "/api/send-reset";
btnForgot?.addEventListener("click", async (e)=>{
  e?.preventDefault?.();
  const email = (forgotInput?.value || "").trim();
  if (!email) { setNote(forgotNote, "Vui lòng nhập email.", false); return; }
  setNote(forgotNote, "Đang gửi...");
  try{
    const res  = await fetch(FORGOT_API, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, link: "https://nini-funny.com/reset-password.html" })
    });
    const data = await res.json().catch(()=>({}));
    if (res.ok){
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    } else {
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  }catch(_){
    setNote(forgotNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
  }
});
/* === END: Login / Google / Signup / Forgot === */

/* === BEGIN: afterLogin + onAuthStateChanged === */
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
    localStorage.setItem(FLAG,"1");
    localStorage.setItem(WHOKEY, who);
  }
  setAuthUI();
});
window.addEventListener("storage", (e)=>{
  if (e.key===FLAG || e.key===WHOKEY || e.key===SIGNAL) setAuthUI();
});
/* === END: afterLogin + onAuthStateChanged === */

</script>

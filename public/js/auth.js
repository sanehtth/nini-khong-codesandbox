// /public/js/auth.js  — NiNi Auth (full, đã sửa setNote -> ok/err + aria-live)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ================= Firebase config ================= */
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

/* ================= LocalStorage flags (đổi UI login/logout) ================= */
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1" | "0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

/* ================= Helpers ================= */
const $ = (id) => document.getElementById(id);

const btnLogin   = $("btnLogin");
const btnLogout  = $("btnLogout");
const whoSpan    = $("who");

const modal      = $("authModal");
const authTabs   = $("authTabs");

/* Login form */
const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

/* Signup form */
const signupEmail = $("signupEmail");
const signupPw    = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

/* Forgot form */
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

/* ========== setNote (đã chỉnh: glass + ok/err, aria-live) ========== */
function setNote(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg || "";
  el.setAttribute("aria-live", "polite");     // để screen reader đọc ngay
  el.classList.remove("ok", "err");
  if (!msg) return;                           // rỗng -> CSS :empty sẽ ẩn
  el.classList.add(ok ? "ok" : "err");
}

function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  whoSpan.textContent = logged && who ? `(${who})` : "";
  if (btnLogin)  btnLogin.hidden  = logged;
  if (btnLogout) btnLogout.hidden = !logged;
}
function openAuth(){ modal?.setAttribute("aria-hidden","false"); }
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }

/* ================= Tabs trong modal ================= */
authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]"); if(!t) return;
  document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.remove("is-active"));
  document.querySelectorAll("#authModal .form").forEach(p=>p.classList.remove("is-active"));
  t.classList.add("is-active");
  const pane = t.getAttribute("data-auth");
  const panel = document.querySelector(`#authModal [data-pane="${pane}"]`) || (pane==="forgot" && $("forgotForm"));
  panel?.classList.add("is-active");
});
modal?.querySelectorAll("[data-close], .modal__backdrop").forEach(el=>el.addEventListener("click", closeAuth));

/* ================= Buttons mở/đóng ================= */
btnLogin?.addEventListener("click", openAuth);
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});

/* ================= Login ================= */
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const cred = await signInWithEmailAndPassword(auth, (loginEmail.value||"").trim(), loginPw.value||"");
    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, niceAuthError(e) || "Không đăng nhập được", false);
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

/* ================= Signup + gửi email xác thực ================= */
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  try{
    const email = (signupEmail.value||"").trim();
    const pass  = signupPw.value||"";

    const cred = await createUserWithEmailAndPassword(auth, email, pass);

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
    const nice = niceAuthError(e) ||
      (e?.code || e?.message || "Không tạo được tài khoản");
    setNote(signupNote, nice, false);
  }
});

/* ================= Forgot password (qua server pro mail) ================= */
const FORGOT_API = "/api/send-reset";  // gọi cùng domain (proxy) để khỏi CORS

btnForgot?.addEventListener("click", async (e)=>{
  e?.preventDefault?.();
  const email = (forgotInput?.value || "").trim();
  if (!email) { setNote(forgotNote, "Vui lòng nhập email.", false); return; }

  setNote(forgotNote, "Đang gửi...", true);
  try{
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        link: "https://nini-funny.com/reset-password.html",
      }),
    });

    const data = await res.json().catch(()=> ({}));
    if (res.ok) {
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    } else {
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  }catch(_){
    setNote(forgotNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
  }
});

/* ================= Shared ================= */
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
setAuthUI();

/* ================= Friendly error text ================= */
function niceAuthError(e){
  const map = {
    "auth/email-already-in-use": "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng chức năng 'Quên mật khẩu'.",
    "auth/invalid-email":       "Email không hợp lệ.",
    "auth/weak-password":       "Mật khẩu quá yếu (ít nhất 8 ký tự).",
    "auth/invalid-credential":  "Email hoặc mật khẩu không đúng.",
    "auth/user-disabled":       "Tài khoản đã bị vô hiệu hóa.",
    "auth/user-not-found":      "Không tìm thấy tài khoản.",
    "auth/wrong-password":      "Mật khẩu không đúng.",
    "auth/popup-closed-by-user":"Cửa sổ đăng nhập đã bị đóng.",
  };
  return map[e?.code] || null;
}

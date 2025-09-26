// /public/js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
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

// ---- Keys in localStorage to toggle 2 buttons ----
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

const $ = (id) => document.getElementById(id);
const btnLogin   = $("btnLogin");
const btnLogout  = $("btnLogout");
const whoSpan    = $("who");
const modal      = $("authModal");
const authTabs   = $("authTabs");

const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

const signupEmail = $("signupEmail");
const signupPw    = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

function setNote(el, msg, ok = true){
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d";
}
function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  whoSpan.textContent = logged && who ? `(${who})` : "";
  btnLogin.hidden  = logged;
  btnLogout.hidden = !logged;
}
function openAuth(){ modal?.setAttribute("aria-hidden","false"); }
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }

// Tabs
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

// Buttons
btnLogin?.addEventListener("click", openAuth);
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});

// Login / Signup
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const cred = await signInWithEmailAndPassword(auth, (loginEmail.value||"").trim(), loginPw.value||"");
    afterLogin(cred.user);
  }catch(e){ setNote(loginNote, e?.code || e?.message || "Không đăng nhập được", false); }
});
btnGoogleLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    afterLogin(cred.user);
  }catch(e){ setNote(loginNote, e?.code || e?.message || "Không đăng nhập được với Google", false); }
});
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  try{
    const cred = await createUserWithEmailAndPassword(auth, (signupEmail.value||"").trim(), signupPw.value||"");
    afterLogin(cred.user);
  }catch(e){ setNote(signupNote, e?.code || e?.message || "Không tạo được tài khoản", false); }
});

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

// ======== QUÊN MẬT KHẨU (gửi qua Netlify Functions) =========
const FORGOT_API = "/api/send-reset"; // GỌI CÙNG DOMAIN → KHỎI CORS

btnForgot?.addEventListener("click", async (e) => {
  e?.preventDefault?.(); // tránh submit form reload

  const email = (forgotInput?.value || "").trim();
  if (!email) {
    setNote(forgotNote, "Vui lòng nhập email.", false);
    return;
  }

  setNote(forgotNote, "Đang gửi...", true);

  try {
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        // đường dẫn quay lại (tùy ý)
        link: "https://nini-funny.com/#/home",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      // server trả ok:true khi gửi mail thành công
      setNote(
        forgotNote,
        data.message || "Gửi không thành công. Vui lòng thử lại!",
        !!data.ok
      );
    } else {
      // lỗi 4xx/5xx: hiển thị message server
      setNote(
        forgotNote,
        data.message || "Không gửi được mail. Vui lòng thử lại!",
        false
      );
    }
  } catch (err) {
    setNote(
      forgotNote,
      "Không kết nối được máy chủ. Kiểm tra lại URL API.",
      false
    );
  }
});



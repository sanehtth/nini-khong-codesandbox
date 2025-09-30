// /public/js/auth.js — Login/Signup + VERIFY qua Netlify Function (SMTP)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail
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
const setNote = (el, msg, ok = true) => { if(el){ el.textContent = msg||""; el.style.color = ok ? "#0f5132" : "#7f1d1d"; } };

const FLAG="NINI_AUTH_LOGGED_IN", WHOKEY="NINI_USER_DISPLAY", SIGNAL="NINI_SIGNED_OUT_AT";
function isLoggedIn(){ return localStorage.getItem(FLAG)==="1"; }
function setAuthUI(){
  const logged = isLoggedIn(); const who = localStorage.getItem(WHOKEY)||"";
  const whoSpan=$("who"); if(whoSpan) whoSpan.textContent = logged && who ? `(${who})` : "";
  const btnLogin=$("btnLogin"), btnLogout=$("btnLogout");
  if(btnLogin) btnLogin.hidden=logged; if(btnLogout) btnLogout.hidden=!logged;
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
const signupPw2     = $("signupPassword2");    // nếu có ô xác nhận
const btnSendVerify = $("btnSendVerify");      // nút “Gửi xác thực email”
const signupNote    = $("signupNote");
// Forgot
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

/* ================= Tabs ================= */
authTabs?.addEventListener("click",(e)=>{
  const t=e.target.closest("[data-auth]"); if(!t) return;
  document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.remove("is-active"));
  document.querySelectorAll("#authModal .form").forEach(p=>p.classList.remove("is-active"));
  t.classList.add("is-active");
  const pane=t.getAttribute("data-auth");
  const panel=document.querySelector(`#authModal [data-pane="${pane}"]`) || (pane==="forgot" && $("forgotForm"));
  panel?.classList.add("is-active");
});

/* ================= Open/Close ================= */
$("btnLogin")?.addEventListener("click",(e)=>{ e.preventDefault(); openAuth(); });
$("btnLogout")?.addEventListener("click", async ()=>{
  try{ await signOut(auth);}catch(_){}
  localStorage.setItem(FLAG,"0"); localStorage.removeItem(WHOKEY); localStorage.setItem(SIGNAL,String(Date.now()));
  location.replace("/");
});
$("authModal")?.querySelectorAll("[data-close], .modal__backdrop]").forEach(el=>el.addEventListener("click", closeAuth));

/* ============= Helper: gửi VERIFY qua Netlify Function (SMTP) ============= */
async function sendVerifyViaSMTP(email){
  const res = await fetch("/.netlify/functions/send-verification-email",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email })
  });
  if(!res.ok){
    let m="Không gửi được email xác minh."; try{ m=(await res.json()).error||m; }catch(_){}
    throw new Error(m);
  }
}

/* ================= Login (Email/Password) ================= */
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  const email=(loginEmail.value||"").trim(), pw=loginPw.value||"";
  if(!email || !pw) return setNote(loginNote,"Vui lòng nhập email và mật khẩu.",false);
  try{
    const cred=await signInWithEmailAndPassword(auth,email,pw);
    await cred.user.reload();
    if(!cred.user.emailVerified){
      // Gửi verify qua SMTP function
      try{ await

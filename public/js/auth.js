// Xử lý mọi kiểu khoảng trắng & ký tự ẩn trong email
function cleanEmail(s) {
  return String(s || '')
    .normalize('NFKC')                     // chuẩn hoá unicode (fullwidth -> ascii)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // bỏ zero-width
    .replace(/\s/g, '')                    // bỏ mọi khoảng trắng (kể cả giữa chuỗi)
    .toLowerCase();
}

// NiNi — AUTH (email-only signup + SMTP verify + reset) + toast

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// LocalStorage
const FLAG="NINI_AUTH_LOGGED_IN", WHOKEY="NINI_USER_DISPLAY", SIGNAL="NINI_SIGNED_OUT_AT";

// DOM
const $ = (id)=>document.getElementById(id);
const modal=$("authModal"), authTabs=$("authTabs");
const btnLogin=$("btnLogin"), btnLogout=$("btnLogout"), whoSpan=$("who");

// login
const loginEmail=$("loginEmail"), loginPw=$("loginPassword");
const btnEmailLogin=$("btnEmailLogin"), btnGoogleLogin=$("btnGoogleLogin");
const loginNote=$("loginNote"), btnResendVerify=$("btnResendVerify");

// signup
const signupEmail=$("signupEmail"), btnEmailSignup=$("btnEmailSignup");
const signupNote=$("signupNote");

// forgot
const forgotInput=$("forgot_email"), btnForgot=$("btnForgotSend"), forgotNote=$("forgotNote");

// Functions (Netlify)
const VERIFY_API = "/.netlify/functions/send-verification-email";
const FORGOT_API = "/.netlify/functions/send-reset";

// Toast
function toast(msg="", type="info"){
  let box=document.getElementById("nini_toast_box");
  if(!box){ box=document.createElement("div"); box.id="nini_toast_box";
    Object.assign(box.style,{position:"fixed",right:"16px",bottom:"16px",display:"flex",flexDirection:"column",gap:"8px",zIndex:99999});
    document.body.appendChild(box);
  }
  const t=document.createElement("div"); t.textContent=msg;
  Object.assign(t.style,{maxWidth:"360px",padding:"10px 12px",borderRadius:"10px",boxShadow:"0 6px 18px rgba(0,0,0,.25)",color:type==="error"?"#7f1d1d":"#0f5132",background:"rgba(255,255,255,.95)",backdropFilter:"blur(8px)",fontSize:"14px"});
  box.appendChild(t); setTimeout(()=>t.remove(), 4500);
}
function setNote(el,msg,ok=true){ if(el){ el.textContent=msg||""; el.style.color=ok?"#0f5132":"#7f1d1d"; } toast(msg||"", ok?"ok":"error"); }
function setBusy(btn, on=true, text="Đang xử lý…"){ if(!btn) return ()=>{}; const old=btn.textContent; btn.disabled=!!on; if(on) btn.textContent=text; return ()=>{btn.disabled=false; btn.textContent=old;}; }
function isLoggedIn(){ return localStorage.getItem(FLAG)==="1"; }
function setAuthUI(){ const logged=isLoggedIn(); const who=localStorage.getItem(WHOKEY)||""; if(whoSpan) whoSpan.textContent=logged&&who?`(${who})`:""; if(btnLogin) btnLogin.hidden=logged; if(btnLogout) btnLogout.hidden=!logged; }

// Tabs & modal
function switchAuth(which){ document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.toggle("is-active", b.dataset.auth===which)); document.querySelectorAll("#authModal .form").forEach(p=>p.classList.toggle("is-active", p.dataset.pane===which)); }
function openAuth(which="login"){ modal?.setAttribute("aria-hidden","false"); switchAuth(which); }
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }
authTabs?.addEventListener("click", e=>{ const t=e.target.closest("[data-auth]"); if(!t) return; switchAuth(t.dataset.auth||"login"); });
modal?.querySelectorAll("[data-close], .modal__backdrop").forEach(el=>el.addEventListener("click", closeAuth));
btnLogin?.addEventListener("click", ()=>openAuth("login"));
btnLogout?.addEventListener("click", async ()=>{ try{await signOut(auth);}catch{} localStorage.setItem(FLAG,"0"); localStorage.removeItem(WHOKEY); localStorage.setItem(SIGNAL, String(Date.now())); location.replace("/"); });

// Backend helpers
async function smtpSendVerify(email) {
  const res = await fetch('/.netlify/functions/send-verification-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  // Luôn đọc body để lấy lỗi chi tiết từ server
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

  if (!res.ok) {
    // In hết ra console để thấy nguyên nhân thật
    console.error('send-verification-email FAILED', res.status, data);
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  console.log('send-verification-email OK', data);
  return data;
}

async function smtpSendReset(email){
  const res = await fetch(FORGOT_API, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email }) });
  const j = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(j.message || "Không gửi được link đặt lại mật khẩu.");
  return j;
}

// Login
btnEmailLogin?.addEventListener("click", async ()=>{
  const off=setBusy(btnEmailLogin,true,"Đang đăng nhập…"); setNote(loginNote,"");
  try {
  await smtpSendVerify(signupEmail.value.trim());
  setNote(signupNote, 'Đã gửi email xác minh – kiểm tra hộp thư nhé.', true);
} catch (e) {
  // e.message bây giờ là mã lỗi chuẩn hoá từ server (SMTP_… / FIREBASE_…)
  setNote(signupNote, e.message || 'Không gửi được email xác minh.', false);
  console.error('smtpSendVerify error:', e);
}
});

// Google
btnGoogleLogin?.addEventListener("click", async ()=>{
  const off=setBusy(btnGoogleLogin,true,"Đang mở Google…"); setNote(loginNote,"");
  try{
    const cred=await signInWithPopup(auth, new GoogleAuthProvider());
    if(cred.user.email && !cred.user.emailVerified){ try{await smtpSendVerify(cred.user.email);}catch{} await signOut(auth); setNote(loginNote,"Email Google chưa xác minh trong hệ thống. Đã gửi mail xác minh.",false); return; }
    afterLogin(cred.user);
  }catch(e){ setNote(loginNote, e?.code||e?.message||"Không đăng nhập được với Google", false); } finally{ off(); }
});

// Signup — chỉ email → gửi email xác minh
btnEmailSignup?.addEventListener("click", async ()=>{
  const email=(signupEmail?.value||"").trim(); if(!email){ setNote(signupNote,"Bạn chưa nhập email.",false); return; }
  const off=setBusy(btnEmailSignup,true,"Đang gửi…"); setNote(signupNote,"");
  try{
    await smtpSendVerify(email);
    setNote(signupNote,"Đã gửi email xác minh — hãy kiểm tra hộp thư rồi làm theo hướng dẫn nhé!",true);
  }catch(e){ setNote(signupNote, e.message || "Không gửi được email xác minh.", false); }
  finally{ off(); }
});

// Forgot — gửi link đặt lại mật khẩu
btnForgot?.addEventListener("click", async ()=>{
  const email=(forgotInput?.value||"").trim(); if(!email){ setNote(forgotNote,"Bạn chưa nhập email.",false); return; }
  const off=setBusy(btnForgot,true,"Đang gửi…"); setNote(forgotNote,"");
  try{ await smtpSendReset(email); setNote(forgotNote,"Đã gửi liên kết đặt lại mật khẩu. Kiểm tra email nhé!", true); }
  catch(e){ setNote(forgotNote, e.message || "Không gửi được mail.", false); }
  finally{ off(); }
});

// After login
function afterLogin(user){ const who=user.displayName||user.email||user.phoneNumber||"user"; localStorage.setItem(FLAG,"1"); localStorage.setItem(WHOKEY,who); setAuthUI(); closeAuth(); location.href="/profile.html"; }
onAuthStateChanged(auth, (user)=>{ if(user){ const who=user.displayName||user.email||user.phoneNumber||"user"; localStorage.setItem(FLAG,"1"); localStorage.setItem(WHOKEY,who);} setAuthUI(); });
window.addEventListener("storage",(e)=>{ if(e.key===FLAG||e.key===WHOKEY||e.key===SIGNAL) setAuthUI(); });
setAuthUI();



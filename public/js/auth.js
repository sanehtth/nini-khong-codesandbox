// NiNi — Auth (SMTP verify + resend + forgot)  — match index.html IDs

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Firebase */
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

/* LocalStorage keys (để toggle nút header) */
const FLAG   = "NINI_AUTH_LOGGED_IN";
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

/* Helpers DOM */
const $ = id => document.getElementById(id);
function toast(msg="", ok=true){
  let box = $("nini_toast_box");
  if (!box){
    box = document.createElement("div");
    box.id = "nini_toast_box";
    Object.assign(box.style,{position:"fixed",right:"16px",bottom:"16px",display:"flex",gap:"8px",flexDirection:"column",zIndex:99999});
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style,{
    maxWidth:"380px",padding:"10px 12px",borderRadius:"10px",
    background:"rgba(255,255,255,.92)",backdropFilter:"blur(8px)",
    color: ok ? "#0f5132" : "#7f1d1d", boxShadow:"0 8px 22px rgba(0,0,0,.25)",fontSize:"14px"
  });
  box.appendChild(t);
  setTimeout(()=>t.remove(), 4500);
}
function setNote(el, msg, ok=true){ if(el){el.textContent = msg||""; el.classList.toggle("ok", ok); el.classList.toggle("err", !ok);} toast(msg, ok); }
function busy(btn, on=true, label="Đang xử lý…"){
  if (!btn) return ()=>{};
  const old = btn.textContent;
  btn.disabled = !!on; if (on) btn.textContent = label;
  return ()=>{ btn.disabled=false; btn.textContent=old; };
}
function isLoggedIn(){ return localStorage.getItem(FLAG)==="1"; }
function setAuthUI(){
  const log = isLoggedIn(); const who = localStorage.getItem(WHOKEY)||"";
  const btnHeaderLogin = $("authBtn"); const btnHeaderLogout = $("btnLogout"); const whoSpan = $("who");
  if (btnHeaderLogin) btnHeaderLogin.hidden = log;
  if (btnHeaderLogout) btnHeaderLogout.hidden = !log;
  if (whoSpan) whoSpan.textContent = log && who ? `(${who})` : "";
}

/* Modal tabs (đồng bộ với index.html) */
const modal    = $("authModal");
const authTabs = $("authTabs");
function switchAuth(which){
  document.querySelectorAll("#authModal .tab-line").forEach(b=>b.classList.toggle("is-active", b.dataset.auth===which));
  document.querySelectorAll("#authModal .form").forEach(p=>p.classList.toggle("is-active", p.getAttribute("data-pane")===which));
}
function openAuth(which="login"){ if(modal){ modal.setAttribute("aria-hidden","false"); switchAuth(which);} }
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }
$("authBtn")?.addEventListener("click", ()=>openAuth("login"));
authTabs?.addEventListener("click",(e)=>{ const t=e.target.closest("[data-auth]"); if(t) switchAuth(t.dataset.auth); });
modal?.querySelectorAll("[data-close], .modal__backdrop").forEach(el=>el.addEventListener("click", closeAuth));

/* Header logout */
$("btnLogout")?.addEventListener("click", async ()=>{
  try{ await signOut(auth);}catch{}
  localStorage.setItem(FLAG,"0"); localStorage.removeItem(WHOKEY); localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});

/* API endpoints */
const VERIFY_API = "/.netlify/functions/send-verification-email";
const RESET_API  = "/.netlify/functions/send-reset";

/* Gửi verify qua SMTP Function */
async function sendVerifySMTP(email){
  const r = await fetch(VERIFY_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.message || "Không gửi được email xác minh");
}

/* ====== LOGIN ====== */
const loginEmail = $("loginEmail");
const loginPwd   = $("loginPwd");
const btnLogin   = $("btnLogin");
const loginNote  = $("loginNote");
const btnResendVerify = $("btnResendVerify");

btnLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";
  const off = busy(btnLogin,true,"Đang đăng nhập…");
  try{
    const cred = await signInWithEmailAndPassword(auth, (loginEmail?.value||"").trim(), loginPwd?.value||"");
    if (!cred.user.emailVerified){
      try { await sendVerifySMTP(cred.user.email); } catch{}
      await signOut(auth);
      setNote(loginNote,"Tài khoản chưa xác minh. Mình vừa gửi lại email xác minh — kiểm tra hộp thư nhé.",false);
      if (btnResendVerify){
        btnResendVerify.style.display="inline-flex";
        btnResendVerify.onclick = async ()=>{
          const off2 = busy(btnResendVerify,true,"Đang gửi lại…");
          try{ await sendVerifySMTP((loginEmail?.value||"").trim()); setNote(loginNote,"Đã gửi lại email xác minh.",true); }
          catch(e){ setNote(loginNote, e.message || "Không gửi được email xác minh.", false); }
          finally{ off2(); }
        };
      }
      return;
    }
    afterLogin(cred.user);
  }catch(e){ setNote(loginNote, e?.code || e?.message || "Không đăng nhập được", false); }
  finally{ off(); }
});

/* ====== SIGNUP ====== */
const signupEmail = $("signupEmail");
const signupPwd   = $("signupPwd");
const btnSignup   = $("btnSignup");
const signupNote  = $("signupNote");

btnSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  const off = busy(btnSignup,true,"Đang tạo tài khoản…");
  try{
    const email = (signupEmail?.value||"").trim();
    const pass  = (signupPwd?.value||"");
    await createUserWithEmailAndPassword(auth, email, pass);
    try { await sendVerifySMTP(email); } catch{}
    try { await signOut(auth); } catch{}
    setNote(signupNote,"Tạo tài khoản thành công. Đã gửi email xác minh — kiểm tra hộp thư rồi đăng nhập lại nhé!", true);
  }catch(e){
    const nice = {
      "auth/email-already-in-use":"Email đã được đăng ký. Hãy đăng nhập hoặc dùng 'Quên mật khẩu'.",
      "auth/invalid-email":"Email không hợp lệ.",
      "auth/weak-password":"Mật khẩu quá yếu (≥ 8 ký tự)."
    };
    setNote(signupNote, nice[e?.code] || e?.code || e?.message || "Không tạo được tài khoản", false);
  }finally{ off(); }
});

/* ====== RESET (forgot) ====== */
const resetEmail = $("resetEmail");
const btnReset   = $("btnReset");
const resetNote  = $("resetNote");

btnReset?.addEventListener("click", async ()=>{
  const email = (resetEmail?.value||"").trim();
  if (!email){ setNote(resetNote,"Vui lòng nhập email.", false); return; }
  const off = busy(btnReset,true,"Đang gửi…");
  try{
    const r = await fetch(RESET_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    const j = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(j?.error || j?.message || "Không gửi được email.");
    setNote(resetNote,"Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư!", true);
  }catch(e){ setNote(resetNote, e.message || "Không gửi được mail. Vui lòng thử lại!", false); }
  finally{ off(); }
});

/* ====== STATE & HEADER ====== */
function afterLogin(user){
  const who = user.displayName || user.email || user.phoneNumber || "user";
  localStorage.setItem(FLAG,"1"); localStorage.setItem(WHOKEY, who);
  setAuthUI(); closeAuth(); location.href="/profile.html";
}
onAuthStateChanged(auth, (user)=>{
  if (user){ const who = user.displayName || user.email || user.phoneNumber || "user";
    localStorage.setItem(FLAG,"1"); localStorage.setItem(WHOKEY, who);
  }
  setAuthUI();
});
window.addEventListener("storage",(e)=>{ if([FLAG,WHOKEY,SIGNAL].includes(e.key)) setAuthUI(); });
setAuthUI();

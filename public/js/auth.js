<!-- ===========================
BEGIN FILE: /public/js/auth.js  (PATCHED to match index.html)
Ghi chú thay đổi chính:
- Đồng bộ ID với index.html:
  Login:    #loginEmail, #loginPwd,   #btnLogin
  Signup:   #signupEmail, #signupPwd, #btnSignup
  Reset:    #resetEmail,  #btnReset
  Resend:   #btnResendVerify (ẩn/hiện khi cần)
- Tabs: chấp nhận cả 'reset' lẫn 'forgot'
- Header: dùng #authBtn (mở modal) và #btnLogout (đăng xuất)
- API: VERIFY_API -> /.netlify/functions/send-verification-email
       FORGOT_API -> /.netlify/functions/send-reset
- Thêm toast để luôn thấy thông báo (kể cả khi note bị che)
=========================== -->
<script type="module">
/* ---------- Firebase ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ---------- Firebase Config ---------- */
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

/* ---------- LocalStorage Keys ---------- */
const FLAG   = "NINI_AUTH_LOGGED_IN";
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

/* ---------- DOM helpers ---------- */
const byId = (id) => document.getElementById(id);
const $qs  = (sel, root=document) => root.querySelector(sel);

/* Header */
const headerAuthBtn = byId("authBtn");   // (mới)
const btnLogout     = byId("btnLogout");
const whoSpan       = byId("who");

/* Modal + Tabs */
const modal    = byId("authModal");
const authTabs = byId("authTabs");

/* Login (map cả tên cũ để không vỡ) */
const loginEmail = byId("loginEmail");
const loginPw    = byId("loginPwd") || byId("loginPassword");
const btnLogin   = byId("btnLogin") || byId("btnEmailLogin");
const btnGoogle  = byId("btnGoogleLogin"); // có thể không tồn tại trong UI hiện tại
const loginNote  = byId("loginNote");
const btnResendVerify = byId("btnResendVerify");

/* Signup */
const signupEmail    = byId("signupEmail");
const signupPw       = byId("signupPwd") || byId("signupPassword");
const btnSignup      = byId("btnSignup") || byId("btnEmailSignup");
const signupNote     = byId("signupNote");

/* Reset/Forgot */
const resetEmail = byId("resetEmail") || byId("forgot_email");
const btnReset   = byId("btnReset")   || byId("btnForgotSend");
const resetNote  = byId("resetNote")  || byId("forgotNote");

/* ---------- Backend APIs ---------- */
const FORGOT_API = "/.netlify/functions/send-reset";
const VERIFY_API = "/.netlify/functions/send-verification-email";

/* ---------- Toast helper ---------- */
function toast(msg = "", type = "info") {
  if (!msg) return;
  let box = byId("nini_toast_box");
  if (!box) {
    box = document.createElement("div");
    box.id = "nini_toast_box";
    Object.assign(box.style, {
      position: "fixed", right: "16px", bottom: "16px",
      display: "flex", flexDirection: "column", gap: "8px",
      zIndex: 99999
    });
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    maxWidth: "360px", padding: "10px 12px",
    borderRadius: "10px",
    boxShadow: "0 6px 18px rgba(0,0,0,.25)",
    color: (type === "error" ? "#7f1d1d" : "#0f5132"),
    background: "rgba(255,255,255,.95)",
    backdropFilter: "blur(8px)",
    fontSize: "14px"
  });
  box.appendChild(t);
  setTimeout(()=> t.remove(), 4500);
}

/* ---------- setNote + busy ---------- */
function setNote(el, msg, ok = true){
  if (el) {
    el.textContent = msg || "";
    el.style.color = ok ? "#0f5132" : "#7f1d1d";
  }
  toast(msg, ok ? "ok" : "error");
}
function setBusy(button, busy = true, labelWhenBusy = "Đang xử lý…") {
  if (!button) return () => {};
  const old = button.textContent;
  button.disabled = !!busy;
  if (busy) button.textContent = labelWhenBusy;
  return () => { button.disabled = false; button.textContent = old; };
}

/* ---------- UI state ---------- */
function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  if (whoSpan) whoSpan.textContent = logged && who ? `(${who})` : "";

  // Trang này dùng authBtn (mở modal) + btnLogout
  if (headerAuthBtn) headerAuthBtn.hidden = logged;
  if (btnLogout)     btnLogout.hidden     = !logged;
}

/* ---------- Modal Tabs ---------- */
function switchAuth(which) {
  // chấp nhận 'reset' hoặc 'forgot' là tab quên mật khẩu
  const pane = (which === "forgot") ? "reset" : which;

  document.querySelectorAll("#authModal .tab-line").forEach(b => {
    b.classList.toggle("is-active", (b.dataset.auth === pane || (pane==="reset" && b.dataset.auth==="forgot")));
  });
  document.querySelectorAll("#authModal .form").forEach(p => {
    p.classList.toggle("is-active", p.getAttribute("data-pane") === pane);
  });
}
function openAuth(which = "login"){
  if (!modal) return;
  modal.setAttribute("aria-hidden","false");
  switchAuth(which);
}
function closeAuth(){ modal?.setAttribute("aria-hidden","true"); }

authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]");
  if(!t) return;
  switchAuth(t.getAttribute("data-auth") || "login");
});
modal?.querySelectorAll("[data-close], .modal__backdrop")
  .forEach(el => el.addEventListener("click", closeAuth));

headerAuthBtn?.addEventListener("click", ()=>openAuth("login"));
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});

/* ---------- API gửi verify qua SMTP ---------- */
async function sendVerifyEmailSMTP(email){
  const res = await fetch(VERIFY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data?.message || "Không gửi được email xác minh");
  return data;
}

/* ---------- Login ---------- */
btnLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";
  const unbusy = setBusy(btnLogin, true, "Đang đăng nhập…");
  try{
    const cred = await signInWithEmailAndPassword(
      auth, (loginEmail?.value||"").trim(), loginPw?.value||""
    );

    if (!cred.user.emailVerified){
      try { await sendVerifyEmailSMTP(cred.user.email); } catch(e){ console.warn(e); }
      await signOut(auth);
      setNote(loginNote, "Tài khoản chưa xác minh. Mình vừa gửi lại email xác minh — kiểm tra hộp thư nhé.", false);
      if (btnResendVerify){
        btnResendVerify.style.display = "inline-flex";
        btnResendVerify.onclick = async ()=>{
          const off = setBusy(btnResendVerify, true, "Đang gửi lại…");
          try{
            await sendVerifyEmailSMTP((loginEmail?.value||"").trim());
            setNote(loginNote, "Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư!", true);
          }catch(e){
            setNote(loginNote, e.message || "Không gửi được email xác minh.", false);
          }finally{ off(); }
        };
      }
      return;
    }

    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được", false);
  }finally{ unbusy(); }
});

/* ---------- Google (nếu có nút) ---------- */
btnGoogle?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  const unbusy = setBusy(btnGoogle, true, "Đang mở Google…");
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    if (cred.user.email && !cred.user.emailVerified){
      try { await sendVerifyEmailSMTP(cred.user.email); } catch(e){ console.warn(e); }
      await signOut(auth);
      setNote(loginNote, "Email Google chưa xác minh trong hệ thống. Đã gửi mail xác minh — kiểm tra hộp thư nhé.", false);
      return;
    }

    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được với Google", false);
  }finally{ unbusy(); }
});

/* ---------- Signup ---------- */
btnSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  const unbusy = setBusy(btnSignup, true, "Đang tạo tài khoản…");
  try{
    const email = (signupEmail?.value||"").trim();
    const pass  = (signupPw?.value||"");

    await createUserWithEmailAndPassword(auth, email, pass);
    try { await sendVerifyEmailSMTP(email); } catch(e){ console.warn(e); }
    try { await signOut(auth); } catch(_){}

    setNote(
      signupNote,
      "Tạo tài khoản thành công. Mình đã gửi email xác minh — hãy kiểm tra hộp thư rồi đăng nhập lại nhé!",
      true
    );
  }catch(e){
    const nice = {
      "auth/email-already-in-use": "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng 'Quên mật khẩu'.",
      "auth/invalid-email":       "Email không hợp lệ.",
      "auth/weak-password":       "Mật khẩu quá yếu (ít nhất 8 ký tự).",
    };
    setNote(signupNote, nice[e?.code] || (e?.code || e?.message || "Không tạo được tài khoản"), false);
  }finally{ unbusy(); }
});

/* ---------- Reset password ---------- */
btnReset?.addEventListener("click", async (e)=>{
  e?.preventDefault?.();
  const email = (resetEmail?.value || "").trim();
  if (!email) { setNote(resetNote, "Vui lòng nhập email.", false); return; }

  const unbusy = setBusy(btnReset, true, "Đang gửi…");
  try {
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNote(resetNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Kiểm tra email nhé!", true);
    } else {
      setNote(resetNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  } catch (err) {
    setNote(resetNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
  } finally { unbusy(); }
});

/* ---------- After Login + Header sync ---------- */
function afterLogin(user){
  const who = user.displayName || user.email || user.phoneNumber || "user";
  localStorage.setItem(FLAG,"1");
  localStorage.setItem(WHOKEY, who);
  setAuthUI();
  closeAuth();
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
</script>
<!-- ===========================
END FILE: /public/js/auth.js
=========================== -->

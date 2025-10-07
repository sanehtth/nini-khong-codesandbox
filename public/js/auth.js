// NiNi — AUTH (SMTP verify + resend + forgot) + toast + logs

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
const $  = (id) => document.getElementById(id);

/* Header */
const btnLogin   = $("btnLogin");
const btnLogout  = $("btnLogout");
const whoSpan    = $("who");

/* Modal + Tabs */
const modal    = $("authModal");
const authTabs = $("authTabs");

/* Login */
const loginEmail     = $("loginEmail");
const loginPw        = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");
const btnResendVerify = $("btnResendVerify"); // optional

/* Signup */
const signupEmail    = $("signupEmail");
const signupPw       = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

/* Forgot */
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

/* ---------- Backend APIs ---------- */
const FORGOT_API = "/.netlify/functions/send-reset";
const VERIFY_API = "/.netlify/functions/send-verification-email";

/* ---------- Toast helper (bảo đảm luôn thấy thông báo) ---------- */
function toast(msg = "", type = "info") {
  let box = document.getElementById("nini_toast_box");
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
    color: type === "error" ? "#7f1d1d" : "#0f5132",
    background: "rgba(255,255,255,.9)",
    backdropFilter: "blur(8px)",
    fontSize: "14px"
  });
  box.appendChild(t);
  setTimeout(()=> t.remove(), 4500);
}

/* ---------- setNote + fallback toast ---------- */
function setNote(el, msg, ok = true){
  if (el) {
    el.textContent = msg || "";
    el.style.color = ok ? "#0f5132" : "#7f1d1d";
  }
  // luôn hiện toast để bạn nhìn thấy
  toast(msg || "", ok ? "ok" : "error");
}

/* ---------- small helpers ---------- */
function setBusy(button, busy = true, labelWhenBusy = "Đang xử lý…") {
  if (!button) return () => {};
  const old = button.textContent;
  button.disabled = !!busy;
  if (busy) button.textContent = labelWhenBusy;
  else button.textContent = old;
  return () => { button.disabled = false; button.textContent = old; };
}

function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  if (whoSpan) whoSpan.textContent = logged && who ? `(${who})` : "";
  if (btnLogin)  btnLogin.hidden  = logged;
  if (btnLogout) btnLogout.hidden = !logged;
}

/* ---------- Modal Tabs ---------- */
function switchAuth(which) {
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

authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]");
  if(!t) return;
  switchAuth(t.getAttribute("data-auth") || "login");
});
modal?.querySelectorAll("[data-close], .modal__backdrop")
  .forEach(el => el.addEventListener("click", closeAuth));
btnLogin?.addEventListener("click", ()=>openAuth("login"));
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});

/* ---------- gọi Function gửi verify qua SMTP ---------- */
async function sendVerifyEmailSMTP(email){
  console.log("[VERIFY] POST", VERIFY_API, { email });
  const res = await fetch(VERIFY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(()=>({}));
  console.log("[VERIFY] resp", res.status, data);
  if (!res.ok) throw new Error(data?.message || "Không gửi được email xác minh");
  return data;
}

/* ---------- Login ---------- */
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";
  const unbusy = setBusy(btnEmailLogin, true, "Đang đăng nhập…");
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

/* ---------- Google ---------- */
btnGoogleLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";
  const unbusy = setBusy(btnGoogleLogin, true, "Đang mở Google…");
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

/* ---------- Signup: tạo user + gửi verify SMTP + signOut ---------- */
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  const unbusy = setBusy(btnEmailSignup, true, "Đang tạo tài khoản…");
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

/* ---------- Forgot password ---------- */
btnForgot?.addEventListener("click", async (e) => {
  e?.preventDefault?.();
  const email = (forgotInput?.value || "").trim();
  if (!email) {
    setNote(forgotNote, "Vui lòng nhập email.", false);
    return;
  }
  const unbusy = setBusy(btnForgot, true, "Đang gửi…");
  try {
    console.log("[RESET] POST", FORGOT_API, { email });
    const res = await fetch(FORGOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    console.log("[RESET] resp", res.status, data);

    if (res.ok) {
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Kiểm tra email nhé!", true);
    } else {
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  } catch (err) {
    setNote(forgotNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
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

// NiNi — AUTH (SMTP verify + resend + forgot)

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
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
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
/* Nút resend verify (tùy chọn) */
const btnResendVerify = $("btnResendVerify");

/* Signup */
const signupEmail    = $("signupEmail");
const signupPw       = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

/* Forgot */
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

/* ---------- Backend APIs (Netlify Functions) ---------- */
const FORGOT_API = "/.netlify/functions/send-reset";
const VERIFY_API = "/.netlify/functions/send-verification-email";

/* ---------- UI helpers ---------- */
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

/* ---------- gửi verify qua SMTP ---------- */
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
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";

  try{
    const cred = await signInWithEmailAndPassword(
      auth, (loginEmail.value||"").trim(), loginPw.value||""
    );

    if (!cred.user.emailVerified){
      try { await sendVerifyEmailSMTP(cred.user.email); } catch(_){}
      await signOut(auth);
      setNote(
        loginNote,
        "Tài khoản chưa xác minh. Mình vừa gửi lại email xác minh — hãy kiểm tra hộp thư trước khi đăng nhập.",
        false
      );
      if (btnResendVerify){
        btnResendVerify.style.display = "inline-flex";
        btnResendVerify.onclick = async ()=>{
          setNote(loginNote, "Đang gửi lại email xác minh…");
          try{
            await sendVerifyEmailSMTP((loginEmail.value||"").trim());
            setNote(loginNote, "Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư!", true);
          }catch(e){
            setNote(loginNote, e.message || "Không gửi được email xác minh.", false);
          }
        };
      }
      return;
    }

    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được", false);
  }
});

/* ---------- Google ---------- */
btnGoogleLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  if (btnResendVerify) btnResendVerify.style.display = "none";
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    if (cred.user.email && !cred.user.emailVerified){
      try { await sendVerifyEmailSMTP(cred.user.email); } catch(_){}
      await signOut(auth);
      setNote(loginNote, "Email Google của bạn chưa xác minh trong hệ thống. Đã gửi mail xác minh — kiểm tra hộp thư nhé.", false);
      return;
    }

    afterLogin(cred.user);
  }catch(e){
    setNote(loginNote, e?.code || e?.message || "Không đăng nhập được với Google", false);
  }
});

/* ---------- Signup: tạo user + gửi verify SMTP + signOut ---------- */
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  try{
    const email = (signupEmail.value||"").trim();
    const pass  = signupPw.value||"";

    await createUserWithEmailAndPassword(auth, email, pass);
    try { await sendVerifyEmailSMTP(email); } catch(_){}
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
  }
});

/* ---------- Forgot password ---------- */
btnForgot?.addEventListener("click", async (e) => {
  e?.preventDefault?.();

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
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setNote(forgotNote, data.message || "Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email!", true);
    } else {
      setNote(forgotNote, data.message || "Không gửi được mail. Vui lòng thử lại!", false);
    }
  } catch (err) {
    setNote(forgotNote, "Không kết nối được máy chủ. Kiểm tra lại URL API.", false);
  }
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

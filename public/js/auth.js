<!-- ===========================
BEGIN FILE: /public/js/auth.js
Ghi chú:
- Giữ nguyên Firebase config của bạn.
- Chuẩn hoá setNote (màu xanh/thông báo OK, đỏ/lỗi)
- Sửa logic Tab: switchAuth(which) + openAuth(which) để chỉ hiển thị 1 pane.
- Signup: gửi email xác minh bằng Firebase (sendEmailVerification).
- Forgot password: gọi API nội bộ (FORGOT_API) như bạn đang dùng.
=========================== -->
<script type="module">
// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification
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

// ---- LocalStorage keys để toggle 2 nút Header ----
const FLAG   = "NINI_AUTH_LOGGED_IN";  // "1"|"0"
const WHOKEY = "NINI_USER_DISPLAY";
const SIGNAL = "NINI_SIGNED_OUT_AT";

// ---- DOM Shortcuts ----
const $  = (id) => document.getElementById(id);

// Header buttons
const btnLogin   = $("btnLogin");
const btnLogout  = $("btnLogout");
const whoSpan    = $("who");

// Modal + tabs
const modal      = $("authModal");
const authTabs   = $("authTabs");

// Login controls
const loginEmail = $("loginEmail");
const loginPw    = $("loginPassword");
const btnEmailLogin  = $("btnEmailLogin");
const btnGoogleLogin = $("btnGoogleLogin");
const loginNote      = $("loginNote");

// Signup controls
const signupEmail = $("signupEmail");
const signupPw    = $("signupPassword");
const btnEmailSignup = $("btnEmailSignup");
const signupNote     = $("signupNote");

// Forgot controls
const forgotInput = $("forgot_email");
const btnForgot   = $("btnForgotSend");
const forgotNote  = $("forgotNote");

// API nội bộ gửi link quên mật khẩu (cùng domain để khỏi CORS)
const FORGOT_API = "/api/send-reset";


// =============================================
// BEGIN: Helpers UI (setNote / toggle header)
// =============================================
function setNote(el, msg, ok = true){
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#0f5132" : "#7f1d1d"; // xanh: ok, đỏ: lỗi
}
function isLoggedIn(){ return localStorage.getItem(FLAG) === "1"; }
function setAuthUI(){
  const logged = isLoggedIn();
  const who    = localStorage.getItem(WHOKEY) || "";
  whoSpan.textContent = logged && who ? `(${who})` : "";
  if (btnLogin)  btnLogin.hidden  = logged;
  if (btnLogout) btnLogout.hidden = !logged;
}
// =============================================
// END: Helpers UI
// =============================================


// =============================================
// BEGIN: Modal Tabs (sửa ẩn/hiện đúng 1 pane)
// =============================================
function switchAuth(which) {
  // bật tab
  document.querySelectorAll("#authModal .tab-line").forEach(b => {
    b.classList.toggle("is-active", b.dataset.auth === which);
  });
  // bật pane tương ứng (form)
  document.querySelectorAll("#authModal .form").forEach(p => {
    p.classList.toggle("is-active", p.getAttribute("data-pane") === which);
  });
}

function openAuth(which = "login"){
  if (!modal) return;
  modal.setAttribute("aria-hidden","false");
  switchAuth(which);
}
function closeAuth(){
  modal?.setAttribute("aria-hidden","true");
}

// Lắng nghe click tab
authTabs?.addEventListener("click", (e)=>{
  const t = e.target.closest("[data-auth]");
  if(!t) return;
  const pane = t.getAttribute("data-auth") || "login";
  switchAuth(pane);
});

// Đóng modal (nút X + backdrop)
modal?.querySelectorAll("[data-close], .modal__backdrop").forEach(el=>el.addEventListener("click", closeAuth));
// Nút mở/đóng
btnLogin?.addEventListener("click", ()=>openAuth("login"));
btnLogout?.addEventListener("click", async ()=>{
  try { await signOut(auth); } catch(_){}
  localStorage.setItem(FLAG,"0");
  localStorage.removeItem(WHOKEY);
  localStorage.setItem(SIGNAL, String(Date.now()));
  location.replace("/");
});
// =============================================
// END: Modal Tabs
// =============================================


// =============================================
// BEGIN: Login / Google Sign-in
// =============================================
btnEmailLogin?.addEventListener("click", async ()=>{
  setNote(loginNote,"");
  try{
    const cred = await signInWithEmailAndPassword(
      auth,
      (loginEmail.value||"").trim(),
      loginPw.value||""
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
// =============================================
// END: Login / Google Sign-in
// =============================================


// =============================================
// BEGIN: Signup (kèm gửi email xác minh Firebase)
// =============================================
btnEmailSignup?.addEventListener("click", async ()=>{
  setNote(signupNote,"");
  try{
    const email = (signupEmail.value||"").trim();
    const pass  = signupPw.value||"";

    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Gửi email xác minh
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
      "auth/email-already-in-use": "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng chức năng 'Quên mật khẩu'.",
      "auth/invalid-email":       "Email không hợp lệ.",
      "auth/weak-password":       "Mật khẩu quá yếu (ít nhất 8 ký tự).",
    };
    setNote(signupNote, nice[e?.code] || (e?.code || e?.message || "Không tạo được tài khoản"), false);
  }
});
// =============================================
// END: Signup (kèm gửi email xác minh Firebase)
// =============================================


// =============================================
// BEGIN: Forgot password (gọi API nội bộ của bạn)
// =============================================
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
      body: JSON.stringify({
        email,
        // đường dẫn trang reset của bạn
        link: "https://nini-funny.com/reset-password.html",
      }),
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
// =============================================
// END: Forgot password
// =============================================


// =============================================
// BEGIN: State after login + sync Header
// =============================================
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
// =============================================
// END: State after login + sync Header
// =============================================
</script>
<!-- ===========================
END FILE: /public/js/auth.js
=========================== -->

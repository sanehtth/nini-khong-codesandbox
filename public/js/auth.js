/* ========== BEGIN PATCH (SIGNUP HANDLER in /public/js/auth.js) ========== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ... phần config + các hàm helper + login giữ nguyên ... */

// ==== Elements cho đăng ký ====
const signupEmail    = document.getElementById("signupEmail");
const signupPw       = document.getElementById("signupPassword");
const signupPw2      = document.getElementById("signupPassword2");
const btnSendVerify  = document.getElementById("btnSendVerify");
const signupNote     = document.getElementById("signupNote");

// ==== Đăng ký + gửi email xác minh ====
btnSendVerify?.addEventListener("click", async () => {
  const email = (signupEmail.value || "").trim();
  const pw1   = signupPw.value || "";
  const pw2   = signupPw2.value || "";

  // Validate cơ bản
  const setNote = (msg, ok=true) => {
    signupNote.textContent = msg || "";
    signupNote.style.color = ok ? "#0f5132" : "#7f1d1d";
  };

  if (!email)        return setNote("Vui lòng nhập email.", false);
  if (pw1.length<8)  return setNote("Mật khẩu tối thiểu 8 ký tự.", false);
  if (pw1 !== pw2)   return setNote("Mật khẩu xác nhận chưa khớp.", false);

  // Khóa nút tạm thời
  btnSendVerify.disabled = true;
  setNote("Đang xử lý…");

  try {
    // 1) Kiểm tra email đã có tài khoản chưa
    const methods = await fetchSignInMethodsForEmail(auth, email).catch(()=>[]);
    if (methods && methods.length > 0) {
      btnSendVerify.disabled = false;
      return setNote("Email đã có tài khoản. Hãy đăng nhập hoặc dùng 'Quên mật khẩu'.", false);
    }

    // 2) Tạo tài khoản
    const cred = await createUserWithEmailAndPassword(auth, email, pw1);

    // 3) Gửi email xác minh
    try {
      await sendEmailVerification(cred.user, { url: "https://nini-funny.com/#home" });
    } catch {}

    // 4) Đăng xuất để buộc xác minh xong mới đăng nhập
    await signOut(auth);

    // 5) Thông báo + đếm ngược
    let s = 30;
    setNote(`Đã gửi email xác minh tới ${email}. Vui lòng mở hộp thư và bấm vào liên kết để kích hoạt. (Có thể mất vài chục giây)`, true);
    const timer = setInterval(() => {
      s--;
      btnSendVerify.textContent = `Đã gửi (${s}s)`;
      if (s<=0) {
        clearInterval(timer);
        btnSendVerify.textContent = "Gửi lại xác thực email";
        btnSendVerify.disabled = false;
      }
    }, 1000);

  } catch (e) {
    const map = {
      "auth/email-already-in-use": "Email này đã được đăng ký.",
      "auth/invalid-email": "Email không hợp lệ.",
      "auth/weak-password": "Mật khẩu quá yếu (ít nhất 8 ký tự).",
      "auth/too-many-requests": "Bạn thao tác quá nhanh, thử lại sau.",
    };
    signupNote.style.color = "#7f1d1d";
    signupNote.textContent = map[e?.code] || e?.code || e?.message || "Không tạo được tài khoản.";
    btnSendVerify.disabled = false;
  }
});
/* ========== END PATCH (SIGNUP HANDLER in /public/js/auth.js) ========== */
// ===== BEGIN PATCH: open modal click =====
const btnLoginEl = document.getElementById('btnLogin');
if (btnLoginEl) {
  btnLoginEl.addEventListener('click', (e) => {
    e.preventDefault();   // tránh bất kỳ default nào (nếu ở trong <form> hoặc bị wrap)
    const modal = document.getElementById('authModal');
    modal?.setAttribute('aria-hidden','false');
  });
}
// ===== END PATCH =====


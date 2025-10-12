/* auth-glue.js — glue giữa modal & backend (Firebase/server)
   - Bắt các event: auth:login | auth:signup | auth:reset | auth:google
   - Gọi NINI.fb.* tương ứng
   - Hiện trạng thái (loading / ok / err) + đóng modal khi xong
   - Theo dõi user để cập nhật header (ẩn/hiện nút, avatar)
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  const FB = () => (window.NINI && window.NINI.fb) || {};

  /* ---------- Helpers hiển thị trong modal ---------- */
  function setMsg(type, text) {
    const wrap = document.querySelector("#authModal .auth-box");
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector(".msg");
    if (!msg) { msg = document.createElement("div"); msg.className = "msg"; wrap.appendChild(msg); }
    msg.className = "msg " + (type || "");
    msg.textContent = text || "";
  }

  function setFormLoading(formId, loading, textLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = textLoading || "Đang xử lý...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._text || btn.textContent;
      btn.disabled = false;
    }
  }

  function closeModal() {
    const m = document.getElementById("authModal");
    if (!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-auth-open");
    N.emit && N.emit("auth:close");
  }

  /* ---------- Header state (login/logout/avatar) ---------- */
  function $header() {
    const root = document.getElementById("nini_header") || document;
    return {
      root,
      loginBtn:  root.querySelector("#btnAuthOpen, [data-auth='open']"),
      logoutBtn: root.querySelector("#btnLogout,  [data-auth='logout']"),
      avatarBox: root.querySelector("#userAvatar, [data-auth='avatar']"),
      userBox:   root.querySelector(".userbox") || root
    };
  }

  function ensureLogoutButton() {
    const { logoutBtn, userBox } = $header();
    if (logoutBtn) return logoutBtn;
    const btn = document.createElement("button");
    btn.id = "btnLogout";
    btn.setAttribute("data-auth", "logout");
    btn.textContent = "Đăng xuất";
    btn.style.marginLeft = "8px";
    userBox.appendChild(btn);
    return btn;
  }

  function ensureAvatarBox() {
    const { avatarBox, userBox } = $header();
    if (avatarBox) return avatarBox;
    const box = document.createElement("div");
    box.id = "userAvatar";
    box.setAttribute("data-auth", "avatar");
    box.style.display = "inline-flex";
    box.style.alignItems = "center";
    box.style.gap = "6px";
    box.style.marginRight = "8px";
    userBox.prepend(box);
    return box;
  }

  function initialsOf(u) {
    const name = (u.displayName || u.email || "").trim();
    const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const a = (parts[0] || "").charAt(0).toUpperCase();
    const b = (parts[parts.length - 1] || "").charAt(0).toUpperCase();
    return (a + b) || "U";
  }

  function renderUserState(user) {
    const { loginBtn } = $header();
    const logoutBtn = ensureLogoutButton();
    const avatarBox = ensureAvatarBox();

    if (user) {
      if (loginBtn)  loginBtn.style.display  = "none";
      if (logoutBtn) logoutBtn.style.display = "";
      if (avatarBox) {
        avatarBox.innerHTML = "";
        if (user.photoURL) {
          const img = document.createElement("img");
          img.src = user.photoURL;
          img.alt = user.displayName || user.email || "avatar";
          img.style.width = "28px"; img.style.height = "28px";
          img.style.borderRadius = "50%"; img.referrerPolicy = "no-referrer";
          avatarBox.appendChild(img);
        } else {
          const dot = document.createElement("div");
          dot.textContent = initialsOf(user);
          dot.style.width = "28px"; dot.style.height = "28px";
          dot.style.borderRadius = "50%"; dot.style.display = "grid";
          dot.style.placeItems = "center";
          dot.style.background = "#ececff"; dot.style.color = "#4b47ff";
          dot.style.fontWeight = "700";
          avatarBox.appendChild(dot);
        }
        const span = document.createElement("span");
        span.textContent = user.displayName || user.email || "";
        span.style.fontSize = "13px";
        avatarBox.appendChild(span);
      }
    } else {
      const { loginBtn: l2 } = $header();
      if (l2) l2.style.display = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (avatarBox) avatarBox.innerHTML = "";
    }
  }

  // Logout (ủy quyền click)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnLogout, [data-auth='logout']");
    if (!btn) return;
    e.preventDefault();
    try {
      const fb = FB();
      if (!fb.logout) throw new Error("Thiếu NINI.fb.logout");
      await fb.logout();
      renderUserState(null);
      setMsg("ok", "Đã đăng xuất");
    } catch (err) {
      setMsg("err", (err && err.message) || "Đăng xuất thất bại");
    }
  });

  // Theo dõi user để đồng bộ header
  try {
    const fb = FB();
    fb.onUserChanged && fb.onUserChanged((u) => {
      renderUserState(u);
      console.log("[NINI] user:", u ? u.email : "signed out");
    });
  } catch (e) { /* ignore */ }

  /* ---------- Handlers cho các nút trong modal ---------- */

  // Đăng nhập (có fallback đọc trực tiếp từ modal nếu payload rỗng)
N.on && N.on('auth:login', async ({ email, password }) => {
  try {
    // Fallback: nếu email/pw chưa có, đọc trực tiếp từ form đang hiển thị trong modal
    const modal  = document.getElementById('authModal');
    const active = modal ? modal.querySelector('form.active') : null;
    const pick = (selList) => {
      if (!active) return '';
      const el = active.querySelector(selList);
      return el ? String(el.value ?? el.getAttribute('value') ?? '').trim() : '';
    };

    if (!email)    email    = pick('input[type="email"], input[name="email"], input[name*="mail" i]');
    if (!password) password = pick('input[type="password"], input[name="password"]');

    email = (email || '').toLowerCase();

    if (!email) {
      setMsg('err', 'Thiếu email (UI chưa trả được giá trị).');
      console.warn('[auth] missing email. Debug:',
        active?.outerHTML?.slice(0, 200) || '(no active form)');
      return;
    }

    setMsg('', '');
    setFormLoading('formLogin', true, 'Đang đăng nhập...');

    const fb = (window.NINI && window.NINI.fb) || {};
    const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
    if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass/LoginEmailPassword');

    const user = await loginFn(email, password);
    setMsg('ok', 'Đăng nhập thành công!');
    closeModal();
    renderUserState(user);
  } catch (err) {
    setMsg('err', (err && err.message) || 'Đăng nhập thất bại');
  } finally {
    setFormLoading('formLogin', false);
  }
});


  // Đăng ký
  N.on && N.on("auth:signup", async ({ email, password, confirm }) => {
    try {
      if (password !== confirm) { setMsg("err", "Mật khẩu nhập lại không khớp."); return; }
      setMsg("", "");
      setFormLoading("formSignup", true, "Đang tạo tài khoản...");
      const fb = FB();
      if (!fb.registerEmailPass) throw new Error("Thiếu NINI.fb.registerEmailPass");
      const user = await fb.registerEmailPass(email, password);
      if (fb.sendEmailVerification) { try { await fb.sendEmailVerification(email); } catch (e) {} }
      setMsg("ok", "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh.");
      closeModal();
      renderUserState(user);
    } catch (err) {
      setMsg("err", (err && err.message) || "Đăng ký thất bại");
    } finally {
      setFormLoading("formSignup", false);
    }
  });

  // Quên mật khẩu
  N.on && N.on("auth:reset", async ({ email }) => {
    try {
      setMsg("", "");
      setFormLoading("formReset", true, "Đang gửi email...");
      const fb = FB();
      if (!fb.resetPassword) throw new Error("Thiếu NINI.fb.resetPassword");
      await fb.resetPassword(email);
      setMsg("ok", "Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.");
      closeModal();
    } catch (err) {
      setMsg("err", (err && err.message) || "Gửi mail thất bại");
    } finally {
      setFormLoading("formReset", false);
    }
  });

  // Google
  N.on && N.on("auth:google", async () => {
    try {
      setMsg("", "");
      const fb = FB();
      if (!fb.loginGoogle) throw new Error("Thiếu NINI.fb.loginGoogle");
      const user = await fb.loginGoogle();
      setMsg("ok", "Đăng nhập Google thành công!");
      closeModal();
      renderUserState(user);
    } catch (err) {
      setMsg("err", (err && err.message) || "Đăng nhập Google thất bại");
    }
  });
})();


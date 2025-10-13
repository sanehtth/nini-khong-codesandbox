/* auth-glue.js — kết nối modal ↔ Firebase + validate email trước khi gọi API
   - Bắt các event từ UI: auth:login | auth:signup | auth:reset | auth:google
   - Validate email: sai định dạng → báo lỗi & không gọi Firebase
   - Đọc giá trị trực tiếp từ form (#formLogin/#formSignup/#formReset) nếu payload trống
   - Đồng bộ header sau khi đăng nhập/đăng xuất
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  // ============ Helpers UI trong modal ============
  function $(sel, root = document) { return root.querySelector(sel); }

  function setMsg(type, text) {
    const wrap = $("#authModal .auth-box");
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
      btn.textContent = textLoading || "Đang xử lý…";
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

  // ============ Validate & lấy giá trị ============
  // Regex email “vừa đủ chặt” cho UI
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function markInvalid(inputEl, message) {
    if (!inputEl) { setMsg("err", message); return false; }
    inputEl.classList.add("is-invalid"); // style: viền dưới/viền đỏ nếu bạn muốn
    inputEl.setAttribute("aria-invalid", "true");
    setMsg("err", message);
    inputEl.focus();
    return false;
  }

  function clearInvalid(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove("is-invalid");
    inputEl.removeAttribute("aria-invalid");
  }

  function assertEmailFrom(formId, pickSelectorList, requiredMsg = "Vui lòng nhập email.") {
    // pickSelectorList: danh sách selector ưu tiên (đã bao trùm các cách đặt name/id phổ biến)
    const f = document.getElementById(formId)
      || $("#authModal").querySelector(`#${formId}, form[name="${formId}"], form[data-form="${formId}"]`)
      || $("#authModal form");
    const sel = pickSelectorList || [
      'input[type="email"]',
      'input[name="email"]',
      'input[name*="mail" i]'
    ];
    let emailEl = null;
    for (const s of sel) { const found = f?.querySelector(s); if (found) { emailEl = found; break; } }
    const email = (emailEl?.value || "").trim().toLowerCase();

    clearInvalid(emailEl);
    if (!email)  return markInvalid(emailEl, requiredMsg);
    if (!EMAIL_RE.test(email)) return markInvalid(emailEl, "Email không đúng định dạng.");
    return { email, emailEl };
  }

  function readPasswordFrom(formId) {
    const f = document.getElementById(formId) || $("#authModal form");
    const pw = f?.querySelector('input[type="password"], input[name="password"]');
    clearInvalid(pw);
    const val = (pw?.value || "").toString();
    if (!val) return { ok: false, el: pw, value: "", reason: "Vui lòng nhập mật khẩu." };
    return { ok: true, el: pw, value: val };
  }

  // ============ Header state (tuỳ chọn) ============
 function renderUserState(user) {
  // Chỉ thao tác đúng trong #nini_header
  const header = document.getElementById('nini_header');
  if (!header) return;
  const btnAuth = header.querySelector('#btnAuthOpen, [data-auth="open"]');
  const userInfo = header.querySelector('#userInfo, [data-auth="avatar"]')?.parentElement || header.querySelector('#userInfo');

  // Đảm bảo trạng thái mặc định an toàn
  if (btnAuth) btnAuth.hidden = !!user;
  if (userInfo) userInfo.hidden = !user;

  // Cập nhật nickname/avatar nếu có
  const nick = header.querySelector('#userNick');
  const ava  = header.querySelector('#btnProfile, .avatar');
  if (user) {
    const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
    if (nick) nick.textContent = display;
    if (ava) {
      if (user.photoURL) ava.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
      else ava.style.removeProperty('--ava-bg');
      ava.setAttribute('data-letter', (display[0] || 'U').toUpperCase());
    }
  } else {
    if (nick) nick.textContent = '';
    if (ava) {
      ava.style.removeProperty('--ava-bg');
      ava.setAttribute('data-letter', 'U');
    }
  }
}


  // ============ Lấy FB API ============
  const FB = () => (window.NINI && window.NINI.fb) || {};

  // ============ EVENTS ============
  // 1) Đăng nhập
  N.on && N.on('auth:login', async (payload = {}) => {
    try {
      // 1. Validate email
      const okMail = assertEmailFrom("formLogin");
      if (!okMail || !okMail.email) return;

      // 2. Lấy password
      const pw = readPasswordFrom("formLogin");
      if (!pw.ok) return markInvalid(pw.el, pw.reason);

      setMsg('', '');
      setFormLoading('formLogin', true, 'Đang đăng nhập…');

      // 3. Gọi Firebase
      const fb = FB();
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error("Thiếu NINI.fb.loginEmailPass");
      const user = await loginFn(okMail.email, pw.value);

      setMsg('ok', 'Đăng nhập thành công!');
      closeModal();
      renderUserState(user);
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng nhập thất bại');
    } finally {
      setFormLoading('formLogin', false);
    }
  });

  // 2) Đăng ký (email-only)
  N.on && N.on('auth:signup', async () => {
    try {
      // 1. Validate email
      const okMail = assertEmailFrom("formSignup");
      if (!okMail || !okMail.email) return;

      setMsg('', '');
      setFormLoading('formSignup', true, 'Đang gửi email xác minh…');

      // 2. Gọi Firebase (mail pro)
      const fb = FB();
      if (!fb.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');
      await fb.registerEmailOnly(okMail.email);

      setMsg('ok', 'Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  // 3) Quên mật khẩu
  N.on && N.on('auth:reset', async () => {
    try {
      // 1. Validate email
      const okMail = assertEmailFrom("formReset", null, "Vui lòng nhập email để đặt lại mật khẩu.");
      if (!okMail || !okMail.email) return;

      setMsg('', '');
      setFormLoading('formReset', true, 'Đang gửi email…');

      // 2. Gọi Firebase
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(okMail.email);

      setMsg('ok', 'Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Gửi mail thất bại');
    } finally {
      setFormLoading('formReset', false);
    }
  });

  // 4) Google
  N.on && N.on('auth:google', async () => {
    try {
      setMsg('', '');
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

  // ============ UX: xoá trạng thái invalid khi người dùng sửa lại ============
  ["formLogin", "formSignup", "formReset"].forEach(id => {
    const f = document.getElementById(id);
    if (!f) return;
    f.addEventListener("input", (e) => {
      const t = e.target;
      if (t && (t.matches('input[type="email"]') || t.matches('input[type="password"]'))) {
        clearInvalid(t);
        setMsg('', '');
      }
    });
  });
})();


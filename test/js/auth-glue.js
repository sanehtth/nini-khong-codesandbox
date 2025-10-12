/* auth-glue.js
 * NHIỆM VỤ:
 *  - Bắt sự kiện từ auth-modal (auth:login / auth:signup / auth:reset / auth:google)
 *  - Gọi NINI.fb.* (Firebase / server)
 *  - Hiển thị trạng thái (loading / ok / lỗi) và đóng modal khi xong
 *  - Theo dõi user để cập nhật header (ẩn/hiện nút đăng nhập/đăng xuất + avatar)
 *
 * LƯU Ý:
 *  - File này KHÔNG xử lý mở/đóng modal bằng ESC/backdrop... (onoff.js lo)
 *  - Header DOM: cố gắng tự tìm theo id/data-attr phổ biến (#btnAuthOpen, [data-auth="open"], #btnLogout, [data-auth="logout"], #userAvatar, [data-auth="avatar"])
 */

(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  const FB = () => (window.NINI && window.NINI.fb) || {};

  /* ---------- Helpers UI nhỏ trong modal ---------- */
  function setMsg(type, text) {
    const wrap = document.querySelector('#authModal .auth-box');
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector('.msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'msg';
      wrap.appendChild(msg);
    }
    msg.className = 'msg ' + (type || '');
    msg.textContent = text || '';
  }

  function setFormLoading(formId, loading, labelWhenLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = labelWhenLoading || 'Đang xử lý...';
      btn.disabled = true;
    } else {
      if (btn.dataset._text) btn.textContent = btn.dataset._text;
      btn.disabled = false;
    }
  }

  function closeModal() {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
    N.emit && N.emit('auth:close');
  }

  /* ---------- Header state: login/logout/avatar ---------- */
  function $header() {
    const root = document.getElementById('nini_header') || document;
    const loginBtn  = root.querySelector('#btnAuthOpen, [data-auth="open"]');
    const logoutBtn = root.querySelector('#btnLogout, [data-auth="logout"]');
    const avatarBox = root.querySelector('#userAvatar, [data-auth="avatar"]');
    return { root, loginBtn, logoutBtn, avatarBox };
  }

  function ensureLogoutButton() {
    const { root, logoutBtn } = $header();
    if (logoutBtn) return logoutBtn;
    // nếu header chưa có sẵn nút Đăng xuất → tạo nhanh
    const userbox = root.querySelector('.userbox') || root;
    const btn = document.createElement('button');
    btn.id = 'btnLogout';
    btn.setAttribute('data-auth', 'logout');
    btn.textContent = 'Đăng xuất';
    btn.style.marginLeft = '8px';
    userbox.appendChild(btn);
    return btn;
  }

  function ensureAvatarBox() {
    const { root, avatarBox } = $header();
    if (avatarBox) return avatarBox;
    const userbox = root.querySelector('.userbox') || root;
    const box = document.createElement('div');
    box.id = 'userAvatar';
    box.setAttribute('data-auth', 'avatar');
    box.style.display = 'inline-flex';
    box.style.alignItems = 'center';
    box.style.gap = '6px';
    box.style.marginRight = '8px';
    userbox.prepend(box);
    return box;
  }

  function initialsOf(u) {
    const name = (u.displayName || u.email || '').trim();
    const segs = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const first = (segs[0] || '').charAt(0).toUpperCase();
    const last  = (segs[segs.length - 1] || '').charAt(0).toUpperCase();
    return (first + last) || 'U';
  }

  function renderUserState(user) {
    const { loginBtn } = $header();
    const logoutBtn = ensureLogoutButton();
    const avatarBox = ensureAvatarBox();

    if (user) {
      // đang đăng nhập
      if (loginBtn)  loginBtn.style.display  = 'none';
      if (logoutBtn) logoutBtn.style.display = '';
      if (avatarBox) {
        const photo = user.photoURL;
        avatarBox.innerHTML = '';
        if (photo) {
          const img = document.createElement('img');
          img.src = photo; img.alt = user.displayName || user.email || 'avatar';
          img.style.width = '28px'; img.style.height = '28px';
          img.style.borderRadius = '50%'; img.referrerPolicy = 'no-referrer';
          avatarBox.appendChild(img);
        } else {
          const dot = document.createElement('div');
          dot.textContent = initialsOf(user);
          dot.style.width = '28px'; dot.style.height = '28px';
          dot.style.borderRadius = '50%'; dot.style.display = 'grid';
          dot.style.placeItems = 'center';
          dot.style.background = '#ececff'; dot.style.color = '#4b47ff';
          dot.style.fontWeight = '700';
          avatarBox.appendChild(dot);
        }
        const span = document.createElement('span');
        span.textContent = user.displayName || user.email || '';
        span.style.fontSize = '13px';
        avatarBox.appendChild(span);
      }
    } else {
      // đã đăng xuất
      const { loginBtn: l2 } = $header();
      if (l2) l2.style.display = '';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (avatarBox) avatarBox.innerHTML = '';
    }
  }

  // Bắt click Đăng xuất (ủy quyền để không phụ thuộc thời điểm render)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#btnLogout, [data-auth="logout"]');
    if (!btn) return;
    e.preventDefault();
    try {
      const fb = FB();
      if (!fb.logout) throw new Error('Thiếu NINI.fb.logout');
      await fb.logout();
      renderUserState(null);
      setMsg('ok', 'Đã đăng xuất');
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng xuất thất bại');
    }
  });

  // Theo dõi thay đổi user từ Firebase để sync header
  try {
    const fb = FB();
    fb.onUserChanged && fb.onUserChanged((u) => {
      renderUserState(u);
      console.log('[NINI] user:', u ? u.email : 'signed out');
    });
  } catch {}

  /* ---------- Handlers cho các nút trong modal ---------- */

  // Đăng nhập
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      setMsg('', '');
      setFormLoading('formLogin', true, 'Đang đăng nhập...');
      const fb = FB();
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
  N.on && N.on('auth:signup', async ({ email, password, confirm }) => {
    try {
      if (password !== confirm) {
        setMsg('err', 'Mật khẩu nhập lại không khớp.');
        return;
      }
      setMsg('', '');
      setFormLoading('formSignup', true, 'Đang tạo tài khoản...');
      const fb = FB();
      if (!fb.registerEmailPass) throw new Error('Thiếu NINI.fb.registerEmailPass');
      const user = await fb.registerEmailPass(email, password);
      if (fb.sendEmailVerification) {
        try { await fb.sendEmailVerification(email); } catch {}
      }
      setMsg('ok', 'Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh.');
      closeModal();
      renderUserState(user);
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  // Quên mật khẩu
  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      setMsg('', '');
      setFormLoading('formReset', true, 'Đang gửi email...');
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(email);
      setMsg('ok', 'Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Gửi mail thất bại');
    } finally {
      setFormLoading('formReset', false);
    }
  });

  // Google
  N.on && N.on('auth:google', async ()

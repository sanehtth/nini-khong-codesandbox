/* auth-glue.js — singletons, no double submit, clear UI toggle
   - Chỉ wire 1 lần: dùng flags + unsub
   - Chặn gửi trùng: busy gate
   - Validate email trước khi gọi Firebase
   - Đồng bộ UI header theo user
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;           // <-- chặn nạp trùng
  N._wiredAuthGlue = true;

  // ----- tiện ích -----
  const $ = (sel, r = document) => r.querySelector(sel);
  const byId = (id) => document.getElementById(id);
  const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||'').trim());

  function setMsg(type, text) {
    const wrap = document.querySelector("#authModal .auth-box");
    if (!wrap) { if (text) console.warn(text); return; }
    let msg = wrap.querySelector(".msg");
    if (!msg) { msg = document.createElement("div"); msg.className = "msg"; wrap.appendChild(msg); }
    msg.className = "msg " + (type || "");
    msg.textContent = text || "";
  }
  function setFormLoading(formId, loading, textLoading) {
    const f = byId(formId); if (!f) return;
    const btn = f.querySelector('button[type="submit"]'); if (!btn) return;
    if (loading) { btn.dataset._text = btn.textContent; btn.textContent = textLoading || "Đang xử lý..."; btn.disabled = true; }
    else { btn.textContent = btn.dataset._text || btn.textContent; btn.disabled = false; }
  }
  function closeModal() {
    const m = byId("authModal");
    if (!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-auth-open");
    N.emit && N.emit("auth:close");
  }

  // ----- Header UI toggle (ẩn/hiện nút) -----
  function $header() {
    const root = byId("nini_header") || document;
    return {
      loginBtn:  root.querySelector("#btnAuthOpen, [data-auth='open']"),
      logoutBtn: root.querySelector("#btnLogout, [data-auth='logout']"),
      avatarBox: root.querySelector("#userAvatar, [data-auth='avatar']"),
      nickSpan:  root.querySelector("#userNick, [data-auth='nick']"),
    };
  }
  function ensure(el, html, before=false) {
    if (el) return el;
    const box = (byId("nini_header")||document).querySelector(".userbox") || byId("nini_header") || document.body;
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    const node = div.firstChild;
    before ? box.prepend(node) : box.appendChild(node);
    return node;
  }
  function ensureControls() {
    let {loginBtn, logoutBtn, avatarBox, nickSpan} = $header();
    loginBtn = ensure(loginBtn, `<button id="btnAuthOpen" data-auth="open" class="btn-auth">Đăng nhập / Đăng ký</button>`);
    avatarBox = ensure(avatarBox, `<div id="userAvatar" data-auth="avatar" style="display:inline-flex;gap:8px;align-items:center"></div>`, true);
    nickSpan  = ensure(nickSpan,  `<span id="userNick" data-auth="nick"></span>`);
    logoutBtn = ensure(logoutBtn, `<button id="btnLogout"  data-auth="logout" class="btn-auth">Đăng xuất</button>`);
    return {loginBtn, logoutBtn, avatarBox, nickSpan};
  }

  function renderUserState(user) {
    const {loginBtn, logoutBtn, avatarBox, nickSpan} = ensureControls();
    if (user) {
      if (loginBtn)  loginBtn.style.display  = "none";
      if (logoutBtn) logoutBtn.style.display = "";
      if (avatarBox) {
        avatarBox.innerHTML = "";
        if (user.photoURL) {
          const img = document.createElement("img");
          img.src = user.photoURL; img.alt = user.displayName||user.email||"avatar";
          img.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;referrer-policy:no-referrer";
          avatarBox.appendChild(img);
        } else {
          const dot = document.createElement("div");
          const name = (user.displayName || user.email || "").trim();
          const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
          const ini = ((parts[0]||'')[0]||'U').toUpperCase();
          dot.textContent = ini;
          dot.style.cssText = "width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#ececff;color:#4b47ff;font-weight:700";
          avatarBox.appendChild(dot);
        }
      }
      if (nickSpan) nickSpan.textContent = user.displayName || user.email || "";
    } else {
      if (loginBtn)  loginBtn.style.display  = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (avatarBox) avatarBox.innerHTML = "";
      if (nickSpan)  nickSpan.textContent  = "";
    }
    // cập nhật body flag (nếu CSS dùng)
    document.body.setAttribute("data-auth", user ? "in" : "out");
  }

  // ----- wire click (once) -----
  // Busy gates để chặn double-submit/double-logout
  let loginBusy = false, logoutBusy = false;

  document.addEventListener("click", async (e) => {
    // open modal
    const openBtn = e.target.closest("#btnAuthOpen,[data-auth='open']");
    if (openBtn) {
      const m = byId("authModal");
      if (m) { m.classList.remove("hidden"); m.setAttribute("aria-hidden", "false"); document.body.classList.add("body-auth-open"); }
      return;
    }

    // logout
    const outBtn = e.target.closest("#btnLogout,[data-auth='logout']");
    if (outBtn) {
      if (logoutBusy) return;
      logoutBusy = true;
      try { await N.fb?.signOut?.(); setMsg("ok", "Đã đăng xuất"); }
      catch (err) { console.error(err); setMsg("err", err?.message || "Đăng xuất thất bại"); }
      finally { logoutBusy = false; }
    }
  }, {capture:false});

  // ----- handlers từ modal (đăng nhập / đăng ký / reset) -----
  function pickFromActive(sel) {
    const m = byId('authModal');
    const f = m ? m.querySelector('form.active') : null;
    const el = f ? f.querySelector(sel) : null;
    return el ? String(el.value ?? el.getAttribute('value') ?? '').trim() : '';
  }

  N.on && N.on('auth:login', async ({ email, password } = {}) => {
    if (loginBusy) return;               // chặn double click
    loginBusy = true;
    try {
      email    = email    || pickFromActive('input[type="email"], input[name="email"], input[name*="mail" i]');
      password = password || pickFromActive('input[type="password"], input[name="password"]');

      if (!isValidEmail(email)) { setMsg('err','Vui lòng nhập email hợp lệ.'); return; }
      if (!password) { setMsg('err','Vui lòng nhập mật khẩu.'); return; }

      setMsg('', ''); setFormLoading('formLogin', true, 'Đang đăng nhập...');
      const fb = N.fb || {};
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword || fb.login;
      if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass');
      const user = await loginFn(email, password);
      setMsg('ok', 'Đăng nhập thành công!'); closeModal(); renderUserState(user);
    } catch (err) {
      const msg = err?.message || err?.error?.message || 'Đăng nhập thất bại';
      setMsg('err', 'Lỗi: ' + msg);
      console.error('auth:login', err);
    } finally {
      setFormLoading('formLogin', false); loginBusy = false;
    }
  });

  N.on && N.on('auth:signup', async ({ email } = {}) => {
    try {
      email = email || pickFromActive('input[type="email"], input[name="email"], input[name*="mail" i]');
      if (!isValidEmail(email)) { setMsg('err','Email không hợp lệ.'); return; }
      setMsg('', ''); setFormLoading('formSignup', true, 'Đang gửi email xác minh...');
      if (!N.fb?.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');
      await N.fb.registerEmailOnly(email);
      setMsg('ok','Đã gửi email xác minh. Hãy kiểm tra hộp thư.'); closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Đăng ký thất bại'); console.error('auth:signup', err);
    } finally { setFormLoading('formSignup', false); }
  });

  N.on && N.on('auth:reset', async ({ email } = {}) => {
    try {
      email = email || pickFromActive('input[type="email"], input[name="email"], input[name*="mail" i]');
      if (!isValidEmail(email)) { setMsg('err','Email không hợp lệ.'); return; }
      setMsg('', ''); setFormLoading('formReset', true, 'Đang gửi email...');
      if (!N.fb?.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await N.fb.resetPassword(email);
      setMsg('ok','Đã gửi link đặt lại mật khẩu.'); closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Gửi mail thất bại'); console.error('auth:reset', err);
    } finally { setFormLoading('formReset', false); }
  });

  // ----- subscribe onAuthStateChanged: chỉ 1 lần -----
  if (N._onAuthUnsub) { try { N._onAuthUnsub(); } catch(_){} }   // nếu script từng nạp -> huỷ cũ
  if (N.fb?.onUserChanged) {
    N._onAuthUnsub = N.fb.onUserChanged((u) => {
      renderUserState(u);
      console.log('[NINI] user:', u ? (u.email||u.uid) : 'signed out');
    });
  }
  // render ngay nếu đã có user
  try { if (N.fb?.currentUser) renderUserState(N.fb.currentUser()); } catch(_){}
})();

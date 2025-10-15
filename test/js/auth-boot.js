// test/js/auth-boot.js — nút "Đăng nhập" dạng pill + avatar & menu + modal tối giản
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ============ UI helpers ============ */
  function pillButton(id, text) {
    const b = document.createElement('button');
    b.id = id;
    b.type = 'button';
    b.textContent = text;
    b.setAttribute('aria-label', text);
    b.style.cssText = `
      position:fixed; right:98px; top:16px; z-index:1000000;
      height:36px; padding:0 14px; border-radius:18px;
      border:none; background:#2ea36a; color:#fff; font-weight:700;
      box-shadow:0 6px 18px rgba(0,0,0,.22); cursor:pointer;
      display:inline-flex; align-items:center; gap:8px;
    `;
    return b;
  }

  function avatarButton(id, txt) {
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.cssText = `
      position:fixed; right:98px; top:12px; z-index:1000000;
      display:flex; align-items:center; gap:8px;
    `;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.textContent = txt || '';
    pill.style.cssText = `
      height:36px; padding:0 12px; border-radius:18px;
      border:none; background:#263; color:#cfe; font-weight:700;
      box-shadow:0 6px 18px rgba(0,0,0,.20); cursor:default; display:none;
    `;
    pill.className = 'nini_user_name';

    const av = document.createElement('button');
    av.type = 'button';
    av.style.cssText = `
      width:36px; height:36px; border-radius:50%; border:none;
      background:#30a46c; color:#fff; font-weight:800; cursor:pointer;
      display:inline-flex; align-items:center; justify-content:center;
      overflow:hidden;
      box-shadow:0 6px 18px rgba(0,0,0,.22);
    `;
    av.className = 'nini_avatar';

    const img = document.createElement('img');
    img.alt = 'avatar';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:none;';
    av.appendChild(img);

    const span = document.createElement('span');
    span.textContent = 'N';
    av.appendChild(span);

    const menu = document.createElement('div');
    menu.className = 'nini_menu';
    menu.style.cssText = `
      position:absolute; right:0; top:46px; background:#101a14; color:#dff;
      border-radius:12px; min-width:160px; padding:8px;
      box-shadow:0 18px 64px rgba(0,0,0,.5); display:none; z-index:1000001;
    `;
    menu.innerHTML = `
      <button type="button" data-act="profile" style="all:unset;display:block;width:100%;padding:10px;border-radius:8px;cursor:pointer">Hồ sơ</button>
      <button type="button" data-act="logout"  style="all:unset;display:block;width:100%;padding:10px;border-radius:8px;cursor:pointer;color:#fbb">Đăng xuất</button>
    `;

    wrap.appendChild(pill);
    wrap.appendChild(av);
    wrap.appendChild(menu);

    // menu toggle
    av.addEventListener('click', (e)=>{
      e.stopPropagation();
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });
    document.addEventListener('click', ()=> menu.style.display = 'none');

    // actions
    menu.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'profile') {
        location.href = '/#/profile';
      } else if (btn.dataset.act === 'logout') {
        const fb = window.NiNi && window.NiNi.fb;
        fb && fb.auth && fb.auth.signOut && fb.auth.signOut().catch(()=>{});
      }
    });

    return wrap;
  }

  /* ============ Modal tối giản để test ============ */
  function ensureModal(){
    if ($('#authModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.innerHTML = `
      <div class="am_backdrop" style="
        position:fixed; inset:0; background:rgba(0,0,0,.62);
        display:none; align-items:center; justify-content:center;
        z-index:1000002;">
        <div class="am_box" role="dialog" aria-modal="true" style="
          width:min(560px, 92vw); border-radius:14px; background:#101a14;
          color:#dff; box-shadow:0 18px 64px rgba(0,0,0,.55); padding:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <h3 style="margin:0; font-weight:800">Đăng nhập</h3>
            <button type="button" id="am_close" style="
              border:none; background:transparent; color:#9dd; font-size:22px; cursor:pointer">×</button>
          </div>
          <div style="display:flex; gap:10px; margin-bottom:14px;">
            <button class="am_tab" data-tab="login">Đăng nhập</button>
            <button class="am_tab" data-tab="signup">Đăng ký</button>
            <button class="am_tab" data-tab="reset">Quên mật khẩu</button>
          </div>

          <div class="am_view" data-view="login">
            <input id="am_email_l" placeholder="Email" style="width:100%; margin:6px 0; padding:10px; border-radius:8px; border:1px solid #244"/>
            <input id="am_pass_l" type="password" placeholder="Mật khẩu" style="width:100%; margin:6px 0; padding:10px; border-radius:8px; border:1px solid #244"/>
            <button id="am_do_login" style="width:100%; margin-top:8px; padding:10px; border:none; border-radius:8px; background:#30a46c; color:#fff; font-weight:700">Đăng nhập</button>
          </div>

          <div class="am_view" data-view="signup" hidden>
            <input id="am_email_s" placeholder="Email" style="width:100%; margin:6px 0; padding:10px; border-radius:8px; border:1px solid #244"/>
            <input id="am_pass_s" type="password" placeholder="Mật khẩu" style="width:100%; margin:6px 0; padding:10px; border-radius:8px; border:1px solid #244"/>
            <button id="am_do_signup" style="width:100%; margin-top:8px; padding:10px; border:none; border-radius:8px; background:#30a46c; color:#fff; font-weight:700">Tạo tài khoản</button>
          </div>

          <div class="am_view" data-view="reset" hidden>
            <input id="am_email_r" placeholder="Email" style="width:100%; margin:6px 0; padding:10px; border-radius:8px; border:1px solid #244"/>
            <button id="am_do_reset" style="width:100%; margin-top:8px; padding:10px; border:none; border-radius:8px; background:#30a46c; color:#fff; font-weight:700">Gửi link đặt lại</button>
          </div>

          <p id="am_msg" style="min-height:22px; margin:10px 0 0; color:#9fd"></p>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', (e)=>{
      if (e.target.id === 'am_close') { closeModal(); return; }
      const t = e.target.closest('.am_tab'); if (!t) return;
      const view = t.dataset.tab;
      $$('.am_view', wrap).forEach(v => v.hidden = v.dataset.view !== view);
    });

    const fb = window.NiNi && window.NiNi.fb;
    const show = (m, ok) => { const p = $('#am_msg', wrap); p.textContent = m||''; p.style.color = ok ? '#7cf0a2' : '#ffb2b2'; };

    $('#am_do_login').onclick = async () => {
      try { show('Đang đăng nhập…', 1);
        await fb.auth.signInWithEmailAndPassword($('#am_email_l').value.trim(), $('#am_pass_l').value);
        show('Đăng nhập thành công!', 1); setTimeout(closeModal, 300);
      } catch (e){ show(e.message || 'Lỗi đăng nhập'); }
    };
    $('#am_do_signup').onclick = async () => {
      try { show('Đang tạo tài khoản…', 1);
        await fb.auth.createUserWithEmailAndPassword($('#am_email_s').value.trim(), $('#am_pass_s').value);
        show('Tạo tài khoản thành công!', 1); setTimeout(closeModal, 300);
      } catch (e){ show(e.message || 'Lỗi đăng ký'); }
    };
    $('#am_do_reset').onclick = async () => {
      try { show('Đang gửi email…', 1);
        await fb.auth.sendPasswordResetEmail($('#am_email_r').value.trim());
        show('Đã gửi link đặt lại mật khẩu!', 1);
      } catch (e){ show(e.message || 'Lỗi gửi email'); }
    };
  }

  function openModal(){ const bd = $('#authModal .am_backdrop'); bd && (bd.style.display='flex'); }
  function closeModal(){ const bd = $('#authModal .am_backdrop'); bd && (bd.style.display='none'); }

  /* ============ Nút đăng nhập & avatar ============ */
  function ensureEntry(){
    // Nếu đã có -> bỏ qua
    if ($('#niniLoginBtn') || $('#niniUserBox')) return;

    const u = window.NiNi && window.NiNi.user;

    if (!u) {
      const btn = pillButton('niniLoginBtn', 'Đăng nhập');
      btn.addEventListener('click', openModal, { passive: true });
      document.body.appendChild(btn);
    } else {
      const fullName = u.displayName || u.email || 'Người dùng';
      const ab = avatarButton('niniUserBox', fullName);
      // avatar populate
      const img = ab.querySelector('img');
      const span = ab.querySelector('span');
      if (u.photoURL) {
        img.src = u.photoURL; img.style.display='block'; span.style.display='none';
      } else {
        span.textContent = (fullName.trim()[0] || 'N').toUpperCase();
      }
      // show name pill (tuỳ thích ẩn/hiện)
      ab.querySelector('.nini_user_name').style.display = 'none';
      document.body.appendChild(ab);
    }
  }

  function cleanupEntry(){
    const a = $('#niniLoginBtn'); a && a.remove();
    const b = $('#niniUserBox');  b && b.remove();
  }

  function updateAuthUI(){
    cleanupEntry();
    ensureEntry();
  }

  function boot(){
    ensureModal();
    ensureEntry();
  }

  // lắng nghe core.js bắn ra khi auth thay đổi
  document.addEventListener('NiNi:user-changed', updateAuthUI);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // API test nhanh
  window.NiNiAuth = { open: openModal, close: closeModal, refresh: updateAuthUI };
})();

<!-- test/js/auth-boot.js -->
<script>
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // 1) Bơm FAB nếu chưa có
  function ensureFab(){
    if ($('#authFab')) return;
    const btn = document.createElement('button');
    btn.id = 'authFab';
    btn.type = 'button';
    btn.setAttribute('aria-label','Đăng nhập');
    btn.style.cssText = `
      position:fixed; right:16px; bottom:16px; z-index:2000;
      display:inline-flex; align-items:center; justify-content:center;
      width:56px; height:56px; border-radius:28px; border:none;
      background:#30a46c; color:#fff; box-shadow:0 6px 18px rgba(0,0,0,.25);
      cursor:pointer; font-size:22px; font-weight:700;
    `;
    btn.textContent = '↪';
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  // 2) Bơm Modal nếu chưa có
  function ensureModal(){
    if ($('#authModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.innerHTML = `
      <div class="am_backdrop" style="
        position:fixed; inset:0; background:rgba(0,0,0,.6);
        display:none; align-items:center; justify-content:center; z-index:1999;">
        <div class="am_box" role="dialog" aria-modal="true" style="
          width:min(560px, 92vw); border-radius:14px; background:#101a14;
          color:#dff; box-shadow:0 18px 64px rgba(0,0,0,.5); padding:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <h3 style="margin:0; font-weight:700">Đăng nhập</h3>
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

    // Tab switching
    wrap.addEventListener('click', (e)=>{
      if (e.target.id === 'am_close') return closeModal();
      const t = e.target.closest('.am_tab'); if (!t) return;
      const view = t.dataset.tab;
      $$('.am_view', wrap).forEach(v => v.hidden = v.dataset.view !== view);
    });

    // Minimal calls qua Firebase wrapper (đã có trong dự án của bạn)
    const fb = window.NiNi && window.NiNi.fb;

    const show = (msg, ok) => {
      const p = $('#am_msg', wrap);
      p.textContent = msg || '';
      p.style.color = ok ? '#7cf0a2' : '#ffb2b2';
    };

    $('#am_do_login').onclick = async () => {
      try {
        const email = $('#am_email_l').value.trim();
        const pass  = $('#am_pass_l').value;
        show('Đang đăng nhập…', true);
        await fb.auth.signInWithEmailAndPassword(email, pass);
        show('Đăng nhập thành công!', true);
        setTimeout(closeModal, 400);
      } catch (err) { show(err.message || 'Lỗi đăng nhập'); }
    };

    $('#am_do_signup').onclick = async () => {
      try {
        const email = $('#am_email_s').value.trim();
        const pass  = $('#am_pass_s').value;
        show('Đang tạo tài khoản…', true);
        await fb.auth.createUserWithEmailAndPassword(email, pass);
        show('Tạo tài khoản thành công!', true);
        setTimeout(closeModal, 400);
      } catch (err) { show(err.message || 'Lỗi đăng ký'); }
    };

    $('#am_do_reset').onclick = async () => {
      try {
        const email = $('#am_email_r').value.trim();
        show('Đang gửi email…', true);
        await fb.auth.sendPasswordResetEmail(email);
        show('Đã gửi link đặt lại mật khẩu!', true);
      } catch (err) { show(err.message || 'Lỗi gửi email'); }
    };
  }

  function openModal(){ const bd = $('#authModal .am_backdrop'); if (bd) bd.style.display='flex'; }
  function closeModal(){ const bd = $('#authModal .am_backdrop'); if (bd) bd.style.display='none'; }

  // 3) Cập nhật hiển thị FAB theo trạng thái user
  function updateFab(){
    const fab = $('#authFab'); if (!fab) return;
    const u = window.NiNi && window.NiNi.user;
    fab.style.display = u ? 'none' : 'inline-flex';
  }

  // Khởi tạo
  function boot(){
    ensureFab();
    ensureModal();
    updateFab();
  }

  // Lắng nghe sự kiện user thay đổi (được bắn từ core.js)
  document.addEventListener('NiNi:user-changed', updateFab);

  // Boot ngay và khi DOM ready (phòng khi load sớm)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
</script>

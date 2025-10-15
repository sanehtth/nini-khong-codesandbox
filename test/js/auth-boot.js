// test/js/auth-boot.js  (bản vá click + z-index cao + vị trí mới)
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function ensureFab(){
    let btn = $('#authFab');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'authFab';
      btn.type = 'button';
      btn.setAttribute('aria-label','Đăng nhập');
      // Đặt lên góc phải trên (tránh nút tròn dưới góc)
      btn.style.cssText = `
        position:fixed; right:16px; top:14px; z-index:1000000;
        display:inline-flex; align-items:center; justify-content:center;
        width:44px; height:44px; border-radius:22px; border:none;
        background:#30a46c; color:#fff; box-shadow:0 6px 18px rgba(0,0,0,.25);
        cursor:pointer; font-size:18px; font-weight:700; pointer-events:auto;
      `;
      btn.textContent = '↪';
      btn.addEventListener('click', openModal, { passive: true });
      document.body.appendChild(btn);
    }
  }

  function ensureModal(){
    if ($('#authModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.innerHTML = `
      <div class="am_backdrop" style="
        position:fixed; inset:0; background:rgba(0,0,0,.6);
        display:none; align-items:center; justify-content:center;
        z-index:1000001; pointer-events:auto;">
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

    // click tab + đóng
    wrap.addEventListener('click', (e)=>{
      if (e.target.id === 'am_close') return closeModal();
      const t = e.target.closest('.am_tab'); if (!t) return;
      const view = t.dataset.tab;
      $$('.am_view', wrap).forEach(v => v.hidden = v.dataset.view !== view);
    });

    const fb = window.NiNi && window.NiNi.fb;
    const show = (m, ok) => { const p = $('#am_msg', wrap); p.textContent = m||''; p.style.color = ok ? '#7cf0a2' : '#ffb2b2'; };

    $('#am_do_login').onclick = async () => {
      try { show('Đang đăng nhập…', 1);
        await fb.auth.signInWithEmailAndPassword($('#am_email_l').value.trim(), $('#am_pass_l').value);
        show('Đăng nhập thành công!', 1); setTimeout(closeModal, 350);
      } catch (e){ show(e.message || 'Lỗi đăng nhập'); }
    };

    $('#am_do_signup').onclick = async () => {
      try { show('Đang tạo tài khoản…', 1);
        await fb.auth.createUserWithEmailAndPassword($('#am_email_s').value.trim(), $('#am_pass_s').value);
        show('Tạo tài khoản thành công!', 1); setTimeout(closeModal, 350);
      } catch (e){ show(e.message || 'Lỗi đăng ký'); }
    };

    $('#am_do_reset').onclick = async () => {
      try { show('Đang gửi email…', 1);
        await fb.auth.sendPasswordResetEmail($('#am_email_r').value.trim());
        show('Đã gửi link đặt lại mật khẩu!', 1);
      } catch (e){ show(e.message || 'Lỗi gửi email'); }
    };
  }

  function openModal(){
    const bd = $('#authModal .am_backdrop'); if (bd) bd.style.display='flex';
  }
  function closeModal(){
    const bd = $('#authModal .am_backdrop'); if (bd) bd.style.display='none';
  }

  function updateFab(){
    const fab = $('#authFab'); if (!fab) return;
    const u = window.NiNi && window.NiNi.user;
    fab.style.display = u ? 'none' : 'inline-flex';
  }

  function boot(){
    ensureFab();
    ensureModal();
    updateFab();
  }

  // Sự kiện user-changed từ core.js
  document.addEventListener('NiNi:user-changed', updateFab);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Xuất API để test nhanh từ Console
  window.NiNiAuth = { open: openModal, close: closeModal, refresh: updateFab };
})();

/* ===== NiNi — FAB Auth (bottom-left) ====================================
   - Widget nổi ở góc trái-dưới để đăng nhập/đăng ký/đăng xuất
   - Không đụng gì tới header. Đồng bộ với Firebase qua NINI.fb
   - Yêu cầu: đã load nini-fb.mjs và auth-modal.js (để mở modal)
============================================================================ */

(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._fabAuthWired) return;           // chặn nạp 2 lần
  N._fabAuthWired = true;

  function el(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function shortName(u){
    const base = (u.displayName || u.email || '').trim();
    return base || 'NiNi';
  }
  function firstLetter(s){ return (s||'U').trim().charAt(0).toUpperCase(); }

  // ---------- Render ----------
  const $fab = el(`
    <div class="nini-auth-fab" data-state="out" aria-live="polite">
      <button class="nini-auth-button" id="authFabBtn" type="button">
        <span class="ava" id="authFabAva">U</span>
        <span class="nick" id="authFabNick">Khách</span>
      </button>

      <div class="nini-auth-menu" id="authFabMenu" role="menu" aria-hidden="true">
        <button class="nini-auth-item btn-signin"   id="fabOpenModal" data-action="signin">🔐 Đăng nhập / Đăng ký</button>
        <button class="nini-auth-item btn-profile"  id="fabProfile"   data-action="profile">👤 Hồ sơ</button>
        <button class="nini-auth-item btn-signout"  id="fabSignOut"   data-action="signout">🚪 Đăng xuất</button>
      </div>
    </div>
  `);

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild($fab);
  });

  // ---------- State update ----------
  function updateUI(user){
    const fab = $fab;
    const nick = $fab.querySelector('#authFabNick');
    const ava  = $fab.querySelector('#authFabAva');

    if (user){
      fab.setAttribute('data-state','in');
      const name = shortName(user);
      nick.textContent = name;
      if (user.photoURL){
        ava.style.backgroundImage = `url("${user.photoURL}")`;
        ava.textContent = '';
      }else{
        ava.style.backgroundImage = '';
        ava.textContent = firstLetter(name);
      }
    }else{
      fab.setAttribute('data-state','out');
      nick.textContent = 'Khách';
      ava.style.backgroundImage = '';
      ava.textContent = 'U';
    }
  }

  // ---------- Menu open/close ----------
  const $btn  = $fab.querySelector('#authFabBtn');
  const $menu = $fab.querySelector('#authFabMenu');

  function toggleMenu(open){
    if (open === undefined) open = !$menu.classList.contains('open');
    $menu.classList.toggle('open', open);
    $menu.setAttribute('aria-hidden', open ? 'false':'true');
  }

  document.addEventListener('click', (e) => {
    // click nút chính -> mở/đóng menu
    if (e.target.closest('#authFabBtn')) { toggleMenu(); return; }
    // click ngoài -> đóng
    if (!$fab.contains(e.target)) toggleMenu(false);

    // hành động trong menu
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (!act) return;

    if (act === 'signin'){
      toggleMenu(false);
      // mở modal đăng nhập
      if (N.emit) N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (m){
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden','false');
        document.body.classList.add('body-auth-open');
      }
    }
    if (act === 'profile'){
      toggleMenu(false);
      location.href = '/profile.html';
    }
    if (act === 'signout'){
      (async () => {
        try{
          await N.fb?.signOut?.();
        }catch(err){
          console.error('[fab-auth] signOut error:', err);
        }finally{
          toggleMenu(false);
        }
      })();
    }
  });

  // ---------- Subscribe user changes ----------
  try{
    // cập nhật ngay
    if (N.fb?.currentUser){
      try{ updateUI(N.fb.currentUser()); }catch(_){}
    }
    // lắng nghe thay đổi
    N.fb?.onUserChanged?.((u) => updateUI(u));
  }catch(_){}
})();

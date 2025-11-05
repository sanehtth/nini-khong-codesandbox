;(() => {
  const $ = (s, r = document) => r.querySelector(s);

  function getList() {
    return $('.nini-side .side-icons');
  }

  function ensureSlot() {
    const list = getList();
    if (!list) return null;
    let slot = $('#sb-auth-slot', list);
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'sb-auth-slot';
      list.appendChild(slot);
    }
    return slot;
  }

  function render() {
    try {
      const slot = ensureSlot();
      if (!slot) return; // sidebar chưa có -> Observer sẽ gọi lại khi xuất hiện

      const u = (window.NiNi && window.NiNi.user) || null;

      // KHÔNG dùng icon "user" để khỏi nhầm với Profile
      const imgSrc = u
        ? '/public/assets/icons/logout.webp'
        : '/public/assets/icons/login.webp';

      slot.innerHTML = `
        <a class="icon-btn" id="sb-auth-btn" href="javascript:void(0)">
          <span class="icon"><img src="${imgSrc}" alt=""></span>
          <span class="lbl">${u ? 'Đăng xuất' : 'Đăng nhập'}</span>
        </a>
      `;

      const btn = $('#sb-auth-btn', slot);
      if (btn) {
        btn.onclick = async () => {
          try {
            if (window.NiNi && window.NiNi.user) {
              if (window.N && window.N.fb && typeof window.N.fb.signOut === 'function') {
                await window.N.fb.signOut();
              }
            } else {
              if (window.NiNiAuth && typeof window.NiNiAuth.open === 'function') {
                window.NiNiAuth.open('login');
              }
            }
          } catch (e) {
            console.error('sidebar auth btn error:', e);
          }
        };
      }
    } catch (e) {
      console.error('sidebar-auth render error:', e);
    }
  }

  // Render ngay & khi DOM sẵn sàng
  render();
  document.addEventListener('DOMContentLoaded', render);

  // Cập nhật khi trạng thái user đổi (kênh mới + kênh cũ)
  window.addEventListener('NiNi:user-changed', render);
  document.addEventListener('auth:changed', render);

  // Nếu sidebar xuất hiện trễ do router, quan sát DOM và render khi có
  const obs = new MutationObserver(() => { if (getList()) render(); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

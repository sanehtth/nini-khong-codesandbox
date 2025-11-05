/* /test/js/sidebar-auth.js — SAFE VERSION */
;(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const STATE = { userId: null, mounted: false, renderQueued: false };

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

  function scheduleRender() {
    if (STATE.renderQueued) return;
    STATE.renderQueued = true;
    requestAnimationFrame(() => {
      STATE.renderQueued = false;
      render();       // thực sự vẽ 1 lần / frame
    });
  }

  function render() {
    try {
      const list = getList();
      if (!list) return;

      const u = (window.NiNi && window.NiNi.user) || null;
      const uid = u?.uid || u?.id || null;

      // Nếu đã mount và userId không đổi -> bỏ qua (tránh render lại)
      if (STATE.mounted && STATE.userId === uid) return;

      const slot = ensureSlot();
      if (!slot) return;

      const imgSrc = u
        ? '/public/assets/icons/logout.webp'
        : '/public/assets/icons/login.webp';

      // CHỈ cập nhật khi khác nội dung cũ
      const nextHTML = `
        <a class="icon-btn" id="sb-auth-btn" href="javascript:void(0)">
          <span class="icon"><img src="${imgSrc}" alt=""></span>
          <span class="lbl">${u ? 'Đăng xuất' : 'Đăng nhập'}</span>
        </a>
      `.trim();

      if (slot.__html !== nextHTML) {
        slot.innerHTML = nextHTML;
        slot.__html = nextHTML;

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
            } catch (e) { console.error('sidebar auth btn error:', e); }
          };
        }
      }

      STATE.mounted = true;
      STATE.userId = uid;
    } catch (e) {
      console.error('sidebar-auth render error:', e);
    }
  }

  // Render lúc DOM sẵn sàng và khi trạng thái user đổi
  document.addEventListener('DOMContentLoaded', scheduleRender);
  window.addEventListener('NiNi:user-changed', scheduleRender);
  document.addEventListener('auth:changed', scheduleRender);

  // Observer CHỈ kích hoạt khi sidebar vừa xuất hiện & CHƯA mount
  const obs = new MutationObserver(() => {
    // chỉ queue render nếu đã có list và chưa mount slot
    if (getList() && !$('#sb-auth-slot')) scheduleRender();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // gọi lần đầu
  scheduleRender();
})();

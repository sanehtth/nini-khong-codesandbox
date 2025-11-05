// /test/js/sidebar-auth.js
(() => {
  const $ = (s, r=document) => r.querySelector(s);

  function ensureSlot(){
    const list = $('.nini-side .side-icons');
    if (!list) return null;
    let slot = $('#sb-auth-slot', list);
    if (!slot){
      slot = document.createElement('div');
      slot.id = 'sb-auth-slot';
      list.appendChild(slot);
    }
    return slot;
  }

  function renderSidebarAuth(){
    const slot = ensureSlot();
    if (!slot) return; // sidebar chưa có -> Observer sẽ gọi lại

   const u = window.NiNi?.user || null;

// Dùng 2 file riêng để không nhầm với icon user của trang Profile
const imgSrc = u
  ? '/public/assets/icons/logout.webp'   // đã đăng nhập -> hiện icon Đăng xuất
  : '/public/assets/icons/login.webp';   // chưa đăng nhập -> hiện icon Đăng nhập


    slot.innerHTML = `
      <a class="icon-btn" id="sb-auth-btn" href="javascript:void(0)">
        <span class="icon"><img src="${imgSrc}" alt=""></span>
        <span class="lbl">${u ? 'Đăng xuất' : 'Đăng nhập'}</span>
      </a>
    `;

    $('#sb-auth-btn', slot).onclick = async () => {
      try{
        if (window.NiNi?.user) { await window.N?.fb?.signOut?.(); }
        else { window.NiNiAuth?.open?.('login'); }
      }catch(e){ console.error(e); }
    };
  }

  // chạy ngay & khi DOM sẵn sàng
  renderSidebarAuth();
  document.addEventListener('DOMContentLoaded', renderSidebarAuth);
  setTimeout(renderSidebarAuth, 0);

  // cập nhật khi trạng thái user đổi (kênh mới + kênh cũ)
  window.addEventListener('NiNi:user-changed', renderSidebarAuth);
  document.addEventListener('auth:changed', renderSidebarAuth);

  // nếu sidebar render sau (do router), quan sát và render khi xuất hiện
  const obs = new MutationObserver(() => {
    if (ensureSlot()) renderSidebarAuth();
  });
  obs.observe(document.body, { childList:true, subtree:true });
})();

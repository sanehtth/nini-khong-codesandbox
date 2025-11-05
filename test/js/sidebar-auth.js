// /test/js/sidebar-auth.js
(() => {
  const $  = (s, r=document) => r.querySelector(s);

  // Vẽ (hoặc cập nhật) nút auth ở cuối sidebar
  function renderSidebarAuth() {
    const list = $('.nini-side .side-icons');
    if (!list) return;

    // Tạo "slot" nếu chưa có
    let slot = $('#sb-auth-slot', list);
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'sb-auth-slot';
      list.appendChild(slot);           // append cuối danh sách icon
    }

    const u = window.NiNi?.user || null;

    // Tuỳ chọn: dùng avatar khi đã đăng nhập
    const imgSrc = u?.photoURL
      ? u.photoURL
      : (u ? '/public/assets/icons/logout.webp' : '/public/assets/icons/user.webp');

    slot.innerHTML = `
      <a class="icon-btn" id="sb-auth-btn" data-role="user" href="javascript:void(0)">
        <span class="icon">
          <img id="sb-auth-img" src="${imgSrc}" alt="">
        </span>
        <span class="lbl">${u ? 'Đăng xuất' : 'Đăng nhập'}</span>
      </a>
    `;

    // Hành vi click
    $('#sb-auth-btn', slot).onclick = async () => {
      if (window.NiNi?.user) {
        try { await window.N?.fb?.signOut?.(); } catch(e) { console.error(e); }
      } else {
        window.NiNiAuth?.open?.('login');
      }
    };
  }

  // Lần đầu (sau khi DOM có sidebar)
  document.addEventListener('DOMContentLoaded', renderSidebarAuth);

  // Nếu sidebar render trễ theo route, gọi lại an toàn:
  setTimeout(renderSidebarAuth, 0);

  // Cập nhật theo trạng thái đăng nhập
  window.addEventListener('NiNi:user-changed', renderSidebarAuth);
})();

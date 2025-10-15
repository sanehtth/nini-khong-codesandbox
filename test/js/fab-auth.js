/* fab-auth.js — Nút nổi Đăng nhập ở góc trái dưới.
   - Tự chèn nút nếu chưa có
   - Khi bấm => mở NiNiAuth.open('login')
   - Nếu đã đăng nhập: ẩn nút nổi
*/

(function () {
  const $ = (s, r = document) => r.querySelector(s);

  let fab = $('#authFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'authFab';
    fab.type = 'button';
    fab.className = 'fab-auth glass';
    fab.innerHTML = '<span class="ico">👤</span><span class="txt">Đăng nhập</span>';
    document.body.appendChild(fab);
  }

  fab.addEventListener('click', () => window.NiNiAuth?.open('login'));

  // Theo dõi trạng thái đăng nhập (Firebase đã bọc ở window.NiNi.fb)
  const apply = (u) => {
    fab.style.display = u ? 'none' : 'inline-flex';
  };

  // Nếu core đã có user hiện tại:
  apply(window.NiNi?.user || null);

  // Lắng nghe thay đổi user do core phát
  window.addEventListener('NiNi:user-changed', (e) => apply(e.detail));
})();

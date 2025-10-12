/* auth-modal.js — full
   Tạo DOM modal + xử lý mở/đóng: backdrop, nút Đóng/OK, ESC.
   Tương thích event bus NINI.on/emit nếu có, nhưng vẫn fallback tự hoạt động.
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthModal) return;
  N._wiredAuthModal = true;

  // --- Tạo DOM modal nếu chưa có ---
  function ensureModal() {
    let m = document.getElementById('authModal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'authModal';
    m.className = 'hidden';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = `
      <div class="auth-backdrop">
        <div class="auth-box">
          <!-- Bạn có thể thay nội dung form ở đây -->
          <div style="margin-bottom:8px;font-weight:600">Đăng nhập / Đăng ký / Quên mật khẩu</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
            <button data-auth="close">Đóng</button>
            <button id="btnOk" data-auth="ok">OK</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    return m;
  }

  const modalEl = () => document.getElementById('authModal') || ensureModal();

  // --- Hiển thị / Ẩn ---
  function openModal() {
    const m = modalEl();
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-auth-open');
  }
  function closeModal() {
    const m = modalEl();
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
  }

  // Đồng bộ với event bus (nếu dùng nơi khác)
  N.on && N.on('auth:open', openModal);
  N.on && N.on('auth:close', closeModal);

  // --- Click: backdrop / close / ok ---
  document.addEventListener('click', (e) => {
    const m = document.getElementById('authModal');
    if (!m || m.getAttribute('aria-hidden') === 'true') return;

    const clickedClose = e.target.closest('[data-auth="close"]');
    const clickedOk    = e.target.closest('#btnOk, [data-auth="ok"]');

    const insideModal  = e.target.closest('#authModal');
    const insideBox    = e.target.closest('#authModal .auth-box');
    const clickedBackdrop = insideModal && !insideBox;

    if (clickedClose || clickedOk || clickedBackdrop) {
      e.preventDefault();
      closeModal();
      N.emit && N.emit('auth:close');
    }
  });

  // --- ESC để đóng ---
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = document.getElementById('authModal');
    if (!m || m.getAttribute('aria-hidden') === 'true') return;
    e.preventDefault();
    closeModal();
    N.emit && N.emit('auth:close');
  });

  // Đảm bảo modal tồn tại sẵn để CSS hoạt động ngay
  ensureModal();
})();

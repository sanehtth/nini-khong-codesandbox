/* header.js — full */
(function () {
  // Giữ nguyên phần render header / nút đăng nhập của bạn ở trên (nếu có).
  // Dưới đây là fallback điều khiển modal để không bị "kẹt".

  const N = (window.NINI = window.NINI || {});
  const $ = (sel, root) => (root || document).querySelector(sel);

  const modalEl = () => document.getElementById('authModal');

  function showModal() {
    const m = modalEl();
    if (!m) return;
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
  }

  function hideModal() {
    const m = modalEl();
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
  }

  // Bắt sự kiện từ bus (nếu nơi khác có emit)
  if (!N._authModalWiredBus) {
    N._authModalWiredBus = true;
    N.on && N.on('auth:open', showModal);
    N.on && N.on('auth:close', hideModal);
  }

  // Click nút mở (hỗ trợ cả #btnAuthOpen và data-auth="open")
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('#btnAuthOpen, [data-auth="open"]');
    if (!openBtn) return;
    e.preventDefault();
    showModal();
    N.emit && N.emit('auth:open');
  });

  // Đóng khi click backdrop / nút đóng / nút OK
  document.addEventListener('click', (e) => {
    const m = modalEl();
    if (!m || m.getAttribute('aria-hidden') === 'true') return;

    const clickedClose = e.target.closest('[data-auth="close"]');
    const clickedOk    = e.target.closest('#btnOk, [data-auth="ok"]');

    const insideModal  = e.target.closest('#authModal');
    const insideBox    = e.target.closest('#authModal .auth-box');
    const clickedBackdrop = insideModal && !insideBox;

    if (clickedClose || clickedOk || clickedBackdrop) {
      e.preventDefault();
      hideModal();
      N.emit && N.emit('auth:close');
    }
  });

  // ESC để đóng
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = modalEl();
    if (!m || m.getAttribute('aria-hidden') === 'true') return;
    e.preventDefault();
    hideModal();
    N.emit && N.emit('auth:close');
  });
})();

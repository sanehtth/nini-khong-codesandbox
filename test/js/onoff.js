/* onoff.js — điều khiển mở/đóng modal Auth (an toàn & không bind trùng) */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._authModalWiredOnoff) return;        // ➊ tránh đăng ký lặp
  N._authModalWiredOnoff = true;

  // ➋ Helpers lấy modal & trạng thái
  const modalEl  = () => document.getElementById('authModal');
  const isOpen   = () => {
    const m = modalEl();
    return !!(m && m.getAttribute('aria-hidden') !== 'true' && !m.classList.contains('hidden'));
  };

  // ➌ Hiển thị/Ẩn modal + khóa/mở scroll nền
  function showModal() {
    const m = modalEl();
    if (!m) return;
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-auth-open');
    // autofocus input email nếu có
    const first = m.querySelector('input[type="email"], input, button, [tabindex]:not([tabindex="-1"])');
    if (first) setTimeout(() => first.focus(), 0);
  }

  function hideModal() {
    const m = modalEl();
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
  }

  // ➍ ESC để đóng
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    hideModal();
    N.emit && N.emit('auth:close');
  });

  // ➎ Click delegation: backdrop / [data-auth="close"] / [data-auth="ok"]
  document.addEventListener('click', (e) => {
    const m = modalEl();
    if (!m || !isOpen()) return;

    const insideModal = e.target.closest('#authModal');
    if (!insideModal) return; // click ngoài modal => bỏ qua cho phần khác xử lý

    const box = e.target.closest('#authModal .auth-box');
    const clickedBackdrop = !!insideModal && !box;
    const clickedClose    = e.target.closest('[data-auth="close"]');
    const clickedOk       = e.target.closest('[data-auth="ok"], #btnOk');

    if (clickedBackdrop || clickedClose || clickedOk) {
      e.preventDefault();
      hideModal();
      N.emit && N.emit('auth:close');
    }
  });

  // ➏ Đồng bộ với event bus (mở/đóng từ nơi khác)
  N.on && N.on('auth:open',  showModal);
  N.on && N.on('auth:close', hideModal);

  // (tùy chọn) mở bằng anchor có data-auth="open"
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-auth="open"]');
    if (!openBtn) return;
    e.preventDefault();
    showModal();
    N.emit && N.emit('auth:open');
  });
})();

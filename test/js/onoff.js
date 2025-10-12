;(() => {
  const N = window.NINI || {};
  const modalEl = () => document.getElementById('authModal');

  function reallyClose() {
    const m = modalEl();
    if (!m) return;
    // Ẩn chắc chắn
    m.setAttribute('aria-hidden', 'true');
    m.classList.add('hidden');
    // Phát sự kiện cho nơi khác (nếu có lắng nghe)
    N.emit && N.emit('auth:close');
  }

  // ESC
  document.addEventListener('keydown', (e) => {
    const m = modalEl();
    if (e.key === 'Escape' && m && m.getAttribute('aria-hidden') !== 'true') {
      e.preventDefault();
      reallyClose();
    }
  });

  // Click: backdrop / [data-auth="close"] / #btnOk
  document.addEventListener('click', (e) => {
    const m = modalEl();
    if (!m || m.getAttribute('aria-hidden') === 'true') return;

    const clickedCloseBtn = e.target.closest('[data-auth="close"]');
    const clickedOkBtn    = e.target.closest('#btnOk, [data-auth="ok"]');
    const box             = e.target.closest('#authModal .auth-box');
    const insideModal     = !!box;
    const clickedInsideAuthModal = e.target.closest('#authModal');

    // Bấm ở bất kỳ đâu trong #authModal nhưng KHÔNG nằm trong .auth-box => coi là backdrop
    const clickedBackdrop = clickedInsideAuthModal && !insideModal;

    if (clickedCloseBtn || clickedOkBtn || clickedBackdrop) {
      e.preventDefault();
      reallyClose();
    }
  });
})();

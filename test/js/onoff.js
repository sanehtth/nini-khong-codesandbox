;(() => {
  const N = window.NINI;
  const modal = () => document.getElementById('authModal');

  // ESC đóng
  document.addEventListener('keydown', (e) => {
    const m = modal();
    if (e.key === 'Escape' && m && m.getAttribute('aria-hidden') !== 'true') {
      N.emit?.('auth:close');
      m.setAttribute('aria-hidden', 'true');
      m.classList.add('hidden');
    }
  });

  // Ủy quyền click cho các hành vi đóng
  document.addEventListener('click', (e) => {
    const m = modal();
    if (!m || m.getAttribute('aria-hidden') === 'true') return;

    const isBackdrop = e.target.closest('.auth-backdrop');
    const isCloseBtn = e.target.closest('[data-auth="close"]');
    const isOkBtn    = e.target.closest('#btnOk, [data-auth="ok"]');

    if (isBackdrop || isCloseBtn || isOkBtn) {
      N.emit?.('auth:close');
      m.setAttribute('aria-hidden', 'true');
      m.classList.add('hidden');
      e.preventDefault();
    }
  });
})();

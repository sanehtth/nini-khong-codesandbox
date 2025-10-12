/* onoff.js — full */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._authModalWiredOnoff) return; // tránh bind trùng
  N._authModalWiredOnoff = true;

  const modalEl = () => document.getElementById('authModal');

  function hideModal() {
    const m = modalEl();
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
  }

  // ESC để đóng (fallback)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = modalEl();
    if (!m || m.getAttribute('aria-hidden') === 'true') return;
    e.preventDefault();
    hideModal();
    N.emit && N.emit('auth:close');
  });

  // Đồng bộ với bus (nếu nơi khác có gọi)
  N.on && N.on('auth:close', hideModal);
})();

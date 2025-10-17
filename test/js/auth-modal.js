// ===== SAFE INIT GUARD (auth-modal.js) =====
if (!window.__AUTH_MODAL_INIT__) {
  window.__AUTH_MODAL_INIT__ = true;

  const backdrop = document.getElementById('authBackdrop');
  const modal = document.getElementById('authModal');

  function open(tab = 'login') {
    if (!backdrop || !modal) return;
    document.body.classList.add('body-auth-open');
    backdrop.hidden = false;
    modal.hidden = false;
    // render nội dung tab vào modal (replace, không append)
    modal.innerHTML = renderAuthTab(tab); // <- hàm của bạn
  }
  function close() {
    if (!backdrop || !modal) return;
    document.body.classList.remove('body-auth-open');
    backdrop.hidden = true;
    modal.hidden = true;
    modal.innerHTML = '';
  }

  window.NiNiAuth = { open, close }; // Xuất API

  // Delegation 1 lần cho nút đóng trong modal
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
}

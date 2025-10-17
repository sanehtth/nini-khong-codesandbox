// ===== SAFE INIT GUARD (auth-boot.js) =====
if (!window.__AUTH_BOOT_INIT__) {
  window.__AUTH_BOOT_INIT__ = true;

  // Mount 1 lần: tạo/đổi trạng thái nút đăng nhập trên header
  const header = document.getElementById('nini_header');
  if (header) {
    // Tạo pill nếu chưa có
    const btnId = 'nini-login-pill';
    let btn = header.querySelector('#' + btnId);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = btnId;
      btn.className = 'login-pill';
      btn.textContent = 'Đăng nhập';
      header.appendChild(btn);
    }

    // Gỡ mọi listener cũ (nếu bạn từng gắn inline) rồi gắn 1 listener cha
    btn.onclick = null;
    btn.addEventListener('click', () => window.NiNiAuth?.open?.('login'));
  }
}

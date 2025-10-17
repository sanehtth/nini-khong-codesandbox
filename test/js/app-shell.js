// ===== SAFE INIT GUARD (app-shell.js) =====
if (!window.__APP_SHELL_INIT__) {
  window.__APP_SHELL_INIT__ = true;

  // Chỉ đăng ký 1 listener route-change
  const onRouteChange = () => {
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    // renderStage / renderPage theo hash
    window.NINI?.navigate?.(hash);   // hoặc gọi hàm render của bạn
  };

  // Lần đầu + lắng nghe thay đổi hash
  window.addEventListener('hashchange', onRouteChange);
  onRouteChange();

  // Đồng bộ trạng thái đăng nhập nếu cần (qua event bus core.js)
  // N.on('auth:changed', user => { ... }) — ĐĂNG KÝ 1 LẦN
}

// ===== SAFE INIT GUARD (auth-glue.js) =====
if (!window.__AUTH_GLUE_INIT__) {
  window.__AUTH_GLUE_INIT__ = true;

  // Không đăng ký 2 lần onAuthStateChanged
  let unsubAuth = null;
  const bindAuth = () => {
    if (unsubAuth) return; // đã bind
    unsubAuth = window.N?.fb?.onAuthStateChanged?.((user) => {
      // Cập nhật header/avatar… qua event bus
      window.N?.emit?.('auth:changed', user);
    });
  };

  const unbindAuth = () => {
    if (unsubAuth) { try { unsubAuth(); } catch {} ; unsubAuth = null; }
  };

  bindAuth();
  // Nếu có cơ chế hot-reinit, nhớ gọi unbindAuth() trước bind lại.
}

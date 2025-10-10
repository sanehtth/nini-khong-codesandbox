(() => {
  NINI.api.login = async (email, pass) => {
    console.log('[MOCK] login', {email, pass});
    // giả lập user
    NINI.emit('auth:changed', { email, photoURL: '/public/assets/avatar/NV.webp' });
  };

  NINI.api.register = async (email, pass, name) => {
    console.log('[MOCK] register', {email, pass, name});
    alert('Đã gửi email xác nhận (mock). Sau khi xác nhận, bạn có thể đặt lại mật khẩu.');
  };

  NINI.api.sendReset = async (email) => {
    console.log('[MOCK] sendReset', {email});
    alert('Đã gửi liên kết đặt lại mật khẩu (mock).');
  };

  NINI.api.logout = async () => {
    console.log('[MOCK] logout');
    NINI.emit('auth:changed', null);
  };
})();

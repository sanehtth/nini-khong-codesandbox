/* auth-glue.js
 * NHIỆM VỤ: Bắt sự kiện từ auth-modal (login / signup / reset / google)
 *           Gọi NINI.fb.* (Firebase / server của bạn)
 *           Hiển thị trạng thái (loading / ok / lỗi) và đóng modal khi xong.
 *
 * LƯU Ý: File này KHÔNG điều khiển mở/đóng modal bằng ESC/backdrop...
 *        (việc đó do onoff.js đảm nhận). Chỉ "glue" giữa UI và backend.
 */

(function () {
  // --- tiện ích ---
  const N  = (window.NINI = window.NINI || {});
  const FB = () => (window.NINI && window.NINI.fb) || {};

  // Hiện message nhỏ trong modal
  function setMsg(type, text) {
    const wrap = document.querySelector('#authModal .auth-box');
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector('.msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'msg';
      wrap.appendChild(msg);
    }
    msg.className = 'msg ' + (type || '');
    msg.textContent = text || '';
  }

  // Bật/tắt loading cho nút submit của form
  function setFormLoading(formId, loading, labelWhenLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = labelWhenLoading || 'Đang xử lý...';
      btn.disabled = true;
    } else {
      if (btn.dataset._text) btn.textContent = btn.dataset._text;
      btn.disabled = false;
    }
  }

  // Đóng modal (để onoff.js cũng bắt bus cho đồng bộ)
  function closeModal() {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
    N.emit && N.emit('auth:close');
  }

  // === Handlers chính ===

  // 1) Đăng nhập
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      setMsg('', '');
      setFormLoading('formLogin', true, 'Đang đăng nhập...');
      const fb = FB();

      // tương thích cả 2 tên hàm bạn đang dùng
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error('Thiếu hàm NINI.fb.loginEmailPass/Password');

      const user = await loginFn(email, password);
      setMsg('ok', 'Đăng nhập thành công!');
      closeModal();
      // onUserChanged trong fb sẽ cập nhật header cho bạn
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng nhập thất bại');
    } finally {
      setFormLoading('formLogin', false);
    }
  });

  // 2) Đăng ký
  N.on && N.on('auth:signup', async ({ email, password, confirm }) => {
    try {
      if (password !== confirm) {
        setMsg('err', 'Mật khẩu nhập lại không khớp.');
        return;
      }
      setMsg('', '');
      setFormLoading('formSignup', true, 'Đang tạo tài khoản...');

      const fb = FB();
      if (!fb.registerEmailPass) throw new Error('Thiếu hàm NINI.fb.registerEmailPass');

      const user = await fb.registerEmailPass(email, password);
      // nếu bạn có hàm gửi verify qua mail pro (Netlify Functions)
      if (fb.sendEmailVerification) {
        try { await fb.sendEmailVerification(email); } catch {}
      }
      setMsg('ok', 'Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  // 3) Quên mật khẩu
  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      setMsg('', '');
      setFormLoading('formReset', true, 'Đang gửi email...');
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu hàm NINI.fb.resetPassword');

      await fb.resetPassword(email); // gọi Netlify Function/SMTP pro của bạn
      setMsg('ok', 'Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.')

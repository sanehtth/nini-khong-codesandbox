(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // Mở/đóng modal
  const shade = $('#auth-shade');
  const modMain = $('#auth-modal');
  const modReg  = $('#reg-modal');
  const modLog  = $('#login-modal');

  function open(m){ shade.classList.add('show'); m.classList.add('show'); }
  function closeAll(){ shade.classList.remove('show'); [modMain,modReg,modLog].forEach(m=>m.classList.remove('show')); }

  $('#open-auth')?.addEventListener('click', e=>{ e.preventDefault(); open(modMain); });
  $('#close-auth')?.addEventListener('click', closeAll);
  $('#reg-cancel')?.addEventListener('click', ()=>{ closeAll(); open(modMain); });
  $('#login-cancel')?.addEventListener('click', ()=>{ closeAll(); open(modMain); });
  shade?.addEventListener('click', closeAll);

  // Lựa chọn Google
  $('#btn-google')?.addEventListener('click', ()=>{
    location.href = '/.netlify/functions/auth-google-start';
  });

  // Mở form đăng ký
  $('#btn-open-register')?.addEventListener('click', ()=>{
    modMain.classList.remove('show'); open(modReg);
  });

  // Mở form đăng nhập email
  $('#open-email-login')?.addEventListener('click', (e)=>{
    e.preventDefault();
    modMain.classList.remove('show'); open(modLog);
  });

  // ===== Đăng ký: gửi OTP =====
  $('#reg-send-otp')?.addEventListener('click', async ()=>{
    const name  = $('#reg-name').value.trim();
    const dob   = $('#reg-dob').value.trim();
    const email = $('#reg-email').value.trim();
    const pass  = $('#reg-pass').value;
    const pass2 = $('#reg-pass2').value;

    if(!name || !email || !pass || !pass2){ return alert('Điền đủ họ tên, email, mật khẩu.'); }
    if(pass.length < 6){ return alert('Mật khẩu ít nhất 6 ký tự.'); }
    if(pass !== pass2){ return alert('Mật khẩu nhập lại chưa khớp.'); }

    try{
      const res = await fetch('/.netlify/functions/register-begin', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, dob, email, pass })
      }).then(r=>r.json());

      if(!res.ok) throw new Error(res.msg || 'Không gửi được OTP.');

      // hiện ô OTP
      window.__tx = res.tx;
      $('#reg-otp-wrap').hidden = false;
      $('#reg-otp').focus();
      alert('Đã gửi OTP tới email. Hãy kiểm tra hộp thư.');
    }catch(err){
      alert(err.message || 'Lỗi mạng.');
    }
  });

  // ===== Đăng ký: xác nhận OTP =====
  $('#reg-verify')?.addEventListener('click', async ()=>{
    const code  = $('#reg-otp').value.trim();
    const email = $('#reg-email').value.trim();
    if(!window.__tx) return alert('Thiếu phiên đăng ký. Hãy bấm “Gửi OTP” trước.');
    if(!code) return alert('Nhập OTP 6 số.');

    try{
      const res = await fetch('/.netlify/functions/register-verify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, code, tx: window.__tx })
      }).then(r=>r.json());

      if(!res.ok) throw new Error(res.msg || 'OTP không hợp lệ.');

      alert('Đăng ký thành công! Giờ bạn có thể đăng nhập bằng email + mật khẩu.');
      closeAll(); open(modLog);
      $('#login-email').value = email;
    }catch(err){
      alert(err.message || 'Lỗi xác nhận.');
    }
  });

  // ===== Đăng nhập email + password =====
  $('#login-submit')?.addEventListener('click', async ()=>{
    const email = $('#login-email').value.trim();
    const pass  = $('#login-pass').value;

    try{
      const ok = await fetch('/.netlify/functions/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, pass })
      }).then(r=>r.ok);

      if(!ok) return alert('Sai email hoặc mật khẩu.');
      closeAll(); location.reload();
    }catch(err){
      alert('Không thể đăng nhập.');
    }
  });
})();

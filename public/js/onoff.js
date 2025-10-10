(() => {
  const modal = document.querySelector('.auth-modal'); // hoặc nơi bạn tạo modal
  let isOpen = false;

  function open(m = 'login') {
    // ... render UI theo mode m
    isOpen = true;
    modal.classList.remove('hidden');
    modal.style.removeProperty('display'); // clear fallback nếu có
  }

  function close() {
    isOpen = false;
    modal.classList.add('hidden');
    modal.style.display = 'none';        // fallback nếu .hidden bị override
    setTimeout(()=>modal.style.removeProperty('display'),0); // dọn lại sau 1 tick
  }

  // ---- Đóng bằng nút
  const btnClose = modal.querySelector('#authClose');
  btnClose?.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  // ---- Đóng khi click ra nền
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  // chặn click nổi bọt bên trong thẻ card
  modal.querySelector('.auth-card')?.addEventListener('click', (e) => e.stopPropagation());

  // ---- Đóng bằng ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });

  // ---- Tự đóng sau khi login/register/reset thành công
  async function submit() {
    try {
      // ... gọi API của bạn (login/register/sendReset)
      close();
    } catch (err) {
      alert(err?.message || err);
    }
  }
  modal.querySelector('#authSubmit')?.addEventListener('click', (e) => {
    e.preventDefault();
    submit();
  });

  // ---- Ngăn vòng lặp mở lại (nếu có onAuthStateChanged)
  // Chỉ emit open khi thực sự cần, và chỉ nếu modal đang đóng:
  NINI?.on('auth:open', ({mode}) => {
    if (!isOpen) open(mode || 'login');
  });

  // (export nếu cần)
  window.NINI = window.NINI || {};
  window.NINI.authModal = { open, close };
})();

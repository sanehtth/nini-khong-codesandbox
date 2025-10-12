;(() => {
  const N = window.NINI;
  const modal = () => document.getElementById('authModal');

  // ESC để đóng modal
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && modal() && modal().getAttribute('aria-hidden')!=='true') {
      N.emit('auth:close');
    }
  });

  // bấm ngoài modal để đóng
  document.addEventListener('click',(e)=>{
    const m = modal();
    if (!m || m.getAttribute('aria-hidden')==='true') return;
    if (e.target === m) N.emit('auth:close');
  });

  // nút OK demo
  document.addEventListener('click',(e)=>{
    if (e.target?.id === 'btnOk') alert('OK (demo)');
  });
})();

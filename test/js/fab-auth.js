// /test/js/fab-auth.js
(function(){
  if (window.__FAB_AUTH_INIT__) return; window.__FAB_AUTH_INIT__ = true;

  // FAB nổi (dùng icon /public/assets/icons/login.webp)
  const fab = document.createElement('button');
  fab.className = 'nini-fab-login';
  fab.title = 'Đăng nhập';
  fab.innerHTML = `<img src="/public/assets/icons/login.webp" alt="login">`;
  document.body.appendChild(fab);
  fab.addEventListener('click', ()=> window.NiNiAuth?.open('login'));

  // Gắn vào icon User trong sidebar (nếu có)
  // giả sử nút User có data-role="user" trên .icon-btn
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.icon-btn[data-role="user"]');
    if (btn) { e.preventDefault(); window.NiNiAuth?.open('login'); }
  });

  // Khi đăng nhập xong, ẩn FAB (tuỳ ý)
  window.N?.on?.('auth:login', ()=>{
    fab.style.display = 'none';
  });
})();

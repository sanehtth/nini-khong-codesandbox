/* ===== Mở / đóng modal ===== */
function openAuth(){
  document.getElementById('authModal').classList.add('is-open');
  document.body.classList.add('modal-open');
}
function closeAuth(){
  document.getElementById('authModal').classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

/* Gán nút mở modal */
document.querySelectorAll('[data-open-auth]').forEach(btn=>{
  btn.addEventListener('click', openAuth);
});

/* Đổi tab trong modal */
const tabs = document.querySelectorAll('.modal__tab');
const panes = document.querySelectorAll('.auth-pane');

function showPane(name){
  tabs.forEach(t=> t.classList.toggle('is-active', t.dataset.authTab === name));
  panes.forEach(p=> p.classList.toggle('is-active', p.dataset.pane === name));
}

tabs.forEach(t=>{
  t.addEventListener('click', ()=> showPane(t.dataset.authTab));
});

/* Link nhảy tab (VD: Quên mật khẩu -> tab forgot) */
document.querySelectorAll('[data-jump]').forEach(a=>{
  a.addEventListener('click', ()=> showPane(a.dataset.jump));
});

/* Đặt mặc định là tab Đăng nhập */
showPane('login');

/* Đổi mùa (Home = nini_home) — nếu bạn dùng effects khác thì thay logic này */
const seasonButtons = document.querySelectorAll('.tab');
seasonButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    seasonButtons.forEach(b=>b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const s = btn.dataset.season;   // 'home' | 'spring' | 'summer' | 'autumn' | 'winter'
    document.body.classList.remove('season-home','season-spring','season-summer','season-autumn','season-winter');
    document.body.classList.add(`season-${s}`);
  });
});

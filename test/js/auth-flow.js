// auth-flow.js
(function(){
  // Chống bind 2 lần nếu file bị import nhầm
  if (window.__AUTH_FLOW_BOUND__) return;
  window.__AUTH_FLOW_BOUND__ = true;

  // --------- Helper dom ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // --------- Element chính ----------
  const els = {
    signIn : $('#btnSignIn'),    // Nút đăng nhập duy nhất ở header
    signOut: $('#btnSignOut'),   // Nút đăng xuất
    modal  : $('#authModal'),    // Modal đăng nhập
    backdrop: $('#authBackdrop') // Nền mờ
  };

  // --------- Local flag giả lập đăng nhập (thay bằng Firebase sau này) ----------
  const LS_AUTH = 'nini.auth';
  const isLoggedIn  = () => localStorage.getItem(LS_AUTH) === '1';
  const setLoggedIn = (v) => localStorage.setItem(LS_AUTH, v ? '1' : '0');

  // Đồng bộ UI theo trạng thái đăng nhập
  function renderAuthUI(){
    const ok = isLoggedIn();
    if (els.signIn)  els.signIn.hidden  = ok;
    if (els.signOut) els.signOut.hidden = !ok;
  }

  // --------- Mở/đóng modal ----------
  function openAuth(){
    if (!els.modal) return;
    document.body.classList.add('auth-open');
    els.modal.hidden = false;
    els.backdrop.hidden = false;
  }
  function closeAuth(){
    document.body.classList.remove('auth-open');
    if (els.modal) els.modal.hidden = true;
    if (els.backdrop) els.backdrop.hidden = true;
  }

  // Click backdrop để đóng
  els.backdrop?.addEventListener('click', closeAuth);
  // Click vùng trống trong modal để đóng
  els.modal?.addEventListener('click', (e)=>{ if(e.target===els.modal) closeAuth(); });

  // --------- Router siêu gọn cho các section #page-... ----------
  const PAGES = ['home','rules','forum','contact','storybook','video','game','shop','chat','notify','settings','profile'];

  function navigate(name){
    if (!PAGES.includes(name)) name = 'home';
    PAGES.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.hidden = (p !== name);
    });
    // Đổi hash để back/forward hoạt động
    const tgt = `#/${name}`;
    if (location.hash !== tgt) history.pushState({}, '', tgt);
  }

  // Back/forward của trình duyệt
  window.addEventListener('popstate', ()=>{
    const name = (location.hash.replace('#/','') || 'home');
    navigate(name);
  });

  // --------- Nạp chi tiết cho khung bên phải ----------
  function loadItemDetail(key){
    // Tìm khung detail-box trong trang đang hiển thị (page visible)
    const page = PAGES.map(p=>document.getElementById(`page-${p}`)).find(el=>el && !el.hidden);
    const box  = page?.querySelector('#detail-box');
    if (!box) return;

    // Tìm text của item (để demo)
    const src = page.querySelector(`[data-item="${CSS.escape(key)}"]`);
    const title = src?.textContent?.trim() || 'Nội dung';

    box.innerHTML = `
      <div class="glass p-4">
        <h3 style="margin-top:0">${title}</h3>
        <p>Đây là nội dung chi tiết cho <strong>${key}</strong>. Khi tích hợp dữ liệu thật, phần này sẽ hiển thị preview/reader/video/game…</p>
      </div>`;
  }

  // --------- Event Delegation (bắt mọi click 1 chỗ) ----------
  document.addEventListener('click', (ev)=>{
    const t = ev.target.closest('[data-nav],[data-item],[data-auth],[data-action],#btnSignIn,#btnSignOut]');
    if (!t) return;

    // 1) Điều hướng header / thanh trái
    if (t.dataset.nav){
      ev.preventDefault();
      navigate(t.dataset.nav);
      return;
    }

    // 2) Chọn mục bên trái (storybook/video/game/shop…)
    if (t.dataset.item){
      ev.preventDefault();
      loadItemDetail(t.dataset.item);
      return;
    }

    // 3) Nhóm auth
    if (t.id === 'btnSignIn' || t.dataset.action === 'signin' || t.dataset.auth === 'open'){
      ev.preventDefault(); openAuth(); return;
    }
    if (t.id === 'btnSignOut' || t.dataset.action === 'signout'){
      ev.preventDefault();
      // TODO: Firebase signOut(); hiện dùng local flag
      setLoggedIn(false);
      renderAuthUI();
      return;
    }
    if (t.dataset.auth === 'close'){
      ev.preventDefault(); closeAuth(); return;
    }
    if (t.dataset.auth === 'tab'){
      // Demo đổi tab trong modal (UI)
      $$('.auth-tabs [data-auth="tab"]').forEach(b=>b.classList.remove('is-active'));
      t.classList.add('is-active');
      // Bạn có thể show/hide các form tương ứng ở đây
      return;
    }
  });

  // --------- Submit form đăng nhập (demo) ----------
  const form = $('#authForm');
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    // TODO: Thay bằng Firebase signInWithEmailAndPassword(...)
    setLoggedIn(true);
    renderAuthUI();
    closeAuth();
  });

  // --------- Khởi động ----------
  renderAuthUI();
  navigate((location.hash.replace('#/','') || 'home'));

})();

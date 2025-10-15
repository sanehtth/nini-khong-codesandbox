// auth-flow.js
(function(){
  if (window.__AUTH_FLOW_BOUND__) return; // chống bind nhiều lần
  window.__AUTH_FLOW_BOUND__ = true;

  // ====== state & dom shortcut
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const els = {
    signIn:  $('#btnSignIn'),
    signOut: $('#btnSignOut'),
    modal:   $('#authModal'),      // <div id="authModal" class="auth-modal" hidden>...</div>
    backdrop: document.getElementById('authBackdrop') || (()=> {
      const b = document.createElement('div');
      b.id='authBackdrop'; document.body.appendChild(b); return b;
    })(),
  };

  // ====== helpers
  function openAuth() {
    if (!els.modal) return;
    document.body.classList.add('auth-open');
    els.modal.hidden = false;
  }
  function closeAuth() {
    document.body.classList.remove('auth-open');
    if (els.modal) els.modal.hidden = true;
  }

  // ====== UI sync theo login flag (đọc từ localStorage hoặc Firebase)
  const LS_AUTH = 'nini.auth';
  function isLoggedIn() { return localStorage.getItem(LS_AUTH) === '1'; }
  function setLoggedIn(v) { localStorage.setItem(LS_AUTH, v ? '1' : '0'); }

  function renderAuthUI() {
    const ok = isLoggedIn();
    if (els.signIn)  els.signIn.hidden  = ok;
    if (els.signOut) els.signOut.hidden = !ok;
  }

  // ====== event delegation cho toàn trang
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action],[data-auth],[data-nav],[data-item]');

    // mở modal từ FAB hoặc bất cứ thứ gì có data-auth="open"
    if (t?.dataset?.auth === 'open') {
      ev.preventDefault(); openAuth(); return;
    }
    if (t?.dataset?.auth === 'close') { ev.preventDefault(); closeAuth(); return; }

    // header: đăng nhập/đăng xuất
    if (t?.id === 'btnSignIn' || t?.dataset?.action === 'signin') {
      ev.preventDefault(); openAuth(); return;
    }
    if (t?.id === 'btnSignOut' || t?.dataset?.action === 'signout') {
      ev.preventDefault();
      try {
        // TODO: gọi Firebase signOut(); hiện đang dùng local flag
        setLoggedIn(false);
        renderAuthUI();
      } catch(e){ console.error(e); }
      return;
    }

    // router: header & side-nav
    if (t?.dataset?.nav) {
      ev.preventDefault();
      navigate(t.dataset.nav);
      return;
    }

    // chọn mục trong danh sách (storybook/video/game/shop…)
    if (t?.dataset?.item) {
      ev.preventDefault();
      loadItemDetail(t.dataset.item);
      return;
    }
  }, {capture:false, passive:false});

  // ====== modal: click ra ngoài để đóng
  if (els.backdrop) els.backdrop.addEventListener('click', closeAuth);
  if (els.modal) els.modal.addEventListener('click', (e)=>{
    if (e.target === els.modal) closeAuth();
  });

  // ====== router siêu gọn cho các khung
  const pages = ['home','storybook','video','game','shop','chat','notify','settings','profile'];
  function navigate(name){
    if (!pages.includes(name)) name = 'home';
    pages.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.hidden = (p !== name);
    });
    // cập nhật hash nhẹ nhàng
    if (location.hash !== `#/${name}`) history.pushState({}, '', `#/${name}`);
  }

  // ====== hiển thị chi tiết bên khung phải
  function loadItemDetail(key){
    const box = document.getElementById('detail-box');
    if (!box) return;
    // Tạm demo: lấy text từ data-*
    const src = document.querySelector(`[data-item="${key}"]`);
    const title = src?.textContent?.trim() || 'Nội dung';
    box.innerHTML = `
      <div class="glass p-4">
        <h3 class="mb-2">${title}</h3>
        <p>Nội dung chi tiết của <strong>${key}</strong> sẽ hiển thị ở đây.</p>
      </div>`;
  }

  // ====== khởi động
  renderAuthUI();
  // tự route theo hash lúc tải
  navigate((location.hash.replace('#/','')||'home'));

  // Back/forward
  window.addEventListener('popstate', ()=> {
    navigate((location.hash.replace('#/','')||'home'));
  });

  // ====== giả lập submit đăng nhập trong modal
  const fakeForm = document.getElementById('authForm');
  if (fakeForm) fakeForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    // TODO: gọi Firebase signInWithEmailAndPassword…
    setLoggedIn(true);
    renderAuthUI();
    closeAuth();
  });

})();

/* nini-header.js — NON-MODULE
 * Header + modal 3 tab (Đăng nhập / Đăng ký / Quên mật khẩu)
 * Phụ thuộc: window.NINI.fb (từ nini-fb.js)
 */

(function () {
  'use strict';

  var W = window;
  var D = document;
  var NINI = W.NINI = W.NINI || {};
  var API  = NINI.fb || {}; // có thể chưa sẵn sàng ngay

  // ---------- DOM helpers ----------
  function $(sel, root){ return (root||D).querySelector(sel); }
  function on(el, ev, cb){ el && el.addEventListener(ev, cb); }
  function addBodySeason(s){
    var body = D.body;
    ['spring','summer','autumn','winter','home'].forEach(function(c){ body.classList.remove(c); });
    if (s && s!=='auto') body.classList.add(s);
  }

  // ---------- Modal (login/register/forgot) ----------
  function ensureModal() {
    if ($('#niniAuthModal')) return $('#niniAuthModal');

    var wrap = D.createElement('div');
    wrap.id = 'niniAuthModal';
    wrap.className = 'modal is-hidden';
    wrap.innerHTML = [
      '<div class="modal__backdrop"></div>',
      '<div class="modal__dialog glass">',
      '  <div class="tabs">',
      '    <button class="tab is-active" data-tab="login">Đăng nhập</button>',
      '    <button class="tab" data-tab="register">Đăng ký</button>',
      '    <button class="tab" data-tab="forgot">Quên mật khẩu</button>',
      '  </div>',
      '  <div class="tabpanes">',
      '    <section class="pane is-active" data-pane="login">',
      '      <label>Email<input id="lgEmail" type="email" placeholder="you@example.com"/></label>',
      '      <label>Mật khẩu<input id="lgPass" type="password" placeholder="••••••••"/></label>',
      '      <div class="row"><button id="btnLogin" class="btn">OK</button><button class="btn btn--ghost" id="btnClose1">Đóng</button></div>',
      '    </section>',
      '    <section class="pane" data-pane="register">',
      '      <label>Email<input id="rgEmail" type="email" placeholder="you@example.com"/></label>',
      '      <label>Mật khẩu<input id="rgPass" type="password" placeholder="Tối thiểu 6 ký tự"/></label>',
      '      <label>Tên hiển thị<input id="rgName" type="text" placeholder="Bé NiNi"/></label>',
      '      <div class="row"><button id="btnRegister" class="btn">Tạo tài khoản</button><button class="btn btn--ghost" id="btnClose2">Đóng</button></div>',
      '    </section>',
      '    <section class="pane" data-pane="forgot">',
      '      <label>Email<input id="fgEmail" type="email" placeholder="you@example.com"/></label>',
      '      <div class="row"><button id="btnForgot" class="btn">Gửi link đặt lại</button><button class="btn btn--ghost" id="btnClose3">Đóng</button></div>',
      '    </section>',
      '  </div>',
      '</div>'
    ].join('');
    D.body.appendChild(wrap);

    // Tab switching
    var tabs = wrap.querySelectorAll('.tab');
    tabs.forEach(function(t){
      on(t,'click',function(){
        tabs.forEach(function(x){ x.classList.remove('is-active'); });
        t.classList.add('is-active');

        var paneName = t.getAttribute('data-tab');
        wrap.querySelectorAll('.pane').forEach(function(p){
          p.classList.toggle('is-active', p.getAttribute('data-pane')===paneName);
        });
      });
    });

    // Close actions
    on(wrap.querySelector('.modal__backdrop'),'click', function(){ hideModal(); });
    on($('#btnClose1',wrap),'click', function(){ hideModal(); });
    on($('#btnClose2',wrap),'click', function(){ hideModal(); });
    on($('#btnClose3',wrap),'click', function(){ hideModal(); });

    // Buttons
    on($('#btnLogin',wrap),'click', function(){
      var email = $('#lgEmail',wrap).value.trim();
      var pass  = $('#lgPass',wrap).value;
      if (!email || !pass) return alert('Nhập email và mật khẩu');
      NINI.fb.loginEmailPass(email, pass)
        .then(function(){ hideModal(); })
        .catch(function(e){ alert('Đăng nhập lỗi: ' + (e && e.message || e)); });
    });

    on($('#btnRegister',wrap),'click', function(){
      var email = $('#rgEmail',wrap).value.trim();
      var pass  = $('#rgPass',wrap).value;
      var name  = $('#rgName',wrap).value.trim();
      if (!email || !pass) return alert('Nhập email và mật khẩu');
      NINI.fb.registerEmailPass(email, pass, name)
        .then(function(){ hideModal(); })
        .catch(function(e){ alert('Đăng ký lỗi: ' + (e && e.message || e)); });
    });

    on($('#btnForgot',wrap),'click', function(){
      var email = $('#fgEmail',wrap).value.trim();
      if (!email) return alert('Nhập email');
      NINI.fb.resetPassword(email)
        .then(function(){ alert('Đã gửi liên kết đặt lại mật khẩu.'); hideModal(); })
        .catch(function(e){ alert('Không gửi được email: ' + (e && e.message || e)); });
    });

    return wrap;
  }

  function showModal() { ensureModal().classList.remove('is-hidden'); }
  function hideModal() { ensureModal().classList.add('is-hidden'); }

  // ---------- Header render ----------
  function renderHeader(opts) {
    var root = $(opts.selector);
    if (!root) return;

    var html = [
      '<div class="nini-header glass">',
      '  <div class="brand">',
      '    <a class="logo" href="/"><img src="/public/assets/icons/logo_text.webp" alt="NiNi"/></a>',
      '    <span class="slogan">Chơi mê ly, bứt phá tư duy</span>',
      '  </div>',
      '  <nav class="tabs">',
      '    <button data-season="home">Home</button>',
      '    <button data-season="spring">Spring</button>',
      '    <button data-season="summer">Summer</button>',
      '    <button data-season="autumn">Autumn</button>',
      '    <button data-season="winter">Winter</button>',
      '  </nav>',
      '  <div class="user-slot" id="niniUserSlot">',
      '    <button class="btn" id="btnLoginOpen">Đăng nhập / Đăng ký</button>',
      '  </div>',
      '</div>'
    ].join('');

    root.innerHTML = html;

    // Season switching
    root.querySelectorAll('[data-season]').forEach(function(b){
      on(b,'click', function(){
        var s = b.getAttribute('data-season');
        addBodySeason(s);
        if (opts.onSeasonChange) { try { opts.onSeasonChange(s); } catch(e){} }
        // optional routes
        if (opts.routes && opts.routes[s]) location.href = opts.routes[s];
      });
    });

    // open auth modal
    on($('#btnLoginOpen',root),'click', function(){ showModal(); });

    // subscribe user changes
    function paintUser(u){
      var slot = $('#niniUserSlot', root);
      if (!slot) return;
      if (!u) {
        slot.innerHTML = '<button class="btn" id="btnLoginOpen">Đăng nhập / Đăng ký</button>';
        on($('#btnLoginOpen',root),'click', function(){ showModal(); });
      } else {
        var email = (u.email || '').replace(/</g,'&lt;');
        var photo = u.photoURL || '/public/assets/avatar/NV.webp';
        slot.innerHTML = [
          '<img class="avatar avatar--sm" src="', photo, '" alt="avatar"/>',
          '<span class="email">', email, '</span>',
          '<a class="btn btn--ghost" href="/profile.html" id="btnProfile">Hồ sơ</a>',
          '<button class="btn" id="btnLogout">Đăng xuất</button>'
        ].join('');
        on($('#btnLogout',root),'click', function(){
          NINI.fb.logout().catch(function(e){ alert('Không đăng xuất được: ' + (e && e.message || e)); });
        });
      }
    }

    // Nếu fb chưa sẵn, chờ sự kiện; nếu đã sẵn, subscribe luôn.
    if (W.NINI && W.NINI.fb && typeof W.NINI.fb.onUserChanged === 'function') {
      W.NINI.fb.onUserChanged(paintUser);
    } else {
      W.addEventListener('nini:fb:ready', function(){
        W.NINI && W.NINI.fb && W.NINI.fb.onUserChanged && W.NINI.fb.onUserChanged(paintUser);
      }, { once: true });
    }

    // default season/apply
    var def = (opts.defaultSeason || 'auto');
    if (def !== 'auto') addBodySeason(def);
  }

  // ---------- Public API ----------
  NINI.header = {
    mount: function (selector, opts) {
      opts = opts || {};
      opts.selector = selector;
      renderHeader(opts);
    }
  };

})();



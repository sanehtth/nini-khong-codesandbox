/* public/js/nini-header.js */
;(function (global){
  const NINI = global.NINI || (global.NINI = {});
  const U = NINI || {};

  // ---- helpers (store + get active profile) ----
  const KEY_ACCS = 'NINI_ACCOUNTS_V3';
  const KEY_ACTIVE = 'NINI_ACTIVE_USER_V3';
  const FALLBACK_AVT = '/public/assets/avatar/NV1.webp';

  function readActive(){
    try{
      const uid = NINI.store.get(KEY_ACTIVE, null);
      const accs = NINI.store.get(KEY_ACCS, {});
      return (uid && accs && accs[uid]) ? accs[uid] : null;
    }catch(_){ return null; }
  }

  function make(tag, attrs={}, children){
    const el = document.createElement(tag);
    for (const k in attrs){
      const v = attrs[k];
      if (k==='class') el.className = v;
      else if (k==='style') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    if (children!=null){
      (Array.isArray(children)?children:[children]).forEach(c=>{
        if (c==null) return;
        el.appendChild(typeof c==='string'? document.createTextNode(c): c);
      });
    }
    return el;
  }

  // ---- build modal auth (3 tabs) ----
  function buildAuthModal(){
    const backdrop = make('div',{class:'nh__modal-backdrop'});
    const modal = make('div',{class:'nh__modal'});

    const tabs = make('div',{class:'nh__tabs'});
    const tabLogin = make('button',{class:'nh__tab is-active'},'Đăng nhập');
    const tabSignup= make('button',{class:'nh__tab'},'Đăng ký');
    const tabForgot= make('button',{class:'nh__tab'},'Quên mật khẩu');
    tabs.append(tabLogin, tabSignup, tabForgot);

    const pLogin = make('div',{class:'nh__panel is-active'},[
      make('div',{class:'nh__row'},[make('label',{},'Email'), make('input',{type:'email',id:'nh_email_login',placeholder:'you@example.com'})]),
      make('div',{class:'nh__row'},[make('label',{},'Mật khẩu'), make('input',{type:'password',id:'nh_pass_login',placeholder:'••••••••'})]),
      make('div',{style:{display:'flex',gap:'8px'}},[
        make('button',{class:'nh__btn',onclick:doEmailLogin},'Đăng nhập'),
        make('button',{class:'nh__btn',onclick:doGoogle},'Đăng nhập với Google')
      ])
    ]);

    const pSignup = make('div',{class:'nh__panel'},[
      make('div',{class:'nh__row'},[make('label',{},'Email'), make('input',{type:'email',id:'nh_email_sign',placeholder:'you@example.com'})]),
      make('div',{class:'nh__row'},[make('label',{},'Mật khẩu'), make('input',{type:'password',id:'nh_pass_sign',placeholder:'Ít nhất 8 ký tự'})]),
      make('button',{class:'nh__btn',onclick:doSignUp},'Đăng ký')
    ]);

    const pForgot = make('div',{class:'nh__panel'},[
      make('div',{class:'nh__row'},[make('label',{},'Email'), make('input',{type:'email',id:'nh_email_forgot',placeholder:'you@example.com'})]),
      make('button',{class:'nh__btn',onclick:doReset},'Gửi link đặt lại mật khẩu')
    ]);

    modal.append(tabs,pLogin,pSignup,pForgot);
    document.body.append(backdrop, modal);

    function sw(t){
      [tabLogin,tabSignup,tabForgot].forEach(b=>b.classList.remove('is-active'));
      [pLogin,pSignup,pForgot].forEach(p=>p.classList.remove('is-active'));
      if(t==='login'){ tabLogin.classList.add('is-active'); pLogin.classList.add('is-active'); }
      if(t==='sign') { tabSignup.classList.add('is-active'); pSignup.classList.add('is-active'); }
      if(t==='forgot'){ tabForgot.classList.add('is-active'); pForgot.classList.add('is-active'); }
    }
    tabLogin.onclick=()=>sw('login');
    tabSignup.onclick=()=>sw('sign');
    tabForgot.onclick=()=>sw('forgot');

    function open(){ backdrop.style.display='block'; modal.style.display='block'; }
    function close(){ backdrop.style.display='none'; modal.style.display='none'; }
    backdrop.addEventListener('click', close);

    // ---- wire FB (nini-fb.js) ----
    async function doEmailLogin(){
      try{
        const email = document.getElementById('nh_email_login').value.trim();
        const pass  = document.getElementById('nh_pass_login').value;
        await NINI.fb.signInEmail(email, pass);
        close(); NINI.header.refresh();
      }catch(e){ alert('Đăng nhập lỗi: '+e.message); }
    }
    async function doGoogle(){
      try{ await NINI.fb.signInWithGoogle(); close(); NINI.header.refresh(); }
      catch(e){ alert('Google lỗi: '+e.message); }
    }
    async function doSignUp(){
      try{
        const email = document.getElementById('nh_email_sign').value.trim();
        const pass  = document.getElementById('nh_pass_sign').value;
        await NINI.fb.signUpEmail(email, pass);
        alert('Đăng ký xong. Hãy xác nhận email nếu được yêu cầu.'); 
        sw('login');
      }catch(e){ alert('Đăng ký lỗi: '+e.message); }
    }
    async function doReset(){
      try{
        const email = document.getElementById('nh_email_forgot').value.trim();
        await NINI.fb.sendReset(email);
        alert('Đã gửi link đặt lại mật khẩu.');
        sw('login');
      }catch(e){ alert('Không gửi được: '+e.message); }
    }

    return {open,close};
  }

  // ---- build header ----
  function buildHeader(opts={}){
    const bar = make('header',{class:'nh__bar'});
    const brand = make('a',{class:'nh__brand',href:'/#home','aria-label':'NiNi — Funny'},[
      make('img',{src:'/public/assets/icons/logo_text.webp',alt:'NiNi Funny'}),
      make('div',{class:'nh__slogan'}, opts.slogan || 'Chơi mê ly, bứt phá tư duy')
    ]);
    const seasons = make('nav',{class:'nh__seasons'});
    const chips = [
      ['Home','/#home'],['Spring','/#spring'],['Summer','/#summer'],['Autumn','/#autumn'],['Winter','/#winter']
    ].map(([t,href])=>{
      const b=make('a',{class:'nh__chip',href},t); seasons.appendChild(b); return b;
    });

    const spacer = make('div',{class:'nh__spacer'});
    const user = make('div',{class:'nh__user'});
    const avt = make('img',{class:'nh__avatar',alt:'avatar'});
    const email = make('div',{class:'nh__email'});
    const btn = make('button',{class:'nh__btn'},'Đăng nhập / Đăng ký');

    user.append(avt,email,btn);
    bar.append(brand,seasons,spacer,user);

    // modal
    const modal = buildAuthModal();
    btn.onclick = ()=> modal.open();
    avt.onclick = ()=> location.href='/profile.html';

    function refresh(){
      const acc = readActive();
      if(acc){
        avt.src = acc.avatarUrl || FALLBACK_AVT;
        email.textContent = acc.email || '';
        btn.textContent = 'Đăng xuất';
        btn.onclick = async ()=>{
          try{ await NINI.fb.signOut(); }finally{ NINI.header.refresh(); }
        };
      }else{
        avt.src = FALLBACK_AVT;
        email.textContent = '';
        btn.textContent = 'Đăng nhập / Đăng ký';
        btn.onclick = ()=> modal.open();
      }
    }

    return {el:bar, refresh};
  }

  // ---- public API ----
  NINI.header = {
    mount(target='body', opts={}){
      const host = (typeof target==='string')? document.querySelector(target) : target;
      if(!host) return;
      if (this._mounted) try{ this.unmount(); }catch(_){}
      const h = buildHeader(opts);
      host.prepend(h.el);
      this._mounted = h; 
      this.refresh();
    },
    refresh(){ this._mounted && this._mounted.refresh(); },
    unmount(){ if(this._mounted){ this._mounted.el.remove(); this._mounted=null; } }
  };

  // auto mount nếu trang đặt data-header
  document.addEventListener('DOMContentLoaded', ()=>{
    const t = document.querySelector('[data-nini-header]') || document.body;
    NINI.header.mount(t);
  });

})(window);


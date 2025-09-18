(() => {
  // ===== Mapping ảnh theo mùa =====
  const SEASON_BG = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  const body = document.body;
  const hero = document.getElementById('seasonHero');

  function setSeason(name){
    if(!SEASON_BG[name]) name = 'home';
    body.setAttribute('data-season', name);
    hero.src = SEASON_BG[name];
    // active tab
    document.querySelectorAll('.tabs .tab').forEach(b=>{
      b.classList.toggle('is-active', b.dataset.season===name);
    });
    // update hash (để F5 vẫn nhớ)
    location.hash = name==='home' ? '' : `#/${name}`;
  }

  // tabs top
  document.getElementById('topTabs').addEventListener('click', (e)=>{
    const btn = e.target.closest('.tab');
    if(!btn) return;
    setSeason(btn.dataset.season);
  });

  // menu pills
  document.querySelector('.frame__menu').addEventListener('click', (e)=>{
    const btn = e.target.closest('.pill');
    if(!btn) return;
    document.querySelectorAll('.frame__menu .pill').forEach(p=>p.classList.remove('is-active'));
    btn.classList.add('is-active');
    const el = document.querySelector(btn.dataset.target);
    if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  });

  // khởi tạo theo hash
  (function initFromHash(){
    const m = location.hash.match(/^#\/(home|spring|summer|autumn|winter)$/i);
    setSeason(m ? m[1].toLowerCase() : 'home');
  })();

  // ===== Modal =====
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  const openBtn  = document.getElementById('authBtn');
  const closeBtn = document.getElementById('authClose');

  function openAuth(){ backdrop.classList.remove('hidden'); modal.classList.remove('hidden'); }
  function closeAuth(){ backdrop.classList.add('hidden'); modal.classList.add('hidden'); }

  openBtn.addEventListener('click', openAuth);
  closeBtn.addEventListener('click', closeAuth);
  backdrop.addEventListener('click', closeAuth);

  // chuyển view trong modal
  function showView(name){
    modal.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    const view = modal.querySelector(`.view-${name}`);
    if(view) view.classList.remove('hidden');

    modal.querySelectorAll('.tab-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.view===name);
    });
  }
  showView('login');

  modal.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click', ()=>showView(b.dataset.view));
  });
})();

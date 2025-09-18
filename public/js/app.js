(() => {
  const IMAGES = {
    home  : "/public/assets/bg/nini_home.webp",
    spring: "/public/assets/images/seasons/spring.webp",
    summer: "/public/assets/images/seasons/summer.webp",
    autumn: "/public/assets/images/seasons/autumn.webp",
    winter: "/public/assets/images/seasons/winter.webp",
  };

  const hero   = document.getElementById("hero");
  const tabs   = document.getElementById("seasonTabs");
  const authBtn= document.getElementById("authBtn");
  const bd     = document.body;

  const authModal   = document.getElementById("authModal");
  const authBackdrop= document.getElementById("authBackdrop");
  const authClose   = document.getElementById("authClose");

  function setSeason(s){
    const key = s in IMAGES ? s : "home";
    bd.setAttribute("data-season", key);
    hero.src = IMAGES[key];
    // set active tab UI
    document.querySelectorAll("#seasonTabs .tab").forEach(b=>{
      b.classList.toggle("is-active", b.dataset.season === key);
    });
    // hash for deep-link
    location.hash = key === "home" ? "#/" : `#/${key}`;
  }

  // init
  setSeason((location.hash.replace("#/","") || "home"));

  // change by click tab
  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-season]");
    if (!btn) return;
    setSeason(btn.dataset.season);
  });

  // pills scroll
  document.querySelectorAll(".pill").forEach(p=>{
    p.addEventListener("click", ()=>{
      const sel = p.getAttribute("data-target");
      const el = document.querySelector(sel);
      if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });

  // modal
  function openAuth(){ authBackdrop.classList.remove("hidden"); authModal.classList.remove("hidden"); }
  function closeAuth(){ authBackdrop.classList.add("hidden"); authModal.classList.add("hidden"); }
  authBtn.addEventListener("click", openAuth);
  authBackdrop.addEventListener("click", closeAuth);
  authClose.addEventListener("click", closeAuth);

  // Debug: nếu tải sai file (trả về HTML), báo ra console
  fetch("/public/js/app.js", {method:"HEAD"})
    .then(r=>{
      const ct = r.headers.get("content-type") || "";
      if(!ct.includes("javascript")) {
        console.warn("Cảnh báo: /public/js/app.js không trả về JS (content-type:", ct, ")");
      }
    })
    .catch(()=>{});
    // ===== Modal logic =====
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  const closeBtn = document.getElementById('authClose');
  const openBtn  = document.getElementById('authBtn');

  function openAuth(){ backdrop.classList.remove('hidden'); modal.classList.remove('hidden'); }
  function closeAuth(){ backdrop.classList.add('hidden'); modal.classList.add('hidden'); }

  if (openBtn)  openBtn.addEventListener('click', openAuth);
  if (closeBtn) closeBtn.addEventListener('click', closeAuth);
  if (backdrop) backdrop.addEventListener('click', closeAuth);

  // Chuyển view: login / signup / reset
  function showView(name){
    modal.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    modal.querySelector(`.view-${name}`).classList.remove('hidden');
    modal.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
    });
  }
  // mặc định mở đăng nhập
  showView('login');

  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
})();


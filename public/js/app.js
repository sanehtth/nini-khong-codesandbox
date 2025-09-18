/* ====== Ảnh theo mùa ====== */
const SCENES = {
  home:   { outer: "/public/assets/bg/nini_home.webp",                    inner: "/public/assets/bg/nini_home.webp" },
  spring: { outer: "/public/assets/images/seasons/spring.webp",  inner: "/public/assets/images/seasons/spring.webp" },
  summer: { outer: "/public/assets/images/seasons/summer.webp",  inner: "/public/assets/images/seasons/summer.webp" },
  autumn: { outer: "/public/assets/images/seasons/autumn.webp",  inner: "/public/assets/images/seasons/autumn.webp" },
  winter: { outer: "/public/assets/images/seasons/winter.webp",  inner: "/public/assets/images/seasons/winter.webp" },
};
const SEASONS = Object.keys(SCENES);

const bg  = document.querySelector(".page-bg");
const img = document.getElementById("seasonImg");
const navLinks = [...document.querySelectorAll(".nav__link")];

/* Lấy mùa từ URL (hỗ trợ "#winter", "#/winter", "/winter", "/f#winter") */
function getSeasonFromURL() {
  let h = (location.hash || "").toLowerCase();  // "#/winter" | "#winter"
  h = h.replace(/^#\/?/, "");                   // "winter"
  if (SEASONS.includes(h)) return h;

  const p = location.pathname.replace(/^\/+/, "").toLowerCase(); // "winter" | "f" | ""
  if (SEASONS.includes(p)) return p;

  return "home";
}

function setSeason(season) {
  document.body.setAttribute('data-season', season);
  heroImg.src = IMAGES[season];                // ảnh trong khung
  outerBg.style.backgroundImage = `url(${IMAGES[season]})`; // nền ngoài
  document.querySelectorAll('.tabs button')
    .forEach(b => b.classList.toggle('is-active', b.dataset.season === season));
}


/* Bắt sự kiện nav */
navLinks.forEach(a => a.addEventListener("click", () => setSeason(a.dataset.season)));

/* Nút nội dung nhanh */
const infoMap = {
  about: "Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.",
  rules: "Luật chơi: Chọn mùa – hoàn thành nhiệm vụ nhỏ – tích điểm – đổi quà nhé!",
  forum: "Diễn đàn: Nơi bé chia sẻ thành quả và bạn bè cổ vũ nhau.",
  feedback: "Bạn có ý tưởng trò chơi hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!",
};
document.querySelectorAll(".pill").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("is-active", p===btn));
    const el = document.getElementById("infoBody");
    if (el) el.textContent = infoMap[btn.dataset.tab] || "";
  });
});

/* Modal auth */
const modal   = document.getElementById("authModal");
const btnAuth = document.getElementById("btnAuth");
if (btnAuth && modal) {
  btnAuth.addEventListener("click", () => (modal.hidden = false));
  modal.addEventListener("click", e => { if (e.target.matches("[data-close]")) modal.hidden = true; });
  const tabs = [...document.querySelectorAll(".tab")];
  const panes = {
    login:    document.getElementById("pane-login"),
    register: document.getElementById("pane-register"),
    reset:    document.getElementById("pane-reset"),
  };
  function showPane(k){
    tabs.forEach(t=>t.classList.toggle("is-active", t.dataset.pane === k));
    Object.entries(panes).forEach(([key,el])=> el && el.classList.toggle("is-active", key===k));
  }
  tabs.forEach(t=> t.addEventListener("click", ()=> showPane(t.dataset.pane)));
  document.querySelectorAll("[data-switch]").forEach(b=> b.addEventListener("click", ()=> showPane(b.dataset.switch)));
}

/* Khởi động + lắng nghe thay đổi URL */
function boot(){ setSeason(getSeasonFromURL()); }
window.addEventListener("hashchange", boot);
window.addEventListener("popstate",  boot);
boot();

console.log("NiNi boot ok");


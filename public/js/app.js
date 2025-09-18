/* ====== Ảnh theo mùa (ngoài + trong) ====== */
const SCENES = {
  home:   { outer: "/public/assets/bg/nini_home.webp",    inner: "/public/assets/bg/nini_home.webp" },
  spring: { outer: "/public/assets/images/seasons/spring.webp", inner: "/public/assets/images/seasons/spring.webp" },
  summer: { outer: "/public/assets/images/seasons/summer.webp", inner: "/public/assets/images/seasons/summer.webp" },
  autumn: { outer: "/public/assets/images/seasons/autumn.webp", inner: "/public/assets/images/seasons/autumn.webp" },
  winter: { outer: "/public/assets/images/seasons/winter.webp", inner: "/public/assets/images/seasons/winter.webp" },
};

const bg = document.querySelector(".page-bg");
const img = document.getElementById("seasonImg");
const navLinks = [...document.querySelectorAll(".nav__link")];

/* đổi mùa + hiệu ứng chuyển */
function setSeason(key){
  const conf = SCENES[key] || SCENES.home;
  // active nav
  navLinks.forEach(a => a.classList.toggle("is-active", a.dataset.season === key));

  // fade ảnh trong khung
  img.style.opacity = "0";
  setTimeout(()=>{
    img.src = conf.inner;
    img.onload = ()=> (img.style.opacity = "1");
  }, 150);

  // đổi nền ngoài
  bg.style.backgroundImage = `url("${conf.outer}")`;

  // cập nhật hash để reload vẫn đúng mùa
  if(location.hash !== `#${key}`){
    history.replaceState(null, "", `#${key}`);
  }
}

function initSeasonFromHash(){
  const key = (location.hash || "#home").replace("#","").toLowerCase();
  setSeason(SCENES[key] ? key : "home");
}

/* click nav */
navLinks.forEach(a => {
  a.addEventListener("click", ()=> setSeason(a.dataset.season));
});

/* quick tabs dưới khung – thay nội dung panel ngắn */
const infoMap = {
  about:   "Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.",
  rules:   "Luật chơi: Chọn mùa – hoàn thành nhiệm vụ nhỏ – tích điểm – đổi quà nhé!",
  forum:   "Diễn đàn: Nơi bé chia sẻ thành quả và bạn bè cổ vũ nhau.",
  feedback:"Góp ý: Bạn thấy gì cần cải thiện? Hãy nói với NiNi nhé!"
};
document.querySelectorAll(".pill").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.getElementById("infoBody").textContent = infoMap[btn.dataset.tab] || "";
  });
});

/* ====== Modal Auth (3 tab) ====== */
const modal = document.getElementById("authModal");
const btnAuth = document.getElementById("btnAuth");

// mở/đóng
btnAuth.addEventListener("click", ()=> modal.hidden = false);
modal.addEventListener("click", e=>{
  if(e.target.matches("[data-close]")) modal.hidden = true;
});

// chuyển tab pane
const tabs = [...document.querySelectorAll(".tab")];
const panes = {
  login:    document.getElementById("pane-login"),
  register: document.getElementById("pane-register"),
  reset:    document.getElementById("pane-reset")
};
function showPane(key){
  tabs.forEach(t=>t.classList.toggle("is-active", t.dataset.pane === key));
  Object.entries(panes).forEach(([k,el])=> el.classList.toggle("is-active", k===key));
}
tabs.forEach(t=> t.addEventListener("click", ()=> showPane(t.dataset.pane)));
document.querySelectorAll("[data-switch]").forEach(b=> b.addEventListener("click", ()=> showPane(b.dataset.switch)));

// demo: nút Google chỉ hiển thị toast nhỏ (chưa nối OAuth)
const btnLoginGoogle = document.getElementById("btnLoginGoogle");
if(btnLoginGoogle){
  btnLoginGoogle.addEventListener("click", ()=> {
    alert("Demo: Đăng nhập Google (sau khi gắn OAuth) → nhắc cập nhật hồ sơ cá nhân.");
  });
}

/* ====== Khởi động ====== */
window.addEventListener("hashchange", initSeasonFromHash);
initSeasonFromHash();

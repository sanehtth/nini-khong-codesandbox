/* ====== CẤU HÌNH ẢNH NỀN THEO MÙA ====== */
const BG = {
  home:  "/public/assets/bg/nini_home.webp",
  spring:"/public/assets/images/seasons/spring.webp",
  summer:"/public/assets/images/seasons/summer.webp",
  autumn:"/public/assets/images/seasons/autumn.webp",
  winter:"/public/assets/images/seasons/winter.webp",
};

const seasonBg = document.getElementById("seasonBg");
const nini      = document.getElementById("niniMascot");

/* chọn mùa */
const seasonBtns = [...document.querySelectorAll(".season-tabs .tab-btn")];
function setSeason(season){
  seasonBtns.forEach(b=>b.classList.toggle("active", b.dataset.season===season));
  const url = BG[season] ?? BG.home;
  seasonBg.src = url;
}
seasonBtns.forEach(b => b.addEventListener("click", ()=> setSeason(b.dataset.season)));
setSeason("home"); // mặc định Home

/* ====== 4 NÚT DƯỚI (cập nhật text) ====== */
const PANE = {
  about: {
    title: "NiNi — Funny",
    text:  "Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi."
  },
  rules: {
    title: "Luật chơi",
    text:  "Mỗi game có hướng dẫn riêng. Bé hoàn thành thử thách để nhận điểm và huy hiệu."
  },
  forum: {
    title: "Diễn đàn",
    text:  "Nơi cha mẹ và bé chia sẻ trải nghiệm, mẹo chơi hay và góp ý tính năng."
  },
  feedback:{
    title: "Góp ý",
    text:  "Bạn có ý tưởng mới? Hãy gửi góp ý để NiNi tốt hơn mỗi ngày!"
  }
}
const contentPane  = document.getElementById("contentPane");
const titleEl      = contentPane.querySelector(".card__title");
const textEl       = contentPane.querySelector(".card__text");
const pills        = [...document.querySelectorAll(".cta .pill")];

function setPane(key){
  pills.forEach(p=>p.classList.toggle("active", p.dataset.pane===key));
  titleEl.textContent = PANE[key].title;
  textEl.textContent  = PANE[key].text;
}
pills.forEach(p => p.addEventListener("click", ()=> setPane(p.dataset.pane)));
setPane("about");

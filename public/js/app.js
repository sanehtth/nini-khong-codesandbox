// ========= CẤU HÌNH ẢNH NỀN =========
// EDIT: nếu bạn có /public/assets/images/seasons/home.webp thì để đúng tên.
// Nếu KHÔNG có home.webp, mình fallback về summer.webp.
const BG = {
  home  : "/public/assets/images/seasons/home.webp",  // <-- nếu không tồn tại, sẽ fallback
  spring: "/public/assets/images/seasons/spring.webp",
  summer: "/public/assets/images/seasons/summer.webp",
  autumn: "/public/assets/images/seasons/autumn.webp",
  winter: "/public/assets/images/seasons/winter.webp",
  fallback: "/public/assets/images/seasons/summer.webp"
};

document.addEventListener('DOMContentLoaded', () => {
  const tabsWrap = document.getElementById('tabs');
  const seasonBtns = [...tabsWrap.querySelectorAll('.tab')];
  const scene = document.getElementById('scene');

  // ====== ĐỔI MÙA ======
  function setSeason(season) {
    // đặt active cho nút mùa
    seasonBtns.forEach(b => b.classList.toggle('is-active', b.dataset.season === season));

    // đổi background (có fallback nếu ảnh chính không có)
    setSceneSrcFirstAvailable([BG[season], BG.fallback]);
  }

  // helper: thử lần lượt URL, nếu lỗi thì tới URL kế tiếp
  function setSceneSrcFirstAvailable(urls, i = 0) {
    const url = urls[i];
    if (!url) return; // hết fallback

    const testImg = new Image();
    testImg.onload = () => { scene.src = url; };
    testImg.onerror = () => setSceneSrcFirstAvailable(urls, i + 1);
    testImg.src = url;
  }

  // gán click 5 nút mùa
  seasonBtns.forEach(btn => {
    btn.addEventListener('click', () => setSeason(btn.dataset.season));
  });

  // khởi tạo: HOME
  setSeason('home');

  // ====== TABS NỘI DUNG TRONG KHUNG ======
  const pills = [...document.querySelectorAll('.footer-nav .pill')];
  const panels = [...document.querySelectorAll('[data-tab-panel]')];

  function showPanel(key) {
    pills.forEach(p => p.classList.toggle('is-active', p.dataset.tab === key));
    panels.forEach(sec => sec.classList.toggle('is-show', sec.dataset.tabPanel === key));
  }

  pills.forEach(p => p.addEventListener('click', () => showPanel(p.dataset.tab)));

  // mặc định hiển thị "about" (đã active sẵn trong HTML)
});

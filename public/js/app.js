/* NiNi — App (NO EFFECT version) */
(() => {
  const frame = document.getElementById('frame');
  const bg = document.getElementById('bg');
  const nini = document.getElementById('nini');

  // Map ảnh theo data-* (dễ sửa đường dẫn nếu đổi ảnh)
  const IMGS = {
    home  : frame.dataset.home,
    spring: frame.dataset.spring,
    summer: frame.dataset.summer,
    autumn: frame.dataset.autumn,
    winter: frame.dataset.winter,
  };
  const niniSrc = frame.dataset.nini;

  // Thông tin cho 4 tab trong khung
  const INFO = {
    about   : { title: 'NiNi — Funny', text: 'Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.' },
    rules   : { title: 'Luật chơi', text: 'Mỗi trò có mô tả ngắn ngay trang chơi. Bé tích điểm bằng cách hoàn thành thử thách.' },
    forum   : { title: 'Diễn đàn', text: 'Nơi bé khoe thành tích, kể chuyện và học hỏi lẫn nhau (ra mắt sớm).' },
    feedback: { title: 'Góp ý', text: 'Bạn muốn góp ý thêm trò/ảnh/ý tưởng? Rất mong nhận chia sẻ để NiNi hay hơn nữa!' },
  };

  // ========== SEASON TABS ==========
  const tabBar = document.getElementById('seasonTabs');
  function setSeason(name) {
    // Cập nhật active UI
    [...tabBar.querySelectorAll('.tab')].forEach(b => b.classList.toggle('is-active', b.dataset.season === name));

    // Đổi background
    const next = IMGS[name] || IMGS.home;
    if (bg.src !== location.origin + next) bg.src = next;

    // NiNi
    if (niniSrc && !nini.src) nini.src = niniSrc;

    // (giữ chỗ cho effect: tắt/bật ở đây nếu cần)
    if (window.SEASON_FX && window.SEASON_FX.stop) window.SEASON_FX.stop('.frame');
  }

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-season]');
    if (!btn) return;
    setSeason(btn.dataset.season);
  });

  // ========== INFO TABS ==========
  const infoTabs = document.getElementById('infoTabs');
  const infoPanel = document.getElementById('infoPanel');
  function setInfo(key) {
    [...infoTabs.querySelectorAll('.info__tab')].forEach(b => b.classList.toggle('is-active', b.dataset.key === key));
    const it = INFO[key] || INFO.about;
    infoPanel.innerHTML = `<h3>${it.title}</h3><p>${it.text}</p>`;
  }
  infoTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    setInfo(btn.dataset.key);
  });

  // ========== INIT ==========
  document.addEventListener('DOMContentLoaded', () => {
    setSeason('home');   // Home thực sự là Home (không còn trỏ nhầm Summer)
    setInfo('about');    // Tab mặc định
  });

  // Cho phép đổi tỉ lệ NiNi nhanh: window.NINI = {scale: 2.2}
  window.NINI = new Proxy({}, {
    set(_t, prop, val){
      if (prop === 'scale') document.documentElement.style.setProperty('--nini-scale', val);
      return true;
    }
  });
})();

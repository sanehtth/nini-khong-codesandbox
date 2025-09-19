// public/seasons.js
(function () {
  const EFFECT_LAYER_ID = "effect-layer";
  const BTN_SELECTOR = "[data-season]";
  const STORAGE_KEY = "currentSeason";

  // Map mùa -> ảnh tương ứng
  const ASSETS = {
    Spring: "/public/assets/icons/flower.webp",
    Summer: "/public/assets/icons/drop.webp",
    Autumn: "/public/assets/icons/leaf.webp",
    Winter: "/public/assets/icons/snow.webp",
  };

  // Preload ảnh để không bị trễ khi đổi mùa
  const preloaded = {};
  Object.entries(ASSETS).forEach(([season, src]) => {
    const img = new Image();
    img.src = src;
    preloaded[season] = img;
  });

  // Lấy/ghi mùa trong localStorage để giữ trạng thái khi reload
  function getSavedSeason() {
    return localStorage.getItem(STORAGE_KEY) || "Spring";
  }
  function saveSeason(season) {
    localStorage.setItem(STORAGE_KEY, season);
  }

  function ensureEffectLayer() {
    let layer = document.getElementById(EFFECT_LAYER_ID);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = EFFECT_LAYER_ID;
      // layer nằm trên cùng nội dung
      Object.assign(layer.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: "9999",
      });
      document.body.appendChild(layer);
    }
    return layer;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Tạo effect đơn giản bằng cách spawn nhiều "particle" rơi
  function renderEffect(season) {
    const layer = ensureEffectLayer();
    layer.innerHTML = ""; // reset effect mỗi lần đổi mùa

    const imgSrc = ASSETS[season];
    if (!imgSrc) return;

    const count = 24; // số lượng "bông/tuyết/lá/giọt"
    for (let i = 0; i < count; i++) {
      const el = document.createElement("img");
      el.src = imgSrc;
      el.alt = season + " particle";
      const size = random(16, 40);

      Object.assign(el.style, {
        position: "absolute",
        top: "-48px",
        left: `${random(0, 100)}%`,
        width: `${size}px`,
        height: "auto",
        willChange: "transform, top, opacity",
        animationDuration: `${random(4, 9)}s`,
        animationDelay: `${random(0, 2)}s`,
        animationIterationCount: "1",
        animationTimingFunction: "linear",
        animationName: "falling__once",
        opacity: "0.95",
      });

      layer.appendChild(el);
    }
  }

  // Thêm @keyframes một lần (nếu CSS global chưa có)
  function injectKeyframesOnce() {
    const id = "__seasons_anim__";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes falling__once {
        0% { transform: translateY(-60px) rotate(0deg); opacity: 0.0; }
        10% { opacity: 1; }
        100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
      }
    `;
    document.head.appendChild(style);
  }

  function setActiveButton(season) {
    document.querySelectorAll(BTN_SELECTOR).forEach(btn => {
      if (btn.dataset.season === season) {
        btn.classList.add("season-active");
      } else {
        btn.classList.remove("season-active");
      }
    });
  }

  function handleClickSeason(season) {
    saveSeason(season);
    setActiveButton(season);
    // Render effect NGAY khi bấm
    renderEffect(season);
    // Nếu bạn có theme màu nền theo mùa, có thể set class body tại đây:
    document.body.dataset.season = season; // ví dụ để CSS dùng [data-season="Winter"] { ... }
  }

  // Khởi tạo
  document.addEventListener("DOMContentLoaded", () => {
    injectKeyframesOnce();

    // Gán click cho các nút
    document.querySelectorAll(BTN_SELECTOR).forEach(btn => {
      btn.addEventListener("click", () => {
        const season = btn.dataset.season;
        handleClickSeason(season);
      });
    });

    // Khi load trang, đọc mùa đã lưu và set UI (nhưng KHÔNG bắt buộc phải bắn effect)
    const initial = getSavedSeason();
    setActiveButton(initial);
    document.body.dataset.season = initial;
  });
})();

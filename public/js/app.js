// ====== NiNi — base app (no effects) ======
(() => {
  // Ảnh nền cho từng chế độ
  const BG = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  // DOM
  const scene = document.getElementById("scene");
  const tabWrap = document.getElementById("seasonTabs");
  const panelEl = document.getElementById("infoPanel");
  const pillWrap = document.querySelector(".pill-nav");

  let season = "home";
  let panel = "about";

  // Helpers
  function setSeason(next) {
    if (!BG[next]) next = "home";
    season = next;
    scene.src = BG[season];

    // toggle active tab
    for (const btn of tabWrap.querySelectorAll(".tab")) {
      btn.classList.toggle("is-active", btn.dataset.season === season);
    }
  }

  function setPanel(next) {
    panel = next;
    for (const p of pillWrap.querySelectorAll(".pill")) {
      p.classList.toggle("is-active", p.dataset.panel === panel);
    }
    switch (panel) {
      case "about":
        panelEl.innerHTML = `
          <h2 class="panel-title">NiNi — Funny</h2>
          <p class="panel-text">Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.</p>
        `;
        break;
      case "rules":
        panelEl.innerHTML = `
          <h2 class="panel-title">Luật chơi</h2>
          <p class="panel-text">Các luật đơn giản, minh hoạ rõ ràng. Điểm thưởng tích luỹ theo nhiệm vụ.</p>
        `;
        break;
      case "forum":
        panelEl.innerHTML = `
          <h2 class="panel-title">Diễn đàn</h2>
          <p class="panel-text">Nơi trao đổi mẹo, chia sẻ kết quả và thảo luận cùng bạn bè/PH.</p>
        `;
        break;
      case "feedback":
        panelEl.innerHTML = `
          <h2 class="panel-title">Góp ý</h2>
          <p class="panel-text">Hãy gửi góp ý để mình tối ưu thêm trải nghiệm nhé!</p>
        `;
        break;
    }
  }

  // Events
  tabWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    setSeason(btn.dataset.season);
  });

  pillWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    setPanel(btn.dataset.panel);
  });

  // Init
  setSeason("home");
  setPanel("about");
})();

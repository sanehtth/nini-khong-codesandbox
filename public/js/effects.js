/* NiNi — hiệu ứng rơi hoa/lá/tuyết theo mùa (đã tinh gọn & vá nhỏ) */
(() => {
  const icons = {
    home:   "",
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const frame = document.getElementById("frame");
  if (!frame) return;

  // Canvas phủ riêng trong khung frame (không bắt chuột)
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",    // không chặn click
    zIndex: "0",              // NOTE: để thấp, modal nằm trên
  });
  frame.appendChild(canvas);

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let iconImg = new Image();
  let iconReady = false;
  let rafId = null;
  let currentSeason = "home";

  function resize() {
    const rect = frame.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    H = canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width  = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resize();
  addEventListener("resize", resize);

  function loadIcon(url) {
    iconReady = false;
    iconImg = new Image();
    iconImg.onload = () => { iconReady = true; };
    iconImg.onerror = () => { iconReady = false; };
    iconImg.src = url;
  }

  function setSeasonIcon() {
    const s = (location.hash || "").replace(/^#\/?/, "") || "home";
    currentSeason = s;

    const url = icons[s];
    if (url) {
      // NOTE: chỉ set iconReady=true sau khi ảnh onload
      loadIcon(url);
    } else {
      // home -> tắt hạt, xóa canvas
      iconReady = false;
      particles = [];
      ctx.clearRect(0, 0, W, H);
    }
  }

  function buildParticles() {
    const count = 18;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * -H,
      vy: 0.6 + Math.random() * 0.8,
      vx: -0.2 + Math.random() * 0.4,
      size: 14 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      vr: -0.02 + Math.random() * 0.04,
    }));
  }

  // ---- Khởi tạo lần đầu
  setSeasonIcon();
  buildParticles();

  // NOTE: Gộp còn 1 listener hashchange (không gọi đôi)
  addEventListener("hashchange", () => {
    setSeasonIcon();
    buildParticles();
  });

  function step() {
    ctx.clearRect(0, 0, W, H);
    if (iconReady) {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(iconImg, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
    }
    rafId = requestAnimationFrame(step);
  }

  // NOTE: tiết kiệm pin/CPU khi tab ẩn
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId) {
      rafId = requestAnimationFrame(step);
    }
  });

  rafId = requestAnimationFrame(step);
})();

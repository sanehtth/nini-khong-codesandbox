/* ============================================================================
   NiNi — Hiệu ứng rơi hoa/lá/tuyết theo mùa (FULL, đã tinh gọn & vá)
   - Canvas phủ trong khung #frame, không chặn click
   - Khớp DPI/resize, tránh vỡ/nhòe
   - API điều khiển: window.fx.setSeason(), pause(), resume(), setDensity()
   ========================================================================== */
(() => {
  const ICONS = {
    home:   "", // tắt
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const frame = document.getElementById("frame");
  if (!frame) return;

  // ---------------- Canvas layer trong khung ----------------
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2", // TRÊN nền khung, DƯỚI mascot/chips
  });
  frame.style.position = frame.style.position || "relative"; // bảo đảm có positioning
  frame.appendChild(canvas);

  // ---------------- State & helpers ----------------
  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let iconImg = new Image();
  let iconReady = false;
  let rafId = null;
  let paused = false;

  let currentSeason = "home";
  let densityMult = 1; // cho phép tăng/giảm mật độ hạt

  // size theo khung + DPR
  function resizeByRect(rect) {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.max(1, Math.floor(rect.width  * dpr));
    H = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = W;   canvas.height = H;
    canvas.style.width  = rect.width  + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  // Lần đầu
  resizeByRect(frame.getBoundingClientRect());

  // Bắt mọi thay đổi kích thước khung
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const r = e.contentRect;
      resizeByRect(r);
    }
  });
  ro.observe(frame);

  // ---------------- Icon loader ----------------
  function loadIcon(url) {
    iconReady = false;
    if (!url) { iconImg = new Image(); return; }
    iconImg = new Image();
    iconImg.onload = () => { iconReady = true; };
    iconImg.onerror = () => { iconReady = false; };
    iconImg.src = url;
  }

  // ---------------- Particles ----------------
  function calcCount() {
    // mật độ: 18 hạt cho ~1280x720, scale theo diện tích & densityMult
    const base = 18;
    const area = (W / dpr) * (H / dpr);
    const ref  = 1280 * 720;
    return Math.max(6, Math.floor(base * (area / ref) * densityMult));
  }

  function buildParticles() {
    const count = calcCount();
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * (W / dpr),
      y: Math.random() * -(H / dpr),
      vy: 0.6 + Math.random() * 0.9,
      vx: -0.25 + Math.random() * 0.5,
      size: 14 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      vr: -0.02 + Math.random() * 0.04,
    }));
  }

  // ---------------- Season switching ----------------
  function seasonFromHash() {
    const s = (location.hash || "").replace(/^#\/?/, "") || "home";
    return ICONS[s] !== undefined ? s : "home";
  }

  function applySeason(name) {
    const s = ICONS[name] !== undefined ? name : "home";
    currentSeason = s;
    const url = ICONS[s];

    if (!url) {
      iconReady = false;
      particles = [];
      ctx.clearRect(0, 0, W, H);
      return;
    }
    loadIcon(url);
    buildParticles();
  }

  // ---------------- Animation loop ----------------
  function step() {
    if (paused) return;
    ctx.clearRect(0, 0, W, H);

    if (iconReady && particles.length) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;

        const maxX = W / dpr, maxY = H / dpr;
        if (p.y > maxY + 20) { p.y = -20; p.x = Math.random() * maxX; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(iconImg, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    rafId = requestAnimationFrame(step);
  }

  // Tiết kiệm pin/CPU khi tab ẩn
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId && !paused) {
      rafId = requestAnimationFrame(step);
    }
  });

  // ---------------- Public API ----------------
  window.fx = {
    /** ép mùa: "spring"|"summer"|"autumn"|"winter"|"home" */
    setSeason(name) { applySeason(name); },
    /** dừng vòng lặp (giữ frame hiện tại) */
    pause() { paused = true; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    /** chạy tiếp vòng lặp */
    resume() { if (!paused) return; paused = false; if (!rafId) rafId = requestAnimationFrame(step); },
    /** chỉnh mật độ hạt (1 = mặc định). Ví dụ: 0.7 ít hạt, 1.5 nhiều hạt */
    setDensity(mult = 1) { densityMult = Math.max(0.3, Number(mult) || 1); buildParticles(); },
  };

  // ---------------- Tự khởi động ----------------
  // 1) theo hash hiện tại
  applySeason(seasonFromHash());
  // 2) bám theo hashchange (nếu bạn không gọi fx.setSeason từ app.js)
  addEventListener("hashchange", () => { applySeason(seasonFromHash()); });
  // 3) vào vòng lặp
  rafId = requestAnimationFrame(step);
})();

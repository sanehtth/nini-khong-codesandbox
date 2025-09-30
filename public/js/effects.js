/* NiNi — falling effects (flowers / drops / leaves / snow)
   - window.fx.setSeason('home'|'spring'|'summer'|'autumn'|'winter')
   - Auto-boot from hash; pause when tab hidden; DPR aware
*/
(() => {
  const ICONS = {
    home:   "",
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const fx = (window.fx = window.fx || {});

  let frame, canvas, ctx;
  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let img = new Image();
  let imgReady = false;
  let rafId = null;
  let current = "home";

  function ensureCanvas() {
    frame = document.getElementById("frame");
    if (!frame) return false;

    if (!canvas) {
      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");
      Object.assign(canvas.style, {
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        zIndex: "2" // dưới nhân vật & chip, trên nền frame
      });
      frame.appendChild(canvas);
      window.addEventListener("resize", resize, { passive: true });
    }
    resize();
    return true;
  }

  function resize() {
    if (!frame || !canvas) return;
    const rect = frame.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width  = rect.width + "px";
    canvas.style.height = rect.height + "px";
    W = rect.width; H = rect.height;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
  }

  function loadIcon(url) {
    imgReady = false;
    img = new Image();
    img.onload  = () => { imgReady = true; };
    img.onerror = () => { imgReady = false; };
    img.src = url;
  }

  function makeParticles() {
    const N = 28;
    particles = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * -H,
      vy: 0.6 + Math.random() * 0.9,
      vx: -0.25 + Math.random() * 0.5,
      size: 14 + Math.random() * 12,
      rot: Math.random() * Math.PI * 2,
      vr:  -0.025 + Math.random() * 0.05
    }));
  }

  function clearParticles() {
    particles = [];
    ctx && ctx.clearRect(0,0,W,H);
  }

  function setSeason(season) {
    if (!ensureCanvas()) return;
    current = season || "home";
    const url = ICONS[current] || "";
    if (!url) { imgReady = false; clearParticles(); return; }
    loadIcon(url);
    makeParticles();
  }

  fx.setSeason = setSeason;

  function tick() {
    if (!ctx) { rafId = requestAnimationFrame(tick); return; }
    ctx.clearRect(0,0,W,H);
    if (imgReady && particles.length) {
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 24) { p.y = -24; p.x = Math.random() * W; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(img, -p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  });

  function bootFromHash() {
    const s = (location.hash || "").replace(/^#\/?/, "") || "home";
    setSeason(s);
  }

  function boot() {
    if (!ensureCanvas()) return;
    bootFromHash();
    window.addEventListener("hashchange", bootFromHash);
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  fx.boot = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();

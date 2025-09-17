/* eslint-disable */
(() => {
  const ICONS = {
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  // tốc độ tương đối giữa các mùa (có thể tinh chỉnh)
  const SPEED = { spring: .6, summer: .9, autumn: .8, winter: .7 };

  let raf = null, canvas = null, ctx = null, particles = [], img = null;
  let host = null, active = null, dpi = 1;

  function ensure(selector) {
    host = document.querySelector(selector);
    if (!host) { console.warn("[SEASON_FX] host not found:", selector); }
    return !!host;
  }

  function makeCanvas() {
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute; inset:0; width:100%; height:100%; pointer-events:none";
    ctx = canvas.getContext("2d");
    host.appendChild(canvas);

    const resize = () => {
      const r = host.getBoundingClientRect();
      dpi = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(r.width * dpi);
      canvas.height = Math.floor(r.height * dpi);
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }

  function buildParticles(count, speedMul) {
    const area = host.getBoundingClientRect();
    const arr = new Array(count).fill(0).map(() => ({
      x: Math.random() * area.width,
      y: Math.random() * -area.height,
      vy: 20 + Math.random() * 40,         // base fall
      swing: (Math.random() * .8 + .4),     // sideways
      rot: Math.random() * Math.PI * 2,
      size: 16 + Math.random() * 18
    }));
    // speed scale
    arr.forEach(p => { p.vy *= speedMul; });
    return arr;
  }

  function loadIcon(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
  }

  function step() {
    const w = canvas.width / dpi, h = canvas.height / dpi;
    ctx.clearRect(0, 0, w, h);

    const t = performance.now() * .001;
    for (let p of particles) {
      // update
      p.y += p.vy * (1/60);                    // rơi đều ~ 60fps
      p.x += Math.sin(t * 1.6 + p.y * .02) * p.swing; // lắc ngang
      p.rot += .01;

      // vòng lại
      if (p.y > h + 40) {
        p.y = -40;
        p.x = Math.random() * w;
      }

      // draw
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(img, -s/2, -s/2, s, s);
      ctx.restore();
    }
    raf = requestAnimationFrame(step);
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    raf = null; particles = [];
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = ctx = img = host = null;
  }

  async function mount(selector, opts = {}) {
    if (!ensure(selector)) return;
    const { season="spring", density=120, speed=.6 } = opts;
    active = season;

    // tạo canvas
    makeCanvas();

    // tải icon
    const iconUrl = ICONS[season] || ICONS.spring;
    img = await loadIcon(iconUrl);

    // sinh hạt
    const mul = speed * (SPEED[season] ?? 1);
    particles = buildParticles(density, mul);

    // chạy
    raf = requestAnimationFrame(step);
  }

  function unmount() {
    cleanup();
  }

  // public API
  window.SEASON_FX = { mount, unmount };
})();

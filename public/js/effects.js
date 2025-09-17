// eslint-disable-next-line
(() => {
  const ICONS = {
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const SPEED = { spring: 1.0, summer: 1.1, autumn: 1.2, winter: 1.0 };

  let host = null, canvas = null, ctx = null;
  let particles = [];
  let activeSeason = null;
  let imgIcon = null;
  let raf = 0;

  function ensureCanvas(selector){
    if (!host) {
      host = document.querySelector(selector || "#viewport");
    }
    if (!host) return null;

    if (!canvas){
      canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
      host.appendChild(canvas);
      ctx = canvas.getContext("2d");
      window.addEventListener("resize", resize, { passive:true });
      resize();
    }
    return canvas;
  }

  function resize(){
    if (!canvas || !host) return;
    const r = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(r.width  * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function buildParticles(count, straightDown, spdMul){
    const r = host.getBoundingClientRect();
    particles = new Array(count).fill(0).map(() => {
      const x = Math.random() * r.width;
      const y = Math.random() * r.height;
      const vy = (30 + Math.random()*40) * spdMul;
      const vx = straightDown ? 0 : (Math.random()*40 - 20);
      const s  = 16 + Math.random()*12;
      const rot = Math.random()*Math.PI*2;
      const rotV = (Math.random()*0.02 - 0.01);
      return {x,y,vx,vy,size:s,rot,rotV};
    });
  }

  function loadIcon(url){
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
  }

  function step(){
    if (!ctx || !host || !imgIcon) return;
    const r = host.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);

    for (let p of particles){
      p.y += p.vy/60;
      p.x += p.vx/60;
      p.rot += p.rotV;

      if (p.y > r.height+40){ p.y = -40; p.x = Math.random()*r.width; }
      if (p.x < -40) p.x = r.width+40;
      else if (p.x > r.width+40) p.x = -40;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(imgIcon, -p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    }
    raf = requestAnimationFrame(step);
  }

  async function play(season, opts={}){
    activeSeason = season;
    const { straightDown=true, speed=1.0, hostSelector="#viewport" } = opts;

    ensureCanvas(hostSelector);
    if (!canvas) return;

    cancelAnimationFrame(raf);

    const iconUrl = ICONS[season] || ICONS.spring;
    try { imgIcon = await loadIcon(iconUrl); } catch(e){ return; }

    const r = host.getBoundingClientRect();
    const base  = Math.round(r.width * r.height / 18000);
    const count = Math.max(24, Math.min(base, 120));
    const spdMul = (SPEED[season] || 1.0) * speed;

    buildParticles(count, straightDown, spdMul);
    raf = requestAnimationFrame(step);
  }

  function clear(){
    cancelAnimationFrame(raf);
    raf = 0;
    particles = [];
    if (ctx){
      const r = host?.getBoundingClientRect?.() || {width:0,height:0};
      ctx.clearRect(0,0,r.width,r.height);
    }
  }

  // public API
  window.SeasonFX = { play, clear };
})();

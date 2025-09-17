// ================ Season FX (singleton) ================
(() => {
  const ICONS = {
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const SPEED = { spring: 1.1, summer: 1.6, autumn: 1.3, winter: 1.0 }; // nhanh chậm khác nhau
  let raf = null, canvas, ctx, particles = [], host = null, active = null;

  function makeCanvas(container){
    canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    Object.assign(canvas.style,{
      position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none"
    });
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize(); window.addEventListener("resize", resize);
  }
  function resize(){
    if(!canvas) return;
    const {width, height} = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function buildParticles(icon, speedMul){
    const count = Math.round((canvas.width / window.devicePixelRatio) / 9); // mật độ vừa phải
    particles = Array.from({length: count}, () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        vy: (40 + Math.random()*60) * speedMul,     // rơi thẳng xuống
        size: 14 + Math.random()*14,
        rot: Math.random() * Math.PI*2,
        icon
      };
    });
  }

  function loadIcon(url){
    return new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url;
    });
  }

  function step(now){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const h = canvas.height;
    particles.forEach(p => {
      p.y += p.vy * 0.016;   // ~60fps
      if(p.y > h + 40){ p.y = -40; p.x = Math.random()*canvas.width; }
      p.rot += 0.02;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * 0.05); // nhẹ nhàng thôi
      const s = p.size;
      ctx.drawImage(p.icon, -s/2, -s/2, s, s);
      ctx.restore();
    });
    raf = requestAnimationFrame(step);
  }

  async function startSeasonEffect(season, container){
    stopSeasonEffect();
    if(!container || season === "home") return;

    host = container;
    if(!canvas) makeCanvas(host);

    const icon = await loadIcon(ICONS[season]);
    buildParticles(icon, SPEED[season] || 1.2);
    raf = requestAnimationFrame(step);
    active = season;
  }

  function stopSeasonEffect(){
    if(raf) cancelAnimationFrame(raf);
    raf = null; particles = []; active = null;
    if(ctx) ctx.clearRect(0,0,canvas?.width||0,canvas?.height||0);
  }

  // expose
  window.startSeasonEffect = startSeasonEffect;
  window.stopSeasonEffect  = stopSeasonEffect;
})();

/* NiNi — nhẹ nhàng: rơi bông tuyết/lá/hoa theo mùa (có thể tắt khi không cần) */
(() => {
  const icons = {
    home: "",
    spring: "/public/assets/icons/flower.webp",
    summer: "/public/assets/icons/drop.webp",
    autumn: "/public/assets/icons/leaf.webp",
    winter: "/public/assets/icons/snow.webp",
  };

  const frame = document.getElementById("frame");
  if (!frame) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  Object.assign(canvas.style, {
    position:"absolute", inset:"0", pointerEvents:"none"
  });
  frame.appendChild(canvas);

  let W=0,H=0,dpr=1; let particles=[]; let iconImg = new Image(), iconReady=false;
  let currentSeason = "home";

  function resize(){
    const rect = frame.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = canvas.width  = Math.floor(rect.width * dpr);
    H = canvas.height = Math.floor(rect.height* dpr);
    canvas.style.width  = rect.width+"px";
    canvas.style.height = rect.height+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); addEventListener("resize", resize);

  function loadIcon(url){
    iconReady = false; iconImg = new Image();
    iconImg.onload = ()=> iconReady = true;
    iconImg.src = url;
  }

  function setSeasonIcon() {
  const s = (location.hash || "").replace(/^#\/?/, "") || "home";
  currentSeason = s;

  const url = icons[s];
  if (url) {
    // có mùa -> bật icon
    loadIcon(url);
    iconReady = true;
  } else {
    // home -> tắt hoàn toàn
    iconReady = false;
    particles = [];
    ctx.clearRect(0, 0, W, H);
  }
}

addEventListener("hashchange", setSeasonIcon);

  function buildParticles(){
    const count = 18;
    particles = Array.from({length: count}, () => ({
      x: Math.random()*W, y: Math.random()*-H,
      vy: 0.6 + Math.random()*0.8,
      vx: -0.2 + Math.random()*0.4,
      size: 14 + Math.random()*10,
      rot: Math.random()*Math.PI*2,
      vr: -0.02 + Math.random()*0.04,
    }));
  }
// gọi lần đầu khi tải
setSeasonIcon();
buildParticles();

// khi đổi hash -> đổi icon + reset particles
addEventListener("hashchange", () => {
  setSeasonIcon();
  buildParticles();
});

  function step(){
    ctx.clearRect(0,0,W,H);
    if (iconReady){
      particles.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random()*W; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(iconImg, -p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      });
    }
    requestAnimationFrame(step);
  }
  step();
})();







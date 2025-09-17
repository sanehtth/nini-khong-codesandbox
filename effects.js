// icons webp cho từng mùa
const ICONS = {
  spring: '/public/assets/icons/flower.webp',
  summer: '/public/assets/icons/drop.webp',
  autumn: '/public/assets/icons/leaf.webp',
  winter: '/public/assets/icons/snow.webp',
};

let fxCtx, w, h, particles = [], iconImg = new Image(), animId;

function makeParticle(type){
  const size = (type==='summer') ? rand(10,18) : rand(12,22);
  const speed = (type==='summer') ? rand(140,200) : rand(70,120); // px/s
  return {
    x: Math.random() * w,
    y: -size,
    vy: speed,         // rơi thẳng
    size,
    rot: Math.random()*Math.PI*2,
    rotSpeed: rand(-0.8, 0.8),
  };
}
function rand(a,b){ return a + Math.random()*(b-a); }

function step(last){
  const now = performance.now();
  const dt = (now - last) / 1000;
  fxCtx.clearRect(0,0,w,h);
  // vẽ
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.y += p.vy * dt;
    p.rot += p.rotSpeed * dt;
    if(p.y > h + 30){ particles.splice(i,1); continue; }

    fxCtx.save();
    fxCtx.translate(p.x, p.y);
    fxCtx.rotate(p.rot);
    fxCtx.drawImage(iconImg, -p.size/2, -p.size/2, p.size, p.size);
    fxCtx.restore();
  }
  // bổ sung hạt để đủ mật độ
  while(particles.length < targetCount) particles.push(makeParticle(currentSeason));
  animId = requestAnimationFrame(()=>step(now));
}

let currentSeason = 'spring';
let targetCount = 80;

export function startSeasonEffect(canvas, season='spring'){
  if(animId) cancelAnimationFrame(animId);
  fxCtx = canvas.getContext('2d');
  // resize
  const resize = ()=>{
    w = canvas.width  = canvas.clientWidth  * devicePixelRatio;
    h = canvas.height = canvas.clientHeight * devicePixelRatio;
    fxCtx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  // cấu hình theo mùa
  currentSeason = season;
  targetCount = (season==='summer') ? 110 : (season==='winter' ? 90 : 80);
  iconImg.src = ICONS[season] || ICONS.spring;
  particles = [];
  for(let i=0;i<targetCount;i++){
    const p = makeParticle(season); p.y = Math.random()*h; particles.push(p);
  }
  step(performance.now());
}
// nếu không dùng module, bỏ export và gán global:
window.startSeasonEffect = startSeasonEffect;

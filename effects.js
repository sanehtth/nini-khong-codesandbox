/* =========================================================
   Seasonal FX — chỉ vẽ trong #fx, không đè lên menu/nút
   Các hàm chỉnh tốc độ/số lượng:
   - petalsSlow(): hoa rơi chậm (home/spring)
   - rainVertical(): mưa rơi thẳng, nhanh (summer)
   - leavesFall(): lá rơi chậm, lắc nhẹ (autumn)
   - snowSoft(): tuyết mềm, chậm (winter)
   Đổi count / vận tốc vy/vx để nhiều/ít & nhanh/chậm.
========================================================= */

let fxRAF = 0;
function clearFX(){
  cancelAnimationFrame(fxRAF);
  const fx = document.getElementById('fx');
  if (fx) fx.innerHTML = '';
}

function particleFactory(opts){
  const fx = document.getElementById('fx');
  if (!fx) return { stop:()=>{} };

  const {
    count = 80,
    makeEl = ()=>document.createElement('div'),
    init = (el)=>{},
    step = (el,dt)=>{},
    maxFPS = 60
  } = opts;

  const els = Array.from({length:count}, () => {
    const el = makeEl();
    el.style.position='absolute';
    init(el);
    fx.appendChild(el);
    return el;
  });

  let last = performance.now();
  const minDt = 1000/maxFPS;

  function loop(now){
    const dt = now - last;
    if (dt >= minDt){
      els.forEach(el => step(el, dt/1000));
      last = now;
    }
    fxRAF = requestAnimationFrame(loop);
  }
  fxRAF = requestAnimationFrame(loop);
  return { stop: clearFX };
}

/* =============== SPRING / HOME: Hoa rơi chậm =============== */
function petalsSlow(){
  return particleFactory({
    count: 90, // NOTE: tăng/giảm số hoa
    makeEl(){
      const el = document.createElement('span');
      el.textContent='❀'; el.style.fontSize = (12+Math.random()*8)+'px';
      el.style.filter='drop-shadow(0 0 2px rgba(255,255,255,.6))';
      return el;
    },
    init(el){
      el.style.left = (Math.random()*100)+'%';
      el.style.top  = (-10 - Math.random()*30) + '%';
      el.dataset.vx = (Math.random()*.5 - .25);   // lắc ngang nhẹ
      el.dataset.vy = (15 + Math.random()*20);    // rơi chậm (đổi tại đây)
      el.dataset.rot= Math.random()*360;
    },
    step(el,dt){
      let x = parseFloat(el.style.left) || 0;
      let y = parseFloat(el.style.top)  || -10;
      const vx = +el.dataset.vx, vy = +el.dataset.vy;

      x += vx * dt * 10;
      y += vy * dt;

      el.dataset.rot = (+el.dataset.rot + 40*dt) % 360;
      el.style.transform = `rotate(${el.dataset.rot}deg)`;
      el.style.left = x + '%';
      el.style.top  = y + '%';

      if (y > 105){
        el.style.left = (Math.random()*100)+'%';
        el.style.top  = '-12%';
      }
    }
  });
}

/* =============== SUMMER: Mưa thẳng, nhanh =============== */
function rainVertical(){
  return particleFactory({
    count: 160, // NOTE: tăng/giảm số hạt mưa
    makeEl(){
      const el = document.createElement('i');
      el.style.width='1px'; el.style.height=(12+Math.random()*18)+'px';
      el.style.background='rgba(180,220,255,.7)';
      el.style.borderRadius='1px';
      return el;
    },
    init(el){
      el.style.left = (Math.random()*100)+'%';
      el.style.top  = (Math.random()*-100)+'%';
      el.dataset.vy = 250 + Math.random()*220; // nhanh hơn = số lớn
    },
    step(el,dt){
      let y = parseFloat(el.style.top) || -50;
      y += (+el.dataset.vy) * dt / 100; // đổi px/s -> %
      el.style.top = y + '%';
      if (y > 105) el.style.top = (-10 - Math.random()*50)+'%';
    }
  });
}

/* =============== AUTUMN: Lá rơi chậm, drift =============== */
function leavesFall(){
  return particleFactory({
    count: 90,
    makeEl(){
      const el = document.createElement('span');
      el.textContent = ['🍁','🍂'][Math.random()*2|0];
      el.style.fontSize = (14+Math.random()*10)+'px';
      return el;
    },
    init(el){
      el.style.left = (Math.random()*100)+'%';
      el.style.top  = (-10 - Math.random()*20) + '%';
      el.dataset.vx = (Math.random()*.8 - .4);
      el.dataset.vy = 20 + Math.random()*18;
    },
    step(el,dt){
      let x = parseFloat(el.style.left) || 0;
      let y = parseFloat(el.style.top)  || -10;
      x += (+el.dataset.vx) * dt * 10;
      y += (+el.dataset.vy) * dt;
      el.style.left = x + '%';
      el.style.top  = y + '%';
      if (y > 105){
        el.style.left = (Math.random()*100)+'%';
        el.style.top  = '-12%';
      }
    }
  });
}

/* =============== WINTER: Tuyết mềm, chậm =============== */
function snowSoft(){
  return particleFactory({
    count: 120,
    makeEl(){
      const el = document.createElement('b');
      el.style.width=el.style.height=(2+Math.random()*3)+'px';
      el.style.borderRadius='50%';
      el.style.background='rgba(255,255,255,.9)';
      el.style.boxShadow='0 0 6px rgba(255,255,255,.6)';
      return el;
    },
    init(el){
      el.style.left = (Math.random()*100)+'%';
      el.style.top  = (-10 - Math.random()*30)+'%';
      el.dataset.vx = (Math.random()*.6 - .3);
      el.dataset.vy = 10 + Math.random()*12;  // CHẬM
    },
    step(el,dt){
      let x = parseFloat(el.style.left) || 0;
      let y = parseFloat(el.style.top)  || -10;
      x += (+el.dataset.vx) * dt * 10;
      y += (+el.dataset.vy) * dt;
      el.style.left = x + '%';
      el.style.top  = y + '%';
      if (y > 105){
        el.style.left = (Math.random()*100)+'%';
        el.style.top  = '-12%';
      }
    }
  });
}

/* =============== Công tắc theo mùa =============== */
function initSeasonFX(season){
  clearFX();
  const map = {
    home:   petalsSlow,
    spring: petalsSlow,
    summer: rainVertical,
    autumn: leavesFall,
    winter: snowSoft
  };
  (map[season] || petalsSlow)();
}

// Cho phép dùng ở file HTML
window.initSeasonFX = initSeasonFX;

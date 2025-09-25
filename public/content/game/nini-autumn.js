/* nini-funny — ENGLISH LEARNING (Autumn) — COMPAT v3 (ES5-safe) */
(function () {
  'use strict';

  // ---- tiny helpers
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function fmt(n){ return new Intl.NumberFormat().format(n|0); }
  function readJSON(key, fallback){
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function writeJSON(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

  var VERSION = 3;
  var STORAGE_KEYS = {
    ACCOUNTS: 'NINI_ACCOUNTS_V'+VERSION,
    ACTIVE:   'NINI_ACTIVE_USER_V'+VERSION
  };

  // ---- data
  var TOPICS = [
    { id:'farm',   name:'Farm',   costCoins:300, needXP:0,   icon:'🌾',
      categories:[
        { id:'vocab', name:'Luyen tu', games:['farm-qa','farm-match','farm-delivery'] },
        { id:'sent',  name:'Luyen cau', games:[] },
        { id:'read',  name:'Luyen doc', games:[] },
        { id:'listen',name:'Luyen nghe', games:[] }
      ]},
    { id:'school', name:'School', costCoins:500, needXP:200, icon:'🏫',
      categories:[{ id:'vocab', name:'Luyen tu', games:[] },{ id:'sent', name:'Luyen cau', games:[] }]},
    { id:'market', name:'Market', costCoins:800, needXP:450, icon:'🛒',
      categories:[{ id:'vocab', name:'Luyen tu', games:[] }]}
  ];

  function DEFAULT_PROFILE(name){
    return {
      name: name || 'Player',
      xp: 0, coins: 300,
      createdAt: Date.now(), lastSave: Date.now(),
      unlocked: { topics:{}, categories:{} }
    };
  }

  // ---- state
  var accounts = readJSON(STORAGE_KEYS.ACCOUNTS, {});
  var activeId = readJSON(STORAGE_KEYS.ACTIVE, null);

  function setActive(id){ activeId = id; writeJSON(STORAGE_KEYS.ACTIVE, id); renderAll(); }
  function getActive(){ return accounts[activeId]; }
  function saveActive(){ var p=getActive(); if(!p) return; p.lastSave=Date.now(); writeJSON(STORAGE_KEYS.ACCOUNTS, accounts); updateHUD(); }

  if (!Object.keys) { Object.keys = function(o){ var a=[],k; for(k in o) if(o.hasOwnProperty(k)) a.push(k); return a; }; }

  var NiniApp = window.NiniApp = {
    profile: function(){ var p=getActive(); return p ? JSON.parse(JSON.stringify(p)) : {}; },
    addXP: function(n){ var p=getActive(); if(!p) return; p.xp = clamp(p.xp + (n|0), 0, 1e9); saveActive(); },
    addCoins: function(n){ var p=getActive(); if(!p) return; p.coins = clamp(p.coins + (n|0), 0, 1e9); saveActive(); },
    spendCoins: function(n){ var p=getActive(); if(!p) return false; n=Math.abs(n|0); if(p.coins<n) return false; p.coins-=n; saveActive(); return true; },
    unlockTopic: function(id){ var p=getActive(); if(!p) return false; p.unlocked.topics[id]=true; saveActive(); return true; },
    reset: function(){ if(!activeId) return; accounts[activeId]=DEFAULT_PROFILE(accounts[activeId].name); saveActive(); },
    switch: function(id){ if(accounts[id]) setActive(id); },
    create: function(name){ var id='u'+Math.random().toString(36).slice(2,10); accounts[id]=DEFAULT_PROFILE(name||'Player'); writeJSON(STORAGE_KEYS.ACCOUNTS, accounts); setActive(id); return id; },
    list: function(){ var out=[],k; for(k in accounts){ if(accounts.hasOwnProperty(k)){ var p=accounts[k]; out.push({id:k,name:p.name,xp:p.xp,coins:p.coins}); } } return out; },
    debugCreate: function(name){ if(Object.keys(accounts).length===0){ this.create(name||'Player'); } }
  };

  if (Object.keys(accounts).length===0){ NiniApp.create('Player 1'); }
  if (!activeId){ setActive(Object.keys(accounts)[0]); }

  // ---- styles (no template literals to avoid stray tokens)
  var css = [
    '.nini,.nini *{box-sizing:border-box}',
    '.nini{--bg:#0f0f0f;--panel:#151515;--muted:#9aa0a6;--fg:#eaeaea;--accent:#ffb703;--accent2:#a3e635;--ok:#10b981;--bad:#ef4444;color:var(--fg);font-family:system-ui,ui-sans-serif,Segoe UI,Roboto,Helvetica,Arial,sans-serif}',
    '.nini .card{background:var(--panel);border:1px solid #262626;border-radius:14px;padding:14px;box-shadow:0 6px 20px rgba(0,0,0,.35)}',
    '.nini .row{display:flex;align-items:center;gap:10px}',
    '.nini .col{display:flex;flex-direction:column;gap:10px}',
    '.nini .grid{display:grid;gap:10px}',
    '.nini .grid.g2{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.nini .btn{appearance:none;border:1px solid #333;background:#1b1b1b;color:var(--fg);padding:8px 12px;border-radius:10px;cursor:pointer}',
    '.nini .btn:hover{background:#222}',
    '.nini .pill{background:#1b1b1b;border:1px solid #2a2a2a;padding:6px 10px;border-radius:999px;display:inline-flex;gap:6px;align-items:center}',
    '.nini .hud{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-weight:600}',
    '.nini .title{font-size:18px;font-weight:700}',
    '.nini .tiny{font-size:12px;color:var(--muted)}',
    '.nini .panel{padding:10px;border:1px dashed #333;border-radius:12px}',
    '.nini .scene{position:relative;height:260px;border-radius:12px;overflow:hidden;border:1px solid #2b364d;background:linear-gradient(180deg,#0b1220,#111)}',
    '.nini .obj{position:absolute;padding:6px 8px;border-radius:10px;background:#243b53;border:1px solid #355070;cursor:pointer;user-select:none}',
    '.nini .dropzone{min-height:42px;border:2px dashed #394;border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center}',
    '.nini .chip{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#263238;border:1px solid #3a4a54;cursor:grab;user-select:none}',
    '.nini .bag{display:flex;gap:8px;flex-wrap:wrap}',
    '.nini .npc{padding:8px;border-radius:12px;border:1px solid #3a2b18;background:linear-gradient(180deg,#1a1209,#100a04)}'
  ].join('\n');
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  // ---- HUD & App
  function renderHUD(){
    var root = document.getElementById('nini-hud'); if(!root) return;
    var p = getActive(); root.classList.add('nini');
    root.innerHTML =
      '<div class="card hud">'+
        '<span class="pill">User <b>'+p.name+'</b></span>'+
        '<span class="pill">XP <b id="hud-xp">'+fmt(p.xp)+'</b></span>'+
        '<span class="pill">Coins <b id="hud-coins">'+fmt(p.coins)+'</b></span>'+
        '<button class="btn" id="hud-switch">Switch</button>'+
        '<button class="btn" id="hud-reset">Reset</button>'+
      '</div>';
    var rs = root.querySelector('#hud-reset');
    var sw = root.querySelector('#hud-switch');
    if (rs) rs.addEventListener('click', function(){ if(confirm('Reset current progress?')) NiniApp.reset(); });
    if (sw) sw.addEventListener('click', function(){
      var name = prompt('New player name (create) — or leave blank to pick an ID:');
      if(name){ NiniApp.create(name); }
      else {
        var list = NiniApp.list().map(function(u){ return u.id+':'+u.name; }).join('\n');
        var pick = prompt('Enter account ID:\n'+list);
        if(pick && accounts[pick]) NiniApp.switch(pick);
      }
    });
  }
  function updateHUD(){
    var p=getActive();
    var xp=document.getElementById('hud-xp');
    var c=document.getElementById('hud-coins');
    if(xp) xp.textContent=fmt(p.xp);
    if(c) c.textContent=fmt(p.coins);
  }

  function renderApp(){
    var root = document.getElementById('nini-app'); if(!root) return;
    root.classList.add('nini'); root.innerHTML = '';

    var topics = document.createElement('div'); topics.className='card';
    topics.innerHTML = '<div class="title">Chu de</div><div class="tiny">Mo khoa bang Coins & XP</div>';
    var grid = document.createElement('div'); grid.className='grid g2'; topics.appendChild(grid);

    for (var i=0;i<TOPICS.length;i++){
      (function(t){
        var p = getActive(); var unlocked = !!(p.unlocked.topics[t.id]);
        var box = document.createElement('div'); box.className='panel';
        box.innerHTML =
          '<div class="row" style="justify-content:space-between">'+
            '<div class="row"><div style="font-size:22px">'+t.icon+'</div>'+
              '<div><div class="title">'+t.name+'</div><div class="tiny">Yeu cau: '+t.costCoins+' coins, '+t.needXP+' XP</div></div>'+
            '</div>'+
            '<div>'+(unlocked?'<span class="pill">Da mo</span>':'<button class="btn" data-open="'+t.id+'">Mo</button>')+'</div>'+
          '</div>'+
          (unlocked?'<div class="tiny">Da mo • Chon muc luyen de choi</div>':'');
        grid.appendChild(box);
        if(!unlocked){
          var btn = box.querySelector('[data-open]');
          if(btn) btn.addEventListener('click', function(){
            var p=getActive();
            if(p.coins < t.costCoins){ toast('Chua du coins'); return; }
            if(p.xp < t.needXP){ toast('Chua du XP'); return; }
            if(NiniApp.spendCoins(t.costCoins)){ NiniApp.unlockTopic(t.id); toast('Da mo '+t.name+'!'); renderAll(); }
          });
        } else {
          var catWrap = document.createElement('div'); catWrap.className='row'; catWrap.style.flexWrap='wrap'; catWrap.style.marginTop='8px';
          for (var j=0;j<t.categories.length;j++){
            (function(c){
              var b=document.createElement('button'); b.className='btn'; b.textContent=c.name;
              b.addEventListener('click', function(){ openTopicGame(t, c); });
              catWrap.appendChild(b);
            })(t.categories[j]);
          }
          box.appendChild(catWrap);
        }
      })(TOPICS[i]);
    }

    root.appendChild(topics);
    var play = document.createElement('div'); play.id='nini-play'; play.style.marginTop='12px'; root.appendChild(play);
  }

  function openTopicGame(topic, category){
    var mount = document.getElementById('nini-play'); mount.innerHTML='';
    var card = document.createElement('div'); card.className='card';
    card.innerHTML =
      '<div class="row" style="justify-content:space-between">'+
        '<div class="title">'+topic.icon+' '+topic.name+' — '+category.name+'</div>'+
        '<button class="btn" id="back">← Back</button>'+
      '</div>';
    mount.appendChild(card);
    var back = card.querySelector('#back'); if(back) back.addEventListener('click', renderAll);

    var wrap = document.createElement('div'); wrap.className='row'; wrap.style.flexWrap='wrap'; wrap.style.marginTop='10px'; card.appendChild(wrap);
    for (var i=0;i<category.games.length;i++){
      var gid = category.games[i], meta = REGISTRY[gid] && REGISTRY[gid].meta || {title:gid};
      (function(gid, meta){
        var b=document.createElement('button'); b.className='btn'; b.textContent=meta.title;
        b.addEventListener('click', function(){ startGame(gid); });
        wrap.appendChild(b);
      })(gid, meta);
    }
  }

  function startGame(id){
    var play = document.getElementById('nini-play'); play.innerHTML='';
    var fn = REGISTRY[id]; if(!fn){ play.innerHTML = '<div class="nini card">Khong tim thay game: '+id+'</div>'; return; }
    var shell = document.createElement('div'); shell.className='card'; play.appendChild(shell);
    var unmount = fn(shell); shell.__unmount = unmount;
  }

  function renderAll(){ renderHUD(); renderApp(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else { renderAll(); }

  // ---- toast
  var toastEl;
  function toast(msg){
    if(!toastEl){
      toastEl = document.createElement('div'); toastEl.className='nini card';
      toastEl.style.position='fixed'; toastEl.style.bottom='16px'; toastEl.style.left='50%';
      toastEl.style.transform='translateX(-50%)'; toastEl.style.zIndex='9999';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.style.opacity='1';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function(){ toastEl.style.opacity='0'; }, 1500);
  }

  // ---- game registry
  var REGISTRY = {};
  function register(id, fn, meta){ REGISTRY[id]=fn; REGISTRY[id].meta = meta || {}; }

  // ===== FARM — Game 1: Q&A click objects =====
  register('farm-qa', function(root){
    var REWARD = { correct:{xp:5, coins:5}, finish:{xp:20, coins:20} };
    var QUESTIONS = [
      { en:'Where is the carrot?', vi:'Ca rot o dau?', target:'carrot' },
      { en:'Find the chicken.', vi:'Tim con ga.', target:'chicken' },
      { en:'Where is the cow?', vi:'Con bo o dau?', target:'cow' },
      { en:'Click the barn.', vi:'Bam vao chuong trai.', target:'barn' },
      { en:'Where is the farmer?', vi:'Nguoi nong dan o dau?', target:'farmer' },
      { en:'Find the sheep.', vi:'Tim con cuu.', target:'sheep' }
    ];
    var html =
      '<div class="row" style="justify-content:space-between"><div class="title">Farm Q&A</div><div class="tiny">5–10 cau · Click dung do vat</div></div>'+
      '<div class="tiny">EN→VI: doc cau TA va bam doi tuong dung</div>'+
      '<div class="scene" id="scene"></div>'+
      '<div class="row" style="justify-content:space-between;margin-top:8px">'+
        '<div>❓ <b id="qtext"></b> <span class="tiny" id="qsub"></span></div>'+
        '<div>✅ <b id="score">0</b></div>'+
      '</div>'+
      '<div class="row" style="margin-top:8px"><button class="btn" id="start">Start</button><button class="btn" id="next" disabled>Next</button></div>';
    root.innerHTML = html;

    var scene = root.querySelector('#scene');
    var qEl = root.querySelector('#qtext');
    var sub = root.querySelector('#qsub');
    var score = root.querySelector('#score');
    var objects = [
      {id:'carrot',  label:'carrot',  x:40,  y:190},
      {id:'chicken', label:'chicken', x:200, y:170},
      {id:'cow',     label:'cow',     x:120, y:120},
      {id:'barn',    label:'barn',    x:260, y:80},
      {id:'farmer',  label:'farmer',  x:20,  y:80},
      {id:'sheep',   label:'sheep',   x:300, y:160}
    ];
    for (var i=0;i<objects.length;i++){
      var o=objects[i], el=document.createElement('div');
      el.className='obj'; el.style.left=o.x+'px'; el.style.top=o.y+'px'; el.textContent=o.label; el.setAttribute('data-id', o.id);
      scene.appendChild(el);
    }

    var idx=0, corrects=0;
    function showQuestion(){
      var q=QUESTIONS[idx]; qEl.textContent=q.en; sub.textContent='— '+q.vi;
      var nodes = root.querySelectorAll('.obj');
      for (var k=0;k<nodes.length;k++){
        (function(el){
          el.onclick = function(){
            if (el.getAttribute('data-id')===q.target){
              corrects++; score.textContent=String(corrects);
              NiniApp.addXP(REWARD.correct.xp); NiniApp.addCoins(REWARD.correct.coins);
              toast('Dung! +'+REWARD.correct.xp+' XP, +'+REWARD.correct.coins+' coins');
              root.querySelector('#next').disabled=false;
            } else {
              toast('Sai roi! Thu cau khac'); root.querySelector('#next').disabled=false;
            }
          };
        })(nodes[k]);
      }
    }

    root.querySelector('#start').addEventListener('click', function(){
      idx=0; corrects=0; score.textContent='0'; root.querySelector('#next').disabled=true; showQuestion();
    });
    root.querySelector('#next').addEventListener('click', function(){
      idx++; if(idx>=6){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoan thanh! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins'); return; }
      root.querySelector('#next').disabled=true; showQuestion();
    });

    return function(){};
  }, { title:'Farm Q&A (click dung vat)' });

  // ===== FARM — Game 2: Match (drag image → word) =====
  register('farm-match', function(root){
    var REWARD = { each:{xp:4, coins:4}, finish:{xp:15, coins:15} };
    var PAIRS = [
      { id:'carrot', word:'carrot', label:'🥕' },
      { id:'chicken', word:'chicken', label:'🐔' },
      { id:'cow', word:'cow', label:'🐄' },
      { id:'sheep', word:'sheep', label:'🐑' },
      { id:'barn', word:'barn', label:'🏚️' }
    ];
    root.innerHTML =
      '<div class="row" style="justify-content:space-between"><div class="title">Match — Image → Word</div><div class="tiny">Keo bieu tuong vao tu</div></div>'+
      '<div class="grid g2" id="wrap" style="margin-top:8px"></div>'+
      '<div class="row" style="margin-top:8px"><div>✅ <b id="done">0</b>/<span id="total"></span></div></div>';
    root.querySelector('#total').textContent = String(PAIRS.length);
    var wrap = root.querySelector('#wrap');
    var bag = document.createElement('div'); bag.className='panel'; bag.innerHTML = '<div class="tiny">Tui do</div><div class="bag" id="bag"></div>';
    var targets = document.createElement('div'); targets.className='panel'; targets.innerHTML = '<div class="tiny">Tha vao tu dung</div>';
    wrap.appendChild(bag); wrap.appendChild(targets);
    var bagBox = bag.querySelector('#bag');

    for (var i=0;i<PAIRS.length;i++){
      (function(p){
        var chip=document.createElement('div'); chip.className='chip'; chip.textContent=p.label+' '+p.word; chip.draggable=true; chip.setAttribute('data-id', p.id);
        chip.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', p.id); });
        bagBox.appendChild(chip);
      })(PAIRS[i]);
    }

    var shuffled = PAIRS.slice().sort(function(){ return Math.random()-0.5; });
    for (var j=0;j<shuffled.length;j++){
      (function(p){
        var dz=document.createElement('div'); dz.className='dropzone'; dz.textContent=p.word.toUpperCase(); dz.setAttribute('data-id', p.id);
        dz.addEventListener('dragover', function(e){ e.preventDefault(); });
        dz.addEventListener('drop', function(e){
          e.preventDefault(); var id=e.dataTransfer.getData('text/plain'); if(!id) return;
          if(id===p.id){ dz.textContent='✔ '+p.word; dz.style.borderColor='#2e7d32'; dz.style.opacity='0.8'; NiniApp.addXP(REWARD.each.xp); NiniApp.addCoins(REWARD.each.coins); toast('Dung! +'+REWARD.each.xp+' XP, +'+REWARD.each.coins+' coins'); done++; updateDone(); dz.style.pointerEvents='none'; }
          else { toast('Sai vi tri, thu lai!'); }
        });
        targets.appendChild(dz);
      })(shuffled[j]);
    }

    var done=0;
    function updateDone(){
      root.querySelector('#done').textContent=String(done);
      if(done>=PAIRS.length){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoan thanh! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins'); }
    }
    return function(){};
  }, { title:'Match (keo hinh → tu)' });

  // ===== FARM — Game 3: Delivery =====
  register('farm-delivery', function(root){
    var REWARD = { each:{xp:6, coins:6}, finish:{xp:20, coins:30} };
    var REQUESTS = [
      { npc:'Farmer', need:'hoe' },
      { npc:'Farmer', need:'carrot' },
      { npc:'Kid',    need:'milk' },
      { npc:'Dog',    need:'bone' }
    ];
    var INVENTORY = [
      { id:'carrot', label:'carrot' },
      { id:'hoe',    label:'hoe' },
      { id:'milk',   label:'milk' },
      { id:'bone',   label:'bone' }
    ];
    root.innerHTML =
      '<div class="row" style="justify-content:space-between"><div class="title">Delivery</div><div class="tiny">Keo do toi dung nguoi can</div></div>'+
      '<div class="grid g2" style="margin-top:8px">'+
        '<div class="panel"><div class="tiny">Yeu cau</div><div id="req" class="col"></div></div>'+
        '<div class="panel"><div class="tiny">Tui do</div><div id="inv" class="bag"></div></div>'+
      '</div>'+
      '<div class="row" style="margin-top:8px"><div>✅ <b id="d">0</b>/<span id="t"></span></div></div>';
    root.querySelector('#t').textContent = String(REQUESTS.length);
    var req = root.querySelector('#req'); var inv = root.querySelector('#inv');

    for (var i=0;i+0<REQUESTS.length;i++){
      (function(r){
        var n=document.createElement('div'); n.className='npc dropzone'; n.textContent=r.npc+' — need: '+r.need; n.setAttribute('data-need', r.need);
        n.addEventListener('dragover', function(e){ e.preventDefault(); });
        n.addEventListener('drop', function(e){
          e.preventDefault(); var id=e.dataTransfer.getData('text/plain'); if(!id) return;
          if(id===r.need){ n.textContent=r.npc+' — ✔ '+r.need; n.style.borderColor='#2e7d32'; n.style.opacity='0.9'; done++; NiniApp.addXP(REWARD.each.xp); NiniApp.addCoins(REWARD.each.coins); toast('Giao dung! +'+REWARD.each.xp+' XP, +'+REWARD.each.coins+' coins'); updateDone(); n.style.pointerEvents='none'; }
          else { toast('Sai nguoi!'); }
        });
        req.appendChild(n);
      })(REQUESTS[i]);
    }

    for (var j=0;j<INVENTORY.length;j++){
      (function(it){
        var c=document.createElement('div'); c.className='chip'; c.textContent=it.label; c.draggable=true; c.setAttribute('data-id', it.id);
        c.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', it.id); });
        inv.appendChild(c);
      })(INVENTORY[j]);
    }

    var done=0;
    function updateDone(){
      root.querySelector('#d').textContent=String(done);
      if(done>=REQUESTS.length){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoan thanh! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins'); }
    }
    return function(){};
  }, { title:'Delivery (giao do dung nguoi)' });

})();

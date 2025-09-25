/*
  nini-funny — ENGLISH LEARNING (Autumn)
  -------------------------------------------------
  Drop-in JavaScript that works on a pure HTML+CSS site.
  - Accounts (local-only), starting coins = 300.
  - Topics with unlock costs/requirements (Farm first, then School, ...).
  - Inside each Topic are categories (Vocabulary/Sentences/Reading/Listening). This starter focuses on Vocabulary with 3 mini games:
      (1) Farm Q&A (click the right object in a scene)
      (2) Match Image → Word (drag & drop)
      (3) Delivery (drag item from bag to the correct NPC)
  - Shared XP/Coins across all mini games, persisted with localStorage.

  Usage (minimal):
    1) Save this file as /assets/js/nini-autumn.js and include on the Autumn tab/page:
         <script src="/assets/js/nini-autumn.js" defer></script>
    2) Add containers somewhere in the Autumn tab content:
         <div id="nini-hud"></div>
         <div id="nini-app"></div>
    3) (Optional) Pre-create an account via code: NiniApp.debugCreate('Minh')

  Notes:
  - This is a compact starter you can extend. No build tools, no frameworks.
  - All UI and logic are scoped under the .nini root to avoid style bleed.
*/

;(() => {
  const VERSION = 2
  const STORAGE_KEYS = {
    STATE: 'NINI_STATE_V' + VERSION,
    ACCOUNTS: 'NINI_ACCOUNTS_V' + VERSION,
    ACTIVE: 'NINI_ACTIVE_USER_V' + VERSION,
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
  const fmt = (n) => new Intl.NumberFormat().format(n|0)

  // ------------------------------
  // Data model
  // ------------------------------
  const TOPICS = [
    { id:'farm',   name:'Farm',   costCoins:300, needXP:0,   icon:'🌾',
      categories:[{ id:'vocab', name:'Luyện từ', games:['farm-qa','farm-match','farm-delivery'] },
                  { id:'sent',  name:'Luyện câu', games:[] },
                  { id:'read',  name:'Luyện đọc', games:[] },
                  { id:'listen',name:'Luyện nghe', games:[] }] },
    { id:'school', name:'School', costCoins:500, needXP:200, icon:'🏫',
      categories:[{ id:'vocab', name:'Luyện từ', games:[] },{ id:'sent', name:'Luyện câu', games:[] }] },
    { id:'market', name:'Market', costCoins:800, needXP:450, icon:'🛒', categories:[{id:'vocab',name:'Luyện từ',games:[]}] },
  ]

  const DEFAULT_PROFILE = (name='Player') => ({
    name, xp:0, coins:300, createdAt:Date.now(), lastSave:Date.now(),
    unlocked:{ topics:{}, categories:{} },
  })

  // ------------------------------
  // Storage & state
  // ------------------------------
  function readJSON(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch{ return fallback } }
  function writeJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)) }catch{} }

  let accounts = readJSON(STORAGE_KEYS.ACCOUNTS, {}) // id -> profile
  let activeId = readJSON(STORAGE_KEYS.ACTIVE, null)

  function uid(){ return 'u'+Math.random().toString(36).slice(2,10) }

  function setActive(id){ activeId = id; writeJSON(STORAGE_KEYS.ACTIVE, id); renderAll() }
  function getActive(){ return accounts[activeId] }
  function saveActive(){ const p=getActive(); if(!p) return; p.lastSave=Date.now(); writeJSON(STORAGE_KEYS.ACCOUNTS, accounts); updateHUD() }

  // Public API
  const NiniApp = (window.NiniApp = {
    get profile(){ return structuredClone(getActive() ?? {}) },
    addXP(n){ const p=getActive(); if(!p) return; p.xp = clamp(p.xp + (n|0), 0, 1e9); saveActive() },
    addCoins(n){ const p=getActive(); if(!p) return; p.coins = clamp(p.coins + (n|0), 0, 1e9); saveActive() },
    spendCoins(n){ const p=getActive(); if(!p) return false; n=Math.abs(n|0); if(p.coins<n) return false; p.coins-=n; saveActive(); return true },
    unlockTopic(id){ const p=getActive(); if(!p) return false; (p.unlocked.topics[id]=true); saveActive(); return true },
    reset(){ if(!activeId) return; accounts[activeId]=DEFAULT_PROFILE(accounts[activeId].name); saveActive() },
    switch(id){ if(accounts[id]) setActive(id) },
    create(name){ const id=uid(); accounts[id]=DEFAULT_PROFILE(name||'Player'); writeJSON(STORAGE_KEYS.ACCOUNTS, accounts); setActive(id); return id },
    list(){ return Object.entries(accounts).map(([id,p])=>({id,name:p.name,xp:p.xp,coins:p.coins})) },
    debugCreate(name='Minh'){ if(Object.keys(accounts).length===0){ this.create(name) } },
  })

  // Bootstrap default account if none
  if(Object.keys(accounts).length===0){ const id = NiniApp.create('Player 1'); setActive(id) }
  if(!activeId){ setActive(Object.keys(accounts)[0]) }

  // ------------------------------
  // Styles
  // ------------------------------
  const css = `
  .nini, .nini * { box-sizing:border-box }
  .nini { --bg:#0f0f0f; --panel:#151515; --muted:#9aa0a6; --fg:#eaeaea; --accent:#ffb703; --accent2:#a3e635; --ok:#10b981; --bad:#ef4444;
           color:var(--fg); font-family:system-ui, ui-sans-serif, Segoe UI, Roboto, Helvetica, Arial, sans-serif }
  .nini .card{ background:var(--panel); border:1px solid #262626; border-radius:14px; padding:14px; box-shadow:0 6px 20px rgba(0,0,0,.35) }
  .nini .row{ display:flex; align-items:center; gap:10px }
  .nini .col{ display:flex; flex-direction:column; gap:10px }
  .nini .grid{ display:grid; gap:10px }
  .nini .grid.g2{ grid-template-columns:repeat(2, minmax(0,1fr)) }
  .nini .btn{ appearance:none; border:1px solid #333; background:#1b1b1b; color:var(--fg); padding:8px 12px; border-radius:10px; cursor:pointer }
  .nini .btn:hover{ background:#222 }
  .nini .pill{ background:#1b1b1b; border:1px solid #2a2a2a; padding:6px 10px; border-radius:999px; display:inline-flex; gap:6px; align-items:center }
  .nini .hud{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-weight:600 }
  .nini .title{ font-size:18px; font-weight:700 }
  .nini .tiny{ font-size:12px; color:var(--muted) }
  .nini .panel{ padding:10px; border:1px dashed #333; border-radius:12px }
  .nini .scene{ position:relative; height:260px; border-radius:12px; overflow:hidden; border:1px solid #2b364d; background:linear-gradient(180deg,#0b1220,#111) }
  .nini .obj{ position:absolute; padding:6px 8px; border-radius:10px; background:#243b53; border:1px solid #355070; cursor:pointer; user-select:none }
  .nini .dropzone{ min-height:42px; border:2px dashed #394; border-radius:10px; padding:6px; display:flex; align-items:center; justify-content:center }
  .nini .chip{ display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; background:#263238; border:1px solid #3a4a54; cursor:grab; user-select:none }
  .nini .bag{ display:flex; gap:8px; flex-wrap:wrap }
  .nini .npc{ padding:8px; border-radius:12px; border:1px solid #3a2b18; background:linear-gradient(180deg,#1a1209,#100a04) }
  `
  const styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl)

  // ------------------------------
  // HUD & App shell
  // ------------------------------
  function renderHUD(){
    const root = document.getElementById('nini-hud'); if(!root) return
    root.classList.add('nini')
    const p = getActive()
    root.innerHTML = `
      <div class="card hud">
        <span class="pill">👤 <b>${p.name}</b></span>
        <span class="pill">🍂 XP <b id="hud-xp">${fmt(p.xp)}</b></span>
        <span class="pill">🪙 Coins <b id="hud-coins">${fmt(p.coins)}</b></span>
        <button class="btn" id="hud-switch">Đổi tài khoản</button>
        <button class="btn" id="hud-reset">Reset</button>
      </div>`
    root.querySelector('#hud-reset')?.addEventListener('click', ()=>{ if(confirm('Reset tiến trình của người chơi hiện tại?')) NiniApp.reset() })
    root.querySelector('#hud-switch')?.addEventListener('click', ()=>{
      const name = prompt('Tên người chơi mới (để tạo tài khoản) — hoặc để trống để chọn tài khoản cũ:')
      if(name){ NiniApp.create(name) } else {
        const list = NiniApp.list().map(u=>`${u.id}:${u.name}`).join('
')
        const pick = prompt('Nhập ID tài khoản muốn dùng:
'+list)
        if(pick && accounts[pick]) NiniApp.switch(pick)
      }
    })
  }
  function updateHUD(){ const p=getActive(); const xp=document.getElementById('hud-xp'); const c=document.getElementById('hud-coins'); if(xp) xp.textContent=fmt(p.xp); if(c) c.textContent=fmt(p.coins) }

  function renderApp(){
    const root = document.getElementById('nini-app'); if(!root) return
    root.classList.add('nini')
    root.innerHTML = ''

    // Topics list
    const topics = document.createElement('div'); topics.className = 'card'
    topics.innerHTML = `<div class="title">Chủ đề</div><div class="tiny">Mở khóa bằng Coins và XP. Chủ đề đầu tiên: Farm (300 coins).</div>`

    const grid = document.createElement('div'); grid.className='grid g2'; topics.appendChild(grid)

    TOPICS.forEach(t => {
      const p = getActive(); const unlocked = !!(p.unlocked.topics[t.id])
      const box = document.createElement('div'); box.className='panel'
      box.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div class="row"><div style="font-size:22px">${t.icon}</div><div><div class="title">${t.name}</div><div class="tiny">Yêu cầu: ${t.costCoins} coins, ${t.needXP} XP</div></div></div>
          <div>${unlocked?'<span class="pill">Đã mở</span>':`<button class="btn" data-open="${t.id}">Mở</button>`}</div>
        </div>
        ${unlocked?`<div class="tiny">Đã mở • Chọn mục luyện để chơi</div>`:''}
      `
      grid.appendChild(box)
      if(!unlocked){
        box.querySelector('[data-open]')?.addEventListener('click', ()=>{
          const p=getActive(); if(p.coins < t.costCoins){ toast('Chưa đủ coins') ; return }
          if(p.xp < t.needXP){ toast('Chưa đủ XP') ; return }
          if(NiniApp.spendCoins(t.costCoins)){ NiniApp.unlockTopic(t.id); toast('Đã mở '+t.name+'!') ; renderAll() }
        })
      } else {
        // render categories
        const catWrap = document.createElement('div'); catWrap.className='row'; catWrap.style.flexWrap='wrap'; catWrap.style.marginTop='8px'
        t.categories.forEach(c=>{
          const b = document.createElement('button'); b.className='btn'; b.textContent = `${c.name}`; b.addEventListener('click', ()=> openTopicGame(t, c))
          catWrap.appendChild(b)
        })
        box.appendChild(catWrap)
      }
    })

    root.appendChild(topics)

    // Where a game mounts
    const play = document.createElement('div'); play.id='nini-play'; play.style.marginTop='12px'; root.appendChild(play)
  }

  function openTopicGame(topic, category){
    const mount = document.getElementById('nini-play'); mount.innerHTML = ''
    const card = document.createElement('div'); card.className='card'
    card.innerHTML = `<div class="row" style="justify-content:space-between"><div class="title">${topic.icon} ${topic.name} — ${category.name}</div><button class="btn" id="back">← Quay lại</button></div>`
    mount.appendChild(card)
    card.querySelector('#back').addEventListener('click', renderAll)

    // list games
    const wrap = document.createElement('div'); wrap.className='row'; wrap.style.flexWrap='wrap'; wrap.style.marginTop='10px'; card.appendChild(wrap)
    category.games.forEach(gid=>{
      const meta = REGISTRY[gid]?.meta || {title:gid}
      const b = document.createElement('button'); b.className='btn'; b.textContent = meta.title
      b.addEventListener('click', ()=> startGame(gid))
      wrap.appendChild(b)
    })
  }

  function startGame(id){
    const play = document.getElementById('nini-play'); play.innerHTML = ''
    const fn = REGISTRY[id]; if(!fn){ play.innerHTML = `<div class="nini card">Không tìm thấy game: ${id}</div>`; return }
    const shell = document.createElement('div'); shell.className='card'; play.appendChild(shell)
    const unmount = fn(shell)
    shell.__unmount = unmount
  }

  function renderAll(){ renderHUD(); renderApp() }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', renderAll) } else { renderAll() }

  // ------------------------------
  // Toast helper
  // ------------------------------
  let toastEl
  function toast(msg){
    if(!toastEl){ toastEl = document.createElement('div'); toastEl.className='nini card'; Object.assign(toastEl.style,{position:'fixed',bottom:'16px',left:'50%',transform:'translateX(-50%)',zIndex:9999}); document.body.appendChild(toastEl) }
    toastEl.textContent = msg; toastEl.style.opacity='1'; clearTimeout(toastEl._t); toastEl._t = setTimeout(()=> toastEl.style.opacity='0', 1500)
  }

  // ------------------------------
  // Game Registry
  // ------------------------------
  const REGISTRY = {}
  function register(id, fn, meta){ REGISTRY[id]=fn; REGISTRY[id].meta = meta }

  // ------------------------------
  // FARM — Game 1: Q&A click objects in scene
  // ------------------------------
  register('farm-qa', (root)=>{
    const REWARD = { correct:{xp:5, coins:5}, finish:{xp:20, coins:20} }
    const QUESTIONS = [
      { en:'Where is the carrot?', vi:'Cà rốt ở đâu?', target:'carrot' },
      { en:'Find the chicken.', vi:'Tìm con gà.', target:'chicken' },
      { en:'Where is the cow?', vi:'Con bò ở đâu?', target:'cow' },
      { en:'Click the barn.', vi:'Bấm vào chuồng trại.', target:'barn' },
      { en:'Where is the farmer?', vi:'Người nông dân ở đâu?', target:'farmer' },
      { en:'Find the sheep.', vi:'Tìm con cừu.', target:'sheep' },
      { en:'Where is the carrot?', vi:'Cà rốt ở đâu?', target:'carrot' },
    ]

    let idx = 0, corrects = 0

    root.innerHTML = `
      <div class="row" style="justify-content:space-between"><div class="title">🍂 Farm Q&A</div><div class="tiny">5–10 câu · Click đúng đồ vật</div></div>
      <div class="tiny">EN → VI: đọc câu tiếng Anh và bấm đúng đối tượng</div>
      <div class="scene" id="scene"></div>
      <div class="row" style="justify-content:space-between;margin-top:8px">
        <div>❓ <b id="qtext"></b> <span class="tiny" id="qsub"></span></div>
        <div>✅ <b id="score">0</b></div>
      </div>
      <div class="row" style="margin-top:8px"><button class="btn" id="start">Start</button><button class="btn" id="next" disabled>Next</button></div>
    `

    const scene = root.querySelector('#scene')
    const qEl = root.querySelector('#qtext'); const sub = root.querySelector('#qsub'); const score = root.querySelector('#score');

    // simple scene objects (positions are illustrative)
    const objects = [
      {id:'carrot',  label:'🥕 carrot',  x:40,  y:190},
      {id:'chicken', label:'🐔 chicken', x:200, y:170},
      {id:'cow',     label:'🐄 cow',     x:120, y:120},
      {id:'barn',    label:'🏚️ barn',    x:260, y:80},
      {id:'farmer',  label:'👨‍🌾 farmer',x:20,  y:80},
      {id:'sheep',   label:'🐑 sheep',   x:300, y:160},
    ]
    objects.forEach(o=>{ const el=document.createElement('div'); el.className='obj'; el.style.left=o.x+'px'; el.style.top=o.y+'px'; el.textContent=o.label; el.dataset.id=o.id; scene.appendChild(el) })

    function showQuestion(){
      const q = QUESTIONS[idx]
      qEl.textContent = q.en; sub.textContent = '— '+q.vi
      root.querySelectorAll('.obj').forEach(el=>{
        el.onclick = () => {
          if(el.dataset.id===q.target){ corrects++; score.textContent=String(corrects); NiniApp.addXP(REWARD.correct.xp); NiniApp.addCoins(REWARD.correct.coins); toast('Đúng! +'+REWARD.correct.xp+' XP, +'+REWARD.correct.coins+' coins'); root.querySelector('#next').disabled=false }
          else { toast('Sai rồi! Thử câu khác'); root.querySelector('#next').disabled=false }
        }
      })
    }

    root.querySelector('#start').addEventListener('click', ()=>{ idx=0; corrects=0; score.textContent='0'; root.querySelector('#next').disabled=true; showQuestion() })
    root.querySelector('#next').addEventListener('click', ()=>{
      idx++; if(idx>=Math.min(QUESTIONS.length, 10)){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoàn thành! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins'); return }
      root.querySelector('#next').disabled=true; showQuestion()
    })

    return ()=>{}
  }, { title:'Farm Q&A (click đúng vật)' })

  // ------------------------------
  // FARM — Game 2: Match Image → Word (drag & drop)
  // ------------------------------
  register('farm-match', (root)=>{
    const REWARD = { each:{xp:4, coins:4}, finish:{xp:15, coins:15} }
    const PAIRS = [
      { id:'carrot', word:'carrot', label:'🥕' },
      { id:'chicken', word:'chicken', label:'🐔' },
      { id:'cow', word:'cow', label:'🐄' },
      { id:'sheep', word:'sheep', label:'🐑' },
      { id:'barn', word:'barn', label:'🏚️' },
    ]

    root.innerHTML = `
      <div class="row" style="justify-content:space-between"><div class="title">🥕 Match — Image → Word</div><div class="tiny">Kéo biểu tượng vào ô đúng từ</div></div>
      <div class="grid g2" id="wrap" style="margin-top:8px"></div>
      <div class="row" style="margin-top:8px"><div>✅ <b id="done">0</b>/<span id="total"></span></div></div>
    `
    root.querySelector('#total').textContent = String(PAIRS.length)

    const wrap = root.querySelector('#wrap');
    const bag = document.createElement('div'); bag.className='panel'; bag.innerHTML = '<div class="tiny">Túi đồ</div><div class="bag" id="bag"></div>'
    const targets = document.createElement('div'); targets.className='panel'; targets.innerHTML = '<div class="tiny">Thả vào từ đúng</div>'

    wrap.appendChild(bag); wrap.appendChild(targets)

    const bagBox = bag.querySelector('#bag')

    // make items (draggable chips)
    PAIRS.forEach(p=>{
      const chip = document.createElement('div'); chip.className='chip'; chip.textContent = p.label + ' ' + p.word; chip.draggable=true; chip.dataset.id=p.id
      chip.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', p.id) })
      bagBox.appendChild(chip)
    })

    // targets
    PAIRS.slice().sort(()=>Math.random()-0.5).forEach(p=>{
      const dz = document.createElement('div'); dz.className='dropzone'; dz.textContent = p.word.toUpperCase(); dz.dataset.id=p.id
      dz.addEventListener('dragover', (e)=> e.preventDefault())
      dz.addEventListener('drop', (e)=>{
        e.preventDefault(); const id=e.dataTransfer.getData('text/plain'); if(!id) return
        if(id===p.id){ dz.textContent = '✔ '+p.word; dz.style.borderColor = '#2e7d32'; dz.style.opacity='0.8'; NiniApp.addXP(REWARD.each.xp); NiniApp.addCoins(REWARD.each.coins); toast('Đúng! +'+REWARD.each.xp+' XP, +'+REWARD.each.coins+' coins'); done++ ; updateDone(); dz.style.pointerEvents='none' }
        else { toast('Sai vị trí, thử lại!') }
      })
      targets.appendChild(dz)
    })

    let done = 0
    function updateDone(){ root.querySelector('#done').textContent = String(done); if(done>=PAIRS.length){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoàn thành! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins') } }

    return ()=>{}
  }, { title:'Match (kéo hình → từ)' })

  // ------------------------------
  // FARM — Game 3: Delivery (drag from bag to NPC)
  // ------------------------------
  register('farm-delivery', (root)=>{
    const REWARD = { each:{xp:6, coins:6}, finish:{xp:20, coins:30} }
    const REQUESTS = [
      { npc:'👨‍🌾 Farmer', need:'hoe' },
      { npc:'👩‍🌾 Farmer', need:'carrot' },
      { npc:'🧒 Kid', need:'milk' },
      { npc:'🐶 Dog', need:'bone' },
    ]
    const INVENTORY = [
      { id:'carrot', label:'🥕 carrot' },
      { id:'hoe',    label:'🪓 hoe' },
      { id:'milk',   label:'🥛 milk' },
      { id:'bone',   label:'🦴 bone' },
    ]

    root.innerHTML = `
      <div class="row" style="justify-content:space-between"><div class="title">📦 Delivery</div><div class="tiny">Kéo đồ tới đúng người cần</div></div>
      <div class="grid g2" style="margin-top:8px">
        <div class="panel"><div class="tiny">Yêu cầu</div><div id="req" class="col"></div></div>
        <div class="panel"><div class="tiny">Túi đồ</div><div id="inv" class="bag"></div></div>
      </div>
      <div class="row" style="margin-top:8px"><div>✅ <b id="d">0</b>/<span id="t"></span></div></div>
    `
    root.querySelector('#t').textContent = String(REQUESTS.length)

    const req = root.querySelector('#req'); const inv = root.querySelector('#inv')

    // NPC boxes (dropzones)
    REQUESTS.forEach(r=>{
      const n = document.createElement('div'); n.className='npc dropzone'; n.textContent = `${r.npc} — need: ${r.need}`; n.dataset.need=r.need
      n.addEventListener('dragover', (e)=> e.preventDefault())
      n.addEventListener('drop', (e)=>{ e.preventDefault(); const id=e.dataTransfer.getData('text/plain'); if(!id) return; if(id===r.need){ n.textContent = `${r.npc} — ✔ ${r.need}`; n.style.borderColor='#2e7d32'; n.style.opacity='0.9'; done++; NiniApp.addXP(REWARD.each.xp); NiniApp.addCoins(REWARD.each.coins); toast('Giao đúng! +'+REWARD.each.xp+' XP, +'+REWARD.each.coins+' coins'); updateDone(); n.style.pointerEvents='none' } else { toast('Sai người!') } })
      req.appendChild(n)
    })

    // Inventory chips
    INVENTORY.forEach(it=>{ const c=document.createElement('div'); c.className='chip'; c.textContent=it.label; c.draggable=true; c.dataset.id=it.id; c.addEventListener('dragstart', (e)=> e.dataTransfer.setData('text/plain', it.id)); inv.appendChild(c) })

    let done=0
    function updateDone(){ root.querySelector('#d').textContent = String(done); if(done>=REQUESTS.length){ NiniApp.addXP(REWARD.finish.xp); NiniApp.addCoins(REWARD.finish.coins); toast('Hoàn thành! +'+REWARD.finish.xp+' XP, +'+REWARD.finish.coins+' coins') } }

    return ()=>{}
  }, { title:'Delivery (giao đồ đúng người)' })

})()

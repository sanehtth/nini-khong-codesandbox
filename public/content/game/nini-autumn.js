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

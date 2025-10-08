/* /public/js/nini-utils.js
   Tiện ích dùng chung cho toàn site NiNi
   - DOM helpers: $, $$
   - Storage JSON: lsGet, lsSet
   - Event bus: emit, on
   - Fetch helpers: fetchJSON, postJSON, safeFetch
   - UI: toast, setText, setBar, preloadImages
   - Auth/header helpers: applyHeaderAuthUI, syncHeaderAvatar
   - Profile LS helpers: readActiveProfile, writeLocalProfile, emitProfileChange
   - Router nhỏ: getHashSegment, setHashSegment
   - Misc: debounce, throttle, sleep
*/
export const $  = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Storage JSON ---------- */
export function lsGet(key, def=null){
  try{ const v = localStorage.getItem(key); return v==null? def : JSON.parse(v); }catch{ return def; }
}
export function lsSet(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch{}
}
export function lsRemove(key){ try{ localStorage.removeItem(key); }catch{} }

/* ---------- Event bus (CustomEvent) ---------- */
export function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch{} }
export function on(name, handler){ window.addEventListener(name, handler); return ()=>window.removeEventListener(name, handler); }

/* ---------- Fetch helpers ---------- */
export async function safeFetch(input, init={}, timeoutMs=12000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(input, {...init, signal: ctrl.signal});
    return res;
  }finally{ clearTimeout(t); }
}
export async function fetchJSON(url, opts={}, timeoutMs=12000){
  const r = await safeFetch(url, opts, timeoutMs);
  if(!r.ok) throw new Error(await r.text().catch(()=>`HTTP ${r.status}`));
  return await r.json();
}
export async function postJSON(url, data, extra={}, timeoutMs=12000){
  return fetchJSON(url, {
    method: 'POST',
    headers: {'content-type':'application/json', ...(extra.headers||{})},
    body: JSON.stringify(data),
    credentials: extra.credentials || 'same-origin',
  }, timeoutMs);
}

/* ---------- UI helpers ---------- */
export function toast(msg, ok=true){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; top:12px; right:12px; z-index:9999;
    padding:8px 12px; border-radius:12px; backdrop-filter:blur(6px);
    background:rgba(255,255,255,.22); border:1px solid rgba(17,24,39,.14);
    color:${ok?'#0f5132':'#7f1d1d'}; box-shadow:0 6px 20px rgba(0,0,0,.15);
  `;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2400);
}
export function setText(id, v){ const el=document.getElementById(id); if(el) el.textContent = v; }
export function setBar(id, p){ const el=document.getElementById(id); if(el) el.style.width = Math.max(0,Math.min(100,p))+'%'; }
export function preloadImages(urls=[]){ urls.forEach(u=>{ const i=new Image(); i.src=u; }); }

/* ---------- Auth/header helpers ---------- */
const LS_ACCOUNTS = 'NINI_ACCOUNTS_V3';
const LS_ACTIVE   = 'NINI_ACTIVE_USER_V3';
const AUTH_FLAG   = 'NINI_AUTH_LOGGED_IN';

export function readActiveProfile(){
  try{
    const uid  = lsGet(LS_ACTIVE, null);
    const accs = lsGet(LS_ACCOUNTS, {});
    return (uid && accs && accs[uid]) ? accs[uid] : null;
  }catch{ return null; }
}
export function writeLocalProfile(uid, profile){
  const accs = {}; accs[uid] = profile;
  lsSet(LS_ACCOUNTS, accs);
  lsSet(LS_ACTIVE, uid);
  emit('nini:profilechange', {uid, profile});
}
export function emitAuthChange(loggedIn){
  try{ localStorage.setItem(AUTH_FLAG, loggedIn ? '1' : '0'); }catch{}
  emit('nini:authchange', { loggedIn });
}

export function applyHeaderAuthUI(){
  const logged = localStorage.getItem(AUTH_FLAG) === '1';
  $$('[data-show="in"]').forEach(el=> el.style.display = logged ? '' : 'none');
  $$('[data-show="out"]').forEach(el=> el.style.display = logged ? 'none' : '');
}

export function syncHeaderAvatar(imgSelector='#avatarImg', fallback='/public/assets/avatar/NV1.webp'){
  const img = $(imgSelector); if(!img) return;
  const pf  = readActiveProfile();
  const url = (pf && pf.avatarUrl) ? pf.avatarUrl : fallback;
  const abs = new URL(url, location.origin).href;
  if (img.src !== abs) img.src = url;
}

/* Khởi động tự đồng bộ ở Header (nếu trang có avatar & nút đăng nhập) */
(function bootHeaderSync(){
  // chạy sớm một lần
  try{ applyHeaderAuthUI(); syncHeaderAvatar(); }catch{}
  // nghe sự kiện từ các trang khác
  on('nini:authchange', applyHeaderAuthUI);
  on('nini:profilechange', ()=>syncHeaderAvatar());
  window.addEventListener('storage', (e)=>{
    if (e.key===LS_ACCOUNTS || e.key===LS_ACTIVE || e.key===AUTH_FLAG){
      applyHeaderAuthUI(); syncHeaderAvatar();
    }
  });
})();

/* ---------- Router (hash nhẹ) ---------- */
export function getHashSegment(){ return (location.hash||'').replace(/^#\/?/, '') || 'home'; }
export function setHashSegment(seg){
  const s = String(seg||'home');
  if (getHashSegment() !== s){
    history.replaceState({}, '', '#/'+s);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

/* ---------- Misc ---------- */
export const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
export function debounce(fn, wait=200){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); };
}
export function throttle(fn, wait=200){
  let t=0; return (...a)=>{ const n=Date.now(); if(n-t>=wait){ t=n; fn(...a);} };
}

/* ---------- Brand helper (logo/slogan) ---------- */
export function applyBrandFromLocal(){
  const KEY='NINI_THEME_BRAND';
  try{
    const b = lsGet(KEY, {});
    if (b.logoMain)  $$('.brand__logo').forEach(i=>i.src=b.logoMain);
    if (b.logoSmall) $$('.brand__logo--small').forEach(i=>i.src=b.logoSmall);
    if (b.slogan)    $$('.brand__slogan').forEach(e=>e.textContent=b.slogan);
  }catch{}
}

// NiNi utils
export const LS = {
  get(key, fb=null){ try{ return JSON.parse(localStorage.getItem(key)||JSON.stringify(fb)); }catch{ return fb; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
export const $  = (s, r=document)=>r.querySelector(s);
export const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

export function toast(msg, ok=true){
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText = "position:fixed;top:12px;right:12px;padding:8px 12px;border-radius:12px;z-index:9999;backdrop-filter:blur(6px);background:rgba(255,255,255,.22);border:1px solid rgba(17,24,39,.14);color:"+(ok?"#0f5132":"#7f1d1d");
  document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
}
export function dispatch(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }

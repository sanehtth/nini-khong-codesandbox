(function(){
  const ENDPOINT='/.netlify/functions/theme';
  const KEY='NINI_THEME_CACHE_V1';
  const MAX_AGE=3600; // 1h

  function inject(css){
    let s=document.getElementById('themeOverride');
    if(!s){ s=document.createElement('style'); s.id='themeOverride'; document.head.appendChild(s); }
    s.textContent=css;
  }
  try{
    const cache=JSON.parse(localStorage.getItem(KEY)||'null');
    const now=Date.now()/1000|0;
    if(cache && (now-cache.ts)<MAX_AGE){ inject(cache.css); }
    fetch(ENDPOINT,{cache:'no-store'})
      .then(r=>r.text())
      .then(css=>{ if(css){ inject(css); localStorage.setItem(KEY, JSON.stringify({ts: now, css})); } })
      .catch(()=>{});
  }catch(_){}
})();

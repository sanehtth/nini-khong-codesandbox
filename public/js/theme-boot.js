/* NiNi theme-boot.js
   - Nạp CSS override từ Netlify Function `/.netlify/functions/theme`
   - Cache 1h trong localStorage để tránh nháy
   - Áp logo/slogan từ localStorage (nếu có)
*/
(function(){
  var ENDPOINT='/.netlify/functions/theme';
  var KEY='NINI_THEME_CACHE_V1';
  var TTL=3600; // giây

  function inject(css){
    if(!css) return;
    try{
      var s=document.getElementById('themeOverride');
      if(!s){ s=document.createElement('style'); s.id='themeOverride'; document.head.appendChild(s); }
      s.textContent=css;
    }catch(_){}
  }

  try{
    var now = (Date.now()/1000)|0;
    var cache = JSON.parse(localStorage.getItem(KEY)||'null');
    if(cache && (now - cache.ts) < TTL){
      inject(cache.css); // áp ngay từ cache để không nháy
    }
    // luôn thử lấy bản mới (nếu có)
    fetch(ENDPOINT, {cache:'no-store'})
      .then(function(r){ return r.ok ? r.text() : ''; })
      .then(function(css){
        if(css){
          inject(css);
          localStorage.setItem(KEY, JSON.stringify({ ts: now, css: css }));
        }
      })
      .catch(function(){});
  }catch(_){}

  // (Tuỳ chọn) Áp logo/slogan toàn site từ localStorage (do Admin set)
  (function applyBrandEverywhere(){
    var BRAND_KEY='NINI_THEME_BRAND';
    try{
      var b = JSON.parse(localStorage.getItem(BRAND_KEY)||'{}');
      if (b.logoMain)  document.querySelectorAll('.brand__logo').forEach(function(i){ i.src=b.logoMain; });
      if (b.logoSmall) document.querySelectorAll('.brand__logo--small').forEach(function(i){ i.src=b.logoSmall; });
      if (b.slogan)    document.querySelectorAll('.brand__slogan').forEach(function(e){ e.textContent=b.slogan; });
    }catch(_){}
  })();

  // Helper xoá cache nhanh khi cần đổi theme ngay
  window.NiNiTheme = {
    clear: function(){
      try{ localStorage.removeItem(KEY); }catch(_){}
      location.reload();
    }
  };
})();

/*! NiNi Utils (non-module, global) v2 */
(function (global) {
  // Bảo đảm namespace tồn tại trên window
  global.NINI = global.NINI || {};
  var NINI = global.NINI;

  /* ===================== DOM helpers ===================== */
  NINI.$ = function (sel, root) { return (root || document).querySelector(sel); };
  NINI.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  NINI.create = function (tag, attrs, children) {
    var el = document.createElement(tag || "div");
    if (attrs) for (var k in attrs) {
      if (k === "style" && typeof attrs[k] === "object") { for (var s in attrs[k]) el.style[s] = attrs[k][s]; }
      else if (k === "class" || k === "className") el.className = attrs[k];
      else if (k === "dataset") { for (var d in attrs[k]) el.dataset[d] = attrs[k][d]; }
      else if (k in el) el[k] = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    if (children != null) {
      if (!Array.isArray(children)) children = [children];
      children.forEach(function (c) { el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    }
    return el;
  };

  NINI.html = function (el, html) { if (el) el.innerHTML = html || ""; return el; };
  NINI.text = function (el, t) { if (el) el.textContent = t == null ? "" : String(t); return el; };

  NINI.on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); return el; };
  NINI.off = function (el, ev, fn, opt) { if (el) el.removeEventListener(ev, fn, opt || false); return el; };

  NINI.delegate = function (root, event, selector, handler) {
    root.addEventListener(event, function (e) {
      var cur = e.target;
      while (cur && cur !== root) {
        if (cur.matches && cur.matches(selector)) { handler.call(cur, e); return; }
        cur = cur.parentNode;
      }
    });
  };

  NINI.cls = {
    add: function (el, c) { if (el) el.classList.add(c); },
    rm: function (el, c) { if (el) el.classList.remove(c); },
    has: function (el, c) { return el ? el.classList.contains(c) : false; },
    toggle: function (el, c, force) { if (el) el.classList.toggle(c, force); }
  };

  /* ===================== Storage helpers ===================== */
  NINI.storage = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (_) { return def; } },
    set: function (k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    del: function (k) { localStorage.removeItem(k); }
  };
// alias để tương thích code cũ gọi NINI.store.*
  NINI.store = {
    get: NINI.storage.get,
    set: NINI.storage.set,
    del: NINI.storage.del
};

  // key “chuẩn” hay dùng trong project
  NINI.KEY = {
    AUTH_LOGGED: 'NINI_AUTH_LOGGED_IN',
    ACCOUNTS   : 'NINI_ACCOUNTS_V3',
    ACTIVE     : 'NINI_ACTIVE_USER_V3',
    THEME      : 'NINI_THEME_CACHE_V1',
    BRAND      : 'NINI_THEME_BRAND'
  };

  /* ===================== URL / query ===================== */
  NINI.qs = function (name, def) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : def;
  };
  NINI.qsAll = function () {
    var o = {}, sp = new URLSearchParams(location.search);
    sp.forEach(function (v, k) { o[k] = v; });
    return o;
  };

  /* ===================== Fetch helpers ===================== */
  NINI.getJSON = function (url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  };
  NINI.postJSON = function (url, data, opts) {
    opts = opts || {};
    opts.method = opts.method || 'POST';
    opts.headers = Object.assign({ 'content-type': 'application/json' }, opts.headers || {});
    opts.body = JSON.stringify(data || {});
    return NINI.getJSON(url, opts);
  };

  /* ===================== Misc ===================== */
  NINI.uid = function (p) { return (p || 'id_') + Math.random().toString(36).slice(2, 9); };
  NINI.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  NINI.debounce = function (fn, ms) {
    var t; return function () { var self = this, args = arguments;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, args); }, ms || 200);
    };
  };
  NINI.throttle = function (fn, ms) {
    var ok = true; return function () { if (!ok) return;
      ok = false; var self = this, args = arguments;
      setTimeout(function () { ok = true; fn.apply(self, args); }, ms || 200);
    };
  };

  NINI.copy = function (text) {
    return navigator.clipboard ? navigator.clipboard.writeText(String(text)) :
      new Promise(function (res, rej) {
        try {
          var ta = NINI.create('textarea', { style: { position: 'fixed', opacity: 0 } }, text);
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); res();
        } catch (e) { rej(e); }
      });
  };

  NINI.fmt = {
    num: function (n) { n = Number(n || 0); return n.toLocaleString('vi-VN'); },
    money: function (n) { n = Number(n || 0); return n.toLocaleString('vi-VN') + ' đ'; },
    date: function (ts) {
      var d = ts instanceof Date ? ts : new Date(ts || Date.now());
      var pad = function (x) { return (x < 10 ? '0' : '') + x; };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
  };

  NINI.toast = function (msg, ok) {
    var t = NINI.create('div', {
      class: 'nini-toast',
      style: {
        position: 'fixed', top: '12px', right: '12px', zIndex: 9999,
        padding: '8px 12px', borderRadius: '12px',
        background: 'rgba(255,255,255,.22)', border: '1px solid rgba(17,24,39,.14)',
        color: ok === false ? '#7f1d1d' : '#0f5132', backdropFilter: 'blur(6px)'
      }
    }, String(msg || ''));
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400);
  };

  // gắn global
  global.NINI = NINI;
})(window);



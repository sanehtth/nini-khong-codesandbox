;(() => {
  window.NINI = window.NINI || {};
  const ev = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  // helpers DOM
  NINI.$ = (sel, root=document) => root.querySelector(sel);
  NINI.$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // simple pubsub
  NINI.on = (name, fn) => document.addEventListener(name, fn);
  NINI.emit = ev;

  // theme switch (spring/summer/autumn/winter)
  NINI.setSeason = (s) => {
    document.body.classList.remove('spring','summer','autumn','winter');
    document.body.classList.add(s);
  };

  // mount guard
  NINI.mountOnce = (selector, render) => {
    const el = NINI.$(selector);
    if (!el || el.__mounted) return;
    el.__mounted = true;
    render(el);
  };
})();

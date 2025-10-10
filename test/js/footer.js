(() => {
  function mountFooter(root) {
    const el = typeof root === 'string' ? document.querySelector(root) : root;
    el.innerHTML = `<div class="footer glass">© NiNi — Funny</div>`;
  }
  NINI.mount.footer = mountFooter;
})();

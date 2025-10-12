;(() => {
  if (!document.getElementById('mini_footer')){
    const f = document.createElement('footer');
    f.id = 'mini_footer';
    f.innerHTML = `<small>© NiNi — Funny</small>`;
    document.body.appendChild(f);
  }
})();

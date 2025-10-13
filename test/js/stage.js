;(() => {
  const N = window.NINI;

  function renderSeasonsNav(root){
    root.innerHTML = `
      <button data-season="spring">Xuân</button>
      <button data-season="summer">Hạ</button>
      <button data-season="autumn">Thu</button>
      <button data-season="winter">Đông</button>
    `;
    nav.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-season]');
      if (!btn) return;
      N.setSeason(btn.dataset.season);
    });
  }

  N.mountOnce('#stage', renderStage);
  N.mountOnce('#season_nav', renderSeasonsNav);
})();


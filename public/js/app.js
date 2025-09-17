/* NiNi — App (NO EFFECT) */
(() => {
  const SEASONS = {
    home  : '/public/assets/bg/nini_home.webp',
    spring: '/public/assets/images/seasons/spring.webp',
    summer: '/public/assets/images/seasons/summer.webp',
    autumn: '/public/assets/images/seasons/autumn.webp',
    winter: '/public/assets/images/seasons/winter.webp',
  };

  const frame = document.getElementById('frame');
  const tabs  = document.getElementById('seasonTabs');
  const dock  = document.getElementById('dock');

  function setSeason(s){
    frame.style.backgroundImage = `url("${SEASONS[s] || SEASONS.home}")`;
    tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.season===s));
    localStorage.setItem('nini_season', s);
  }

  setSeason(localStorage.getItem('nini_season') || 'home');

  tabs.addEventListener('click', e=>{
    const btn = e.target.closest('.tab'); if(!btn) return;
    setSeason(btn.dataset.season);
  });

  // 4 tab nội dung trong khung
  const cards = {
    cardIntro   : document.getElementById('cardIntro'),
    cardRules   : document.getElementById('cardRules'),
    cardForum   : document.getElementById('cardForum'),
    cardFeedback: document.getElementById('cardFeedback'),
  };
  function setCard(id){
    Object.entries(cards).forEach(([k,el])=> el.hidden = (k!==id));
    dock.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-selected', String(p.dataset.card===id)));
  }
  setCard('cardIntro');
  dock.addEventListener('click', e=>{
    const p = e.target.closest('.pill'); if(!p) return;
    setCard(p.dataset.card);
  });
})();

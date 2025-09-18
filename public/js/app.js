// ===== Modal open/close
const openBtn = document.getElementById('openAuth');
const closeBtn = document.getElementById('closeAuth');
const backdrop = document.getElementById('backdrop');
const modal = document.getElementById('authModal');

function showModal() {
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
}
function hideModal() {
  backdrop.classList.add('hidden');
  modal.classList.add('hidden');
}
openBtn?.addEventListener('click', showModal);
closeBtn?.addEventListener('click', hideModal);
backdrop?.addEventListener('click', hideModal);

// ===== Auth tabs
const authTabs = document.getElementById('authTabs');
const panels = {
  login: document.getElementById('authLogin'),
  signup: document.getElementById('authSignup'),
  forgot: document.getElementById('authForgot'),
};
authTabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-auth]');
  if (!btn) return;
  // set active tab
  [...authTabs.children].forEach(el => el.classList.remove('is-active'));
  btn.classList.add('is-active');
  // show panel
  const key = btn.getAttribute('data-auth');
  Object.values(panels).forEach(p => p.classList.add('hidden'));
  panels[key]?.classList.remove('hidden');
});

// ===== Season tabs (chỉ đổi ảnh – chưa gắn hiệu ứng rơi)
const seasonTabs = document.getElementById('seasonTabs');
const seasonImg = document.getElementById('seasonImg');
const seasonSrc = {
  home:   '/public/assets/bg/nini_home.webp',
  spring: '/public/assets/images/seasons/spring.webp',
  summer: '/public/assets/images/seasons/summer.webp',
  autumn: '/public/assets/images/seasons/autumn.webp',
  winter: '/public/assets/images/seasons/winter.webp'
};
seasonTabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-s]');
  if (!btn) return;
  [...seasonTabs.children].forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  const key = btn.getAttribute('data-s');
  seasonImg.src = seasonSrc[key] || seasonSrc.home;
});

// ===== Bottom info tabs – demo nội dung
const infoTabs = document.getElementById('infoTabs');
const contentTitle = document.getElementById('contentTitle');
const contentText = document.getElementById('contentText');
const mapText = {
  about:   ['NiNi — Funny', 'Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.'],
  rules:   ['Luật chơi', 'Mỗi trò có hướng dẫn rõ ràng. Hãy đọc kỹ và làm theo để tích điểm!'],
  forum:   ['Diễn đàn', 'Nơi bé & phụ huynh thảo luận, chia sẻ kinh nghiệm học & chơi.'],
  feedback:['Góp ý', 'Rất mong nhận được góp ý để NiNi tốt hơn mỗi ngày!']
};
infoTabs?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  [...infoTabs.children].forEach(x => x.classList.remove('is-active'));
  b.classList.add('is-active');
  const key = b.getAttribute('data-tab');
  const [tt, tx] = mapText[key] || mapText.about;
  contentTitle.textContent = tt;
  contentText.textContent = tx;
});

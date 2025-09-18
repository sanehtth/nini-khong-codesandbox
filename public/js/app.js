/* ===== Helpers ===== */
const $  = (q, r=document) => r.querySelector(q);
const $$ = (q, r=document) => [...r.querySelectorAll(q)];

/* ===== Backdrop & Modal ===== */
const openBtn  = $('#openAuth');
const closeBtn = $('#closeAuth');
const backdrop = $('#backdrop');
const modal    = $('#authModal');

const showModal = () => { backdrop.classList.remove('hidden'); modal.classList.remove('hidden'); };
const hideModal = () => { backdrop.classList.add('hidden'); modal.classList.add('hidden'); };

openBtn?.addEventListener('click', showModal);
closeBtn?.addEventListener('click', hideModal);
backdrop?.addEventListener('click', hideModal);

/* ===== Modal Tabs (login / signup / forgot) ===== */
const authTabs = $('#authTabs');
const panels = {
  login : $('#authLogin'),
  signup: $('#authSignup'),
  forgot: $('#authForgot'),
};
function switchAuth(to){
  $$('.modal-tab', authTabs).forEach(b=>b.classList.toggle('is-active', b.dataset.auth===to));
  Object.entries(panels).forEach(([k,el]) => el.classList.toggle('hidden', k!==to));
}
authTabs?.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-auth]');
  if(!t) return;
  switchAuth(t.dataset.auth);
});
$$('[data-switch="forgot"]').forEach(b=>b.addEventListener('click',()=>switchAuth('forgot')));

/* ===== Fake actions (bạn gắn API thật sau) ===== */
$('#loginGoogle')?.addEventListener('click', ()=> alert('Login Google (demo)'));
$('#signupSendOtp')?.addEventListener('click',()=> alert('Đã gửi OTP (demo)'));
$('#forgotSendOtp')?.addEventListener('click',()=> alert('Đã gửi OTP (demo)'));

/* ===== Seasons ===== */
const seasonImg  = $('#seasonImg');
const seasonMap  = {
  home  : '/public/assets/bg/nini_home.webp',
  spring: '/public/assets/images/seasons/spring.webp',
  summer: '/public/assets/images/seasons/summer.webp',
  autumn: '/public/assets/images/seasons/autumn.webp',
  winter: '/public/assets/images/seasons/winter.webp',
};

$$('.tab[data-s]').forEach(btn=>{
  btn.setAttribute('type','button');
  btn.addEventListener('click', ()=>{
    $$('.tab[data-s]').forEach(b=>b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const key = btn.dataset.s;
    seasonImg.src = seasonMap[key] || seasonMap.home;
  });
});

/* ===== 4 nút dưới ảnh ===== */
const contentTitle = $('#contentTitle');
const contentText  = $('#contentText');

const infoMap = {
  about:   ['NiNi — Funny','Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.'],
  rules:   ['Luật chơi','Mỗi trò có hướng dẫn rõ ràng. Hãy đọc kỹ và làm theo để tích điểm!'],
  forum:   ['Diễn đàn','Nơi bé & phụ huynh thảo luận, chia sẻ kinh nghiệm học & chơi.'],
  feedback:['Góp ý','Rất mong nhận được góp ý để NiNi tốt hơn mỗi ngày!'],
};

$$('.pill[data-tab]').forEach(p=>{
  p.setAttribute('type','button');
  p.addEventListener('click', ()=>{
    $$('.pill[data-tab]').forEach(x=>x.classList.remove('is-active'));
    p.classList.add('is-active');
    const [ttl, txt] = infoMap[p.dataset.tab] || infoMap.about;
    contentTitle.textContent = ttl;
    contentText.textContent  = txt;
  });
});

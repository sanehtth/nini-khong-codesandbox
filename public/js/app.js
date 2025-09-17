// ----- Ảnh nền theo mùa (đảm bảo bạn có 4 file .webp trong /public/assets/images/seasons/) -----
const bgEl = document.getElementById('bg');
const fxCanvas = document.getElementById('fx');

const SEASON_BG = {
  Home: '/public/assets/bg/nini_home.webp',
  spring: '/public/assets/images/seasons/spring.webp',
  summer: '/public/assets/images/seasons/summer.webp',
  autumn: '/public/assets/images/seasons/autumn.webp',
  winter: '/public/assets/images/seasons/winter.webp',
};

function setSeason(season){
  const url = SEASON_BG[season] || SEASON_BG.spring;
  bgEl.style.backgroundImage = `url("${url}")`;
  // gọi hiệu ứng theo mùa (trong effects.js)
  startSeasonEffect(fxCanvas, season);
}

// gán sự kiện cho 4 nút mùa
document.querySelectorAll('.season-nav [data-season]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    setSeason(btn.dataset.season);
  });
});

// mùa mặc định
setSeason('Home');

// ----- Đăng nhập thành viên (KHÔNG dính admin) -----
const authBtn   = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const emailForm = document.getElementById('emailForm');
const googleBtn = document.getElementById('googleBtn');
const signupLink= document.getElementById('signupLink');
const authMsg   = document.getElementById('authMsg');

authBtn.addEventListener('click', ()=> authModal.hidden = false);
authModal.addEventListener('click', (e)=> { if(e.target === authModal) authModal.hidden = true; });
authModal.querySelectorAll('[data-close]').forEach(b=> b.addEventListener('click', ()=> authModal.hidden = true));

// ---- Firebase App (đã có config của bạn) ----
/* global firebase */
const auth = firebase.auth();

emailForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  authMsg.textContent = '';
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    authModal.hidden = true;
    authBtn.textContent = 'Xin chào';
  }catch(err){
    authMsg.textContent = err.message || 'Đăng nhập thất bại';
  }
});

signupLink.addEventListener('click', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  authMsg.textContent = '';
  try{
    await auth.createUserWithEmailAndPassword(email, pass);
    authModal.hidden = true;
    authBtn.textContent = 'Xin chào';
  }catch(err){
    authMsg.textContent = err.message || 'Không tạo được tài khoản';
  }
});

googleBtn.addEventListener('click', async ()=>{
  authMsg.textContent = '';
  try{
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    authModal.hidden = true;
    authBtn.textContent = 'Xin chào';
  }catch(err){
    authMsg.textContent = err.message || 'Google sign-in lỗi';
  }
});

// hiển thị tên sau khi đăng nhập
auth.onAuthStateChanged(user=>{
  if(user){
    const name = user.displayName || user.email.split('@')[0];
    authBtn.textContent = `Xin chào, ${name}`;
  }else{
    authBtn.textContent = 'Đăng nhập / Đăng ký';
  }
});


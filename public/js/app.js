/* ========================
   NiNi — Funny (UI only)
   - Đổi mùa (tabs)
   - Modal Auth: Đăng nhập (Google | Email & Mật khẩu), Quên MK (OTP), Đăng ký (OTP)
   - Lưu demo người dùng trong localStorage (KHÔNG backend)
======================== */

const SEASON_BG = {
  home:  "/public/assets/bg/nini_home.webp",
  spring:"/public/assets/images/seasons/spring.webp",
  summer:"/public/assets/images/seasons/summer.webp",
  autumn:"/public/assets/images/seasons/autumn.webp",
  winter:"/public/assets/images/seasons/winter.webp",
};

const $ = (sel, parent=document) => parent.querySelector(sel);
const $$ = (sel, parent=document) => [...parent.querySelectorAll(sel)];

const bgImg = $("#bgImg");
const tabs = $$(".tab");
const chips = $$(".chip");

/* ===== ĐỔI MÙA / HOME ===== */
tabs.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tabs.forEach(t=>t.classList.remove("is-active"));
    btn.classList.add("is-active");

    const season = btn.dataset.season;
    const src = SEASON_BG[season] || SEASON_BG.home;
    bgImg.src = src;

    // Khi ở tab khác "home", ẩn chút nội dung home
    const homeContent = $("#homeContent");
    homeContent.style.display = (season === "home" ? "block" : "none");
  });
});

/* ===== 4 chip trong khung ===== */
chips.forEach(c=>{
  c.addEventListener("click", ()=>{
    chips.forEach(x=>x.classList.remove("is-active"));
    c.classList.add("is-active");
    // tuỳ bạn map nội dung theo chip ở đây…
  });
});

/* ===== MODAL AUTH ===== */
const authOpen = $("#authOpen");
const authModal = $("#authModal");
const authClose = $("#authClose");
const toast = $("#authToast");

authOpen.addEventListener("click", openAuth);
authClose.addEventListener("click", closeAuth);
authModal.addEventListener("click", (e)=>{ if(e.target === authModal) closeAuth(); });

function openAuth(){
  authModal.classList.remove("is-hidden");
  authModal.setAttribute("aria-hidden","false");
}
function closeAuth(){
  authModal.classList.add("is-hidden");
  authModal.setAttribute("aria-hidden","true");
}

/* Tabs trong modal */
const authTabs = $$(".auth_tab");
authTabs.forEach(t=>{
  t.addEventListener("click", ()=>{
    authTabs.forEach(x=>x.classList.remove("is-active"));
    t.classList.add("is-active");
    const name = t.dataset.authTab;
    $$(".auth_panel").forEach(p=>{
      p.classList.toggle("is-hidden", p.dataset.panel !== name);
    });
  });
});

/* ===== ĐĂNG NHẬP (GOOGLE) – demo ===== */
$("#googleSignIn").addEventListener("click", ()=>{
  // Demo: giả lập Google login thành công
  localStorage.setItem("nini_current_user", JSON.stringify({
    email:"google_user@example.com", name:"NiNi Google", provider:"google", t:Date.now()
  }));
  showToast("Đăng nhập Google thành công. Hãy cập nhật hồ sơ để bảo vệ tài khoản.");
  setTimeout(closeAuth, 1200);
});

/* ===== STORE DEMO (localStorage) ===== */
function getUsers(){
  try{ return JSON.parse(localStorage.getItem("nini_users")||"{}"); }catch(_){ return {}; }
}
function setUsers(obj){
  localStorage.setItem("nini_users", JSON.stringify(obj));
}

/* ===== ĐĂNG NHẬP EMAIL & MẬT KHẨU ===== */
$("#signinForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = (fd.get("email")||"").trim().toLowerCase();
  const pass  = (fd.get("password")||"").trim();

  const users = getUsers();
  const u = users[email];
  if(!u) return showToast("Email chưa tồn tại. Vui lòng đăng ký.", true);
  if(u.password !== pass) return showToast("Mật khẩu chưa đúng.", true);

  localStorage.setItem("nini_current_user", JSON.stringify({email, name:u.fullname||"", provider:"password", t:Date.now()}));
  showToast("Đăng nhập thành công. Hãy cập nhật hồ sơ để bảo vệ tài khoản.");
  setTimeout(closeAuth, 1200);
});

/* ===== QUÊN MẬT KHẨU (OTP) ===== */
const forgotToggle = $("#forgotToggle");
const forgotForm = $("#forgotForm");
const signinForm = $("#signinForm");
const backToSignin = $("#backToSignin");
const forgotSendOtp = $("#forgotSendOtp");
const forgotOtpHint = $("#forgotOtpHint");

forgotToggle.addEventListener("click", ()=>{
  signinForm.classList.add("is-hidden");
  forgotForm.classList.remove("is-hidden");
});

backToSignin.addEventListener("click", ()=>{
  forgotForm.classList.add("is-hidden");
  signinForm.classList.remove("is-hidden");
  forgotOtpHint.textContent = "";
});

forgotSendOtp.addEventListener("click", ()=>{
  const email = forgotForm.email.value.trim().toLowerCase();
  if(!email) return showToast("Nhập email để nhận OTP.", true);

  // Demo: phát OTP ngẫu nhiên và lưu tạm
  const otp = makeOtp();
  const users = getUsers();
  users.__otp = { email, otp, ts: Date.now() };
  setUsers(users);

  forgotOtpHint.textContent = `Đã gửi OTP (demo): ${otp}`;
  showToast("Đã gửi OTP đến email (demo).", false);
});

$("#resetPass").addEventListener("click", ()=>{
  const email = forgotForm.email.value.trim().toLowerCase();
  const otp = (forgotForm.otp.value||"").trim();
  const newpass = (forgotForm.newpass.value||"").trim();

  const users = getUsers();
  const meta = users.__otp;

  if(!meta || meta.email !== email || meta.otp !== otp) return showToast("OTP chưa đúng.", true);
  if(newpass.length < 6) return showToast("Mật khẩu mới tối thiểu 6 ký tự.", true);

  if(!users[email]) users[email] = { password:newpass, createdAt:Date.now() };
  else users[email].password = newpass;

  delete users.__otp;
  setUsers(users);

  showToast("Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
  setTimeout(()=>{
    backToSignin.click();
  }, 700);
});

/* ===== ĐĂNG KÝ (OTP) ===== */
const signupForm = $("#signupForm");
const signupSendOtp = $("#signupSendOtp");
const signupOtpHint = $("#signupOtpHint");

signupSendOtp.addEventListener("click", ()=>{
  const email = signupForm.email.value.trim().toLowerCase();
  if(!email) return showToast("Nhập email để nhận OTP.", true);

  const otp = makeOtp();
  const users = getUsers();
  users.__otp = { email, otp, ts:Date.now(), type:"signup" };
  setUsers(users);

  signupOtpHint.textContent = `Đã gửi OTP (demo): ${otp}`;
  showToast("Đã gửi OTP đến email (demo).");
});

signupForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const fd = new FormData(signupForm);
  const email = (fd.get("email")||"").trim().toLowerCase();
  const fullname = (fd.get("fullname")||"").trim();
  const pass = (fd.get("password")||"").trim();
  const repass = (fd.get("repass")||"").trim();
  const otp = (fd.get("otp")||"").trim();

  if(pass.length < 6) return showToast("Mật khẩu tối thiểu 6 ký tự.", true);
  if(pass !== repass) return showToast("Mật khẩu nhập lại chưa trùng.", true);

  const users = getUsers();
  const meta = users.__otp;

  if(!meta || meta.email !== email || meta.otp !== otp) return showToast("OTP chưa đúng.", true);
  if(users[email]) return showToast("Email đã tồn tại, vui lòng đăng nhập.", true);

  users[email] = { password:pass, fullname, createdAt:Date.now() };
  delete users.__otp;
  setUsers(users);

  showToast("Tạo tài khoản thành công. Hãy đăng nhập và cập nhật hồ sơ.");
  // chuyển sang tab “Đăng nhập”
  const tabSignin = $(`[data-auth-tab="signin"]`);
  tabSignin.click();
});

/* ===== Helpers ===== */
function showToast(msg, isErr=false){
  toast.textContent = msg;
  toast.classList.remove("is-hidden");
  toast.style.background = isErr ? "rgba(181,40,57,.55)" : "rgba(0,0,0,.45)";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.classList.add("is-hidden"), 3000);
}
function makeOtp(){ return (""+Math.floor(100000 + Math.random()*900000)); }


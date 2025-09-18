/* ===== Helper ===== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* ===== Modal open/close ===== */
const modal = $("#authModal");
$("#authOpenBtn")?.addEventListener("click", ()=> modal.classList.remove("hidden"));
$("#authCloseBtn")?.addEventListener("click", ()=> modal.classList.add("hidden"));
modal?.addEventListener("click", e=>{ if(e.target===modal) modal.classList.add("hidden"); });

/* ===== Tabs switch ===== */
$$(".tabs .tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".tabs .tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.tab;
    $$(".tab-panel").forEach(p=>p.classList.remove("show"));
    $("#tab-"+id)?.classList.add("show");
  });
});

/* ===== Handlers (mock demo) — sau này nối API thật ===== */
$("#btnGoogle")?.addEventListener("click", ()=>{
  alert("Demo: Đăng nhập Google thành công!\nNhắc người dùng cập nhật hồ sơ.");
  modal.classList.add("hidden");
});

$("#formLogin")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  console.log("LOGIN", data);
  alert("Demo: Đăng nhập bằng email thành công!");
  modal.classList.add("hidden");
});

$("#btnSendOtpSignup")?.addEventListener("click", ()=>{
  const email = $("#formSignup [name=email]").value.trim();
  if(!email) return alert("Nhập email trước đã!");
  alert("Demo: Đã gửi OTP đăng ký tới " + email);
});

$("#formSignup")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  console.log("SIGNUP", data);
  alert("Demo: Tạo tài khoản thành công! Hệ thống sẽ nhắc cập nhật hồ sơ.");
  modal.classList.add("hidden");
});

$("#btnSendOtpReset")?.addEventListener("click", ()=>{
  const email = $("#formReset [name=email]").value.trim();
  if(!email) return alert("Nhập email trước đã!");
  alert("Demo: Đã gửi OTP đặt lại mật khẩu tới " + email);
});

$("#formReset")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  console.log("RESET", data);
  alert("Demo: Đặt lại mật khẩu thành công! Bạn có thể đăng nhập lại.");

  // chuyển về tab đăng nhập
  $$('.tabs .tab').forEach(b=>b.classList.remove('active'));
  $('[data-tab="login"]').classList.add('active');
  $$(".tab-panel").forEach(p=>p.classList.remove("show"));
  $("#tab-login").classList.add("show");
});

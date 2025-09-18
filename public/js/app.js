// ====== NiNi — base app (no effects) + Auth UI mock ======
(() => {
  // Ảnh nền cho từng chế độ
  const BG = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  // DOM
  const scene     = document.getElementById("scene");
  const tabWrap   = document.getElementById("seasonTabs");
  const panelEl   = document.getElementById("infoPanel");
  const pillWrap  = document.querySelector(".pill-nav");

  // Auth DOM
  const authBtn   = document.getElementById("authEntry");
  const modal     = document.getElementById("authModal");
  const bodyWrap  = document.getElementById("authBody");

  // States
  let season = "home";
  let panel  = "about";

  // ---------- SEASONS ----------
  function setSeason(next) {
    if (!BG[next]) next = "home";
    season = next;
    scene.src = BG[season];

    for (const btn of tabWrap.querySelectorAll(".tab")) {
      btn.classList.toggle("is-active", btn.dataset.season === season);
    }
  }

  tabWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    setSeason(btn.dataset.season);
  });

  // ---------- INFO PANELS ----------
  function setPanel(next) {
    panel = next;
    for (const p of pillWrap.querySelectorAll(".pill")) {
      p.classList.toggle("is-active", p.dataset.panel === panel);
    }
    switch (panel) {
      case "about":
        panelEl.innerHTML = `
          <h2 class="panel-title">NiNi — Funny</h2>
          <p class="panel-text">Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.</p>
        `;
        break;
      case "rules":
        panelEl.innerHTML = `
          <h2 class="panel-title">Luật chơi</h2>
          <p class="panel-text">Các luật đơn giản, minh hoạ rõ ràng. Điểm thưởng tích luỹ theo nhiệm vụ.</p>
        `;
        break;
      case "forum":
        panelEl.innerHTML = `
          <h2 class="panel-title">Diễn đàn</h2>
          <p class="panel-text">Nơi trao đổi mẹo, chia sẻ kết quả và thảo luận cùng bạn bè/PH.</p>
        `;
        break;
      case "feedback":
        panelEl.innerHTML = `
          <h2 class="panel-title">Góp ý</h2>
          <p class="panel-text">Hãy gửi góp ý để mình tối ưu thêm trải nghiệm nhé!</p>
        `;
        break;
    }
  }

  pillWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    setPanel(btn.dataset.panel);
  });

  // Init base UI
  setSeason("home");
  setPanel("about");

  // =========================================================
  //                AUTH UI (mock, chưa nối API)
  // =========================================================
  const LS_KEY = "nini_auth";   // {provider, email?, time}
  const OTP_KEY = "nini_otp";   // {email, code, exp}

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); }
    catch { return null; }
  }
  function setAuth(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  function clearAuth() { localStorage.removeItem(LS_KEY); }

  function updateAuthEntry() {
    const a = getAuth();
    if (a) {
      authBtn.textContent = a.email ? `Xin chào, ${a.email}` : "Tài khoản Google";
      authBtn.title = "Nhấn để đăng xuất";
      authBtn.dataset.mode = "logout";
    } else {
      authBtn.textContent = "Đăng nhập / Đăng ký";
      authBtn.title = "";
      authBtn.dataset.mode = "login";
    }
  }

  // Modal helpers
  function openModal(state = "choose") {
    modal.classList.add("show");
    modal.setAttribute("open", "");
    setModalState(state);
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    modal.classList.remove("show");
    modal.removeAttribute("open");
    modal.setAttribute("aria-hidden", "true");
  }
  function setModalState(state) {
    // ẩn/hiện các section theo data-state
    bodyWrap.querySelectorAll("[data-state]").forEach(sec => {
      sec.classList.toggle("is-current", sec.dataset.state === state);
      sec.hidden = sec.dataset.state !== state;
    });
  }

  // Click ngoài / nút đóng
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
    if (e.target.dataset.back) setModalState(e.target.dataset.back);
  });

  // Entry click: login hoặc logout
  authBtn.addEventListener("click", () => {
    if (authBtn.dataset.mode === "logout") {
      clearAuth();
      updateAuthEntry();
      // tuỳ chọn: thông báo nhỏ
      alert("Đã đăng xuất.");
      return;
    }
    openModal("choose");
  });

  // ========== Google login (giả lập) ==========
  const btnGoogle = document.getElementById("btnGoogle");
  btnGoogle?.addEventListener("click", async () => {
    // TODO: sau này thay bằng OAuth thật (Firebase/Google Identity Services)
    // Demo: giả lập thành công
    await wait(600);
    setAuth({ provider: "google", time: Date.now() });
    updateAuthEntry();
    setModalState("remind");
  });

  // ========== Email register + OTP (giả lập) ==========
  const btnEmail = document.getElementById("btnEmail");
  const inpEmail = document.getElementById("regEmail");
  const otpNote  = document.getElementById("otpNote");
  const otpHint  = document.getElementById("otpHint");
  const btnSend  = document.getElementById("btnSendOtp");
  const inpOtp   = document.getElementById("otpInput");
  const btnVerify= document.getElementById("btnVerifyOtp");

  btnEmail?.addEventListener("click", () => {
    inpEmail.value = "";
    otpNote.hidden = true;
    setModalState("email1");
  });

  btnSend?.addEventListener("click", () => {
    const email = (inpEmail.value || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      alert("Email chưa hợp lệ.");
      return;
    }
    // tạo OTP 6 số & "gửi"
    const code = ("" + Math.floor(100000 + Math.random() * 900000));
    const exp  = Date.now() + 5*60*1000; // 5 phút
    localStorage.setItem(OTP_KEY, JSON.stringify({ email, code, exp }));

    otpNote.hidden = false;
    otpNote.textContent = `Đã gửi OTP tới ${email}. (DEMO: mã là ${code})`;
    // chuyển qua bước nhập OTP
    setTimeout(() => setModalState("email2"), 600);
  });

  btnVerify?.addEventListener("click", () => {
    const rec = readOtp();
    if (!rec) { alert("OTP đã hết hạn hoặc chưa gửi."); return; }
    const code = (inpOtp.value || "").trim();
    if (code.length !== 6) { alert("Vui lòng nhập đủ 6 số OTP."); return; }
    if (code !== rec.code) { alert("Mã OTP chưa đúng."); return; }

    // thành công
    localStorage.removeItem(OTP_KEY);
    setAuth({ provider: "email", email: rec.email, time: Date.now() });
    updateAuthEntry();
    inpOtp.value = "";
    otpHint.hidden = false;
    otpHint.textContent = `Đã xác thực ${rec.email}`;
    setModalState("remind");
  });

  function readOtp() {
    try {
      const o = JSON.parse(localStorage.getItem(OTP_KEY) || "null");
      if (!o) return null;
      if (Date.now() > o.exp) { localStorage.removeItem(OTP_KEY); return null; }
      return o;
    } catch { return null; }
  }

  // Utilities
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  // Boot auth UI
  updateAuthEntry();
})();

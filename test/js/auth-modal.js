// /test/js/auth-modal.js
// ===== NiNi Auth Modal: render + hành vi =====
// Phụ thuộc: window.N (core bus), window.N.fb (nini-fb.mjs)

(function () {
  const MODAL_ID = "authModal";
  const BACKDROP_ID = "authBackdrop";
  const SVERI = "/.netlify/functions/send-verification-email";
  const SRESET = "/.netlify/functions/send-reset";

  // Avoid double init
  if (window.NiNiAuth) return;

  // ---------- utils ----------
  const qs = (sel, el = document) => el.querySelector(sel);
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
  const sayTo = (root) => {
    const el = qs("#auth_msg", root);
    return (m, ok = false) => {
      if (!el) return;
      el.textContent = m;
      el.style.color = ok ? "#065f46" : "#7f1d1d";
    };
  };

  // Lấy currentUser an toàn (bao bọc để wrapper là prop hay func đều ok)
  function getCurrentUser() {
    const fb = window.N?.fb;
    if (!fb) return null;
    return typeof fb.currentUser === "function" ? fb.currentUser() : fb.currentUser || null;
  }

  // Chuẩn hoá phản hồi gửi mail (tránh “đã gửi nhưng vẫn báo lỗi 500”)
  function handleMailResponse(r, js, say) {
    if (r.ok) {
      say("Đã gửi email. Vui lòng kiểm tra hộp thư.", true);
      return;
    }
    const msg = (js && (js.error || js.message || js.reason)) || "";
    const up = String(msg).toUpperCase();

    // Firebase throttling → coi như đã gửi gần đây
    if (up.includes("TOO_MANY_ATTEMPTS_TRY_LATER") || up.includes("TOO_MANY_REQUESTS")) {
      say("Bạn vừa yêu cầu gần đây. Nếu email tồn tại, hệ thống đã gửi thư. Hãy kiểm tra hộp thư / Spam.", true);
      return;
    }

    throw new Error(msg || "SEND_FAILED");
  }

  // Khoá nút chống spam (tuỳ chọn)
  function cooldown(btn, sec = 60) {
    if (!btn) return;
    btn.disabled = true;
    const txt = btn.textContent;
    let t = sec;
    const id = setInterval(() => {
      btn.textContent = `${txt} (${t--}s)`;
      if (t < 0) {
        clearInterval(id);
        btn.disabled = false;
        btn.textContent = txt;
      }
    }, 1000);
  }

  function openModal(tab = "login") {
    const back = qs("#" + BACKDROP_ID);
    const host = qs("#" + MODAL_ID);
    if (!back || !host) return;
    document.body.classList.add("body-auth-open");
    back.hidden = false;
    host.hidden = false;
    host.classList.add("open");
    host.innerHTML = renderHTML(tab);
    bindBehavior(host);
  }

  function closeModal() {
    const back = qs("#" + BACKDROP_ID);
    const host = qs("#" + MODAL_ID);
    if (!back || !host) return;
    document.body.classList.remove("body-auth-open");
    back.hidden = true;
    host.hidden = true;
    host.classList.remove("open");
    host.innerHTML = "";
  }

  function renderHTML(active = "login") {
    const is = (k) => (k === active ? "active" : "");
    return `
      <div class="auth-panel glass" role="dialog" aria-modal="true">
        <div class="auth-head">
          <h3 class="auth-title">Tài khoản NiNi</h3>
          <button class="auth-close" data-x>&times;</button>
        </div>

        <div class="auth-tabs" role="tablist">
          <button class="auth-tab ${is("login")}" data-tab="login">Đăng nhập</button>
          <button class="auth-tab ${is("signup")}" data-tab="signup">Đăng ký</button>
          <button class="auth-tab ${is("forgot")}" data-tab="forgot">Quên mật khẩu</button>
        </div>

        <div class="auth-body" data-view="${active}">
          ${active === "login" ? viewLogin() : active === "signup" ? viewSignup() : viewForgot()}
        </div>
      </div>`;
  }

  const viewLogin = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-row"><label>Mật khẩu</label>
      <input class="auth-input" type="password" id="auth_pass" placeholder="••••••••">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-login>Đăng nhập</button>
      <button class="auth-btn ghost" data-google>Đăng nhập Google</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>`;

  const viewSignup = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-signup>Gửi email xác minh</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>
    <div class="auth-msg">* Sau khi xác minh, bạn sẽ được hướng sang trang đặt mật khẩu.</div>`;

  const viewForgot = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-forgot>Gửi email đặt lại mật khẩu</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>`;

  // ---------- behavior ----------
  function bindBehavior(root) {
    const setTab = (tab) => {
      root.innerHTML = renderHTML(tab);
      bindBehavior(root);
    };
    const say = sayTo(root);

    root.addEventListener("click", async (ev) => {
      const t = ev.target;
      if (t.matches("[data-x]")) {
        closeModal();
        return;
      }
      if (t.matches(".auth-tab")) {
        setTab(t.dataset.tab);
        return;
      }

      const vEmail = () => qs("#auth_email", root)?.value.trim().toLowerCase();
      const vPass = () => qs("#auth_pass", root)?.value;

      try {
        // --- ĐĂNG NHẬP EMAIL/PASS ---
        if (t.matches("[data-login]")) {
          const email = vEmail();
          const pass = vPass();
          if (!isEmail(email) || !pass) {
            say("Email/mật khẩu chưa hợp lệ");
            return;
          }
          say("Đang đăng nhập...");
          const cred = await window.N.fb.signIn(email, pass);
          const user = cred?.user ?? getCurrentUser();
          say("Đăng nhập thành công!", true);

          // Phát sự kiện cho toàn site
          document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: user }));
          window.N?.emit?.("auth:changed", user);
          window.N?.emit?.("auth:login", user);

          setTimeout(closeModal, 250);
          return;
        }

        // --- ĐĂNG NHẬP GOOGLE ---
        if (t.matches("[data-google]")) {
          say("Đang mở Google...");
          const cred = await window.N.fb.signInGoogle?.();
          const user = cred?.user ?? getCurrentUser();
          say("Đăng nhập Google thành công!", true);

          document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: user }));
          window.N?.emit?.("auth:changed", user);
          window.N?.emit?.("auth:login", user);

          setTimeout(closeModal, 250);
          return;
        }

        // --- GỬI EMAIL XÁC MINH (Đăng ký) ---
        if (t.matches("[data-signup]")) {
          const email = vEmail();
          if (!isEmail(email)) {
            say("Email không hợp lệ");
            return;
          }
          say("Đang gửi thư xác minh...");
          cooldown(t, 60);
          const r = await fetch(SVERI, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, createIfMissing: true }),
          });
          const js = await r.json().catch(() => ({}));
          try {
            handleMailResponse(r, js, say);
          } catch (err) {
            say(`Lỗi: ${err.message || err}`);
          }
          return;
        }

        // --- GỬI LINK ĐẶT LẠI MẬT KHẨU ---
        if (t.matches("[data-forgot]")) {
          const email = vEmail();
          if (!isEmail(email)) {
            say("Email không hợp lệ");
            return;
          }
          say("Đang gửi liên kết đặt lại...");
          cooldown(t, 60);
          const r = await fetch(SRESET, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const js = await r.json().catch(() => ({}));
          try {
            handleMailResponse(r, js, say);
          } catch (err) {
            say(`Lỗi: ${err.message || err}`);
          }
          return;
        }
      } catch (err) {
        console.error(err);
        say(`Lỗi: ${err.message || err}`);
      }
    });
  }

  // ---------- expose ----------
  window.NiNiAuth = {
    open: (tab) => openModal(tab),
    close: closeModal,
  };

  // Sự kiện nền: click nền để đóng
  document.getElementById(BACKDROP_ID)?.addEventListener("click", closeModal);
})();

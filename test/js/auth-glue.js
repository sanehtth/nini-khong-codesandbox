/**
 * auth-glue.js — Kết nối modal ↔ Firebase wrapper
 * - Bắt event NINI.emit(): auth:login | auth:signup | auth:reset | auth:google
 * - Toggle UI header theo user (btn đăng nhập / avatar + đăng xuất)
 * - Đóng modal sau thao tác thành công
 *
 * Phần header kỳ vọng (nếu có):
 *   #btnAuthOpen  — nút mở modal
 *   #btnLogout    — nút đăng xuất (nếu chưa có, file này sẽ tạo)
 *   #userAvatar   — khung avatar (div/img) + #userNick (span) (nếu chưa có, file này sẽ tạo)
 *
 * Nếu header của bạn render khác, chỉ cần giữ **id** như trên hoặc thêm
 * các data-attr tương đương: [data-auth="open"], [data-auth="logout"], [data-auth="avatar"], [data-auth="nick"]
 */

(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  const FB = () => (window.NINI && window.NINI.fb) || {};

  // ---------- Helpers ----------
  function $(sel, root = document) { return root.querySelector(sel); }

  function setMsg(type, text) {
    const wrap = $("#authModal .auth-box");
    if (!wrap) { if (text) console.log(text); return; }
    let msg = wrap.querySelector(".msg");
    if (!msg) { msg = document.createElement("div"); msg.className = "msg"; wrap.appendChild(msg); }
    msg.className = "msg " + (type || "");
    msg.textContent = text || "";
  }

  function setFormLoading(formId, loading, textLoading) {
    const f = document.getElementById(formId); if (!f) return;
    const btn = f.querySelector('button[type="submit"]'); if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = textLoading || "Đang xử lý...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._text || btn.textContent;
      btn.disabled = false;
    }
  }

  function closeModal() {
    const m = document.getElementById("authModal"); if (!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-auth-open");
    N.emit && N.emit("auth:close");
  }

  // ---------- Header DOM (tạo nếu thiếu) ----------
  function headerParts() {
    const root = document.getElementById("nini_header") || document;

    let openBtn  = root.querySelector("#btnAuthOpen, [data-auth='open']");
    let logoutBtn = root.querySelector("#btnLogout, [data-auth='logout']");
    let avatarBox = root.querySelector("#userAvatar, [data-auth='avatar']");
    let nickEl = root.querySelector("#userNick, [data-auth='nick']");

    // tạo thiếu thì bổ sung gọn
    const userbox = root.querySelector(".userbox") || root;

    if (!logoutBtn) {
      logoutBtn = document.createElement("button");
      logoutBtn.id = "btnLogout";
      logoutBtn.setAttribute("data-auth", "logout");
      logoutBtn.textContent = "Đăng xuất";
      logoutBtn.style.display = "none";
      logoutBtn.className = (openBtn && openBtn.className) || "btn-auth";
      userbox.appendChild(logoutBtn);
    }
    if (!avatarBox) {
      avatarBox = document.createElement("div");
      avatarBox.id = "userAvatar";
      avatarBox.setAttribute("data-auth", "avatar");
      avatarBox.style.display = "none";
      avatarBox.style.alignItems = "center";
      avatarBox.style.gap = "8px";
      userbox.prepend(avatarBox);
    }
    if (!nickEl) {
      nickEl = document.createElement("span");
      nickEl.id = "userNick";
      nickEl.setAttribute("data-auth", "nick");
      avatarBox.appendChild(nickEl);
    }

    return { root, openBtn, logoutBtn, avatarBox, nickEl };
  }

  function initialsOf(u) {
    const name = (u?.displayName || u?.email || "").trim();
    const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const a = (parts[0] || "").charAt(0).toUpperCase();
    const b = (parts[parts.length - 1] || "").charAt(0).toUpperCase();
    return (a + b) || "U";
  }

  function renderUserState(user) {
    const { openBtn, logoutBtn, avatarBox, nickEl } = headerParts();

    if (user) {
      document.body.setAttribute("data-auth", "in");
      if (openBtn) openBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "";

      avatarBox.style.display = "inline-flex";
      avatarBox.innerHTML = ""; // clear
      // avatar (img/initials)
      if (user.photoURL) {
        const img = document.createElement("img");
        img.src = user.photoURL;
        img.alt = user.displayName || user.email || "avatar";
        img.referrerPolicy = "no-referrer";
        img.style.width = img.style.height = "28px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        avatarBox.appendChild(img);
      } else {
        const dot = document.createElement("div");
        dot.textContent = initialsOf(user);
        Object.assign(dot.style, {
          width: "28px", height: "28px", borderRadius: "50%", display: "grid",
          placeItems: "center", background: "#ececff", color: "#4b47ff", fontWeight: "700"
        });
        avatarBox.appendChild(dot);
      }
      const span = document.createElement("span");
      span.id = "userNick";
      span.textContent = user.displayName || (user.email?.split("@")[0] ?? "NiNi");
      avatarBox.appendChild(span);
    } else {
      document.body.setAttribute("data-auth", "out");
      if (logoutBtn) logoutBtn.style.display = "none";
      if (avatarBox) { avatarBox.style.display = "none"; avatarBox.innerHTML = ""; }
      if (openBtn) openBtn.style.display = "";
    }
  }

  // ---------- Wire logout (ủy quyền click) ----------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnLogout, [data-auth='logout']");
    if (!btn) return;
    e.preventDefault();
    try {
      const fb = FB();
      if (!fb.logout) throw new Error("Thiếu NINI.fb.logout()");
      await fb.logout();
      // sạch UI + cache (nếu có)
      localStorage.removeItem("nini.auth");
      localStorage.removeItem("nini.user");
      renderUserState(null);
      setMsg("ok", "Đã đăng xuất");
    } catch (err) {
      console.error(err);
      setMsg("err", err?.message || "Đăng xuất thất bại");
    }
  });

  // ---------- Subscribe user từ Firebase ----------
  try {
    const fb = FB();
    fb.onUserChanged && fb.onUserChanged((u) => {
      renderUserState(u);
      console.log("[NINI] user:", u ? (u.email || u.uid) : "signed out");
    });
    // set OUT ngay lúc mới vào, sau đó listener sẽ set IN nếu có phiên thật
    renderUserState(null);
  } catch (e) { console.warn(e); }

  // ---------- Handlers cho event từ modal ----------
  N.on && N.on("auth:login", async ({ email, password }) => {
    try {
      setMsg("", "");
      setFormLoading("formLogin", true, "Đang đăng nhập...");
      const fb = FB();
      const fn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!fn) throw new Error("Thiếu NINI.fb.loginEmailPass()");
      const user = await fn(String(email || "").toLowerCase(), password || "");
      setMsg("ok", "Đăng nhập thành công!");
      closeModal();
      renderUserState(user);
    } catch (err) {
      console.error(err);
      setMsg("err", err?.message || "Đăng nhập thất bại");
    } finally {
      setFormLoading("formLogin", false);
    }
  });

  N.on && N.on("auth:signup", async ({ email }) => {
    try {
      setMsg("", "");
      setFormLoading("formSignup", true, "Đang gửi email xác minh...");
      const fb = FB();
      if (!fb.registerEmailOnly) throw new Error("Thiếu NINI.fb.registerEmailOnly()");
      await fb.registerEmailOnly(String(email || "").toLowerCase());
      setMsg("ok", "Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.");
      closeModal();
    } catch (err) {
      console.error(err);
      setMsg("err", err?.message || "Đăng ký thất bại");
    } finally {
      setFormLoading("formSignup", false);
    }
  });

  N.on && N.on("auth:reset", async ({ email }) => {
    try {
      setMsg("", "");
      setFormLoading("formReset", true, "Đang gửi email...");
      const fb = FB();
      if (!fb.resetPassword) throw new Error("Thiếu NINI.fb.resetPassword()");
      await fb.resetPassword(String(email || "").toLowerCase());
      setMsg("ok", "Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.");
      closeModal();
    } catch (err) {
      console.error(err);
      setMsg("err", err?.message || "Gửi mail thất bại");
    } finally {
      setFormLoading("formReset", false);
    }
  });

  N.on && N.on("auth:google", async () => {
    try {
      setMsg("", "");
      const fb = FB();
      if (!fb.loginGoogle) throw new Error("Thiếu NINI.fb.loginGoogle()");
      const user = await fb.loginGoogle();
      setMsg("ok", "Đăng nhập Google thành công!");
      closeModal();
      renderUserState(user);
    } catch (err) {
      console.error(err);
      setMsg("err", err?.message || "Đăng nhập Google thất bại");
    }
  });
})();

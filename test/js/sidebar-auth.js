// /test/js/sidebar-auth.js
(function () {
  const SLOT_SEL = ".side-icons"; // container các nút sidebar
  const BTN_ID = "sb-auth-btn";

  function currentUser() {
    const fb = window.N?.fb;
    return typeof fb?.currentUser === "function" ? fb.currentUser() : fb?.currentUser || null;
  }

  function render() {
    const wrap = document.querySelector(SLOT_SEL);
    if (!wrap) return;
    let btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement("a");
      btn.id = BTN_ID;
      btn.className = "icon-btn";
      wrap.appendChild(btn);
    }

    const u = currentUser();
    const icon = u ? "/public/assets/icons/logout.webp" : "/public/assets/icons/login.webp";
    const label = u ? "Đăng xuất" : "Đăng nhập";
    btn.innerHTML = `
      <span class="icon"><img src="${icon}" alt=""></span>
      <span class="lbl">${label}</span>
    `;

    btn.onclick = async (e) => {
      e.preventDefault();
      if (currentUser()) {
        try { await window.N.fb.signOut?.(); } catch (err) { console.error(err); }
        // signOut của bạn sẽ tự phát NiNi:user-changed qua core bridge; nếu chưa, phát tay:
        document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: null }));
      } else {
        window.NiNiAuth?.open?.("login");
      }
    };
  }

  // khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", render);
  // khi route re-render (tuỳ SPA của bạn, nếu có)
  setTimeout(render, 0);
  // khi auth đổi trạng thái
  document.addEventListener("NiNi:user-changed", render);
})();

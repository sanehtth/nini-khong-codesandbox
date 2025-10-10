// /public/js/nini-fb.mjs
// ES module – gắn window.NINI.fb + modal 3 tab (Đăng nhập/Đăng ký/Quên mật khẩu)
// Mock login bằng localStorage để test UI; khi cần bạn thay bằng Firebase Auth.

const NS = (window.NINI ||= {});
const listeners = new Set();
const KEY = "nini_user";

// ---------- state helpers ----------
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function setCurrentUser(u) {
  if (!u) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(u));
  listeners.forEach(fn => { try { fn(getCurrentUser()); } catch {} });
}

// ---------- public API ----------
const fb = {
  async getCurrentUser() { return getCurrentUser(); },
  onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async logout() { setCurrentUser(null); },

  // Mở modal đăng nhập dạng 3 tab
  async loginModal() {
    // inject CSS 1 lần
    if (!document.getElementById("nini-login-css")) {
      const css = document.createElement("style");
      css.id = "nini-login-css";
      css.textContent = `
        .nini-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.25);backdrop-filter:blur(2px);display:grid;place-items:center;z-index:9999}
        .nini-modal{width:min(560px,92vw);border-radius:16px;background:var(--glass-bg,#ffffff0f);border:1px solid var(--glass-brd,#ffffff3a);backdrop-filter:blur(8px);padding:16px}
        .nini-tabs{display:flex;gap:8px;margin-bottom:12px}
        .nini-tab{padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);cursor:pointer}
        .nini-tab.active{background:rgba(255,255,255,.18)}
        .nini-form{display:grid;gap:10px}
        .nini-input{height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);padding:0 12px;color:inherit}
        .nini-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
        .chip{display:inline-block;padding:8px 12px;border-radius:999px;border:1px solid var(--glass-brd,#ffffff3a);background:rgba(255,255,255,.08);cursor:pointer;user-select:none}
      `;
      document.head.appendChild(css);
    }

    // backdrop
    const wrap = document.createElement("div");
    wrap.className = "nini-modal-backdrop";
    wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });

    // modal
    const box = document.createElement("div");
    box.className = "nini-modal";
    wrap.appendChild(box);

    box.innerHTML = `
      <div class="nini-tabs">
        <button class="nini-tab active" data-t="login">Đăng nhập</button>
        <button class="nini-tab" data-t="signup">Đăng ký</button>
        <button class="nini-tab" data-t="reset">Quên mật khẩu</button>
      </div>
      <div class="nini-body"></div>
      <div class="nini-actions">
        <button class="chip" id="niniClose">Đóng</button>
        <button class="chip" id="niniOK">OK</button>
      </div>
    `;

    const body = box.querySelector(".nini-body");
    const btnOK = box.querySelector("#niniOK");
    box.querySelector("#niniClose").onclick = () => wrap.remove();

    function render(which="login") {
      box.querySelectorAll(".nini-tab").forEach(b => b.classList.toggle("active", b.dataset.t===which));
      if (which === "reset") {
        body.innerHTML = `
          <div class="nini-form">
            <input class="nini-input" id="email" type="email" placeholder="you@example.com"/>
          </div>`;
        btnOK.onclick = () => { alert("Đã gửi liên kết đặt lại mật khẩu (mock)."); wrap.remove(); };
      } else {
        body.innerHTML = `
          <div class="nini-form">
            <input class="nini-input" id="email" type="email" placeholder="you@example.com"/>
            <input class="nini-input" id="pwd" type="password" placeholder="Mật khẩu"/>
          </div>`;
        btnOK.onclick = () => {
          const email = body.querySelector("#email").value.trim();
          if (!email) { alert("Nhập email"); return; }
          // MOCK: coi như login/signup ok
          setCurrentUser({ email, photoURL: "/public/assets/avatar/NV1.webp" });
          wrap.remove();
        };
      }
    }
    box.querySelectorAll(".nini-tab").forEach(b => b.onclick = () => render(b.dataset.t));
    render("login");

    document.body.appendChild(wrap);
  }
};

// gắn lên namespace dùng chung
NS.fb = fb;

// Gọi ngay 1 lần để phát state hiện tại (nếu có)
setTimeout(() => listeners.forEach(fn => fn(getCurrentUser())), 0);

// (tùy chọn) export để dev có thể import nếu muốn
export default fb;

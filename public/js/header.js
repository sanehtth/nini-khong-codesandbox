<script>
/*!
 * NiNi Header (non-module, no HTML comments)
 * Mount vào #mini_header trên mọi trang.
 * Yêu cầu: nini-base.css (token) + header.css (style riêng)
 * Dùng các API nếu có:
 *   - NINI.fb.onUserChanged(cb)
 *   - NINI.fb.logout()
 *   - NINI.auth.open('login' | 'register' | 'recover') hoặc modal.open('login')
 */

(function () {
  // namespace an toàn
  window.NINI = window.NINI || {};
  const EXPOSE = (window.NINI.header = window.NINI.header || {});

  // --- template ---
  function html() {
    return (
      '<div class="mini-header glass">' +
      '  <div class="brand">' +
      '    <a class="brand__logo" href="/#home" aria-label="NiNi — Funny">' +
      '      <img src="/public/assets/icons/logonini.webp" alt="NiNi" />' +
      '    </a>' +
      '    <span class="brand__text">' +
      '      <img src="/public/assets/icons/logo_text.webp" alt="NiNi" />' +
      '    </span>' +
      '    <span class="slogan">Chơi mê ly, bứt phá tư duy</span>' +
      '  </div>' +
      '  <div class="userbox" id="niniUserBox">' +
      '    <button class="btn btn-primary" id="btnAuthOpen">Đăng nhập / Đăng ký</button>' +
      '  </div>' +
      '</div>'
    );
  }

  // --- helpers ---
  function openAuth(which) {
    // ưu tiên API mới
    try {
      if (window.NINI && NINI.auth && typeof NINI.auth.open === "function") {
        NINI.auth.open(which || "login");
        return;
      }
      if (window.modal && typeof modal.open === "function") {
        modal.open(which || "login");
        return;
      }
    } catch (e) {}
    alert("Mở cửa sổ đăng nhập/đăng ký.");
  }

  function renderUser(u) {
    const box = document.getElementById("niniUserBox");
    if (!box) return;

    if (!u) {
      // chưa đăng nhập
      box.innerHTML =
        '<button class="btn btn-primary" id="btnAuthOpen">Đăng nhập / Đăng ký</button>';
      const btn = document.getElementById("btnAuthOpen");
      if (btn) btn.addEventListener("click", function () { openAuth("login"); });
      return;
    }

    const email = u.email || "";
    const photo =
      u.photoURL ||
      "/public/assets/avatar/NiNi.webp";

    box.innerHTML =
      '<div class="u">' +
      `  <img class="u__avatar" src="${photo}" alt="avatar" />` +
      `  <span class="u__email" title="${email}">${email}</span>` +
      '  <button class="btn" id="btnAdmin" style="display:none">Admin</button>' +
      '  <button class="btn btn-danger" id="btnLogout">Đăng xuất</button>' +
      "</div>";

    // gợi ý: hiện nút Admin nếu user có quyền (tùy backend của bạn)
    try {
      if (u.isAdmin || (u.customClaims && u.customClaims.admin)) {
        const a = document.getElementById("btnAdmin");
        if (a) {
          a.style.display = "";
          a.addEventListener("click", function () {
            location.href = "/tools/about.html";
          });
        }
      }
    } catch (e) {}

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", async function () {
        try {
          if (window.NINI && NINI.fb && typeof NINI.fb.logout === "function") {
            await NINI.fb.logout();
          }
        } catch (err) {
          alert("Không đăng xuất được: " + (err && err.message ? err.message : err));
        }
      });
    }
  }

  // --- mount/destroy ---
  function mount(selector) {
    const host = document.querySelector(selector || "#mini_header");
    if (!host) return;
    host.innerHTML = html();

    // nút mở auth khi chưa đăng nhập (lần đầu render)
    const btn = document.getElementById("btnAuthOpen");
    if (btn) btn.addEventListener("click", function () { openAuth("login"); });

    // subscribe auth change
    try {
      if (window.NINI && NINI.fb && typeof NINI.fb.onUserChanged === "function") {
        NINI.fb.onUserChanged(renderUser);
      }
    } catch (e) {}
  }

  function destroy(selector) {
    const host = document.querySelector(selector || "#mini_header");
    if (host) host.innerHTML = "";
  }

  EXPOSE.mount = mount;
  EXPOSE.destroy = destroy;

  // auto-mount nếu có #mini_header
  document.addEventListener("DOMContentLoaded", function () {
    const quick = document.getElementById("mini_header");
    if (quick) mount("#mini_header");
  });
})();
</script>

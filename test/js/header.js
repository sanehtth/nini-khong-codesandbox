/* header.js — render brand + nav + hộp user (1 lần duy nhất) */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;
  N._wiredHeader = true;

  const ready = (fn) =>
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);

  function render() {
    const root = document.getElementById("nini_header");
    if (!root) return;

    root.innerHTML = `
      <div class="nini-header-wrap">
        <a class="brand" href="/#/home" aria-label="NiNi — Funny">
          <span class="logo" aria-hidden="true"></span>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="nav">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>

        <div class="userbox">
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>

          <div id="userInfo" class="user-info" style="display:none">
            <button id="btnProfile" class="avatar-btn" type="button" title="Hồ sơ" aria-label="Hồ sơ">
              <span id="userAvatar" class="avatar" role="img" aria-label="Avatar"></span>
            </button>
            <span id="userNick" class="nick"></span>
            <button id="btnLogout" class="btn-auth" type="button" data-auth="logout">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;

    // Mở modal đăng nhập
    document.getElementById("btnAuthOpen")?.addEventListener("click", () => {
      const m = document.getElementById("authModal");
      if (m) { m.classList.remove("hidden"); m.setAttribute("aria-hidden","false"); document.body.classList.add("body-auth-open"); }
      N.emit && N.emit("auth:open");
    });

    // Đi đến profile khi bấm avatar hoặc nút profile
    const goProfile = () => (location.href = "/profile.html");
    document.getElementById("btnProfile")?.addEventListener("click", goProfile);
    document.getElementById("userAvatar")?.addEventListener("click", goProfile);

    // Nếu có N.fb.currentUser() thì bật UI ngay (phần UI sẽ do auth-glue gọi renderUserState,
    // nhưng ta chủ động toggle để khỏi “nháy”)
    try {
      const u = N.fb?.currentUser?.();
      toggleAuthUI(u);
    } catch (_) {}
  }

  function toggleAuthUI(user) {
    const btnAuth = document.getElementById("btnAuthOpen");
    const boxUser = document.getElementById("userInfo");
    const nick = document.getElementById("userNick");
    const ava = document.getElementById("userAvatar");

    if (user) {
      btnAuth && (btnAuth.style.display = "none");
      boxUser && (boxUser.style.display = "inline-flex");
      const display = user.displayName || (user.email ? user.email.split("@")[0] : "") || "NiNi";
      if (nick) nick.textContent = display;

      // avatar: có photoURL thì dùng, không thì hiển thị chữ cái
      const letter = display.trim()[0]?.toUpperCase?.() || "U";
      if (ava) {
        ava.classList.remove("is-empty","is-photo");
        if (user.photoURL) {
          ava.style.setProperty("--ava-bg", `url("${user.photoURL}")`);
          ava.classList.add("is-photo");
          ava.removeAttribute("data-letter");
        } else {
          ava.style.removeProperty("--ava-bg");
          ava.classList.add("is-empty");
          ava.setAttribute("data-letter", letter);
        }
      }
      document.body.setAttribute("data-auth","in");
    } else {
      boxUser && (boxUser.style.display = "none");
      btnAuth && (btnAuth.style.display = "inline-flex");
      if (ava) { ava.style.removeProperty("--ava-bg"); ava.setAttribute("data-letter","U"); }
      if (nick) nick.textContent = "";
      document.body.setAttribute("data-auth","out");
    }
  }

  // Cho auth-glue gọi lại
  N.toggleAuthUI = toggleAuthUI;

  ready(render);
})();

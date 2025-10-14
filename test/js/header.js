// header.js — render header 1 lần, để chỗ cho delegation bắt click
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;        // chặn nạp 2 lần
  N._wiredHeader = true;

  function renderOnce() {
    const root = document.getElementById('nini_header');
    if (!root) {
      console.warn('[header] Không thấy #nini_header');
      return;
    }
    root.innerHTML = `
      <div class="nini-header-wrap">
        <a class="brand" href="/#/home" title="NiNi — Funny">
          <span class="logo" aria-hidden="true"></span>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="nav">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>

        <div class="userbox">
          <!-- trạng thái mặc định: khách -->
          <button id="btnAuthOpen" class="btn-auth" data-auth="open" type="button">Đăng nhập / Đăng ký</button>

          <!-- trạng thái đã đăng nhập (ẩn sẵn) -->
          <div id="userInfo" class="user-info" style="display:none">
            <button id="btnProfile" class="avatar" data-auth="avatar" type="button" title="Hồ sơ"></button>
            <span id="userNick" class="nick"></span>
            <button id="btnSignOut" class="btn-auth" data-auth="logout" type="button">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState !== 'loading') renderOnce();
  else document.addEventListener('DOMContentLoaded', renderOnce);
})();

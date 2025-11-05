// /test/js/sidebar-auth.js
(function () {
  const SLOT_SEL = ".side-icons";
  const BTN_ID = "sb-auth-btn";

  function currentUser(){
    const fb = window.N?.fb;
    return (typeof fb?.currentUser === "function") ? fb.currentUser() : (fb?.currentUser || null);
  }

  function render(){
    const wrap = document.querySelector(SLOT_SEL);
    if (!wrap) return;

    let btn = document.getElementById(BTN_ID);
    if (!btn){
      btn = document.createElement("a");
      btn.id = BTN_ID;
      btn.className = "icon-btn";
      btn.href = "javascript:void(0)";
      btn.setAttribute("aria-label","Auth");
      wrap.appendChild(btn);
    }

    const u = currentUser();
    const icon  = u ? "/public/assets/icons/logout.webp" : "/public/assets/icons/login.webp";
    const label = u ? "Đăng xuất" : "Đăng nhập";

    btn.innerHTML = `
      <span class="icon"><img src="${icon}" alt=""></span>
      <span class="lbl">${label}</span>
    `;

    btn.onclick = async (e) => {
      e.preventDefault();
      if (currentUser()){
        try { await window.N?.fb?.signOut?.(); } catch(err){ console.error(err); }
        // phòng khi wrapper chưa kịp phát:
        document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: null }));
      } else {
        window.NiNiAuth?.open?.("login");
      }
    };
  }

  document.addEventListener("DOMContentLoaded", render);
  setTimeout(render, 0);
  document.addEventListener("NiNi:user-changed", render);
})();

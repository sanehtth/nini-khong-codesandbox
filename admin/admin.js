// /admin/admin.js — shell quản trị đơn giản, ES6 cơ bản

function $(id) {
  return document.getElementById(id);
}

/* ===================== 1. Guard phiên đăng nhập ===================== */
(function guardSession () {
  try {
    fetch("/.netlify/functions/admin-auth/check", {
      credentials: "include"
    })
      .then(function (r) { return r.json().catch(function(){ return {}; }); })
      .then(function (j) {
        if (!j || !j.ok) {
          location.replace("/admin/login.html");
        }
      })
      .catch(function () {
        location.replace("/admin/login.html");
      });
  } catch (e) {
    location.replace("/admin/login.html");
  }
})();

var btnLogout = $("#btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", function () {
    try {
      fetch("/.netlify/functions/admin-auth/logout", {
        method: "POST",
        credentials: "include"
      }).catch(function(){});
    } catch (e) {}
    location.replace("/admin/login.html");
  });
}

/* ===================== 2. Đăng ký tool ===================== */

var TOOL_REGISTRY = {
  scores: {
    title: "Bảng điểm (theo ngày)",
    url: "/admin/tools/scores.html",
    note: "Xem & tải dữ liệu điểm"
  },
  storyboard: {
    title: "Tạo kịch bảng",
    url: "/admin/tools/storyboard.html",
    note: "Tạo kịch bảng"
  },
  makepromt: {
    title: "Tạo promt hinh-video",
    url: "/admin/tools/makepromt.html",
    note: "Prompt 5s • JSON/TSV"
  },
  avatar: {
    title: "Tạo avatar nhân vật",
    url: "/admin/tools/avatar.html",
    note: "Tạo avatar nhân vật"
  },
  character: {
    title: "Tạo hình nhân vật",
    url: "/admin/tools/character.html",
    note: "Form → ghép prompt → xem thử → lưu Firebase"
  },
  hotspot: {
    title: "Tạo điểm ảnh",
    url: "/admin/tools/hotspot.html",
    note: "Tạo điểm ảnh"
  },
  storybook: {
    title: "Tạo Storybook",
    url: "/admin/tools/storyboard.html",
    note: "Biên soạn truyện tranh / sách ảnh"
  },
  image: {
    title: "Tạo ảnh",
    url: "/admin/tools/TaoNV.html",
    note: "Tạo ảnh • HuggingFace / Replicate"
  },
  zip: {
    title: "Nén ảnh",
    url: "/admin/tools/image.html",
    note: "Nén ảnh"
  },
  users: {
    title: "Quản lý User",
    url: "/admin/tools/users.html",
    note: "Tìm kiếm, khóa/mở, reset email"
  }
};

/* ===================== 3. Tham chiếu UI ===================== */

var frame  = $("#toolFrame");
var empty  = $("#toolEmpty");
var titleEl = $("#toolTitle");
var metaEl  = $("#toolMeta");

var sidebar = document.querySelector(".admin-nav");
var buttons = [];
if (sidebar) {
  buttons = Array.prototype.slice.call(
    sidebar.querySelectorAll(".nav-btn[data-tool]")
  );
}

var focusIndex = 0;

/* ===================== 4. Hàm load tool ===================== */

function setActiveButton(toolKey) {
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    var isActive = btn.getAttribute("data-tool") === toolKey;
    if (isActive) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}

function loadTool(toolKey, pushHash) {
  if (pushHash === void 0) pushHash = true;

  var conf = TOOL_REGISTRY[toolKey];
  if (!conf || !frame || !titleEl || !metaEl) return;

  setActiveButton(toolKey);

  titleEl.textContent = conf.title;
  metaEl.textContent  = conf.note || "";

  frame.hidden = false;
  if (empty) empty.hidden = true;
  frame.src = conf.url;

  if (pushHash) {
    var h = new URL(location.href);
    h.hash = "#/tool/" + toolKey;
    history.pushState({ toolKey: toolKey }, "", h);
  }
}

/* ===================== 5. Click sidebar ===================== */

if (sidebar) {
  sidebar.addEventListener("click", function (e) {
    var target = e.target || e.srcElement;
    var btn = null;

    if (target.closest) {
      btn = target.closest(".nav-btn[data-tool]");
    }
    if (!btn) {
      var node = target;
      while (node && node !== sidebar) {
        if (node.classList &&
            node.classList.contains("nav-btn") &&
            node.getAttribute("data-tool")) {
          btn = node;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!btn) return;

    var key = btn.getAttribute("data-tool");
    if (key && TOOL_REGISTRY[key]) {
      loadTool(key);
    }
  });
}

/* ===================== 6. Điều hướng hash ===================== */

window.addEventListener("popstate", function () {
  var m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m && TOOL_REGISTRY[m[1]]) {
    loadTool(m[1], false);
  }
});

/* ===================== 7. Khởi động ===================== */

document.addEventListener("DOMContentLoaded", function () {
  var hash = location.hash || "";
  var m = hash.match(/#\/tool\/([a-z0-9_-]+)/i);
  var key = m && m[1] ? m[1] : null;

  if (!key || !TOOL_REGISTRY[key]) {
    if (TOOL_REGISTRY.scores) {
      key = "scores";
    } else if (buttons.length > 0) {
      key = buttons[0].getAttribute("data-tool");
    }
  }

  if (key && TOOL_REGISTRY[key]) {
    loadTool(key, false);

    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-tool") === key) {
        focusIndex = i;
        break;
      }
    }
  }
});

/* ===================== 8. Hotkeys ===================== */

function focusButton(i) {
  if (!buttons.length) return;
  focusIndex = (i + buttons.length) % buttons.length;
  for (var idx = 0; idx < buttons.length; idx++) {
    if (idx === focusIndex) {
      buttons[idx].classList.add("active");
    } else {
      buttons[idx].classList.remove("active");
    }
  }
}

window.addEventListener("keydown", function (e) {
  if (!buttons.length) return;

  var key = e.key || e.code || "";

  if (e.altKey && (key === "ArrowDown" || key === "Down")) {
    e.preventDefault();
    focusButton(focusIndex + 1);
  }
  if (e.altKey && (key === "ArrowUp" || key === "Up")) {
    e.preventDefault();
    focusButton(focusIndex - 1);
  }
  if (key === "Enter") {
    var btn = buttons[focusIndex];
    if (btn) {
      var tKey = btn.getAttribute("data-tool");
      if (tKey && TOOL_REGISTRY[tKey]) {
        loadTool(tKey);
      }
    }
  }
  if (e.altKey && key.toLowerCase && key.toLowerCase() === "l") {
    var logoutBtn = $("#btnLogout");
    if (logoutBtn) logoutBtn.click();
  }
});

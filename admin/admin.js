// /admin/admin.js — shell quản trị đơn giản, chỉ dùng .admin-nav .nav-btn

const $ = (id) => document.getElementById(id);

/* ===================== 1. Guard phiên đăng nhập ===================== */
(async () => {
  try {
    const r = await fetch("/.netlify/functions/admin-auth/check", {
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!j || !j.ok) location.replace("/admin/login.html");
  } catch (_) {
    location.replace("/admin/login.html");
  }
})();

$("#btnLogout")?.addEventListener("click", async () => {
  try {
    await fetch("/.netlify/functions/admin-auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (_) {}
  location.replace("/admin/login.html");
});

/* ===================== 2. Đăng ký tool ===================== */
// key phải trùng với data-tool trong index.html
const TOOL_REGISTRY = {
  scores: {
    title: "Bảng điểm (theo ngày)",
    url: "/admin/tools/scores.html",
    note: "Xem & tải dữ liệu điểm",
  },
  storyboard: {
    title: "Tạo kịch bảng",
    url: "/admin/tools/storyboard.html",
    note: "Tạo kịch bảng",
  },
  makepromt: {
    title: "Tạo promt hinh-video",
    url: "/admin/tools/makepromt.html",
    note: "Prompt 5s • JSON/TSV",
  },
  avatar: {
    title: "Tạo avatar nhân vật",
    url: "/admin/tools/avatar.html",
    note: "Tạo avatar nhân vật",
  },
  character: {
    title: "Tạo hình nhân vật",
    url: "/admin/tools/character.html",
    note: "Form → ghép prompt → xem thử → lưu Firebase",
  },
  hotspot: {
    title: "Tạo điểm ảnh",
    url: "/admin/tools/hotspot.html",
    note: "Tạo điểm ảnh",
  },
  storybook: {
    title: "Tạo Storybook",
    url: "/admin/tools/storybook.html",
    note: "Biên soạn truyện tranh / sách ảnh",
  },
  image: {
    title: "Tạo ảnh",
    url: "/admin/tools/TaoNV.html",
    note: "Tạo ảnh • HuggingFace / Replicate",
  },
  zip: {
    title: "Nén ảnh",
    url: "/admin/tools/image.html",
    note: "Nén ảnh",
  },
  users: {
    title: "Quản lý User",
    url: "/admin/tools/users.html",
    note: "Tìm kiếm, khóa/mở, reset email",
  },
};

/* ===================== 3. Tham chiếu UI ===================== */
const frame = $("#toolFrame");
const empty = $("#toolEmpty");
const titleEl = $("#toolTitle");
const metaEl = $("#toolMeta");

const sidebar = document.querySelector(".admin-nav");
const buttons = sidebar
  ? Array.from(sidebar.querySelectorAll(".nav-btn[data-tool]"))
  : [];

let focusIndex = 0;

/* ===================== 4. Hàm load tool ===================== */
function setActiveButton(toolKey) {
  buttons.forEach((btn) => {
    const isActive = btn.dataset.tool === toolKey;
    btn.classList.toggle("active", isActive);
  });
}

function loadTool(toolKey, pushHash = true) {
  const conf = TOOL_REGISTRY[toolKey];
  if (!conf || !frame || !titleEl || !metaEl) return;

  // Active state sidebar
  setActiveButton(toolKey);

  // Heading
  titleEl.textContent = conf.title;
  metaEl.textContent = conf.note || "";

  // Hiện iframe, ẩn placeholder
  frame.hidden = false;
  if (empty) empty.hidden = true;
  frame.src = conf.url;

  // Đồng bộ hash
  if (pushHash) {
    const h = new URL(location.href);
    h.hash = `#/tool/${toolKey}`;
    history.pushState({ toolKey }, "", h);
  }
}

/* ===================== 5. Click sidebar ===================== */
if (sidebar) {
  sidebar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn[data-tool]");
    if (!btn) return;
    const key = btn.dataset.tool;
    if (key && TOOL_REGISTRY[key]) loadTool(key);
  });
}

/* ===================== 6. Điều hướng hash (back/forward) ===================== */
window.addEventListener("popstate", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m && TOOL_REGISTRY[m[1]]) {
    loadTool(m[1], false);
  }
});

/* ===================== 7. Khởi động ===================== */
document.addEventListener("DOMContentLoaded", () => {
  // Ưu tiên hash
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  let key = m?.[1];

  // Nếu hash không hợp lệ → dùng scores, nếu không có thì nút đầu tiên
  if (!key || !TOOL_REGISTRY[key]) {
    if (TOOL_REGISTRY.scores) {
      key = "scores";
    } else if (buttons[0]) {
      key = buttons[0].dataset.tool;
    }
  }

  if (key && TOOL_REGISTRY[key]) {
    loadTool(key, false);
    // set focusIndex khớp nút đang active
    focusIndex = Math.max(
      0,
      buttons.findIndex((b) => b.dataset.tool === key)
    );
  }
});

/* ===================== 8. Hotkeys: Alt+↑/↓ + Enter + Alt+L ===================== */
function focusButton(i) {
  if (!buttons.length) return;
  focusIndex = (i + buttons.length) % buttons.length;
  buttons.forEach((b, idx) => b.classList.toggle("active", idx === focusIndex));
}

window.addEventListener("keydown", (e) => {
  if (!buttons.length) return;

  if (e.altKey && (e.key === "ArrowDown" || e.key === "Down")) {
    e.preventDefault();
    focusButton(focusIndex + 1);
  }
  if (e.altKey && (e.key === "ArrowUp" || e.key === "Up")) {
    e.preventDefault();
    focusButton(focusIndex - 1);
  }
  if (e.key === "Enter") {
    const btn = buttons[focusIndex];
    if (btn) {
      const key = btn.dataset.tool;
      if (key && TOOL_REGISTRY[key]) loadTool(key);
    }
  }
  if (e.altKey && e.key?.toLowerCase() === "l") {
    $("#btnLogout")?.click();
  }
});

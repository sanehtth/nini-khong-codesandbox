// /admin/admin.js — SHELL QUẢN TRỊ (sạch, không lẫn logic tool con)

// ==== Guard phiên đăng nhập (giữ như bạn có) ====
const $ = (id) => document.getElementById(id);

(async () => {
  try {
    const r = await fetch("/.netlify/functions/admin-auth/check", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!j || !j.ok) location.replace("/admin/login.html");
  } catch (_) {
    location.replace("/admin/login.html");
  }
})();

$("#btnLogout")?.addEventListener("click", async () => {
  try {
    await fetch("/.netlify/functions/admin-auth/logout", { method: "POST", credentials: "include" });
  } catch (_) {}
  location.replace("/admin/login.html");
});

// ==== Danh mục tool (mỗi tool -> 1 trang HTML nội bộ) ====
const TOOL_REGISTRY = {
  scores: {
    title: "Bảng điểm (theo ngày)",
    url: "/admin/tools/scores.html",
    note: "Xem & tải dữ liệu điểm",
  },
  storyboard: {
    title: "Tạo kịch bảng",
    url: "/admin/tools/storyboard.html",
    note: "tạo kịch bảng",
  },
  makepromt: {
    title: "Tạo promt hinh-video",
    url: "/admin/tools/makepromt.html",
    note: "Prompt 5s • JSON/TSV",
  },
  avatar: {
    title: "Tạo avatar nhân vật",
    url: "/admin/tools/avatar.html",
    note: "tạo avatar nhân vật",
  },
  character: {
    title: "Tạo hình nhân vật",
    url: "/admin/tools/character.html",
    note: "Form → ghép prompt → xem thử → lưu Firebase",
  },
  hotspot: {
    title: "Tạo điểm ảnh",
    url: "/admin/tools/hotspot.html",
    note: "tạo điểm ảnh",
  },
  storybook: {
    title: "Tạo Storybook",
    url: "/admin/tools/storybook.html",
    note: "Biên soạn truyện tranh / sách ảnh",
  },
  image: {
    title: "Tạo ảnh",
    url: "/admin/tools/TaoNV.html",
    note: "Tạo ảnh Miễn phí • HuggingFace/Replicate",
  },
  zip: {
    title: "Nén ảnh",
    url: "/admin/tools/image.html",
    note: "nén ảnh",
  },
  users: {
    title: "Quản lý User",
    url: "/admin/tools/users.html",
    note: "Tìm kiếm, khóa/mở, reset email",
  },
};

// ==== Phần tử UI của shell ====
const sidebar = document.querySelector(".admin-nav");
const buttons = sidebar ? [...sidebar.querySelectorAll(".nav-btn")] : [];
const frame   = $("#toolFrame");
const empty   = $("#toolEmpty");
const titleEl = $("#toolTitle");
const metaEl  = $("#toolMeta");

// ==== Nạp 1 tool vào iframe ====
function loadTool(toolKey, pushHash = true) {
  const conf = TOOL_REGISTRY[toolKey];
  if (!conf || !frame || !titleEl || !metaEl) return;

  // active state trong sidebar
  buttons.forEach((b) => b.classList.toggle("active", b.dataset.tool === toolKey));

  // tiêu đề + mô tả
  titleEl.textContent = conf.title;
  metaEl.textContent = conf.note || "";

  // hiển thị iframe
  frame.hidden = false;
  if (empty) empty.hidden = true;
  frame.src = conf.url;

  // cập nhật hash để back/forward hoạt động
  if (pushHash) {
    const h = new URL(location.href);
    h.hash = `#/tool/${toolKey}`;
    history.pushState({ toolKey }, "", h);
  }
}

// ==== Click trong sidebar ====
sidebar?.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  loadTool(btn.dataset.tool);
});

// ==== Điều hướng bằng hash/back-forward ====
window.addEventListener("popstate", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m) loadTool(m[1], /* pushHash */ false);
});

// ==== Khởi động ====
(function boot() {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  const key = m?.[1] || "scores";
  if (!TOOL_REGISTRY[key]) return;
  loadTool(key, /* pushHash */ false);
})();

// ==== Phím tắt: Alt+↑/↓ để chọn tool; Enter để mở; Alt+L logout ====
let focusIndex = buttons.findIndex((b) => b.classList.contains("active"));
if (focusIndex < 0) focusIndex = 0;

function focusButton(i) {
  if (!buttons.length) return;
  focusIndex = (i + buttons.length) % buttons.length;
  buttons.forEach((b, idx) => b.classList.toggle("active", idx === focusIndex));
}

window.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key === "ArrowDown" || e.key === "Down")) {
    e.preventDefault(); focusButton(focusIndex + 1);
  }
  if (e.altKey && (e.key === "ArrowUp" || e.key === "Up")) {
    e.preventDefault(); focusButton(focusIndex - 1);
  }
  if (e.key === "Enter") {
    const btn = buttons[focusIndex];
    if (btn) loadTool(btn.dataset.tool);
  }
  if (e.altKey && e.key?.toLowerCase() === "l") {
    $("#btnLogout")?.click();
  }
});

// ===== KHÔNG ĐẶT LOGIC CỦA TOOL CON Ở DƯỚI NÀY =====
// Mỗi tool tự có JS riêng (vd. /admin/tools/makeprompt.js, /character.js, ...)
// ===================================================

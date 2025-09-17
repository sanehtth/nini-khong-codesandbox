// netlify/edge-functions/admin-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // 1) Cho phép truy cập login và các static asset trong /admin
  const isLogin = pathname === "/admin/login.html";
  const isAdminAsset =
    pathname.startsWith("/admin/") &&
    (pathname.endsWith(".js") ||
     pathname.endsWith(".css") ||
     pathname.endsWith(".png") ||
     pathname.endsWith(".webp") ||
     pathname.endsWith(".jpg") ||
     pathname.endsWith(".svg"));

  if (isLogin || isAdminAsset) {
    return context.next(); // không chặn trang login + file tĩnh
  }

  // 2) Chỉ bảo vệ các trang /admin/* còn lại
  if (pathname.startsWith("/admin")) {
    const cookie = request.headers.get("cookie") || "";
    const hasAdmin = /(?:^|;\s*)admin_auth=([^;]+)/.test(cookie);

    // Chưa có cookie => đưa đến login
    if (!hasAdmin) {
      url.pathname = "/admin/login.html";
      url.search = ""; // tránh loop vì query
      return Response.redirect(url, 302);
    }

    // Đã có cookie mà cố vào lại login => đưa về /admin/
    if (pathname === "/admin/") {
      return context.next();
    }
  }

  // 3) Mặc định cho qua
  return context.next();
};

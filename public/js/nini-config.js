// /public/js/nini-config.js


window.__NINI_FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyBdaMS7aI03wHLhi1Md2QDitJFkA61IYUU",
  authDomain: "nini-8f3d4.firebaseapp.com",
  projectId: "nini-8f3d4",
  storageBucket: "nini-8f3d4.firebasestorage.app",
  messagingSenderId: "991701821645",
  appId: "1:991701821645:web:fb21c357562c6c801da184",
};

// Đường dẫn Mail Pro (Netlify / Vercel / Cloudflare...)
// Dùng đúng base đã triển khai các function "send-reset" & "send-verification-email".
window.__NINI_MAIL_ENDPOINTS__ = {
  reset: '/.netlify/functions/send-reset',                // Netlify
  verify: '/.netlify/functions/send-verification-email'
  // Nếu dùng Vercel:  '/api/send-reset' , '/api/send-verification-email'
  // Nếu Cloudflare:  '/functions/send-reset' , '/functions/send-verification-email'
};

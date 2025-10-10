<!-- /public/js/nini-fb.js -->
(function (w) {
  const state = { ready: false, subs: [] };
  function onReady(cb) { state.ready ? cb() : state.subs.push(cb); }
  function emitReady() { state.ready = true; state.subs.splice(0).forEach(cb => cb()); }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function ensureSDK() {
    if (!(w.firebase && w.firebase.auth)) {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    }
  }

  // Tuỳ chọn: cấu hình dự phòng đóng cứng ngay trong file
  const FALLBACK_CFG = null; // { apiKey:'...', authDomain:'...', ... }

  function getCfg() {
    return (
      w.__NINI_FIREBASE_CONFIG__ ||
      w._NINI_FIREBASE_CONFIG__ ||
      w.NINI_FIREBASE_CONFIG ||
      FALLBACK_CFG
    );
  }

  async function init() {
    try {
      await ensureSDK();

      const cfg = getCfg();
      if (!cfg) {
        console.error('[nini-fb] Firebase SDK or config missing.');
        return; // không emit => header có thể chờ
      }

      // Singleton app/auth
      const app = w.__NINI_APP__ || (w.__NINI_APP__ = w.firebase.initializeApp(cfg));
      const auth = w.firebase.auth(app);

      w.NINI = w.NINI || {};
      w.NINI.fb = {
        auth,
        ready: onReady,
        onAuthStateChanged: (cb) => auth.onAuthStateChanged(cb),

        // Đăng nhập/đăng ký
        loginGoogle() {
          const p = new w.firebase.auth.GoogleAuthProvider();
          return auth.signInWithPopup(p);
        },
        loginEmail(email, password) {
          return auth.signInWithEmailAndPassword(email, password);
        },
        registerEmail(email, password, displayName = '') {
          return auth.createUserWithEmailAndPassword(email, password).then(cred => {
            if (displayName) return cred.user.updateProfile({ displayName }).then(() => cred);
            return cred;
          });
        },
        logout() { return auth.signOut(); },

        // Mail pro (Netlify Functions) – đổi path nếu bạn đặt khác
        sendReset(email) {
          return fetch('/.netlify/functions/send-reset', {
            method: 'POST', headers: {'content-type':'application/json'},
            body: JSON.stringify({ email })
          }).then(r => r.json());
        },
        sendVerify(email) {
          return fetch('/.netlify/functions/send-verification-email', {
            method: 'POST', headers: {'content-type':'application/json'},
            body: JSON.stringify({ email })
          }).then(r => r.json());
        }
      };

      // Bắn ready
      emitReady();
    } catch (e) {
      console.error('[nini-fb] init error:', e);
    }
  }

  init();
})(window);

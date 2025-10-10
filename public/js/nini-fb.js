/* nini-fb.js — NON-MODULE build (attach to window.NINI.fb)
 * Yêu cầu: đã nạp Firebase web SDK (compat) trước đó.
 */

(function () {
  'use strict';

  var W = window;
  var NINI = W.NINI = W.NINI || {};
  var FBNS = NINI.fb = NINI.fb || {};

  // --- Internal state ---
  var _app = null;
  var _auth = null;
  var _currentUser = null;
  var _ready = false;
  var _subs = []; // onUserChanged subscribers

  // ---------- Utilities ----------
  function noop() {}
  function onceDomReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else cb();
  }

  // call API helper (for mail pro). If fail → throw to caller.
  function callApi(path, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var to = setTimeout(function () {
        reject(new Error('API timeout'));
      }, timeoutMs || 10000);

      fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      })
        .then(function (r) {
          clearTimeout(to);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json().catch(function(){ return {}; });
        })
        .then(resolve)
        .catch(reject);
    });
  }

  function dispatchReady() {
    _ready = true;
    try {
      var ev = new CustomEvent('nini:fb:ready');
      window.dispatchEvent(ev);
    } catch (_) {}
  }

  function notifySubs(u) {
    for (var i = 0; i < _subs.length; i++) {
      try { _subs[i](u); } catch (e) { console.error(e); }
    }
  }

  // ---------- Firebase bootstrap ----------
  function initIfNeeded() {
    if (_auth) return;

    var cfg =
      W.__NINI_FIREBASE_CONFIG__ ||
      W._NINI_FIREBASE_CONFIG__ ||
      W.NINI_FIREBASE_CONFIG || null;

    if (!W.firebase || !cfg) {
      console.warn('[nini-fb] Firebase SDK or config missing.');
      // vẫn expose API rỗng để không crash
      dispatchReady();
      return;
    }

    try {
      _app = (W.firebase.apps && W.firebase.apps.length)
        ? W.firebase.app()
        : W.firebase.initializeApp(cfg);

      _auth = W.firebase.auth();
      // onAuthStateChanged
      _auth.onAuthStateChanged(function (user) {
        _currentUser = user;
        notifySubs(user);
      });

      dispatchReady();
    } catch (e) {
      console.error('[nini-fb] init error:', e);
      dispatchReady();
    }
  }

  // ---------- Public API ----------
  FBNS.onUserChanged = function (cb) {
    if (typeof cb === 'function') {
      _subs.push(cb);
      // replay hiện trạng
      try { cb(_currentUser); } catch (e) {}
    }
  };

  FBNS.getCurrentUser = function () { return _currentUser; };

  FBNS.loginGoogle = function () {
    if (!_auth || !W.firebase) return Promise.reject(new Error('Auth not ready'));
    var provider = new W.firebase.auth.GoogleAuthProvider();
    return _auth.signInWithPopup(provider).then(function (cred) { return cred.user; });
  };

  FBNS.loginEmailPass = function (email, password) {
    if (!_auth || !W.firebase) return Promise.reject(new Error('Auth not ready'));
    return _auth.signInWithEmailAndPassword(email, password).then(function (cred) { return cred.user; });
  };

  FBNS.registerEmailPass = function (email, password, displayName) {
    if (!_auth || !W.firebase) return Promise.reject(new Error('Auth not ready'));
    return _auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
      if (displayName) {
        return cred.user.updateProfile({ displayName: displayName }).then(function () { return cred.user; });
      }
      return cred.user;
    });
  };

  FBNS.logout = function () {
    if (!_auth || !W.firebase) return Promise.resolve();
    return _auth.signOut();
  };

  // Gửi reset qua mail pro; nếu lỗi → fallback về Firebase
  FBNS.resetPassword = function (email) {
    // 1) mail pro
    return callApi('/netlify/functions/send-reset', { email: email })
      .catch(function () {
        // 2) fallback Firebase
        if (!_auth || !W.firebase) throw new Error('Auth not ready');
        return _auth.sendPasswordResetEmail(email, {
          url: (location.origin + '/#/home'),
          handleCodeInApp: false
        });
      });
  };

  // Gửi email verify qua mail pro; nếu lỗi → fallback Firebase
  FBNS.sendVerificationEmail = function () {
    var u = _currentUser;
    if (!u) return Promise.reject(new Error('Not logged in'));

    return callApi('/netlify/functions/send-verification-email', { email: u.email })
      .catch(function () {
        if (!u || !u.sendEmailVerification) throw new Error('No verify method');
        return u.sendEmailVerification({
          url: (location.origin + '/auth-action.html?mode=verifyEmail&continueUrl=' + encodeURIComponent(location.href))
        });
      });
  };

  // Cho header kiểm tra đã sẵn sàng chưa
  FBNS.ready = function () { return _ready; };

  // Init asap (sau DOM để tránh race với config)
  onceDomReady(initIfNeeded);
})();

(() => {
  const evts = {};
  const on = (name, cb) => (evts[name] = evts[name] || []).push(cb);
  const emit = (name, data) => (evts[name] || []).forEach(fn => fn(data));

  const NINI = {
    on,
    emit,
    ready: false,
    onReady(cb) { this.ready ? cb() : on('__ready__', cb); },
    mount: {},     // nơi gắn các component mount
    api: {}        // nơi adapter sẽ gắn hàm login/register/resetPassword
  };

  window.NINI = NINI;
  NINI.ready = true;
  emit('__ready__');
})();

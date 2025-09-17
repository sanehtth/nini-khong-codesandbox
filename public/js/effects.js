/* Placeholder effects – NO-OP by default.
   Khi cần bật rơi hoa/tuyết, bạn có thể thay bằng file effect thật
   và trong app.js gọi window.SEASON_FX.start('.frame', 'spring' | 'winter' | ...) */
window.SEASON_FX = {
  start(){ /* no-op */ },
  stop(){ /* no-op */ }
};

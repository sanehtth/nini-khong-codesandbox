<script>
/*!
 * Stage helper — hiện tại chỉ để dành hook nhẹ (ví dụ tự add class theo mùa).
 * Bạn có thể bỏ file này nếu chưa cần JS cho stage.
 */
(function (W) {
  function seasonFromHash() {
    const h = (location.hash || '').toLowerCase();
    if (h.includes('spring')) return 'spring';
    if (h.includes('summer')) return 'summer';
    if (h.includes('autumn')) return 'autumn';
    if (h.includes('winter')) return 'winter';
    return 'home';
  }

  function applySeasonClass() {
    const s = seasonFromHash();
    document.documentElement.dataset.season = s; // ví dụ: [data-season="spring"] bạn tùy style thêm
  }

  W.addEventListener('hashchange', applySeasonClass);
  applySeasonClass();

  W.NINI = W.NINI || {};
  W.NINI.stage = { applySeasonClass };
})(window);
</script>

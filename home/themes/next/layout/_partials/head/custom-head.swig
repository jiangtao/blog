<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function() {
    console.log('ServiceWorker has been registered!');
  }).catch(console.error);
}
</script>

<!-- Image fallback for WebP support -->
<script src="/js/image-fallback.js"></script>

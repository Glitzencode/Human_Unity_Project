// ── HUMAN UNITY LOADING SCREEN ──
// Add this to every members page and any public page that loads Netlify Identity.
// Injects a loading overlay that hides the "jumpy" JS initialization,
// then fades out once the page is ready.

(function() {
  // Create overlay immediately — before DOM is ready
  var overlay = document.createElement('div');
  overlay.id = 'hu-loading';
  overlay.innerHTML = [
    '<style>',
    '#hu-loading {',
    '  position: fixed; inset: 0; z-index: 9999;',
    '  background: #F7F6F2;',
    '  display: flex; flex-direction: column;',
    '  align-items: center; justify-content: center;',
    '  transition: opacity 0.4s ease;',
    '}',
    '#hu-loading.fade-out { opacity: 0; pointer-events: none; }',
    '#hu-loading img {',
    '  width: 72px; height: 72px;',
    '  object-fit: contain;',
    '  animation: hu-spin 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;',
    '  transform-origin: center center;',
    '}',
    '@keyframes hu-spin {',
    '  0%   { transform: rotate(0deg) scale(1); }',
    '  25%  { transform: rotate(90deg) scale(1.08); }',
    '  50%  { transform: rotate(180deg) scale(1); }',
    '  75%  { transform: rotate(270deg) scale(1.08); }',
    '  100% { transform: rotate(360deg) scale(1); }',
    '}',
    '#hu-loading-wordmark {',
    '  margin-top: 1.25rem;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 13px;',
    '  font-weight: 500;',
    '  letter-spacing: 0.14em;',
    '  text-transform: uppercase;',
    '  color: #888780;',
    '  animation: hu-pulse 2.4s ease infinite;',
    '}',
    '@keyframes hu-pulse {',
    '  0%, 100% { opacity: 0.5; }',
    '  50%       { opacity: 1; }',
    '}',
    '</style>',
    '<img src="/images/hu-logo.jpg" alt="Human Unity">',
    '<div id="hu-loading-wordmark">Human Unity</div>'
  ].join('');

  // Insert as first child of body — works before DOMContentLoaded
  if (document.body) {
    document.body.insertBefore(overlay, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.insertBefore(overlay, document.body.firstChild);
    });
  }

  // Dismiss the overlay
  window.HULoading = {
    dismiss: function() {
      var el = document.getElementById('hu-loading');
      if (!el) return;
      el.classList.add('fade-out');
      setTimeout(function() {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 420);
    }
  };

  // Auto-dismiss after 4s as a safety net — should always be called
  // explicitly by each page once auth is resolved, but this prevents
  // the loader from hanging if something goes wrong.
  setTimeout(function() {
    window.HULoading && window.HULoading.dismiss();
  }, 4000);
})();

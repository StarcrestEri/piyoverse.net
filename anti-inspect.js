// Prevent right-click context menu
window.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C, Ctrl+S, Ctrl+P, Ctrl+Shift+K, Cmd+Opt+I (Mac)
window.addEventListener('keydown', function(e) {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'K')) ||
    (e.ctrlKey && (e.key === 'U' || e.key === 'S' || e.key === 'P')) ||
    (e.metaKey && e.altKey && e.key.toUpperCase() === 'I')
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// Attempt to block drag/drop of images and text selection
window.addEventListener('dragstart', function(e) { e.preventDefault(); });
document.addEventListener('selectstart', function(e) { e.preventDefault(); });

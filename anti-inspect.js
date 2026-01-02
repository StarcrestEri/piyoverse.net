(function(){
  try{ if(window.__legacy_low_end) return; }catch(e){}

  // Prevent right-click context menu
  try{
    window.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  }catch(e){}

  // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C, Ctrl+S, Ctrl+P, Ctrl+Shift+K, Cmd+Opt+I (Mac)
  try{
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
  }catch(e){}

  // Attempt to block drag/drop of images and text selection
  try{ window.addEventListener('dragstart', function(e) { e.preventDefault(); }); }catch(e){}
  try{ document.addEventListener('selectstart', function(e) { e.preventDefault(); }); }catch(e){}
})();

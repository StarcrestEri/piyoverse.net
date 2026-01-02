(function(){
  try{
    try{ if(window.__legacy_low_end) return; }catch(e){}
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function(){
      try{ navigator.serviceWorker.register('/sw.js', { scope: '/' }); }catch(e){}
    });
  }catch(e){}
})();

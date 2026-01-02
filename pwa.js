(function(){
  try{
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function(){
      try{ navigator.serviceWorker.register('/sw.js', { scope: '/' }); }catch(e){}
    });
  }catch(e){}
})();

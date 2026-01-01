(function(){
  try{
    var ua = navigator.userAgent || '';
    // Detect MSIE 7.0 explicitly
    var isIE7 = /MSIE\s7\.0/.test(ua);
    // Detect IE11 (Trident 7 + rv:11.0)
    var isIE11 = /Trident\/7\.0/.test(ua) && /rv:11\.0/.test(ua);
    // Allow forcing IE11 layout (for testing) with ?force_ie11=1 in URL
    var forceIE11 = (typeof location !== 'undefined' && location.search && location.search.indexOf('force_ie11=1') !== -1);
    if(isIE7){
      try{ document.documentElement.className = (document.documentElement.className||'') + ' ie7 no-pillarbox'; }catch(e){}
    }
    if(isIE11 || forceIE11){
      try{ document.documentElement.className = (document.documentElement.className||'') + ' ie11'; }catch(e){}
      if(forceIE11){ try{ document.documentElement.className = (document.documentElement.className||'') + ' force-ie11'; }catch(e){} }
      // Minimal polyfill: ensure document.addEventListener exists for site scripts
      if(!document.addEventListener){
        document.addEventListener = function(evt,fn){ document.attachEvent('on'+evt, fn); };
        document.removeEventListener = function(evt,fn){ document.detachEvent('on'+evt, fn); };
      }
    }
  }catch(e){}
})();

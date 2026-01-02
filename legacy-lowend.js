(function(){
  try{
    var ua = '';
    try{ ua = (navigator && navigator.userAgent) ? navigator.userAgent : ''; }catch(e){ ua = ''; }

    var isNintendo = false;
    try{ isNintendo = (/Nintendo\s+(3DS|DSi)/i.test(ua) || /Nitro/i.test(ua)); }catch(e){ isNintendo = false; }

    var isNetFront = false;
    try{ isNetFront = (/NetFront/i.test(ua) || /NX\b/i.test(ua)); }catch(e){ isNetFront = false; }

    var isOpera95 = false;
    try{ isOpera95 = (/Opera\/(9\.5\d?)/i.test(ua) || /Opera\s+9\.5/i.test(ua)); }catch(e){ isOpera95 = false; }

    var lacksFeatures = false;
    try{ if(!document || !document.getElementById || !document.getElementsByTagName) lacksFeatures = true; }catch(e){ lacksFeatures = true; }
    try{ if(!window || !window.XMLHttpRequest) lacksFeatures = true; }catch(e){ lacksFeatures = true; }
    try{ if(!document.addEventListener && !document.attachEvent) lacksFeatures = true; }catch(e){ lacksFeatures = true; }

    var legacy = !!(isNintendo || isNetFront || isOpera95 || lacksFeatures);

    // Never enable legacy mode in IE (keeps IE11 path untouched)
    try{ if(document && document.documentMode) legacy = false; }catch(e){}

    // Wii U / NintendoBrowser engines can mis-render the CSS pillarbox bars.
    // Disable pillarbox for them even if they don't need full low-end mode.
    try{
      var isNintendoBrowser = false;
      try{ isNintendoBrowser = (/NintendoBrowser/i.test(ua) || /WiiU/i.test(ua)); }catch(e){ isNintendoBrowser = false; }
      if(isNintendoBrowser){
        var deNB = document.documentElement;
        if(deNB){
          var cnNB = deNB.className || '';
          if(cnNB.indexOf('no-pillarbox') === -1){
            deNB.className = cnNB ? (cnNB + ' no-pillarbox') : 'no-pillarbox';
          }
        }
      }
    }catch(e){}

    if(!legacy) return;

    try{ window.__legacy_low_end = true; }catch(e){}

    try{
      var de = document.documentElement;
      if(de){
        var cn = de.className || '';
        if(cn.indexOf('legacy-lowend') === -1){
          de.className = cn ? (cn + ' legacy-lowend') : 'legacy-lowend';
        }
      }
    }catch(e){}

    // Load legacy CSS (prefer DOM injection; fall back to document.write)
    try{
      var head = document.getElementsByTagName('head')[0];
      if(head){
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = '/legacy-lowend.css';
        head.appendChild(link);
        return;
      }
    }catch(e){}

    try{ document.write('<link rel="stylesheet" type="text/css" href="/legacy-lowend.css">'); }catch(e){}
  }catch(e){}
})();

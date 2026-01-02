/* Simple SPA navigation (IE11-compatible) */
(function(){
  try{ if(window.__legacy_low_end) return; }catch(e){}
  if(window.__spa_installed) return; window.__spa_installed = true;

  // Force the site onto Opal + Light (no settings page / no dark mode).
  function enforceTheme(){
    try{
      var de = document.documentElement;
      if(!de) return;
      try{ de.setAttribute('data-theme-mode','light'); }catch(e){}
      try{ de.setAttribute('data-theme','opal'); }catch(e){}
    }catch(e){}
  }
  try{ enforceTheme(); }catch(e){}

  // Ensure hover/outlines for game cards remain present after SPA swaps.
    try{
      var _s = document.createElement('style');
      _s.id = 'spa-fallback-outline';
      // Use explicit colors for IE11 (avoid CSS variables) and ensure selector covers IE11
      _s.textContent = '\n@keyframes game-outline-rotate { to { transform: rotate(360deg); } }\nhtml.frutiger-aero .game-card::after { content:""; position:absolute; top:6px; right:-4px; bottom:6px; left:-4px; border-radius:14px; box-shadow: 0 0 0 1px rgba(43,111,160,0.95) !important; background-repeat:no-repeat; background-image:none; opacity:1 !important; pointer-events:none; transition: box-shadow 180ms ease, opacity 180ms ease; z-index:2; }\nhtml.frutiger-aero .game-card:hover::after { box-shadow: 0 0 18px rgba(182,220,255,0.95) !important; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%270%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27rgb(42%2C122%2C214)%27/%3E%3Cstop%20offset%3D%270.5%27%20stop-color%3D%27rgb(182%2C220%2C255)%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27rgb(42%2C122%2C214)%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20x%3D%273%27%20y%3D%273%27%20width%3D%2794%27%20height%3D%2794%27%20rx%3D%2714%27%20ry%3D%2714%27%20fill%3D%27none%27%20stroke%3D%27url(%23g)%27%20stroke-width%3D%276%27/%3E%3C/svg%3E"); background-repeat: no-repeat; background-size: 100% 100%; transform-origin: 50% 50%; animation: game-outline-rotate 1.6s linear infinite; z-index:3; }\n@supports (background: conic-gradient(from 0deg, #000, #fff)) {\n  html.frutiger-aero .game-card:hover::after { border: 6px solid transparent; box-sizing: border-box; background-image: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0)), conic-gradient(from 0deg, rgb(42,122,214) 0deg, rgb(182,220,255) 180deg, rgb(42,122,214) 360deg); background-origin: padding-box, border-box; background-clip: padding-box, border-box; background-repeat: no-repeat; background-size: auto, auto; transform-origin: 50% 50%; animation: game-outline-rotate 1.6s linear infinite; }\n}\nhtml.frutiger-aero .game-card::before { content:""; position:absolute; top:10px; bottom:6px; left:-4px; right:-4px; border-radius:12px; background-image: linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.06)), linear-gradient(to bottom, rgba(182,220,255,0.12), rgba(255,255,255,0.00)), linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0.02)); background-position: top left, top left, bottom left; background-size: 100% 28px, 100% 28px, 100% 7px; background-repeat: no-repeat; opacity:0; pointer-events:none; transition: transform 180ms ease, opacity 180ms ease; z-index:1; }\nhtml.frutiger-aero .game-card:hover::before { opacity:1 !important; transform: translateY(-2px) !important; }\n';
      try{ document.getElementsByTagName('head')[0].appendChild(_s); }catch(e){}
    }catch(e){}

  function isInternalLink(a){
    try{
      if(!a || !a.getAttribute) return false;
      var href = a.getAttribute('href');
      if(!href) return false;
      href = href.trim();
      if(href.indexOf('mailto:')===0 || href.indexOf('tel:')===0) return false;
      if(a.target && a.target.toLowerCase && a.target.toLowerCase()==='_blank') return false;
      // Resolve absolute URL — use URL when available, fallback to anchor element (IE11)
      var resolved = null;
      try{
        if(window.URL) resolved = (new URL(href, window.location.href)).href;
      }catch(e){ resolved = null; }
      if(!resolved){
        try{ var a2 = document.createElement('a'); a2.href = href; // will resolve relative to document
          // If hostname is empty, it's same-origin relative link
          if(a2.host && a2.host !== window.location.host) return false;
          resolved = a2.href;
        }catch(e){ return false; }
      }
      if(resolved.indexOf(window.location.origin) !== 0) return false;
      return true;
    }catch(e){ return false; }
  }

  function findAnchor(el){
    while(el && el !== document.documentElement){
      if(el.tagName && el.tagName.toLowerCase() === 'a') return el;
      el = el.parentNode;
    }
    return null;
  }

  function onLinkClick(ev){
    ev = ev || window.event;
    var target = ev.target || ev.srcElement;
    var a = findAnchor(target);
    if(!a || !isInternalLink(a)) return;
    // allow links with download attribute or with data-no-spa
    if(a.getAttribute('download') || a.hasAttribute('data-no-spa')) return;
    // allow ctrl/cmd/meta clicks or middle click
    if(ev.ctrlKey || ev.metaKey || ev.shiftKey || (ev.which && ev.which === 2)) return;
    var href = a.getAttribute('href') || a.href;
    // allow hash-only navigations
    if(href.indexOf('#') === 0 || (href.indexOf(window.location.pathname + '#') === 0)) return;
    try{ if(ev.preventDefault) ev.preventDefault(); else ev.returnValue = false; }catch(e){}
    ajaxNavigate(href, true);
  }

  function ajaxNavigate(href, addToHistory){
    try{
      var url = href;
      // preserve audio state if present (avoid restarting DOS.mp3)
      // IMPORTANT: only preserve/restore if user has music enabled.
      var preAudio = null;
      try{
        var musicEnabled = true;
        try{
          // default is on
          var pref = localStorage.getItem('site-music');
          if(pref === 'off') musicEnabled = false;
        }catch(e){ musicEnabled = true; }
        // also respect in-memory flag if present
        try{ if(window.siteMusicEnabled === false) musicEnabled = false; }catch(e){}
        var ael = document.getElementById('piyoverse-music');
        if(musicEnabled && ael){ preAudio = { playing: !ael.paused, time: ael.currentTime }; }
      }catch(e){ preAudio = null; }
      // Use XHR for IE11 compatibility
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4) return;
        if(xhr.status >= 200 && xhr.status < 300){
          var resp = xhr.responseText;
          var doc = null;
          try{ var dp = new DOMParser(); doc = dp.parseFromString(resp, 'text/html'); }catch(e){ doc = null; }
          if(!doc){ try{ var tmp = document.implementation.createHTMLDocument('tmp'); tmp.documentElement.innerHTML = resp; doc = tmp; }catch(e){} }
          if(!doc){ window.location.href = href; return; }

          // Update title
          try{ var nt = doc.getElementsByTagName('title')[0]; if(nt) document.title = nt.textContent || nt.innerText || document.title; }catch(e){}

          // Replace <main>
          try{
            var newMain = doc.getElementsByTagName('main')[0];
            var oldMain = document.getElementsByTagName('main')[0];
            // If the target page isn't a real SPA-capable page (e.g. it's a redirect stub
            // without <main>), fall back to normal navigation.
            if(!newMain || !oldMain){ window.location.href = href; return; }
            oldMain.innerHTML = newMain.innerHTML;
            var newPN = doc.querySelector('.page-name-container'); var oldPN = document.querySelector('.page-name-container');
            if(newPN && oldPN) oldPN.innerHTML = newPN.innerHTML;
          }catch(e){}

          // Execute inline scripts inside the new main
          try{
            var container = doc.getElementsByTagName('main')[0] || doc.body;
            var scripts = container.querySelectorAll('script');
            for(var i=0;i<scripts.length;i++){
              var s = scripts[i];
              var src = s.getAttribute('src');
              if(src){
                // avoid reloading global site scripts
                var skipList = ['market-audio.js','ribbons-of-life.js','ie-fixes.js','anti-inspect.js','spa.js'];
                var skip = false;
                for(var si=0; si<skipList.length; si++){ if(src.indexOf(skipList[si]) !== -1) { skip = true; break; } }
                if(skip) continue;
                var se = document.createElement('script'); se.src = src; document.body.appendChild(se);
              } else {
                try{ (new Function(s.innerHTML))(); }catch(e){}
              }
            }
          }catch(e){}

          // push history
          try{ if(addToHistory && window.history && window.history.pushState) window.history.pushState({spa:true}, '', url); }catch(e){}

          // call reinit hook to reattach behaviors
          try{ if(window.siteReinit) window.siteReinit(); }catch(e){}
          // Re-apply enforced theme after SPA swaps
          try{ enforceTheme(); }catch(e){}
          // reapply ribbons/theme hooks if available (keeps outlines and accents correct)
          try{ if(window.ribbonsSetTheme) { try{ var m = (document.documentElement.getAttribute('data-theme-mode')||'light'); var t = (document.documentElement.getAttribute('data-theme')||'opal'); window.ribbonsSetTheme(m,t); }catch(e){} } }catch(e){}
          // restore audio state if we captured it and audio element still exists
          try{
            if(preAudio){
              var after = document.getElementById('piyoverse-music');
              if(after && after !== null){
                try{ if(typeof preAudio.time === 'number' && Math.abs((after.currentTime||0) - preAudio.time) > 0.5) { try{ after.currentTime = preAudio.time; }catch(e){} } }catch(e){}
                // Only resume if music is still enabled
                try{
                  var musicEnabledNow = true;
                  try{
                    var prefNow = localStorage.getItem('site-music');
                    if(prefNow === 'off') musicEnabledNow = false;
                  }catch(e){ musicEnabledNow = true; }
                  try{ if(window.siteMusicEnabled === false) musicEnabledNow = false; }catch(e){}
                  if(musicEnabledNow && preAudio.playing){
                    var pp = after.play && after.play();
                    if(pp && pp.then){ pp.catch(function(){}); }
                  } else {
                    try{ after.pause && after.pause(); }catch(e){}
                    try{ after.volume = 0; }catch(e){}
                  }
                }catch(e){}
              }
            }
          }catch(e){}

          try{ window.scrollTo(0,0); }catch(e){}
        } else {
          // fallback
          window.location.href = href;
        }
      };
      xhr.send(null);
    }catch(e){ try{ window.location.href = href; }catch(ex){} }
  }

  function onPopState(){ ajaxNavigate(window.location.href, false); }

  // Prevent "stuck" focus styles after mouse clicks while preserving keyboard focus.
  function installUnstickClickFocus(){
    try{
      var lastPointerDown = null;

      function matchesUnstickTarget(el){
        try{
          if(!el || !el.tagName) return false;
          var tag = el.tagName.toLowerCase();
          if(tag === 'button') return true;
          if(tag === 'input'){
            var type = (el.type || '').toLowerCase();
            return (type === 'button' || type === 'submit');
          }
          if(tag === 'a'){
            var cls = (el.className || '');
            return (cls.indexOf('btn') !== -1 || cls.indexOf('nav-item') !== -1 || cls.indexOf('marketplace-btn') !== -1);
          }
          return false;
        }catch(e){ return false; }
      }

      function findTarget(start){
        var el = start;
        while(el && el !== document.documentElement){
          if(matchesUnstickTarget(el)) return el;
          el = el.parentNode;
        }
        return null;
      }

      function onPointerDown(ev){
        ev = ev || window.event;
        var t = ev.target || ev.srcElement;
        lastPointerDown = findTarget(t);
      }

      function onClick(ev){
        try{
          if(!lastPointerDown) return;
          var t = (ev && (ev.target || ev.srcElement)) || null;
          var clicked = findTarget(t);
          if(clicked && clicked === lastPointerDown){
            try{ if(clicked.blur) clicked.blur(); }catch(e){}
          }
        }finally{
          lastPointerDown = null;
        }
      }

      if(document.addEventListener){
        // Modern browsers
        document.addEventListener('pointerdown', onPointerDown, true);
        // IE11 + older fallback
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('click', onClick, true);
      } else if(document.attachEvent){
        document.attachEvent('onmousedown', onPointerDown);
        document.attachEvent('onclick', onClick);
      }
    }catch(e){}
  }

  if(document.addEventListener) document.addEventListener('click', onLinkClick, false);
  else if(document.attachEvent) document.attachEvent('onclick', onLinkClick);
  if(window.addEventListener) window.addEventListener('popstate', onPopState);
  else if(window.attachEvent) window.attachEvent('onpopstate', onPopState);

  try{ installUnstickClickFocus(); }catch(e){}
})();

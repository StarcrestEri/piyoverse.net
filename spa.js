/* Simple SPA navigation (IE11-compatible) */
(function(){
  if(window.__spa_installed) return; window.__spa_installed = true;

  // Ensure hover/outlines for game cards remain present after SPA swaps.
    try{
      var _s = document.createElement('style');
      _s.id = 'spa-fallback-outline';
      // Use explicit colors for IE11 (avoid CSS variables) and ensure selector covers IE11
      _s.textContent = '\nhtml.frutiger-aero .game-card::after { content:""; position:absolute; top:6px; right:-4px; bottom:6px; left:-4px; border-radius:12px; box-shadow: 0 0 0 1px rgba(43,111,160,0.95) !important; opacity:1 !important; pointer-events:none; transition: box-shadow 180ms ease, opacity 180ms ease; z-index:2; }\nhtml.frutiger-aero .game-card:hover::after { box-shadow: 0 0 0 3px rgba(182,220,255,0.95), 0 0 14px rgba(182,220,255,0.95) !important; }\nhtml.frutiger-aero .game-card::before { content:""; position:absolute; top:10px; bottom:6px; left:-4px; right:-4px; border-radius:10px; background-image: linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.06)), linear-gradient(to bottom, rgba(182,220,255,0.12), rgba(255,255,255,0.00)), linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0.02)); background-position: top left, top left, bottom left; background-size: 100% 28px, 100% 28px, 100% 7px; background-repeat: no-repeat; opacity:0; pointer-events:none; transition: transform 180ms ease, opacity 180ms ease; z-index:1; }\nhtml.frutiger-aero .game-card:hover::before { opacity:1 !important; transform: translateY(-2px) !important; }\n';
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
    // Try SPA navigation, but ensure we fallback to a full load if AJAX doesn't complete.
    try{
      ajaxNavigate(href, true);
    }catch(e){
      try{ window.location.href = href; }catch(ex){}
      return;
    }
    try{
      // If SPA doesn't navigate within 1200ms, fall back to full navigation.
      setTimeout(function(){
        try{
          // If location didn't change and document didn't update, force navigation
          if(window.location.href.indexOf(href) === -1){ window.location.href = href; }
        }catch(e){}
      }, 1200);
    }catch(e){}
  }

  function ajaxNavigate(href, addToHistory){
    try{
      var url = href;
      // preserve audio state if present (avoid restarting DOS.mp3)
      var preAudio = null;
      try{ var ael = document.getElementById('piyoverse-music'); if(ael){ preAudio = { playing: !ael.paused, time: ael.currentTime }; } }catch(e){ preAudio = null; }
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
            if(newMain && oldMain) oldMain.innerHTML = newMain.innerHTML;
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
                var skipList = ['market-audio.js','ribbons-of-life.js','ie-fixes.js','settings.js','anti-inspect.js','spa.js'];
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
          // reapply ribbons/theme hooks if available (keeps outlines and accents correct)
          try{ if(window.ribbonsSetTheme) { try{ var m = (document.documentElement.getAttribute('data-theme-mode')||'dark'); var t = (document.documentElement.getAttribute('data-theme')||'obsidian'); window.ribbonsSetTheme(m,t); }catch(e){} } }catch(e){}
          // restore audio state if we captured it and audio element still exists
          try{
            if(preAudio){
              var after = document.getElementById('piyoverse-music');
              if(after && after !== null){
                try{ if(typeof preAudio.time === 'number' && Math.abs((after.currentTime||0) - preAudio.time) > 0.5) { try{ after.currentTime = preAudio.time; }catch(e){} } }catch(e){}
                try{ if(preAudio.playing){ var pp = after.play && after.play(); if(pp && pp.then){ pp.catch(function(){}); } } }catch(e){}
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

  if(document.addEventListener) document.addEventListener('click', onLinkClick, false);
  else if(document.attachEvent) document.attachEvent('onclick', onLinkClick);
  if(window.addEventListener) window.addEventListener('popstate', onPopState);
  else if(window.attachEvent) window.attachEvent('onpopstate', onPopState);
})();

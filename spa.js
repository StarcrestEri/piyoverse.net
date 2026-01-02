/* Simple SPA navigation (IE11-compatible) */
(function(){
  if(window.__spa_installed) return; window.__spa_installed = true;

  function isInternalLink(a){
    try{
      if(!a || !a.getAttribute) return false;
      var href = a.getAttribute('href');
      if(!href) return false;
      href = href.trim();
      if(href.indexOf('mailto:')===0 || href.indexOf('tel:')===0) return false;
      if(a.target && a.target.toLowerCase && a.target.toLowerCase()==='_blank') return false;
      // Resolve absolute URL
      var resolved = (new URL(href, window.location.href)).href;
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

(function(){
  try{ if(window.__legacy_low_end) return; }catch(e){}
  function pageName(){ try { return (location.pathname||'').split('/').pop().toLowerCase(); } catch(e){ return ''; } }
  var name = pageName();
  var isMarketplace = (name.indexOf('marketplace') === 0);
  var musicPref = (function(){ try { var v = localStorage.getItem('site-music'); return v===null? 'on' : v; } catch(e){ return 'on'; } })();
  var sfxPref = (function(){ try { var v = localStorage.getItem('site-sfx'); return v===null? 'on' : v; } catch(e){ return 'on'; } })();
  window.siteMusicEnabled = (musicPref === 'on');
  window.siteSfxEnabled = (sfxPref === 'on');

  var audioEl = null;
  var fadeInterval = null;
  var targetVol = 0.65;
  var saveInterval = null;
  function createAudio(){
    if(audioEl) return audioEl;
    // reuse existing element if page already has one (helps when scripts re-run)
    try{ var existing = document.getElementById('piyoverse-music'); if(existing) { audioEl = existing; try{ audioEl.loop = true; }catch(e){} return audioEl; } }catch(e){}
    audioEl = document.createElement('audio');
    audioEl.id = 'piyoverse-music';
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.volume = 0;
    // add multiple sources (MP3 preferred, then OGG, then WAV) so browser picks supported one
    try{
      var baseAbs = '/Audio/DOS';
      var sources = [ [baseAbs + '.mp3', 'audio/mpeg'], [baseAbs + '.ogg', 'audio/ogg'], [baseAbs + '.wav', 'audio/wav'] ];
      for(var si=0; si<sources.length; si++){
        var srcElem = document.createElement('source');
        srcElem.src = sources[si][0];
        srcElem.type = sources[si][1];
        audioEl.appendChild(srcElem);
      }
    }catch(e){ audioEl.src = '/Audio/DOS.mp3'; }
    audioEl.setAttribute('aria-hidden','true');
    document.body.appendChild(audioEl);
    try{ attachAudioListeners(audioEl); }catch(e){}
    // resume time if available (helps continuity across page loads)
    try {
      var saved = sessionStorage.getItem('market-music-time');
      if (saved !== null && !isNaN(saved)) {
        audioEl.currentTime = parseFloat(saved);
      }
    } catch(e) {}
    return audioEl;
  }

  // Attach play/pause listeners when element exists so we can persist flag
  function attachAudioListeners(el){
    try{
      if(!el) return;
      try{ el.removeEventListener('play', attachAudioListeners.__playFn); }catch(e){}
      try{ el.removeEventListener('pause', attachAudioListeners.__pauseFn); }catch(e){}
      attachAudioListeners.__playFn = function(){ try{ setPlayingFlag(true); }catch(e){} };
      attachAudioListeners.__pauseFn = function(){ try{ setPlayingFlag(false); }catch(e){} };
      try{ el.addEventListener('play', attachAudioListeners.__playFn); }catch(e){}
      try{ el.addEventListener('pause', attachAudioListeners.__pauseFn); }catch(e){}
    }catch(e){}
  }

  // Unlock audio on first user gesture to satisfy autoplay policies
  function unlockAudioOnGesture(){
    try{
      function unlock(){
        try{
          if(audioEl){
            var p = audioEl.play && audioEl.play();
            if(p && p.then){ p.then(function(){ audioEl.pause && audioEl.pause(); }).catch(function(){}); }
          } else {
            try{
              var ctx = new (window.AudioContext || window.webkitAudioContext)();
              var o = ctx.createOscillator();
              var g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination); g.gain.value = 0; o.start(0); o.stop(0);
            }catch(e){}
          }
        }catch(e){}
        try{ document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); }catch(e){}
      }
      document.addEventListener('pointerdown', unlock, { once: true, passive: true });
      document.addEventListener('keydown', unlock, { once: true, passive: true });
    }catch(e){}
  }
  function fadeTo(vol, duration){
    if(!audioEl) return;
    if(fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
    var steps = Math.max(6, Math.round((duration||600)/80));
    var start = audioEl.volume;
    var delta = (vol - start) / steps;
    var cur = 0;
    fadeInterval = setInterval(function(){
      cur++;
      var nv = Math.max(0, Math.min(1, audioEl.volume + delta));
      audioEl.volume = nv;
      if(cur >= steps){ clearInterval(fadeInterval); fadeInterval = null; if(vol===0){ try{ audioEl.pause(); }catch(e){} } }
    }, Math.round((duration||600)/steps));
  }

  // helper to persist whether music was playing so refresh can attempt resume
  function setPlayingFlag(isPlaying){
    try{ localStorage.setItem('site-music-playing', isPlaying ? '1' : '0'); }catch(e){}
  }

  // Ensure music is playing when enabled. Exposed for SPA/settings toggles.
  window.siteEnsureMusicPlaying = function(){
    try{
      if(!window.siteMusicEnabled) return;
      var a = createAudio();
      try{ if(a.loop !== true) a.loop = true; }catch(e){}
      var p = null;
      try{ p = a.play && a.play(); }catch(e){ p = null; }
      if(p && p.then){
        p.then(function(){ try{ fadeTo(targetVol, 900); }catch(e){} }).catch(function(){ /* autoplay blocked */ });
      } else if(p === null){
        // play() threw or not available; wait for user gesture to resume
        try{ document.addEventListener('pointerdown', function ong(){ try{ a.play && a.play(); fadeTo(targetVol,900); }catch(e){} try{ document.removeEventListener('pointerdown', ong); }catch(e){} }, { once:true }); }catch(e){}
      } else { try{ fadeTo(targetVol, 900); }catch(e){} }
      // periodically save time
      try{ if (saveInterval) clearInterval(saveInterval); saveInterval = setInterval(function(){ try{ if(audioEl && !audioEl.paused) sessionStorage.setItem('market-music-time', String(audioEl.currentTime)); }catch(e){} }, 1000); }catch(e){}
      // ensure unlock on gesture
      unlockAudioOnGesture();
      try{ setPlayingFlag(true); }catch(e){}
    }catch(e){}
  };

  // attempt initial start if enabled
  try{
    // If user previously had music playing, attempt resume after refresh.
    var wasPlaying = false;
    try{ wasPlaying = (localStorage.getItem('site-music-playing') === '1'); }catch(e){}
    if(window.siteMusicEnabled && window.siteEnsureMusicPlaying){
      // If it was playing, try to resume; otherwise still ensure audio element exists
      if(wasPlaying) {
        try{ window.siteEnsureMusicPlaying(); }catch(e){}
      } else {
        try{ createAudio(); }catch(e){}
      }
    }
  }catch(e){}

  // Respond to storage events (other tabs) so toggling music elsewhere resumes/pauses here
  try{
    if(window.addEventListener){
      window.addEventListener('storage', function(ev){
        try{
          if(!ev || !ev.key) return;
          if(ev.key === 'site-music'){
            try{ window.siteMusicEnabled = (localStorage.getItem('site-music') === 'on'); }catch(e){}
            if(window.siteMusicEnabled){ try{ if(window.siteEnsureMusicPlaying) window.siteEnsureMusicPlaying(); }catch(e){} }
            else {
              try{ var _a = document.getElementById('piyoverse-music'); if(_a){ try{ _a.pause(); _a.volume = 0; }catch(e){} } }catch(e){}
              try{ setPlayingFlag(false); }catch(e){}
            }
          }
        }catch(e){}
      }, false);
    }
  }catch(e){}

  // Run site music when the user has music enabled site-wide.
  // This enables persistent audio for SPA-style navigation.
  if(window.siteMusicEnabled){
    try{
      var a = createAudio();
      var p = null;
      var deferredResume = false;
      try{
        p = a.play && a.play();
      }catch(e){ p = null; }
      if(p && p.then){
        p.then(function(){ fadeTo(targetVol, 900); try{ setPlayingFlag(true); }catch(e){} }).catch(function(){
          // autoplay blocked; defer resume until user interaction
          deferredResume = true;
        });
      } else if(p === null){
        // play() threw or not available — defer resume
        deferredResume = true;
      } else { fadeTo(targetVol, 900); }

      // If autoplay was blocked, resume on next user gesture
      function attemptDeferredResume(){
        try{
          if(!deferredResume) return;
          var pp = a.play && a.play();
          if(pp && pp.then){ pp.then(function(){ deferredResume = false; fadeTo(targetVol,900); removeListeners(); }).catch(function(){}); }
          else { deferredResume = false; fadeTo(targetVol,900); removeListeners(); }
        }catch(e){}
      }
      function removeListeners(){
        try{ document.removeEventListener('pointerdown', attemptDeferredResume); document.removeEventListener('keydown', attemptDeferredResume); }catch(e){}
      }
      if(deferredResume){ document.addEventListener('pointerdown', attemptDeferredResume, { once: true }); document.addEventListener('keydown', attemptDeferredResume, { once: true }); }
      // also ensure we unlock audio on first gesture (helps SFX/background resume)
      unlockAudioOnGesture();
      // periodically save currentTime so next page can resume close to where we left off
      try { if (saveInterval) clearInterval(saveInterval); saveInterval = setInterval(function(){ try{ if(audioEl && !audioEl.paused) sessionStorage.setItem('market-music-time', String(audioEl.currentTime)); }catch(e){} }, 1000); } catch(e) {}
    }catch(e){}
  }

  // fade out when leaving page (navigation away)
  window.addEventListener('beforeunload', function(){
    try{ if(audioEl){ fadeTo(0, 500); } }catch(e){}
  });

  // save current time on unload so next page can resume
  window.addEventListener('unload', function(){ try{ if(audioEl) sessionStorage.setItem('market-music-time', String(audioEl.currentTime)); if(saveInterval) clearInterval(saveInterval); }catch(e){} });

  // Also respond to visibility change: if page hidden and not marketplace, fade out
  document.addEventListener('visibilitychange', function(){
    try{
      if(document.hidden){ if(audioEl) fadeTo(0,400); }
      else {
        if(audioEl && window.siteMusicEnabled){
          // attempt to resume playback when tab becomes visible again
          try{
            var playPromise = audioEl.play && audioEl.play();
            if(playPromise && playPromise.then){
              playPromise.then(function(){ fadeTo(targetVol,600); }).catch(function(){ /* autoplay blocked */ });
            } else { fadeTo(targetVol,600); }
          }catch(e){ try{ fadeTo(targetVol,600); }catch(e){} }
        }
      }
    }catch(e){}
  });

  // also try resuming when window gains focus (some browsers don't emit visibilitychange reliably)
  window.addEventListener('focus', function(){
    try{
      if(audioEl && window.siteMusicEnabled){
        var pp = audioEl.play && audioEl.play();
        if(pp && pp.then){ pp.then(function(){ fadeTo(targetVol,600); }).catch(function(){}); }
        else { fadeTo(targetVol,600); }
      }
    }catch(e){}
  });

  // monitor play/pause to update persisted playing flag
  try{
    document.addEventListener && audioEl && audioEl.addEventListener && audioEl.addEventListener('play', function(){ try{ setPlayingFlag(true); }catch(e){} });
  }catch(e){}
  try{
    document.addEventListener && audioEl && audioEl.addEventListener && audioEl.addEventListener('pause', function(){ try{ setPlayingFlag(false); }catch(e){} });
  }catch(e){}

  // delegated SFX: trigger on pointerdown (user gesture) and pointerover fallback
  (function(){
    var lastPlay = 0;
    function findInteractiveAncestor(el){
      while(el && el !== document.documentElement){
        try{ if(el.classList && (el.classList.contains('nav-item') || el.classList.contains('game-card') || el.classList.contains('btn'))) return el; }catch(e){}
        el = el.parentNode;
      }
      return null;
    }
    function tryPlay(ev){
      try{
        if(!window.siteSfxEnabled) return;
        var now = Date.now();
        if(now - lastPlay < 120) return;
        var target = findInteractiveAncestor(ev.target || ev.srcElement);
        if(target){ lastPlay = now; try{ window.playSiteSfx && window.playSiteSfx('Audio/Navigation-Hover.ogg', { volume: 0.6 }); }catch(e){} }
      }catch(e){}
    }
    document.addEventListener('pointerdown', tryPlay, { passive: true });
  })();

  // play hover SFX once per pointerenter for listing items and nav items
  try{
    function handleHoverOnce(ev){
      try{
        if(!window.siteSfxEnabled) return;
        var el = ev.currentTarget || ev.target;
        // play once per entry
        if(window.playSiteSfx){
          try{ window.playSiteSfx('Audio/Navigation-Hover.ogg', { volume: 0.6 }); }catch(e){}
        }
      }catch(e){}
    }
    // attach to listing cards and nav-items and generic buttons
    function attachHover(){
      var cards = document.querySelectorAll('.game-card');
      for(var i=0;i<cards.length;i++){
        try{
          var fn = cards[i].__hoverFn || handleHoverOnce;
          cards[i].__hoverFn = fn;
          // Use only pointerenter so the SFX fires once per entry (prevents repeats
          // when moving between child elements inside the card). This also avoids
          // firing multiple mouseenter/mouseover events in some browsers.
          try{ cards[i].removeEventListener('pointerenter', fn); }catch(e){}
          cards[i].addEventListener('pointerenter', fn);
        }catch(e){}
      }
      var navs = document.querySelectorAll('.nav-item');
      for(var j=0;j<navs.length;j++){
        try{
          var fn2 = navs[j].__hoverFn || handleHoverOnce;
          navs[j].__hoverFn = fn2;
          try{ navs[j].removeEventListener('pointerenter', fn2); }catch(e){}
          navs[j].addEventListener('pointerenter', fn2);
        }catch(e){}
      }
      var btns = document.querySelectorAll('.btn, button');
      for(var k=0;k<btns.length;k++){
        try{
          var fn3 = btns[k].__hoverFn || handleHoverOnce;
          btns[k].__hoverFn = fn3;
          try{ btns[k].removeEventListener('pointerenter', fn3); }catch(e){}
          btns[k].addEventListener('pointerenter', fn3);
        }catch(e){}
      }
    }
    // attach after DOM ready
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachHover); else attachHover();
    // expose a reinit hook so SPA navigation can re-run attachment logic
    try{ window.siteReinit = function(){ try{ attachHover(); }catch(e){} }; }catch(e){}
  }catch(e){}

  // Expose a simple SFX player
  window.playSiteSfx = function(src, opts){
    try{
      if(!window.siteSfxEnabled) return;
      // create Audio with a playable format fallback if needed
      var resolved = src;
      // normalize relative paths to absolute so pages in subfolders work
      try{
        if(resolved && !/^(?:https?:|\/)/i.test(resolved)){
          resolved = '/' + resolved.replace(/^\/+/, '');
        }
      }catch(e){}
      try{
        var tester = document.createElement('audio');
        var extMatch = (src||'').match(/\.([a-z0-9]+)$/i);
        if(extMatch && extMatch[1].toLowerCase() === 'ogg'){
          if(!(tester.canPlayType && tester.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''))){
            if(tester.canPlayType && tester.canPlayType('audio/mpeg').replace(/^no$/, '')) resolved = resolved.replace(/\.ogg$/i, '.mp3');
            else if(tester.canPlayType && tester.canPlayType('audio/wav').replace(/^no$/, '')) resolved = resolved.replace(/\.ogg$/i, '.wav');
          }
        }
      }catch(e){}
      var s = new Audio(resolved);
      s.preload = 'auto';
      s.volume = (opts && typeof opts.volume==='number')? opts.volume : 0.9;
      s.play();
      try{ setTimeout(function(){ s.remove(); }, 4000); } catch(e){}
    }catch(e){}
  };
})();

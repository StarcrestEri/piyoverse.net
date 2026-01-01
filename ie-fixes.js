/* IE11 layout shims for Piyoverse (no build step required)
   - Recreates 4:3 pillarbox bars and safe-width sizing
   - Adds "ie11" class for CSS targeting
   - Avoids modern JS syntax so it runs in IE11
*/
(function () {
  var isIE = !!document.documentMode; // IE6-11
  if (!isIE) return;

  // If page explicitly indicates IE7 mode, avoid injecting pillarbox bars.
  // Some IE compatibility modes may still set document.documentMode while
  // userAgent indicates an older IE; we honor an explicit `ie7` class
  // added by `ie-compat.js` to skip the bars.
  try{
    var docClass = (document.documentElement && document.documentElement.className) || '';
    if(/\bie7\b/.test(docClass)){
      // Remove any previously injected bars if present
      try{ var l = document.getElementById('ie-pillarbox-left'); if(l && l.parentNode) l.parentNode.removeChild(l); }catch(e){}
      try{ var r = document.getElementById('ie-pillarbox-right'); if(r && r.parentNode) r.parentNode.removeChild(r); }catch(e){}
      return;
    }
  }catch(e){}

  try {
    if (document.documentElement && document.documentElement.className.indexOf("ie11") === -1) {
      document.documentElement.className += (document.documentElement.className ? " " : "") + "ie11";
    }
    if (document.body && document.body.className.indexOf("ie11") === -1) {
      document.body.className += (document.body.className ? " " : "") + "ie11";
    }
  } catch (e) {
    // ignore
  }

  function ensureBars() {
    var left = document.getElementById("ie-pillarbox-left");
    var right = document.getElementById("ie-pillarbox-right");
    var host = document.body || document.documentElement;

    if (!left) {
      left = document.createElement("div");
      left.id = "ie-pillarbox-left";
      left.className = "ie-pillarbox ie-pillarbox-left";
      if (host) host.appendChild(left);
    }
    if (!right) {
      right = document.createElement("div");
      right.id = "ie-pillarbox-right";
      right.className = "ie-pillarbox ie-pillarbox-right";
      if (host) host.appendChild(right);
    }

    // Inline styles so the bars work even if the IE-only CSS block doesn't apply.
    // Width is set dynamically in applySafeWidths().
    left.style.position = "fixed";
    left.style.top = "0";
    left.style.bottom = "0";
    left.style.left = "0";
    left.style.background = "#000";
    left.style.zIndex = "9000";
    left.style.pointerEvents = "none";

    right.style.position = "fixed";
    right.style.top = "0";
    right.style.bottom = "0";
    right.style.right = "0";
    right.style.background = "#000";
    right.style.zIndex = "9000";
    right.style.pointerEvents = "none";

    return { left: left, right: right };
  }

  function applySafeWidths() {
    if (!document.body) return;

    var vw = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || document.body.clientWidth || 0;
    var vh = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || document.body.clientHeight || 0;

    // 4:3 safe area
    var safeWidth = Math.min(vw, vh * 4 / 3);
    var side = Math.max(0, (vw - safeWidth) / 2);

    var bars = ensureBars();
    bars.left.style.width = side + "px";
    bars.right.style.width = side + "px";

    // Match the existing CSS intention: min(1200px, safe-width)
    var contentWidth = Math.min(1200, safeWidth);

    var selectors = [
      ".frutiger-aero .nav-container",
      ".frutiger-aero .page-name-container",
      ".frutiger-aero main",
      ".frutiger-aero .social-bar",
      ".frutiger-aero .site-footer",
      ".frutiger-aero footer"
    ];

    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var el = nodes[j];
        if (!el || !el.style) continue;
        el.style.width = contentWidth + "px";
        el.style.maxWidth = contentWidth + "px";
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
      }
    }
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      fn();
      return;
    }
    document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    applySafeWidths();
    window.addEventListener("resize", applySafeWidths);
  });
})();

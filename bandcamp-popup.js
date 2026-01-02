(function () {
  try{ if(window.__legacy_low_end) return; }catch(e){}
  function closestAnchor(el) {
    while (el && el !== document.documentElement) {
      if (el.tagName && el.tagName.toLowerCase() === 'a') return el;
      el = el.parentNode;
    }
    return null;
  }

  function onClick(ev) {
    ev = ev || window.event;
    var target = ev.target || ev.srcElement;
    var a = closestAnchor(target);
    if (!a) return;

    var url = a.getAttribute('data-bandcamp-popup') || a.getAttribute('href');
    if (!url || url === '#') return;

    try { if (ev.preventDefault) ev.preventDefault(); else ev.returnValue = false; } catch (e) {}

    // Try to open a pop-up window (keeps the site open behind it).
    var w = 980;
    var h = 720;
    var left = 80;
    var top = 80;
    try {
      if (typeof screen !== 'undefined') {
        left = Math.max(0, (screen.width - w) / 2);
        top = Math.max(0, (screen.height - h) / 2);
      }
    } catch (e) {}

    var features = 'popup=yes,noopener=yes,noreferrer=yes,width=' + w + ',height=' + h + ',left=' + left + ',top=' + top;
    var win = null;
    try { win = window.open(url, 'bandcamp_purchase', features); } catch (e) { win = null; }

    // If popups are blocked, fall back to full navigation.
    if (!win) {
      try { window.location.href = url; } catch (e) {}
      return;
    }

    try { win.focus(); } catch (e) {}
  }

  try {
    document.addEventListener('click', function (ev) {
      var t = ev.target || ev.srcElement;
      var a = closestAnchor(t);
      if (!a) return;
      if (!a.getAttribute('data-bandcamp-popup')) return;
      onClick(ev);
    });
  } catch (e) {}
})();

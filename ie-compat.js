!function(){
	try {
		var ua = "";
		try { ua = navigator && navigator.userAgent ? navigator.userAgent : ""; } catch (_) { ua = ""; }

		var de = null;
		try { de = document && document.documentElement ? document.documentElement : null; } catch (_) { de = null; }

		function hasClass(cls) {
			try {
				if (!de) return false;
				var cn = de.className || "";
				return (" " + cn + " ").indexOf(" " + cls + " ") !== -1;
			} catch (_) {
				return false;
			}
		}

		function addClass(cls) {
			try {
				if (!de) return;
				var cn = de.className || "";
				if ((" " + cn + " ").indexOf(" " + cls + " ") !== -1) return;
				de.className = cn ? cn + " " + cls : cls;
			} catch (_) {}
		}

		function injectLegacyCSS() {
			var href = "/legacy-lowend.css";

			// Prefer DOM injection (safe even if parsing is done).
			try {
				var links = document.getElementsByTagName ? document.getElementsByTagName("link") : null;
				if (links && links.length) {
					for (var i = 0; i < links.length; i++) {
						var l = links[i];
						var h = "";
						try { h = l && l.href ? ("" + l.href) : ""; } catch (_) { h = ""; }
						if (h && h.indexOf(href) !== -1) return; // already present
					}
				}
			} catch (_) {}

			try {
				var heads = document.getElementsByTagName ? document.getElementsByTagName("head") : null;
				var head = heads && heads[0] ? heads[0] : null;
				if (head && document.createElement) {
					var link = document.createElement("link");
					link.rel = "stylesheet";
					link.type = "text/css";
					link.href = href;
					head.appendChild(link);
					return;
				}
			} catch (_) {}

			// Fallback while parsing (old IE): document.write.
			try {
				if (document.write) document.write('<link rel="stylesheet" type="text/css" href="' + href + '">');
			} catch (_) {}
		}

		var isIE7UA = false;
		var isIE11UA = false;
		try { isIE7UA = /MSIE\s7\.0/.test(ua); } catch (_) { isIE7UA = false; }
		try { isIE11UA = /Trident\/7\.0/.test(ua) && /rv:11\.0/.test(ua); } catch (_) { isIE11UA = false; }

		var search = "";
		try { search = (typeof location !== "undefined" && location.search) ? location.search : ""; } catch (_) { search = ""; }

		var forcedIE11 = false;
		var forcedIE7 = false;
		try { forcedIE11 = !!(search && search.indexOf("force_ie11=1") !== -1); } catch (_) { forcedIE11 = false; }
		try { forcedIE7 = !!(search && search.indexOf("force_ie7=1") !== -1); } catch (_) { forcedIE7 = false; }

		// IE7 mode: allow UA, query forcing, or pre-applied class toggles.
		var wantIE7 = !!(isIE7UA || forcedIE7 || hasClass("ie7"));
		if (wantIE7) {
			addClass("ie7");
			addClass("no-pillarbox");
			addClass("legacy-lowend");
			addClass("no-ribbons");
			addClass("ie11-cards");
			injectLegacyCSS();
		}

		// IE11 mode (real IE11 or forced via query).
		if (isIE11UA || forcedIE11) {
			addClass("ie11");
			if (forcedIE11) addClass("force-ie11");

			// addEventListener polyfill for old IE in IE11-mode CSS/JS path
			try {
				if (!document.addEventListener) {
					document.addEventListener = function (evt, fn) { document.attachEvent("on" + evt, fn); };
					document.removeEventListener = function (evt, fn) { document.detachEvent("on" + evt, fn); };
				}
			} catch (_) {}
		}
	} catch (_) {}
}();
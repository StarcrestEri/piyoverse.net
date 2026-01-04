(function () {
	try {
		var ua = "";
		try {
			ua = navigator && navigator.userAgent ? navigator.userAgent : "";
		} catch (_) {
			ua = "";
		}

		var isDSi = false;
		var is3DS = false;
		var isWiiU = false;
		var isNetFront = false;
		var isOpera95 = false;
		var isPSP = false;
		var isVita = false;

		try {
			isDSi = /Nintendo\s+DSi/i.test(ua) || /\bDSi\b/i.test(ua);
		} catch (_) {
			isDSi = false;
		}

		try {
			is3DS = /Nintendo\s+3DS/i.test(ua);
		} catch (_) {
			is3DS = false;
		}

		try {
			isWiiU = /NintendoBrowser/i.test(ua) || /WiiU/i.test(ua);
		} catch (_) {
			isWiiU = false;
		}

		try {
			isNetFront = /NetFront/i.test(ua) || /NX\b/i.test(ua);
		} catch (_) {
			isNetFront = false;
		}

		try {
			isOpera95 = /Opera\/(9\.5\d?)/i.test(ua) || /Opera\s+9\.5/i.test(ua);
		} catch (_) {
			isOpera95 = false;
		}

		try {
			// PSP UA strings vary a lot across firmware/regions/NetFront builds.
			// Keep this intentionally broad (still scoped to obvious PSP markers).
			isPSP = /PlayStation\s*Portable|PlayStationPortable|\bPSP\b|PSP\s*\)|PSP\s*Browser/i.test(ua);
		} catch (_) {
			isPSP = false;
		}

		try {
			isVita = /PlayStation\s*Vita/i.test(ua);
		} catch (_) {
			isVita = false;
		}

		var missingFeatures = false;
		try {
			if (!(document && document.getElementById && document.getElementsByTagName)) missingFeatures = true;
		} catch (_) {
			missingFeatures = true;
		}
		try {
			if (!(window && window.XMLHttpRequest)) missingFeatures = true;
		} catch (_) {
			missingFeatures = true;
		}
		try {
			if (!(document.addEventListener || document.attachEvent)) missingFeatures = true;
		} catch (_) {
			missingFeatures = true;
		}

		// Ultra-minimal fallback: for unknown/very old browsers that are too limited
		// to reliably render the modern themes. This is our "IE1"-style mode.
		var ultraLegacy = false;
		try {
			ultraLegacy = !!missingFeatures;
		} catch (_) {
			ultraLegacy = true;
		}

		var de = null;
		try {
			de = document && document.documentElement ? document.documentElement : null;
		} catch (_) {
			de = null;
		}

		function addClass(cls) {
			try {
				if (!de) return;
				var cn = de.className || "";
				if ((" " + cn + " ").indexOf(" " + cls + " ") !== -1) return;
				de.className = cn ? cn + " " + cls : cls;
			} catch (_) {}
		}

		function injectStylesheet(href) {
			// 1) Preferred: append into <head>
			try {
				var heads = document.getElementsByTagName("head");
				var head = heads && heads[0] ? heads[0] : null;
				if (head && document.createElement) {
					var link = document.createElement("link");
					link.rel = "stylesheet";
					link.type = "text/css";
					link.href = href;
					head.appendChild(link);
					return true;
				}
			} catch (_) {}

			// 2) Fallback: document.write while parsing
			try {
				if (document.write) {
					document.write('<link rel="stylesheet" type="text/css" href="' + href + '">');
					return true;
				}
			} catch (_) {}

			// 3) Last resort: append to <html>
			try {
				var de2 = document && document.documentElement ? document.documentElement : null;
				if (de2 && document.createElement) {
					var link2 = document.createElement("link");
					link2.rel = "stylesheet";
					link2.type = "text/css";
					link2.href = href;
					de2.appendChild(link2);
					return true;
				}
			} catch (_) {}

			return false;
		}

		// IE1-style mode: minimal CSS + disable heavy effects.
		// Applies to "undetected" low-end browsers (feature-poor) so users can still navigate.
		if (ultraLegacy) {
			addClass("ie1");
			addClass("no-ribbons");
			addClass("no-pillarbox");
			try {
				window.__legacy_low_end = true;
			} catch (_) {}
			injectStylesheet("/ie1.css");
			return;
		}

		if (isWiiU) addClass("no-pillarbox");
		if (isDSi) addClass("dsi");
		if (is3DS) addClass("n3ds");
		if (isPSP) addClass("psp");
		if (isPSP || isVita) addClass("no-ribbons");

		// Some devices need the "IE11-style" listing layout.
		if (isDSi || is3DS || isNetFront || isOpera95 || isWiiU || isPSP) addClass("ie11-cards");

		// Legacy/mini CSS path (DSi/3DS/PSP/NetFront/old Opera/feature-poor engines)
		var legacy = !!(isDSi || is3DS || isNetFront || isOpera95 || missingFeatures || isPSP);
		try {
			if (document && document.documentMode) legacy = false;
		} catch (_) {}

		if (!legacy) return;

		try {
			window.__legacy_low_end = true;
		} catch (_) {}

		addClass("legacy-lowend");

		// Only PSP + DSi should use the lighter "Ice Cream Mini" thumbnails.
		if (isPSP || isDSi) {
			try {
				window.__ice_cream_mini = true;
			} catch (_) {}
			addClass("ice-cream-mini");
		}

		// Load legacy stylesheet (robust for very old browsers).
		// Some engines may expose DOM APIs but still fail to apply <link> injected into <head>
		// during early parsing, or may not have a usable <head> node yet.
		(function () {
			var href = "/legacy-lowend.css";
			// 1) Preferred: append into <head>
			try {
				var heads = document.getElementsByTagName("head");
				var head = heads && heads[0] ? heads[0] : null;
				if (head) {
					var link = document.createElement("link");
					link.rel = "stylesheet";
					link.type = "text/css";
					link.href = href;
					head.appendChild(link);
					return;
				}
			} catch (_) {}

			// 2) Fallback: document.write while parsing
			try {
				if (document.write) {
					document.write('<link rel="stylesheet" type="text/css" href="' + href + '">');
					return;
				}
			} catch (_) {}

			// 3) Last resort: append to <html>
			try {
				var de2 = document && document.documentElement ? document.documentElement : null;
				if (de2) {
					var link2 = document.createElement("link");
					link2.rel = "stylesheet";
					link2.type = "text/css";
					link2.href = href;
					de2.appendChild(link2);
				}
			} catch (_) {}
		})();

		// Swap listing/teaser images to `/Images/Ice Cream Mini/` for PSP + DSi only.
		if (isPSP || isDSi) {
			(function () {
				// Use UTF-8 percent-encoded URLs to avoid relying on the browser's manual
				// character encoding setting for non-ASCII filenames.
				var MINI_BASE = "/Images/Ice%20Cream%20Mini/";
				var done = false;
				var tries = 0;
				var stablePasses = 0;

				function isMiniSrc(src) {
					return src.indexOf("/Images/Ice%20Cream%20Mini/") !== -1 || src.indexOf("/Images/Ice Cream Mini/") !== -1;
				}

				function swapOnce() {
					if (done) return;

					var imgs = null;
					try {
						imgs = document.getElementsByTagName("img");
					} catch (_) {
						imgs = null;
					}

					if (!imgs || !imgs.length) return;

					var changed = 0;
					for (var i = 0; i < imgs.length; i++) {
						var img = imgs[i];
						if (!img) continue;

						var imgCls = " ";
						try {
							imgCls = " " + (img.className || "") + " ";
						} catch (_) {
							imgCls = " ";
						}

						var parentCls = " ";
						try {
							var p = img.parentNode;
							parentCls = p ? " " + (p.className || "") + " " : " ";
						} catch (_) {
							parentCls = " ";
						}

						var isThumb = parentCls.indexOf(" game-thumb ") !== -1;
						var isTeaser = imgCls.indexOf(" starcrest-teaser ") !== -1;
						if (!isThumb && !isTeaser) continue;

						var src = "";
						try {
							src = img.getAttribute ? img.getAttribute("src") : img.src;
						} catch (_) {
							src = "";
						}

						if (!src) continue;
						if (isMiniSrc(src)) continue;
						if (src.indexOf("/Images/") === -1) continue;

						var file = src.substring(src.lastIndexOf("/") + 1);
						var decoded = file;
						try {
							decoded = decodeURIComponent(file);
						} catch (_) {
							decoded = file;
						}

						var encoded = decoded;
						try {
							encoded = encodeURIComponent(decoded);
						} catch (_) {
							encoded = decoded;
						}

						var nextSrc = MINI_BASE + encoded;
						try {
							img.setAttribute("src", nextSrc);
						} catch (_) {
							try {
								img.src = nextSrc;
							} catch (_) {}
						}
						changed++;
					}

					// Keep polling until we see a few passes with no changes.
					if (changed === 0) stablePasses++;
					else stablePasses = 0;
					if (stablePasses >= 3) done = true;
				}

				try {
					swapOnce();
				} catch (_) {}

				// Very old engines may not fire DOMContentLoaded reliably.
				// Poll a bit until content exists.
				try {
					var id = window.setInterval(function () {
						tries++;
						try {
							swapOnce();
						} catch (_) {}
						if (done || tries > 60) {
							try {
								window.clearInterval(id);
							} catch (_) {}
						}
					}, 250);
				} catch (_) {}
			})();
		}
	} catch (_) {}
})();
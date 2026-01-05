(function () {
	"use strict";

	try {
		if (window.__legacy_low_end) return;
	} catch (_) {}

	try {
		var de = document && document.documentElement;
		if (de) {
			var cn = " " + (de.className || "") + " ";
			if (cn.indexOf(" no-ribbons ") !== -1) return;
		}
	} catch (_) {}

	function parseRgbString(value, fallback) {
		try {
			if (!value) return fallback;
			var s = String(value).replace(/rgb\(/i, "").replace(/\)/g, "");
			var parts = s.split(",");
			if (!parts || parts.length < 3) return fallback;
			var r = parseInt(parts[0], 10);
			var g = parseInt(parts[1], 10);
			var b = parseInt(parts[2], 10);
			if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return fallback;
			return [r, g, b];
		} catch (_) {
			return fallback;
		}
	}

	function rgb(arr) {
		return "rgb(" + (arr[0] | 0) + "," + (arr[1] | 0) + "," + (arr[2] | 0) + ")";
	}

	function rgba(arr, a) {
		return (
			"rgba(" + (arr[0] | 0) + "," + (arr[1] | 0) + "," + (arr[2] | 0) + "," + a + ")"
		);
	}

	function mix(a, b, t) {
		var x = t;
		if (x < 0) x = 0;
		if (x > 1) x = 1;
		return [(1 - x) * a[0] + x * b[0], (1 - x) * a[1] + x * b[1], (1 - x) * a[2] + x * b[2]];
	}

	if (!window.performance) window.performance = {};
	if (!window.performance.now) window.performance.now = function () { return +new Date(); };

	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame =
			window.msRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			function (cb) {
				return window.setTimeout(function () {
					cb(window.performance.now());
				}, 16);
			};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame =
			window.msCancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			function (id) {
				window.clearTimeout(id);
			};
	}

	var DEFAULT_ACCENT = [93, 176, 255];
	var DEFAULT_OUTLINE = [32, 96, 168];

	window.ribbonsSetTheme = function () {
		(function setVars(accent, outline) {
			var accentCss = rgb(accent);
			var outlineCss = rgb(outline);
			try {
				window.ribbonsAccentColor = accentCss;
			} catch (_) {}
			try {
				if (document && document.documentElement && document.documentElement.style) {
					document.documentElement.style.setProperty("--ribbons-accent", accentCss);
					document.documentElement.style.setProperty("--ribbons-outline", outlineCss);
					document.documentElement.style.setProperty(
						"--ribbons-accent-rgb",
						(accent[0] | 0) + "," + (accent[1] | 0) + "," + (accent[2] | 0)
					);
					document.documentElement.style.setProperty(
						"--ribbons-outline-rgb",
						(outline[0] | 0) + "," + (outline[1] | 0) + "," + (outline[2] | 0)
					);
				}
			} catch (_) {}
		})(DEFAULT_ACCENT, DEFAULT_OUTLINE);
	};

	try {
		window.ribbonsSetTheme(
			(document.documentElement && document.documentElement.getAttribute("data-theme-mode")) || "light",
			(document.documentElement && document.documentElement.getAttribute("data-theme")) || "opal"
		);
	} catch (_) {
		try {
			window.ribbonsSetTheme("light", "opal");
		} catch (_) {}
	}

	var canvas = document.getElementById("ribbons-of-life");
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext("2d");
	if (!ctx) return;

	var perfMode = false;
	var ie11 = false;
	var reduceMotion = false;
	var lowEnd = false;

	try {
		perfMode = window.PVE_MODE === "perf";
	} catch (_) {}

	try {
		ie11 = window.PVE_MODE === "ie11";
	} catch (_) {}

	// Respect OS accessibility settings.
	try {
		reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	} catch (_) {
		reduceMotion = false;
	}

	// Auto-perf on low-end devices (best-effort).
	try {
		var hc = navigator && typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 0;
		var dm = navigator && typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 0;
		var saveData = !!(navigator && navigator.connection && navigator.connection.saveData);
		lowEnd = saveData || (hc && hc <= 4) || (dm && dm <= 4);
	} catch (_) {
		lowEnd = false;
	}

	try {
		if (document.documentElement && document.documentElement.classList) {
			if (document.documentElement.classList.contains("perf-base")) perfMode = true;
			if (document.documentElement.classList.contains("ie11")) ie11 = true;
		}
	} catch (_) {}

	if (reduceMotion) perfMode = true;
	if (lowEnd) perfMode = true;

	var dpr = Math.max(1, window.devicePixelRatio || 1);
	if (perfMode || ie11) dpr = 1;
	// Cap DPR to avoid excessive canvas pixel work on high-DPI displays.
	// Keeps the visual crispness but limits CPU/GPU cost on modern browsers.
	dpr = Math.min(dpr, 1.5);

	var viewW = 0;
	var viewH = 0;

	function resize() {
		// Prefer layout viewport measurements so pillarbox borders line up with
		// CSS widths (avoids cross-browser differences where `innerWidth` includes
		// scrollbar width).
		viewW =
			(document.documentElement && document.documentElement.clientWidth) ||
			(document.body && document.body.clientWidth) ||
			window.innerWidth ||
			0;
		viewH =
			(document.documentElement && document.documentElement.clientHeight) ||
			(document.body && document.body.clientHeight) ||
			window.innerHeight ||
			0;

		canvas.width = Math.max(1, Math.floor(viewW * dpr));
		canvas.height = Math.max(1, Math.floor(viewH * dpr));
		canvas.style.width = viewW + "px";
		canvas.style.height = viewH + "px";
		if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	if (window.addEventListener) window.addEventListener("resize", resize);
	else if (window.attachEvent) window.attachEvent("onresize", resize);

	resize();

	var lastTs = window.performance.now();
	var throttleTs = 0;
	var tAccum = 0;
	var targetMs = 1000 / (reduceMotion ? 12 : perfMode ? 24 : 30);

	function getThemeColors() {
		var accent = DEFAULT_ACCENT;
		var outline = DEFAULT_OUTLINE;
		var ribbon = accent;

		try {
			if (document && document.documentElement) {
				var style = window.getComputedStyle ? window.getComputedStyle(document.documentElement, null) : null;
				if (style) {
					accent = parseRgbString(style.getPropertyValue("--ribbons-accent-rgb"), accent);
					outline = parseRgbString(style.getPropertyValue("--ribbons-outline-rgb"), outline);
					ribbon = parseRgbString(style.getPropertyValue("--ribbons-ribbon-rgb"), accent);
				}
			}
		} catch (_) {}

		return { accent: accent, outline: outline, ribbon: ribbon };
	}

	function drawBackground(w, h, colors) {
		// Blue-white gradient behind ribbons/sparkles (top -> bottom)
		var top = [255, 255, 255];
		var mid = mix([255, 255, 255], colors.accent, 0.16);
		var bot = mix([255, 255, 255], colors.accent, 0.28);

		var grad = ctx.createLinearGradient(0, 0, 0, h);
		grad.addColorStop(0, rgb(top));
		grad.addColorStop(0.6, rgb(mid));
		grad.addColorStop(1, rgb(bot));
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		var vignette = ctx.createRadialGradient(
			0.5 * w,
			0.45 * h,
			0.18 * Math.min(w, h),
			0.5 * w,
			0.55 * h,
			0.95 * Math.max(w, h)
		);
		vignette.addColorStop(0, "rgba(0,0,0,0)");
		vignette.addColorStop(1, "rgba(0,0,0,0.22)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, w, h);
	}

	function drawRibbonBand(w, h, colors) {
		var step = perfMode ? 16 : ie11 ? 14 : 10;
		var ampBase = Math.max(18, 0.035 * h);
		var thickBase = Math.max(54, 0.18 * h);
		var freq = 0.0085;
		var phase = 0.55 * tAccum;

		function drawOne(centerY, thickness) {
			var xs = [];
			var top = [];
			var xs2 = [];
			var bot = [];

			for (var x = -36; x <= w + 36; x += step) {
				var y =
					centerY +
					Math.sin(x * freq + phase) * ampBase +
					Math.sin(0.003995 * x - 0.8 * phase) * (0.6 * ampBase) +
					Math.sin(x * (1.6 * freq) + 0.35 * phase) * (0.16 * ampBase);

				var band = thickness + Math.sin(x * (0.9 * freq) - 1.1 * phase) * (0.1 * thickness);
				xs.push(x);
				top.push(y - 0.5 * band);
				xs2.push(x);
				bot.push(y + 0.5 * band);
			}

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(xs[0], top[0]);
			for (var i = 1; i < xs.length; i++) ctx.lineTo(xs[i], top[i]);
			for (var j = xs2.length - 1; j >= 0; j--) ctx.lineTo(xs2[j], bot[j]);
			ctx.closePath();

			if (!perfMode && !ie11) {
				ctx.shadowColor = "rgba(0,0,0,0.22)";
			// Reduce shadow blur on high-DPR displays to cut rendering cost.
			var _shadowBlur = dpr > 1.25 ? 8 : 14;
			ctx.shadowBlur = _shadowBlur;
			ctx.shadowOffsetY = dpr > 1.25 ? 4 : 6;
			var fillGrad = ctx.createLinearGradient(0, centerY - ampBase - thickness, 0, centerY + ampBase + thickness);
			fillGrad.addColorStop(0, rgba(mix(colors.ribbon, [255, 255, 255], 0.55), 0));
			fillGrad.addColorStop(0.35, rgba(mix(colors.ribbon, [255, 255, 255], 0.3), 0.75));
			fillGrad.addColorStop(0.55, rgba(mix(colors.ribbon, colors.outline, 0.18), 0.92));
			fillGrad.addColorStop(1, rgba(mix(colors.outline, [0, 0, 0], 0.08), 0));
			ctx.fillStyle = fillGrad;
			ctx.fill();

			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.shadowBlur = 0;
			ctx.shadowOffsetY = 0;

			ctx.save();
			ctx.clip();
			var shineW = 0.55 * w;
			var shineX = (35 * tAccum) % (w + 2 * shineW) - shineW;
			var shine = ctx.createLinearGradient(shineX, 0, shineX + shineW, h);
			shine.addColorStop(0, "rgba(255,255,255,0.0)");
			shine.addColorStop(0.35, "rgba(255,255,255,0.0)");
			shine.addColorStop(0.5, "rgba(255,255,255,0.32)");
			shine.addColorStop(0.58, "rgba(255,255,255,0.18)");
			shine.addColorStop(0.7, "rgba(255,255,255,0.0)");
			shine.addColorStop(1, "rgba(255,255,255,0.0)");
			ctx.globalAlpha = perfMode ? 0.18 : ie11 ? 0.2 : 0.26;
			ctx.fillStyle = shine;
			ctx.fillRect(0, 0, w, h);
			ctx.restore();

			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.lineWidth = perfMode ? 1.2 : ie11 ? 1.6 : 2.2;
			ctx.strokeStyle = rgba(colors.outline, 0.58);
			ctx.stroke();

			ctx.lineWidth = perfMode ? 1.1 : ie11 ? 1.4 : 2;
			ctx.strokeStyle = "rgba(255,255,255,0.20)";
			ctx.beginPath();
			ctx.moveTo(xs[0], top[0] + 0.1 * thickness);
			for (var k = 1; k < xs.length; k++) ctx.lineTo(xs[k], top[k] + 0.1 * thickness);
			ctx.stroke();

			ctx.restore();
		}

		// one thick ribbon + two thinner ribbons on either side (above/below)
		var center = 0.52 * h;
		drawOne(center, thickBase);

		// Keep side ribbons from ever overlapping the center ribbon.
		// The ribbon centerlines share the same wave function, so separation is controlled only by the
		// centerY offset vs the (slightly varying) half-thickness of each ribbon.
		var maxOffset = 0.22 * h;
		var gap = Math.max(8, 0.015 * h);

		var sideThickness = 0.038 * thickBase;

		// Worst-case band thickness can reach ~1.1 * thickness.
		// Require: offset >= 0.5 * (1.1*thickBase + 1.1*sideThickness) + gap
		var requiredOffset = 0.55 * (thickBase + sideThickness) + gap;
		if (requiredOffset > maxOffset) {
			// If the viewport is too short, shrink side ribbons so we can still guarantee no overlap.
			sideThickness = Math.max(0.01 * thickBase, (maxOffset - gap) / 0.55 - thickBase);
			requiredOffset = 0.55 * (thickBase + sideThickness) + gap;
		}

		var offset = Math.min(maxOffset, Math.max(20, requiredOffset));
		drawOne(center - offset, sideThickness);
		drawOne(center + offset, sideThickness);
	}

	var sparkles = [];
	var sparklesW = 0;
	var sparklesH = 0;

	function rebuildSparkles(w, h) {
		sparklesW = w;
		sparklesH = h;
		sparkles.length = 0;

		var density = perfMode || ie11 ? 0.00005 : 0.00006;
		// Reduce density further on very large viewports to limit work.
		try {
			if ((w * h) > (1600 * 900)) density *= 0.7;
		} catch (_) {}
		var count = Math.max(18, Math.min(90, Math.floor(w * h * density)));

		for (var i = 0; i < count; i++) {
			sparkles.push({
				x: Math.random() * w,
				y: Math.random() * h,
				r: 0.2 * ((perfMode || ie11 ? 0.9 : 1.1) + Math.random() * (perfMode || ie11 ? 1.4 : 2.1)),
				tw: 0.7 + Math.random() * 1.8,
				ph: Math.random() * Math.PI * 2,
				a: 0.06 + Math.random() * 0.11,
			});
		}
	}

	function drawSparkles(w, h, colors) {
		if (!sparkles.length || sparklesW !== w || sparklesH !== h) rebuildSparkles(w, h);

		var core = mix([255, 255, 255], colors.accent, 0.22);
		var glow = mix([255, 255, 255], colors.accent, 0.42);

		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.lineCap = "round";

		if (!perfMode && !ie11) {
			ctx.shadowColor = rgba(glow, 0.28);
			ctx.shadowBlur = dpr > 1.25 ? 1 : 2;
		}

		for (var i = 0; i < sparkles.length; i++) {
			var s = sparkles[i];
			var tw = 0.5 + 0.5 * Math.sin(s.ph + s.tw * tAccum);
			var alpha = s.a * (0.25 + 0.75 * tw * tw);
			var r = s.r * (0.8 + 0.35 * tw);

			ctx.strokeStyle = rgba(core, alpha);
			ctx.lineWidth = perfMode || ie11 ? 0.7 : 0.9;

			// XMB-ish tiny star: main cross plus smaller diagonals
			ctx.beginPath();
			ctx.moveTo(s.x - r, s.y);
			ctx.lineTo(s.x + r, s.y);
			ctx.moveTo(s.x, s.y - r);
			ctx.lineTo(s.x, s.y + r);

			var d = 0.62 * r;
			ctx.moveTo(s.x - d, s.y - d);
			ctx.lineTo(s.x + d, s.y + d);
			ctx.moveTo(s.x - d, s.y + d);
			ctx.lineTo(s.x + d, s.y - d);
			ctx.stroke();
		}

		ctx.restore();
	}

	function drawFrame(w, h) {
		var colors = getThemeColors();
		drawBackground(w, h, colors);
		drawRibbonBand(w, h, colors);
		drawSparkles(w, h, colors);

		var edge = ctx.createLinearGradient(0, 0, w, 0);
		edge.addColorStop(0, "rgba(0,0,0,0.20)");
		edge.addColorStop(0.06, "rgba(0,0,0,0)");
		edge.addColorStop(0.94, "rgba(0,0,0,0)");
		edge.addColorStop(1, "rgba(0,0,0,0.20)");
		ctx.fillStyle = edge;
		ctx.fillRect(0, 0, w, h);
	}

	function raf(ts) {
		// Pause when hidden or if the canvas was removed.
		try {
			if (document && document.hidden) return;
			if (!canvas || !canvas.parentNode) return;
		} catch (_) {}

		var dt = (ts - lastTs) / 1000;
		if (!isFinite(dt) || dt < 0) dt = 0;
		dt = Math.min(0.05, dt);
		lastTs = ts;
		tAccum += dt;

		if (!throttleTs) throttleTs = ts;
		if (ts - throttleTs < targetMs) {
			window.requestAnimationFrame(raf);
			return;
		}
		throttleTs = ts;

		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, viewW, viewH);

		// preserve the original 4:3 crop behavior
		var aspect = viewW / viewH;
		var target = 4 / 3;
		var drawW, drawH;
		if (aspect > target) {
			drawH = viewH;
			drawW = viewH * target;
		} else {
			drawW = viewW;
			drawH = viewW / target;
		}
		var ox = 0.5 * (viewW - drawW);
		var oy = 0.5 * (viewH - drawH);

		ctx.save();
		ctx.beginPath();
		ctx.rect(ox, oy, drawW, drawH);
		ctx.clip();
		ctx.translate(ox, oy);
		// Sparkle field depends on draw-space size
		if (sparklesW !== drawW || sparklesH !== drawH) rebuildSparkles(drawW, drawH);
		drawFrame(drawW, drawH);
		ctx.restore();

		window.requestAnimationFrame(raf);
	}

	var rafId = 0;
	function start() {
		try {
			if (document && document.hidden) return;
		} catch (_) {}
		try {
			lastTs = window.performance.now();
			throttleTs = 0;
		} catch (_) {}
		rafId = window.requestAnimationFrame(raf);
	}
	function stop() {
		try {
			if (rafId) window.cancelAnimationFrame(rafId);
		} catch (_) {}
		rafId = 0;
	}

	try {
		if (document && document.addEventListener) {
			document.addEventListener("visibilitychange", function () {
				try {
					if (document.hidden) stop();
					else start();
				} catch (_) {}
			});
			// Ensure RAF stops on page unload too.
			try {
				window.addEventListener && window.addEventListener("unload", function () { try { stop(); } catch (_) {} });
			} catch (_) {}
		}
	} catch (_) {}

	start();
})();
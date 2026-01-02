/* Bloomy Waves (Canvas) — ES5 / IE11-safe */
(function () {
    // ---- Tiny polyfills for IE11 ----
    if (!window.performance) { window.performance = {}; }
    if (!window.performance.now) {
        window.performance.now = function () { return +new Date(); };
    }

    if (!Math.hypot) {
        Math.hypot = function () {
            var sum = 0;
            for (var i = 0; i < arguments.length; i++) {
                var n = arguments[i];
                sum += n * n;
            }
            return Math.sqrt(sum);
        };
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = window.msRequestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.mozRequestAnimationFrame
            || function (cb) {
                return window.setTimeout(function () {
                    cb(window.performance.now());
                }, 16);
            };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = window.msCancelAnimationFrame
            || window.webkitCancelAnimationFrame
            || window.mozCancelAnimationFrame
            || function (id) { window.clearTimeout(id); };
    }

    if (window.Element && !Element.prototype.remove) {
        Element.prototype.remove = function () {
            if (this.parentNode) this.parentNode.removeChild(this);
        };
    }

    // If the site is running in IE11 compatibility/performance mode, avoid
    // running the heavy canvas animation. Instead, expose lightweight stubs
    // so other code can still query theme values without CPU cost.
    try {
        var isIe11Mode = false;
        if (typeof window !== 'undefined') {
            if (window.PVE_MODE === 'ie11') isIe11Mode = true;
            try { if (document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('ie11')) isIe11Mode = true; } catch(e){}
        }
        // Also detect a performance-base mode (enabled by default) which
        // applies IE11-derived performance tuning but still runs a lightweight
        // canvas animation rather than short-circuiting entirely.
        var isPerfBase = false;
        try { if (typeof window !== 'undefined' && window.PVE_MODE === 'perf') isPerfBase = true; } catch(e){}
        try { if (document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('perf-base')) isPerfBase = true; } catch(e){}

        if (isIe11Mode) {
            // For IE11 mode, enable a performance-first mode but still run the
            // canvas animation (with lower quality). This preserves panels
            // and ribbon visuals while keeping CPU/GPU usage low.
            try { window.__PVE_PERF_BASE = true; window.PVE_MODE = window.PVE_MODE || 'ie11'; } catch(e){}
            // Provide a simple theme setter so other scripts can query colors
            window.ribbonsSetTheme = function (mode, themeId) {
                try {
                    var accent = '#57bcff';
                    var outline = '#2b6fa0';
                    document.documentElement.style.setProperty('--ribbons-accent', accent);
                    document.documentElement.style.setProperty('--ribbons-outline', outline);
                    document.documentElement.style.setProperty('--ribbons-accent-rgb', '87,188,255');
                    document.documentElement.style.setProperty('--ribbons-outline-rgb', '43,111,160');
                } catch (e) {}
            };
            window.ribbonsAccentColor = '#57bcff';
            // Do NOT return here; continue with a reduced-quality initialization
            // so the ribbons and panels remain visible in IE11 mode.
        }
        // If perf-base is enabled, expose a reduced-quality mode flag so the
        // rest of the script can pick lighter constants and lower DPR.
        if (isPerfBase) {
            try { window.__PVE_PERF_BASE = true; } catch(e){}
        }
    } catch (e) {}

    // ---- Canvas init ----
    var canvas = document.getElementById("ribbons-of-life")
        || document.querySelector("canvas.ribbons-canvas")
        || document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    var discCanvas = document.createElement("canvas");
    var discCtx = discCanvas.getContext("2d");

    if (document.body) {
        document.body.style.margin = "0";
    }

    // Cleanup any previously injected CRT/pixelation/cursor elements.
    (function () {
        try {
            if (document.body && document.body.classList) {
                document.body.classList.remove("crt-cursor");
            }

            var injected = document.querySelectorAll('.crt-overlay, .mouse-cursor, svg[data-ui-filters="true"]');
            for (var i = 0; i < injected.length; i++) {
                if (injected[i] && injected[i].parentNode) injected[i].parentNode.removeChild(injected[i]);
            }

            var screen = document.querySelector(".site-screen");
            if (screen && screen.parentNode) {
                var frag = document.createDocumentFragment();
                while (screen.firstChild) frag.appendChild(screen.firstChild);
                screen.parentNode.insertBefore(frag, screen);
                screen.parentNode.removeChild(screen);
            }
        } catch (e) {
            // ignore
        }
    })();

    if (!canvas.id) canvas.id = "ribbons-of-life";
    if (canvas.classList) canvas.classList.add("ribbons-canvas");
    if (!canvas.parentNode && document.body) {
        document.body.insertBefore(canvas, document.body.firstChild);
    }

    var dpr = Math.max(1, window.devicePixelRatio || 1);
    // If perf-base is active, limit DPR to 1 to reduce canvas pixel count
    try { if (window.__PVE_PERF_BASE) dpr = 1; } catch(e){}
    var W = 0;
    var H = 0;
    function resize() {
        W = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || (document.body && document.body.clientWidth) || 0;
        H = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || (document.body && document.body.clientHeight) || 0;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        discCanvas.width = W * dpr;
        discCanvas.height = H * dpr;
        discCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (window.addEventListener) window.addEventListener("resize", resize);
    resize();

    // ---- Math helpers ----
    function rand(a, b) {
        if (a === undefined) a = 1;
        if (b === undefined) b = 0;
        return b + (a - b) * Math.random();
    }
    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }
    function lerpC(c1, c2, t) {
        var r = Math.round(lerp(c1[0], c2[0], t));
        var g = Math.round(lerp(c1[1], c2[1], t));
        var b = Math.round(lerp(c1[2], c2[2], t));
        return "rgb(" + r + "," + g + "," + b + ")";
    }


        // ---- Theme palettes ----
        // Settings/themes have been removed; the site is forced to Opal (light).
        var THEME_PALETTES = {
            'opal': {TOP:[220,240,255], MID:[180,210,230], BOT:[140,180,210]}
        };
        // Default theme
        var _themeId = 'opal';
        var _theme = THEME_PALETTES[_themeId] || {TOP:[220,240,255], MID:[180,210,230], BOT:[140,180,210]};
        var TOP = (_theme.TOP && _theme.TOP.slice) ? _theme.TOP.slice() : (_theme.STOPS && _theme.STOPS[0] ? _theme.STOPS[0].slice() : [0,0,0]);
        var MID = (_theme.MID && _theme.MID.slice) ? _theme.MID.slice() : (_theme.STOPS && _theme.STOPS[Math.floor((_theme.STOPS.length-1)/2)] ? _theme.STOPS[Math.floor((_theme.STOPS.length-1)/2)].slice() : [5,20,60]);
        var BOT = (_theme.BOT && _theme.BOT.slice) ? _theme.BOT.slice() : (_theme.STOPS && _theme.STOPS[_theme.STOPS.length-1] ? _theme.STOPS[_theme.STOPS.length-1].slice() : [10,60,140]);
        var THEME_STOPS = (_theme.STOPS && _theme.STOPS.slice) ? _theme.STOPS.slice() : null;

        // Theme setter for site scripts
        window.ribbonsSetTheme = function(mode, themeId) {
            // Resolve palette keys with flexible fallbacks:
            // Try: themeId-mode, themeId, base-mode, base, alt '-joy' variants, then fallback.
            function resolvePalette(id, mode) {
                var candidates = [];
                if (id) {
                    candidates.push(id + '-' + mode);
                    candidates.push(id);
                }
                // normalize base (remove -joy or -pride suffix if present)
                var base = id ? id.replace(/(-joy|-pride)$/, '') : id;
                if (base && base !== id) {
                    candidates.push(base + '-' + mode);
                    candidates.push(base);
                    candidates.push(base + '-pride-' + mode);
                    candidates.push(base + '-joy-' + mode);
                    candidates.push(base + '-pride');
                    candidates.push(base + '-joy');
                }
                // also try common explicit light/dark suffixes
                candidates.push(id + '-light');
                candidates.push(id + '-dark');
                for (var i = 0; i < candidates.length; i++) {
                    var k = candidates[i];
                    if (k && THEME_PALETTES.hasOwnProperty(k)) return THEME_PALETTES[k];
                }
                return THEME_PALETTES['opal'];
            }

            // Dark mode removed; always resolve as light.
            var t = resolvePalette(themeId, 'light');
            // Support multi-stop palettes (STOPS) for complex gradients like rainbow
            if (t.STOPS && t.STOPS.slice) {
                THEME_STOPS = t.STOPS.slice();
                TOP = THEME_STOPS[0].slice();
                MID = THEME_STOPS[Math.floor((THEME_STOPS.length-1)/2)].slice();
                BOT = THEME_STOPS[THEME_STOPS.length-1].slice();
            } else {
                THEME_STOPS = null;
                TOP = (t.TOP && t.TOP.slice) ? t.TOP.slice() : TOP;
                MID = (t.MID && t.MID.slice) ? t.MID.slice() : MID;
                BOT = (t.BOT && t.BOT.slice) ? t.BOT.slice() : BOT;
            }
            // Choose an accent color for UI outlines: prefer a non-neutral stop
            function isNeutral(col) {
                try {
                    if (!col || col.length < 3) return true;
                    var r = col[0], g = col[1], b = col[2];
                    // nearly gray if RGB components are very close
                    var maxv = Math.max(r,g,b), minv = Math.min(r,g,b);
                    if ((maxv - minv) <= 12) return true;
                    // near-black or near-white
                    if (maxv < 20) return true;
                    if (minv > 235) return true;
                    return false;
                } catch(e) { return true; }
            }
            function rgbStr(col){ return 'rgb(' + (col[0]|0) + ',' + (col[1]|0) + ',' + (col[2]|0) + ')'; }
            var accentCol = null;
            if (THEME_STOPS && THEME_STOPS.slice) {
                for (var si=0; si<THEME_STOPS.length; si++){
                    if (!isNeutral(THEME_STOPS[si])) { accentCol = THEME_STOPS[si]; break; }
                }
            }
            if (!accentCol) {
                if (!isNeutral(MID)) accentCol = MID;
                else if (!isNeutral(TOP)) accentCol = TOP;
                else if (!isNeutral(BOT)) accentCol = BOT;
            }
            if (!accentCol) accentCol = MID || TOP || BOT;
            try {
                var accentStr = rgbStr(accentCol || [87,188,255]);
                window.ribbonsAccentColor = accentStr;
                if (document && document.documentElement && document.documentElement.style) {
                    try { document.documentElement.style.setProperty('--ribbons-accent', accentStr); } catch(e) {}
                }
                // Always produce a light outline color by blending the accent toward white.
                var t = 0.72; // blend factor toward white (0..1)
                var finalCol = [ Math.round(lerp(accentCol[0]||87, 255, t)), Math.round(lerp(accentCol[1]||188, 255, t)), Math.round(lerp(accentCol[2]||255, 255, t)) ];
                var finalStr = 'rgba(' + (finalCol[0]|0) + ',' + (finalCol[1]|0) + ',' + (finalCol[2]|0) + ',0.95)';
                // Compute a darker outline color (default thin outline) so it's visually darker than the hover accent
                var darkCol = [ Math.max(0, Math.round(finalCol[0] * 0.5)), Math.max(0, Math.round(finalCol[1] * 0.5)), Math.max(0, Math.round(finalCol[2] * 0.5)) ];
                var darkStr = 'rgba(' + (darkCol[0]|0) + ',' + (darkCol[1]|0) + ',' + (darkCol[2]|0) + ',0.95)';
                // Update CSS variables on the document so standard styles pick them up
                try { if (document && document.documentElement && document.documentElement.style) {
                    try { document.documentElement.style.setProperty('--ribbons-outline', darkStr); } catch(e) {}
                    try { document.documentElement.style.setProperty('--ribbons-outline-rgb', (darkCol[0]|0) + ',' + (darkCol[1]|0) + ',' + (darkCol[2]|0)); } catch(e) {}
                    try { document.documentElement.style.setProperty('--ribbons-accent-rgb', (accentCol[0]|0) + ',' + (accentCol[1]|0) + ',' + (accentCol[2]|0)); } catch(e) {}
                } } catch(e) {}

                // Inject or update a cross-browser CSS rule (IE11 doesn't support CSS variables reliably)
                try {
                    var styleId = 'ribbons-accent-style';
                    var st = document.getElementById(styleId);
                                        // sheen overlay color (tinted, low alpha)
                                        var sheenColor = 'rgba(' + (finalCol[0]|0) + ',' + (finalCol[1]|0) + ',' + (finalCol[2]|0) + ',0.10)';
                                        var cssRule = '' +
                                                                '.frutiger-aero .game-card::after { content:""; position:absolute; top:6px; right:-4px; bottom:6px; left:-4px; border-radius:12px; box-shadow: 0 0 0 1px ' + darkStr + ' !important; opacity:1 !important; pointer-events:none; transition: box-shadow 180ms ease, opacity 180ms ease; z-index:2; }\n' +
                                                                '.frutiger-aero .game-card:hover::after { box-shadow: 0 0 0 3px ' + finalStr + ', 0 0 14px ' + finalStr + ' !important; }\n' +
                                                                '.frutiger-aero .game-card::before { content:""; position:absolute; top:10px; bottom:6px; left:-4px; right:-4px; border-radius:10px; background-image: linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0.06)), linear-gradient(to bottom, ' + sheenColor + ', rgba(255,255,255,0.00)), linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0.02)); background-position: top left, top left, bottom left; background-size: 100% 28px, 100% 28px, 100% 7px; background-repeat: no-repeat; opacity:0; pointer-events:none; transition: opacity 180ms ease, transform 220ms ease; z-index:0; transform: translateY(0); }\n' +
                                                                '.frutiger-aero .game-card:hover::before { opacity:1 !important; transform: translateY(-2px) !important; }\n' +
                                                                '.frutiger-aero .game-card .game-thumb, .frutiger-aero .game-card .game-info { position:relative; z-index:3; }\n' +
                                                                '.frutiger-aero .section-separator { background: ' + finalStr + '; height: 4px !important; box-shadow: 0 0 14px ' + finalStr + ' !important; border: 0 !important; }\n' +
                                                                'html:not(.black-text) .frutiger-aero .btn:hover, html:not(.black-text) .frutiger-aero button:hover, html:not(.black-text) .frutiger-aero input[type="button"]:hover, html:not(.black-text) .frutiger-aero input[type="submit"]:hover, html:not(.black-text) .frutiger-aero .nav-item:hover { background: ' + finalStr + ' !important; color: #ffffff !important; box-shadow: 0 6px 22px ' + finalStr + ' !important; }\n' +
                                                                '.frutiger-aero .btn:hover > *, .frutiger-aero button:hover > *, .frutiger-aero .nav-item:hover > * { position: relative; z-index: 3 !important; }\n';
                    if (!st) {
                        st = document.createElement('style');
                        st.id = styleId;
                        st.type = 'text/css';
                        st.appendChild(document.createTextNode(cssRule));
                        (document.head || document.getElementsByTagName('head')[0]).appendChild(st);
                    } else {
                        // replace content
                        if (st.styleSheet) st.styleSheet.cssText = cssRule; else { st.textContent = cssRule; }
                    }
                } catch(e) {}
            } catch(e){}
            // Redraw immediately
            reset();
        };

    var SP_COUNT = 60;
    var FG_COUNT = 24;
    var SP_MIN = 0.6;
    var SP_MAX = 2.2;
    var SP_ALPHA_BASE = 40;

    var SP_BG_SPEED = 1.0;
    var SP_BG_MAX = 4.4;
    var SP_FG_SPEED = 4.4;
    var SP_FG_MAX = 12.0;

    var GRAVITY = 0;
    var GRAVITY_FALLOFF = 0.8;
    var PUSH = 9;
    var MAX_SPEED = 6;

    var RIPPLE_LIFE = 1.4;
    var RIPPLE_RADIUS = 220;
    var RIPPLE_PUSH = 260;
    var WAVE_H = 14;
    var WAVE_LEN = 140;
    var WAVE_SPEED = 5.5;

    var LINE_COUNT = 2;
    var LINE_AMP = 28;
    var LINE_FREQ = 0.01;
    var LINE_SPEED = 0.05;
    var LINE_W = 2.2;
    var LINE_ALPHA = 0.9;
    var LINE_VAR = 0.08;

    var CONNECT_STEP = 10;

    // Apply lower-quality defaults when perf-base mode is active
    try {
        if (window.__PVE_PERF_BASE) {
            SP_COUNT = 30;
            FG_COUNT = 12;
            SP_BG_MAX = 2.2;
            SP_FG_MAX = 6.0;
            LINE_AMP = 20;
            LINE_W = 1.6;
            LINE_SPEED = 0.035;
            LINE_VAR = 0.06;
            CONNECT_STEP = 14;
            RIPPLE_LIFE = 1.6;
            RIPPLE_RADIUS = 180;
            DISC_ALPHA = 0.18;
        }
    } catch(e){}

    var DISC_ALPHA = 0.28;
    var DISC_R = 0.22;
    var DISC_ASPECT_Y = 0.62;
    var DISC_SPIKE = 0.16;
    var DISC_FADE = 1.25;

    // ---- State ----
    var time = 0;
    var ripples = [];
    var sparkles = [];
    var fgSparkles = [];
    var waves = [];

    function stratifiedPositions(count) {
        var cols = Math.max(1, Math.ceil(Math.sqrt(count)));
        var rows = Math.max(1, Math.ceil(count / cols));
        var cw = W / cols;
        var ch = H / rows;
        var out = [];
        var idx = 0;
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                if (idx++ >= count) break;
                out.push([c * cw + cw * rand(0.85, 0.15), r * ch + ch * rand(0.85, 0.15)]);
            }
        }
        return out;
    }

    function initSparkles() {
        var positions = stratifiedPositions(SP_COUNT);
        var out = [];
        for (var i = 0; i < positions.length; i++) {
            var p = positions[i];
            out.push({
                x: p[0],
                y: p[1],
                vx: rand(SP_BG_SPEED, -SP_BG_SPEED) * 0.5,
                vy: rand(SP_BG_SPEED, -SP_BG_SPEED) * 0.5,
                size: rand(SP_MAX, SP_MIN),
                phase: rand(Math.PI * 2)
            });
        }
        return out;
    }

    function initFgSparkles() {
        var positions = stratifiedPositions(Math.max(1, FG_COUNT));
        var out = [];
        for (var i = 0; i < positions.length; i++) {
            var p = positions[i];
            out.push({
                x: p[0],
                y: p[1],
                vx: rand(SP_FG_SPEED, -SP_FG_SPEED) * 0.6,
                vy: rand(SP_FG_SPEED, -SP_FG_SPEED) * 0.6,
                size: rand(SP_MAX * 0.9, Math.max(0.5, SP_MIN * 0.8)),
                phase: rand(Math.PI * 2)
            });
        }
        return out;
    }

    function initWaves() {
        var mid = (LINE_COUNT - 1) * 0.5;
        var spacing = 64;
        var list = [];
        for (var i = 0; i < LINE_COUNT; i++) {
            var baseY = H * 0.5 + (i - mid) * spacing;
            list.push({
                amp: LINE_AMP * (0.85 + 0.3 * Math.random()),
                freq: LINE_FREQ * (0.9 + 0.25 * Math.random()),
                phase: rand(Math.PI * 2),
                phaseSpeed: 0.9 + 0.3 * Math.random(),
                y: baseY,
                w: LINE_W * (0.8 + 0.2 * Math.random())
            });
        }
        return list;
    }

    function addRipple(x, y) {
        ripples.push({ x: x, y: y, age: 0 });
    }
    canvas.addEventListener("mousedown", function (e) {
        var rect = canvas.getBoundingClientRect();
        addRipple((e.clientX - rect.left), (e.clientY - rect.top));
    });

    function rippleOffset(x, y) {
        var off = 0;
        for (var i = 0; i < ripples.length; i++) {
            var r = ripples[i];
            var dx = x - r.x;
            var dy = y - r.y;
            var dist = Math.hypot(dx, dy);
            if (dist > RIPPLE_RADIUS || dist < 1e-5) continue;
            var radial = 1 - dist / RIPPLE_RADIUS;
            var fall = clamp(1 - r.age / RIPPLE_LIFE, 0, 1);
            var phase = dist / WAVE_LEN - r.age * WAVE_SPEED;
            var wave = Math.cos(phase * Math.PI * 2);
            off += wave * Math.pow(radial, 1.4) * fall * WAVE_H;
        }
        return off;
    }

    function updateSparkles(dt, list, collision, maxSpeed) {
        if (collision === undefined) collision = true;
        if (maxSpeed === undefined) maxSpeed = MAX_SPEED;

        // collisions (simple)
        if (collision) {
            for (var i = 0; i < list.length; i++) {
                var a = list[i];
                for (var j = i + 1; j < list.length; j++) {
                    var b = list[j];
                    var dx = b.x - a.x;
                    var dy = b.y - a.y;
                    if (dx > W * 0.5) dx -= W; else if (dx < -W * 0.5) dx += W;
                    if (dy > H * 0.5) dy -= H; else if (dy < -H * 0.5) dy += H;
                    var dist = Math.hypot(dx, dy);
                    var minDist = a.size + b.size;
                    if (dist === 0 || dist >= minDist) continue;
                    var nx = dx / dist;
                    var ny = dy / dist;
                    var overlap = (minDist - dist);
                    var mi = Math.max(0.2, a.size);
                    var mj = Math.max(0.2, b.size);
                    var inv = 1 / (mi + mj);
                    var push = overlap * PUSH * inv * dt;
                    a.x -= nx * push * mj; a.y -= ny * push * mj;
                    b.x += nx * push * mi; b.y += ny * push * mi;
                }
            }
        }

        // gravity toward larger (disabled when GRAVITY = 0)
        if (collision && GRAVITY > 0) {
            for (var i = 0; i < list.length; i++) {
                var a = list[i];
                var mi = Math.max(0.2, a.size);
                for (var j = 0; j < list.length; j++) {
                    if (i === j) continue;
                    var b = list[j];
                    var mj = Math.max(0.2, b.size);
                    if (mi <= mj) continue;
                    var dx = b.x - a.x;
                    var dy = b.y - a.y;
                    if (dx > W * 0.5) dx -= W; else if (dx < -W * 0.5) dx += W;
                    if (dy > H * 0.5) dy -= H; else if (dy < -H * 0.5) dy += H;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 1e-4) continue;
                    var f = GRAVITY * (mi / Math.pow(d2, GRAVITY_FALLOFF));
                    b.vx += f * dx * dt;
                    b.vy += f * dy * dt;
                }
            }
        }

        // ripples
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            for (var j = 0; j < ripples.length; j++) {
                var r = ripples[j];
                var dx = s.x - r.x;
                var dy = s.y - r.y;
                if (dx > W * 0.5) dx -= W; else if (dx < -W * 0.5) dx += W;
                if (dy > H * 0.5) dy -= H; else if (dy < -H * 0.5) dy += H;
                var dist = Math.hypot(dx, dy);
                if (dist < 1e-5 || dist > RIPPLE_RADIUS) continue;
                var radial = 1 - dist / RIPPLE_RADIUS;
                var fall = clamp(1 - r.age / RIPPLE_LIFE, 0, 1);
                var strength = (collision ? RIPPLE_PUSH : RIPPLE_PUSH * 0.65) * Math.pow(radial, 1.2) * fall;
                var nx = dx / dist;
                var ny = dy / dist;
                s.vx += nx * strength * dt;
                s.vy += ny * strength * dt;
            }
        }

        // move + clamp speed
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var spd = Math.hypot(s.vx, s.vy);
            var cap = collision ? maxSpeed : maxSpeed * 0.75;
            if (spd > cap) {
                var k = cap / spd;
                s.vx *= k; s.vy *= k;
            }
            s.x = (s.x + s.vx * dt + W) % W;
            s.y = (s.y + s.vy * dt + H) % H;
            s.phase = (s.phase || 0) + dt * 1.5;
        }
    }

    // IE-friendly gradient (single fill) for performance
    function drawGradient() {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        if (THEME_STOPS && THEME_STOPS.length) {
            var n = THEME_STOPS.length;
            for (var i = 0; i < n; i++) {
                var stop = THEME_STOPS[i];
                var pos = i / (n - 1);
                g.addColorStop(pos, 'rgb(' + stop[0] + ',' + stop[1] + ',' + stop[2] + ')');
            }
        } else {
            g.addColorStop(0, lerpC(TOP, TOP, 0));
            g.addColorStop(0.55, lerpC(TOP, MID, 1));
            g.addColorStop(1, lerpC(MID, BOT, 1));
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function drawPhotonDisc() {
        var cx = W * 0.5;
        var cy = H * 0.5;
        var r = Math.min(W, H) * DISC_R;

        discCtx.clearRect(0, 0, W, H);
        discCtx.globalCompositeOperation = "lighter";
        discCtx.globalAlpha = DISC_ALPHA;

        var outerX = W * 0.55;
        var outerY = Math.min(H * 0.22, (r * 1.35) * DISC_ASPECT_Y);

        function buildDiscPath() {
            var steps = 96;
            discCtx.beginPath();
            for (var i = 0; i <= steps; i++) {
                var a = (i / steps) * Math.PI * 2;
                var lobe = 1 + DISC_SPIKE * Math.cos(4 * a);
                var x = cx + Math.cos(a) * outerX * lobe;
                var y = cy + Math.sin(a) * outerY * lobe;
                if (i === 0) discCtx.moveTo(x, y); else discCtx.lineTo(x, y);
            }
            discCtx.closePath();
        }

        buildDiscPath();
        var gx = discCtx.createLinearGradient(0, cy, W, cy);
        gx.addColorStop(0.00, "rgba(255, 90, 150, 0.00)");
        gx.addColorStop(0.14, "rgba(255, 90, 150, 0.40)");
        gx.addColorStop(0.33, "rgba(255, 210, 110, 0.34)");
        gx.addColorStop(0.52, "rgba(90, 240, 190, 0.30)");
        gx.addColorStop(0.70, "rgba(80, 210, 255, 0.34)");
        gx.addColorStop(0.86, "rgba(170, 120, 255, 0.36)");
        gx.addColorStop(1.00, "rgba(170, 120, 255, 0.00)");
        discCtx.fillStyle = gx;
        discCtx.fill();

        buildDiscPath();
        discCtx.globalAlpha = DISC_ALPHA * 0.85;
        discCtx.save();
        discCtx.translate(cx, cy);
        discCtx.scale(outerX, outerY);
        discCtx.translate(-cx, -cy);
        var core = discCtx.createRadialGradient(cx, cy, 0, cx, cy, 1);
        core.addColorStop(0.00, "rgba(255,255,255,0.26)");
        core.addColorStop(0.20, "rgba(210,250,255,0.20)");
        core.addColorStop(0.55, "rgba(140,180,255,0.10)");
        core.addColorStop(1.00, "rgba(0,0,0,0.00)");
        discCtx.fillStyle = core;
        discCtx.fill();
        discCtx.restore();

        discCtx.globalCompositeOperation = "destination-in";
        discCtx.globalAlpha = 1;
        discCtx.save();
        discCtx.translate(cx, cy);
        discCtx.scale(outerX * DISC_FADE, outerY * DISC_FADE);
        discCtx.translate(-cx, -cy);
        var mask = discCtx.createRadialGradient(cx, cy, 0, cx, cy, 1);
        mask.addColorStop(0.00, "rgba(0,0,0,1)");
        mask.addColorStop(0.35, "rgba(0,0,0,1)");
        mask.addColorStop(1.00, "rgba(0,0,0,0)");
        discCtx.fillStyle = mask;
        discCtx.fillRect(0, 0, W, H);
        discCtx.restore();

        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1;
        ctx.drawImage(discCanvas, 0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
    }

    function drawLines(t) {
        ctx.globalAlpha = LINE_ALPHA;
        var ribbons = [];

        for (var idx = 0; idx < waves.length; idx++) {
            var wv = waves[idx];
            var pts = [];
            var baseAmp = wv.amp;
            var freq = wv.freq;
            var phase = wv.phase + t * LINE_SPEED * wv.phaseSpeed;
            for (var x = 0; x <= W; x += 4) {
                var vx = x / W;
                var localAmp = baseAmp * (1 + LINE_VAR * Math.sin(vx * 6));
                var localFreq = freq * (1 + 0.2 * Math.sin(vx * 4));
                var y = Math.sin(x * localFreq + phase) * localAmp + wv.y;
                y += rippleOffset(x, y);
                pts.push([x, y]);
            }
            ribbons.push({ pts: pts, w: wv.w });
        }

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var colors = ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.92)"];
        for (var i = 0; i < ribbons.length; i++) {
            var r = ribbons[i];
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = r.w;
            ctx.beginPath();
            for (var j = 0; j < r.pts.length; j++) {
                var p = r.pts[j];
                if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
            }
            ctx.stroke();
        }

        if (ribbons.length === 2) {
            var a = ribbons[0].pts;
            var b = ribbons[1].pts;
            var count = Math.min(a.length, b.length);
            var upper = [];
            var lower = [];
            for (var k = 0; k < count; k += CONNECT_STEP) {
                var p0 = a[k];
                var p1 = b[k];
                var dx = p1[0] - p0[0];
                var dy = p1[1] - p0[1];
                var inset = 0.18;
                upper.push([p0[0] + dx * inset, p0[1] + dy * inset]);
                lower.push([p1[0] - dx * inset, p1[1] - dy * inset]);
            }

            ctx.globalAlpha = 0.24;
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            if (upper.length) {
                ctx.moveTo(upper[0][0], upper[0][1]);
                for (var u = 1; u < upper.length; u++) ctx.lineTo(upper[u][0], upper[u][1]);
                for (var l = lower.length - 1; l >= 0; l--) ctx.lineTo(lower[l][0], lower[l][1]);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        ctx.globalAlpha = 1;
    }

    function drawSparkles(list, alphaBase) {
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var twinkle = 1 + 0.18 * Math.sin((s.phase || 0) * 1.7);
            var a = clamp(alphaBase * twinkle, 8, 220);
            var r = Math.max(1, s.size);
            var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.2);
            g.addColorStop(0, "rgba(255,255,255," + (a / 255) + ")");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    }

    function drawVignette() {
        var g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.32)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function reset() {
        sparkles = initSparkles();
        fgSparkles = initFgSparkles();
        waves = initWaves();
        ripples = [];
        time = 0;
    }
    reset();

    var last = window.performance.now();
    function frame(now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        ctx.clearRect(0, 0, W, H);

        // update ripples without Array.filter (keeps it simple)
        var nextRipples = [];
        for (var i = 0; i < ripples.length; i++) {
            var r = ripples[i];
            r.age += dt;
            if (r.age < RIPPLE_LIFE) nextRipples.push(r);
        }
        ripples = nextRipples;

        drawGradient();
        drawPhotonDisc();
        drawLines(time);
        updateSparkles(dt, sparkles, true, SP_BG_MAX);
        updateSparkles(dt, fgSparkles, true, SP_FG_MAX);
        drawSparkles(sparkles, SP_ALPHA_BASE);
        drawSparkles(fgSparkles, 160);
        drawVignette();

        time += dt * 60 * 0.25;
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
})();
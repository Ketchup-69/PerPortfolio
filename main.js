/* ==========================================================
   THE HOUSE — engine (grid edition)
   Arcade loader → flight → grid world. Table, cursor, music,
   molecules. No dependencies.
   ========================================================== */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const SITE = window.SITE || {};
  const PROJECTS = window.PROJECTS || [];
  const MUSIC = window.MUSIC || { tracks: [] };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = matchMedia("(hover: none)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  };

  /* ----------------------------------------------------------
     CONTENT
     ---------------------------------------------------------- */
  const SUITS = {
    heart: [".##...##.", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#....", "........."],
    diamond: ["....#....", "...###...", "..#####..", ".#######.", "#########", ".#######.", "..#####..", "...###...", "....#...."],
    spade: ["....#....", "...###...", "..#####..", ".#######.", "#########", "#########", ".##.#.##.", "....#....", "...###..."],
    club: ["...###...", "..#####..", "..#####..", ".##.#.##.", "#########", "#########", ".##.#.##.", "....#....", "...###..."],
  };
  function suitSVG(suit, cls = "suit-svg") {
    let d = "";
    (SUITS[suit] || SUITS.spade).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") d += `M${x} ${y}h1v1h-1z`; }));
    return `<svg class="${cls}" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const HEX = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 28 9v14L16 30 4 23V9z"/></svg>`;

  const cardsEl = $("#cards");
  const ROT = [-5, 3, -2, 5, -4, 2, -3, 4];
  const OFF = [0, 46, -14, 30, -24, 18, 8, -10];
  PROJECTS.forEach((p, i) => {
    const n = String(i + 1).padStart(2, "0");
    const links = [
      p.repo ? `<a href="${esc(p.repo)}" target="_blank" rel="noopener">Repo ↗</a>` : "",
      p.live ? `<a href="${esc(p.live)}" target="_blank" rel="noopener">Live ↗</a>` : "",
    ].join("");
    const el = document.createElement("article");
    el.className = "card";
    el.tabIndex = 0;
    el.dataset.suit = p.suit;
    el.setAttribute("aria-label", `Project ${n}: ${p.title}`);
    const mid = (PROJECTS.length - 1) / 2;
    el.style.setProperty("--fan", `${((i - mid) * 3.4).toFixed(1)}deg`);
    el.style.setProperty("--off", `${(Math.abs(i - mid) ** 2 * 7).toFixed(0)}px`);
    el.innerHTML = `
      <div class="card-tilt"><div class="card-inner">
        <div class="card-face card-back"><div class="back-emblem">${HEX}<span>OK</span></div><p class="back-no">No. ${n}</p></div>
        <div class="card-face card-front">
          <div class="corner tl"><span class="rank">${esc(p.rank)}</span>${suitSVG(p.suit)}</div>
          ${suitSVG(p.suit, "suit-svg watermark")}
          <div class="card-body">
            <p class="card-num">Project ${n}</p>
            <h3>${esc(p.title)}</h3>
            <p class="blurb">${esc(p.blurb)}</p>
            <ul class="stack">${(p.stack || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          </div>
          <div class="card-links">${links}</div>
          <div class="corner br"><span class="rank">${esc(p.rank)}</span>${suitSVG(p.suit)}</div>
        </div>
      </div></div>`;
    cardsEl.appendChild(el);
  });

  $$("[data-site]").forEach((el) => { const v = SITE[el.dataset.site]; if (v) el.textContent = v; });
  const resume = SITE.resumeUrl || "#";
  $$("[data-resume]").forEach((a) => {
    a.href = resume;
    if (resume !== "#") { a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", (e) => { e.preventDefault(); toast("Resume link coming soon"); });
  });
  const linkRow = (key, href, label) => {
    const a = $(`[data-link="${key}"]`);
    if (!a) return;
    if (!href) { a.hidden = true; return; }
    a.href = href;
    const v = $(".r-val", a);
    if (label && v) v.textContent = label;
  };
  linkRow("github", SITE.github);
  linkRow("linkedin", SITE.linkedin);
  linkRow("email", SITE.email ? `mailto:${SITE.email}` : "", SITE.email);
  $("#year").textContent = new Date().getFullYear();

  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      Object.assign(toastEl.style, {
        position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", zIndex: 400,
        fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase",
        padding: "12px 16px", background: "rgba(5,9,18,.9)", color: "var(--ivory)", border: "1px solid var(--accent)",
        boxShadow: "0 0 24px rgba(255,90,36,.3)", transition: "opacity .3s", opacity: 0, pointerEvents: "none",
      });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = 1;
    clearTimeout(toastT);
    toastT = setTimeout(() => (toastEl.style.opacity = 0), 1800);
  }

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  const state = { mx: 0.5, my: 0.5, smx: 0.5, smy: 0.5, px: -9999, py: -9999, lastMove: 0, sy: scrollY, lastSy: scrollY, vel: 0, t: 0 };
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    state.mx = e.clientX / innerWidth;
    state.my = e.clientY / innerHeight;
    state.px = e.clientX;
    state.py = e.clientY;
    state.lastMove = performance.now();
  }, { passive: true });
  if (noHover) {
    addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      state.mx = clamp(0.5 + e.gamma / 60, 0, 1);
      state.my = clamp(0.5 + (e.beta - 45) / 80, 0, 1);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     SOUND — interface only, synthesized
     ---------------------------------------------------------- */
  const Sound = (() => {
    let ac = null, master = null, noiseBuf = null;
    let enabled = store.get("house-sound") !== "0";
    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = enabled ? 0.8 : 0;
        master.connect(ac.createDynamicsCompressor()).connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    const ready = () => enabled && ensure();
    function noise(dur, type, freq, q, gain, when = 0, f2) {
      const t = ac.currentTime + when;
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.004 + dur * 0.4, 0.6));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(master);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    }
    function tone(freq, dur, type, gain, when = 0, endFreq) {
      const t = ac.currentTime + when;
      const o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function chipClack(n = 2) {
      for (let i = 0; i < n; i++) {
        const w = i * (0.045 + Math.random() * 0.03);
        tone(2400 + Math.random() * 1200, 0.05, "triangle", 0.12, w);
        noise(0.035, "highpass", 3200, 0.7, 0.22, w);
      }
    }
    return {
      get enabled() { return enabled; },
      unlock() { if (enabled) ensure(); },
      set(v) {
        enabled = v;
        store.set("house-sound", v ? "1" : "0");
        if (v) { ensure(); master.gain.setTargetAtTime(0.8, ac.currentTime, 0.08); }
        else if (ac) master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      },
      flip() { if (!ready()) return; noise(0.09, "bandpass", 2300, 0.9, 0.3); tone(820, 0.08, "triangle", 0.045, 0, 260); },
      chip(n = 2) { if (ready()) chipClack(n); },
      tick() { if (ready()) tone(1900, 0.02, "square", 0.01); },
      lever() { if (!ready()) return; noise(0.12, "lowpass", 600, 0.7, 0.35); tone(140, 0.18, "square", 0.06, 0, 70); tone(90, 0.12, "square", 0.05, 0.22, 60); },
      spin() { if (!ready()) return; for (let i = 0; i < 18; i++) tone(700 + (i % 3) * 120, 0.03, "square", 0.02, i * 0.07); },
      reel() { if (!ready()) return; tone(220, 0.08, "square", 0.06); noise(0.05, "highpass", 2000, 0.6, 0.15); },
      coin() { if (!ready()) return; tone(988, 0.08, "square", 0.05); tone(1319, 0.32, "square", 0.05, 0.08); },
      whoosh() {
        if (!ready()) return;
        noise(2.4, "bandpass", 180, 0.8, 0.5, 0, 4200);
        noise(1.6, "lowpass", 400, 0.5, 0.25, 0.3, 1600);
        tone(55, 2.2, "sine", 0.18, 0, 110);
      },
      land() { if (!ready()) return; tone(110, 0.9, "sine", 0.2, 0, 55); noise(0.5, "lowpass", 900, 0.6, 0.18, 0, 200); [659.25, 987.77].forEach((f, i) => tone(f, 1.2, "sine", 0.05, 0.05 + i * 0.06)); },
      jackpot() {
        if (!ready()) return;
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => tone(f, 0.3, "square", 0.03, i * 0.065));
        for (let i = 0; i < 14; i++) tone(1800 + Math.random() * 1600, 0.05, "triangle", 0.03, 0.2 + i * 0.05);
        for (let i = 0; i < 5; i++) setTimeout(() => chipClack(2), 450 + i * 90);
      },
    };
  })();

  const sndBtn = $("#sndToggle");
  const syncSnd = () => sndBtn.setAttribute("aria-pressed", String(Sound.enabled));
  syncSnd();
  sndBtn.addEventListener("click", () => { Sound.set(!Sound.enabled); syncSnd(); if (Sound.enabled) Sound.chip(2); });
  addEventListener("pointerdown", () => Sound.unlock(), { passive: true });
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("a, button");
    if (t && !t.contains(e.relatedTarget)) Sound.tick();
  });

  /* ----------------------------------------------------------
     PIXEL HELPERS (loader)
     ---------------------------------------------------------- */
  const B8 = (() => {
    const m = [[0, 2], [3, 1]];
    let b = m;
    for (let n = 2; n < 8; n *= 2) {
      const nb = [];
      for (let y = 0; y < n * 2; y++) { nb[y] = []; for (let x = 0; x < n * 2; x++) nb[y][x] = 4 * b[y % n][x % n] + m[(y / n) | 0][(x / n) | 0]; }
      b = nb;
    }
    return b.flat().map((v) => (v + 0.5) / 64);
  })();
  const bay = (x, y) => B8[((y & 7) << 3) | (x & 7)];
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); }
  const hex3 = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  function paint(w, h, fn) {
    const c = mk(w, h), g = c.getContext("2d"), img = g.createImageData(c.width, c.height), d = img.data;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const r = fn(x, y);
      if (!r) continue;
      const i = (y * c.width + x) * 4;
      d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = r[3] ?? 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  const pick = (ramp, v, x, y) => ramp[clamp(Math.floor(v * (ramp.length - 1) + bay(x, y)), 0, ramp.length - 1)];
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ----------------------------------------------------------
     SCENE — casino in space, 8-bit. Dithered sky, earth below a
     pixel grid, light-cycle trails, chips and dice drifting.
     ---------------------------------------------------------- */
  const pk = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  function bres(x0, y0, x1, y1, fn) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      fn(x0, y0);
      if ((x0 === x1 && y0 === y1) || ++n > 4000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  const DQ = new URLSearchParams(location.search).get("dither") !== "bayer"; // high-quality error-diffusion dither by default; ?dither=bayer for the chunky ordered look
  const rampLerp = (ramp, v) => { const f = clamp(v, 0, 1) * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(f)), t = f - i; return [lerp(ramp[i][0], ramp[i + 1][0], t), lerp(ramp[i][1], ramp[i + 1][1], t), lerp(ramp[i][2], ramp[i + 1][2], t)]; };
  const shade = (ramp, v, x, y) => (DQ ? rampLerp(ramp, v) : pick(ramp, v, x, y));
  function fsQuantize(cv, pal) {
    const w = cv.width, h = cv.height, g2 = cv.getContext("2d"), im = g2.getImageData(0, 0, w, h), d = im.data;
    const er = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, k = i * 4;
      if (d[k + 3] === 0) continue;
      const r = d[k] + er[i * 3], gg = d[k + 1] + er[i * 3 + 1], b = d[k + 2] + er[i * 3 + 2];
      let best = pal[0], bd = 1e9;
      for (const p of pal) { const dd = (p[0] - r) ** 2 + (p[1] - gg) ** 2 + (p[2] - b) ** 2; if (dd < bd) { bd = dd; best = p; } }
      d[k] = best[0]; d[k + 1] = best[1]; d[k + 2] = best[2];
      const e = [r - best[0], gg - best[1], b - best[2]];
      const push = (xx, yy, f) => { if (xx < 0 || xx >= w || yy >= h) return; const j = (yy * w + xx); if (d[j * 4 + 3] === 0) return; er[j * 3] += e[0] * f; er[j * 3 + 1] += e[1] * f; er[j * 3 + 2] += e[2] * f; };
      push(x + 1, y, 7 / 16); push(x - 1, y + 1, 3 / 16); push(x, y + 1, 5 / 16); push(x + 1, y + 1, 1 / 16);
    }
    g2.putImageData(im, 0, 0);
  }

  const Scene = (() => {
    const cv = $("#scene"), ctx = cv.getContext("2d");
    let S = 3, W = 0, H = 0, backdrop = null, earth = null, ov = null, og = null, oimg = null, obuf = null;
    let stars = [];
    const cam = { hz: 0.6, h: 1.3, sp: 3, z: 0 };
    let landStart = -1, visible = false, hzOverride = null;
    const P = {
      void: hex3("#020409"), deep: hex3("#060b1c"), navy: hex3("#0a1633"), navy2: hex3("#13244f"), navy3: hex3("#1e3a78"),
      blue: hex3("#3d7bff"), ice: hex3("#9cc4ff"), white: hex3("#e8f0ff"), acc: hex3("#ff5a24"), accD: hex3("#8a2a0e"), accS: hex3("#ff9a74"),
      land1: hex3("#3a2c24"), land2: hex3("#7a5c3e"), land3: hex3("#b08a5c"), teal: hex3("#1f5a5a"),
    };

    function buildBackdrop() {
      const pad = 30, w = W + pad * 2, h = Math.ceil(H * 1.6);
      const ramp = [P.void, P.deep, P.navy, P.navy2, P.navy3, P.blue, P.ice];
      backdrop = paint(w, h, (x, y) => {
        let v = 0.02 + 0.12 * (y / h);
        const nx = x / w, ny = y / H;
        const dl = Math.abs((ny - 0.05) - (nx - 0.55) * 1.4) / 1.72;
        const mask = Math.max(0, 1 - dl / 0.3) * (nx > 0.35 ? 1 : 0.2) * (ny < 1.1 ? 1 : Math.max(0, 1 - (ny - 1.1) * 3));
        if (mask > 0) v += mask * smooth(clamp((fbm(x * 0.022, y * 0.03, 5) - 0.38) / 0.4, 0, 1)) * 0.7;
        const wm = Math.max(0, 1 - Math.hypot(nx - 0.3, ny - 0.13) / 0.12);
        if (!DQ && wm > 0 && bay(x, y) < wm * 0.18) return P.accD;
        if (DQ && wm > 0) v += wm * 0.08;
        return shade(ramp, clamp(v, 0, 1), x, y);
      });
      backdrop.pad = pad;
      if (DQ) fsQuantize(backdrop, ramp);
      stars = [];
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0, n = Math.floor((w * h) / 700); i < n; i++) {
        const r = rnd();
        stars.push({ x: Math.floor(rnd() * w), y: Math.floor(rnd() * h), c: r < 0.1 ? P.accS : r < 0.55 ? P.ice : P.white, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.2, big: rnd() < 0.03 });
      }
    }
    function buildEarth() {
      const w = W + 40, h = Math.ceil(H * 1.0);
      const R = W * 0.95, cx = w / 2, cy = R + 14;
      const ocean = [P.void, P.navy, P.navy2, P.navy3, P.blue], cloud = [P.navy3, P.blue, P.ice, P.white, P.white], land = [P.land1, P.teal, P.land2, P.land3];
      earth = paint(w, h, (x, y) => {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) {
          const u = dx / R, vv = dy / R, z = Math.sqrt(Math.max(0, 1 - u * u - vv * vv));
          const light = clamp(0.5 + 0.35 * z - u * 0.15, 0, 1) * 0.6;
          const sx = u / (z + 0.25), sy = vv / (z + 0.25);
          const cl = fbm(sx * 9 + 3, sy * 14 + 1, 5), ln = fbm(sx * 5 + 40, sy * 8 + 12, 4);
          const rim = R - d;
          if (rim < 1.5) return P.ice;
          if (rim < 3.5 && bay(x, y) < 0.5) return P.blue;
          if (cl > 0.6) return shade(cloud, clamp(((cl - 0.6) / 0.35) * light, 0, 1), x, y);
          if (ln > 0.57) return shade(land, clamp(((ln - 0.57) / 0.25) * light, 0, 1), x, y);
          return shade(ocean, clamp(light * 0.7 + cl * 0.2, 0, 1), x, y);
        }
        const a = d - R;
        if (a < 10) {
          const t = 1 - a / 10 + (bay(x, y) - 0.5) * 0.5;
          if (t > 0.85) return P.ice;
          if (t > 0.6) return P.blue;
          if (t > 0.35) return [...P.navy3, 200];
        }
        return null;
      });
      if (DQ) fsQuantize(earth, [...ocean, ...cloud, ...land, P.ice, P.blue, P.navy3]);
    }

    function resize() {
      const iw = innerWidth, ih = innerHeight;
      S = DQ ? (iw >= 1600 ? 2 : iw >= 900 ? 2 : 1) : iw >= 1600 ? 4 : iw >= 900 ? 3 : 2;
      W = Math.ceil(iw / S); H = Math.ceil(ih / S);
      cv.width = W; cv.height = H;
      cv.style.width = W * S + "px"; cv.style.height = H * S + "px";
      ctx.imageSmoothingEnabled = false;
      buildBackdrop(); buildEarth();
      computeKeys();
    }

    // floating casino objects
    const OBJ = [
      { k: "chip", x: 0.52, y: 0.13, s: 7, c: [198, 30, 46], d: 1.4, ph: 0 },
      { k: "die", x: 0.86, y: 0.15, s: 6, d: 1.1, ph: 1.7 },
      { k: "card", x: 0.7, y: 0.29, s: 8, d: 0.8, ph: 3.1 },
      { k: "chip", x: 0.37, y: 0.07, s: 4, c: [30, 58, 120], d: 0.6, ph: 2.2 },
      { k: "chip", x: 0.95, y: 0.37, s: 4, c: [255, 90, 36], d: 1.8, ph: 4.4 },
      { k: "die", x: 0.62, y: 0.06, s: 4, d: 1.6, ph: 0.8 },
    ];
    const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    function drawObj(o, t, mx, sl) {
      const S0 = Math.max(3, Math.round(o.s * (W / 480) * 1.4));
      const x = Math.round(o.x * W - mx * W * 0.04 * o.d), y = Math.round(o.y * H + Math.sin(t * 0.8 + o.ph) * 2 - sl * 0.04 * o.d);
      const F = (c, X, Y, w = 1, h = 1) => { ctx.fillStyle = typeof c === "string" ? c : rgb(c); ctx.fillRect(X, Y, w, h); };
      if (o.k === "chip") {
        const a = t * 1.6 + o.ph, rx = Math.max(1, Math.round(S0 * Math.abs(Math.cos(a)))), r = S0;
        for (let dy = -r; dy <= r; dy++) {
          const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / r) ** 2)));
          if (half < 1 && rx > 1) continue;
          F(o.c, x - half, y + dy, half * 2 + 1, 1);
          if (rx > 2) { const st = ((dy + Math.floor(a * 6)) & 3) < 2 ? "#f2ece2" : rgb(o.c); F(st, x - half, y + dy); F(st, x + half, y + dy); }
        }
        if (rx > 3) for (let dy = -Math.round(r * 0.55); dy <= Math.round(r * 0.55); dy += 2) { const hh = Math.round(rx * 0.55 * Math.sqrt(Math.max(0, 1 - (dy / (r * 0.55)) ** 2))); F("rgba(242,236,226,.75)", x - hh, y + dy); F("rgba(242,236,226,.75)", x + hh, y + dy); }
      } else if (o.k === "die") {
        const face = 1 + (Math.floor(t * 0.9 + o.ph) % 6), s = S0;
        F("#0b0d14", x - s - 1, y - s - 1, s * 2 + 3, s * 2 + 3);
        F("#f2ece2", x - s, y - s, s * 2 + 1, s * 2 + 1);
        F("#c9c0b0", x - s, y + s, s * 2 + 1, 1); F("#c9c0b0", x + s, y - s, 1, s * 2 + 1);
        const g = Math.max(1, Math.round(s * 0.55));
        for (const [px, py] of PIPS[face]) F(face === 1 ? "#c61e2e" : "#0b0d14", x + px * g, y + py * g, s > 5 ? 2 : 1, s > 5 ? 2 : 1);
      } else {
        const fl = Math.cos(t * 0.9 + o.ph), w = Math.max(1, Math.round(S0 * 0.75 * Math.abs(fl))), h = Math.round(S0 * 1.05);
        F("#0b0d14", x - w - 1, y - h - 1, w * 2 + 3, h * 2 + 3);
        if (fl > 0) {
          F("#f2ece2", x - w, y - h, w * 2 + 1, h * 2 + 1);
          if (w > 2) { F("#c61e2e", x, y - 2, 1, 5); F("#c61e2e", x - 1, y - 1, 3, 3); F("#c61e2e", x - w + 1, y - h + 1); }
        } else {
          F("#0a1230", x - w, y - h, w * 2 + 1, h * 2 + 1);
          if (w > 1) { F("#ff5a24", x - w, y - h, w * 2 + 1, 1); F("#ff5a24", x - w, y + h, w * 2 + 1, 1); }
        }
      }
    }

    let keys = [];
    const CAM = { lobby: { hz: 0.6, h: 1.3, sp: 3 }, rules: { hz: 0.44, h: 2.4, sp: 1.2 }, table: { hz: -0.45, h: 1.0, sp: 0 }, cashout: { hz: 0.56, h: 1.4, sp: 10 } };
    function computeKeys() {
      keys = ["lobby", "rules", "table", "cashout"].map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { c: r.top + scrollY + r.height / 2, v: CAM[id] };
      }).filter(Boolean);
    }
    function target(pos) {
      if (!keys.length) return CAM.lobby;
      if (pos <= keys[0].c) return keys[0].v;
      for (let i = 0; i < keys.length - 1; i++) {
        const a = keys[i], b = keys[i + 1];
        if (pos <= b.c) {
          const t = easeInOut(clamp((pos - a.c) / (b.c - a.c), 0, 1));
          return { hz: lerp(a.v.hz, b.v.hz, t), h: lerp(a.v.h, b.v.h, t), sp: lerp(a.v.sp, b.v.sp, t) };
        }
      }
      return keys[keys.length - 1].v;
    }

    let last = performance.now();
    function draw(now = performance.now()) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible) return;
      const t = now / 1000;
      const tg0 = target(scrollY + innerHeight * 0.5), tg = hzOverride === null ? tg0 : { ...tg0, hz: hzOverride }, k = reduceMotion ? 1 : 0.12;
      cam.hz = lerp(cam.hz, tg.hz, k); cam.h = lerp(cam.h, tg.h, k); cam.sp = lerp(cam.sp, tg.sp + Math.min(14, Math.abs(state.vel) * 0.25), k);
      let hz = cam.hz, h = cam.h;
      if (landStart >= 0) {
        const lt = clamp((now - landStart) / 1800, 0, 1), e = easeOut(lt);
        hz = lerp(1.15, hz, e); h = lerp(9, h, e);
        if (lt >= 1) landStart = -1;
      }

      const mx = state.smx - 0.5, my = state.smy - 0.5, sl = scrollY / S;
      const hzY = Math.round(H * (hz - my * 0.04));
      const vx = W / 2 - mx * W * 0.14, f = H * 0.95;

      ctx.fillStyle = "#020409"; ctx.fillRect(0, 0, W, H);
      const bx = Math.round(-backdrop.pad - mx * W * 0.02), by = Math.round(-Math.min(sl * 0.05, backdrop.height - H) - my * 6);
      ctx.drawImage(backdrop, bx, by);
      for (const s of stars) {
        const x = s.x + bx, y = s.y + by;
        if (x < 0 || x >= W || y < 0 || y >= Math.min(H, hzY)) continue;
        const b = reduceMotion ? 0.8 : 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        if (b < 0.2) continue;
        ctx.fillStyle = rgb(s.c, b > 0.65 ? 1 : 0.45);
        ctx.fillRect(x, y, 1, 1);
        if (s.big && b > 0.7) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
      // warm flare (top-left sun)
      const fx = Math.round(W * 0.3 + bx + backdrop.pad), fy = Math.round(H * 0.13 + by);
      if (fy > -20 && fy < hzY) {
        const L = Math.round(6 + Math.sin(t * 1.3) * 2);
        ctx.fillStyle = "#ff9a74"; ctx.fillRect(fx - L * 2, fy, L * 4 + 1, 1); ctx.fillRect(fx, fy - L * 2, 1, L * 4 + 1);
        ctx.fillStyle = "#fff"; ctx.fillRect(fx - 1, fy - 1, 3, 3);
      }
      if (hzY > 0) for (const o of OBJ) drawObj(o, reduceMotion ? 0 : t, mx, sl);
      if (hzY < H) ctx.drawImage(earth, Math.round(-20 - mx * W * 0.03), hzY + Math.round(H * 0.05) - 14);

      const dim = clamp((scrollY - innerHeight * 0.5) / innerHeight, 0, 1) * 0.45;
      if (dim > 0) { ctx.fillStyle = `rgba(2,4,9,${dim.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    }

    addEventListener("resize", resize);
    addEventListener("load", computeKeys);
    document.fonts?.ready.then(computeKeys);
    resize();
    return { draw, show() { visible = true; }, land() { visible = true; landStart = performance.now(); }, recompute: computeKeys, override(v) { hzOverride = v; } };
  })();

  /* ----------------------------------------------------------
     LOADER — a player at a slot machine on earth. Enter: he
     pulls the lever, 7-7-7, and we get pulled into the reel,
     up through the clouds, out to the casino in space.
     ---------------------------------------------------------- */
  const Gate = (() => {
    const gate = $("#gate"), cv = $("#gateCanvas");
    if (!gate || !cv) return null;
    const g = cv.getContext("2d");
    const countEl = $("#gateCount"), barEl = $("#gateBar"), skipBtn = $("#gateSkip");
    let S = 3, W = 0, H = 0, room = null, player = null, L = {};
    let clouds = null, gstars = [], coins = [];
    let running = true, ready = false, tEnter = -1, onDone = null, landed = false, unlocked = false, prog = 0, jackpotFired = false;
    const t0 = performance.now();
    let loaded = false;
    Promise.all([
      new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))),
      document.fonts ? document.fonts.ready : Promise.resolve(),
    ]).then(() => { loaded = true; buildRoom(); });

    // 8x8 reel symbols
    const SYMS = {
      seven: ["........", ".rrrrrr.", ".RRRRrr.", "....rr..", "...rr...", "...rr...", "..rr....", "..rr...."],
      cherry: ["....ggg.", "...g...g", "..g....g", ".rr...rr", "rwrr.rwr", "rrrr.rrr", ".rr..rr.", "........"],
      bell: ["...yy...", "..yyyy..", ".yyyyyy.", ".ywyyyy.", ".yyyyyy.", "yyyyyyyy", "YYYYYYYY", "...YY..."],
      diamond: ["...cc...", "..cwcc..", ".cwcccc.", "cccccccc", ".cccccC.", "..cccC..", "...CC...", "........"],
      star: ["...yy...", "...yy...", "yyyyyyyy", ".yyyyyy.", "..yyyy..", ".yy..yy.", "yy....yy", "........"],
      chip: ["..aaaa..", ".awwwwa.", "awaaaawa", "awa..awa", "awa..awa", "awaaaawa", ".awwwwa.", "..aaaa.."],
    };
    const SPAL = { r: "#e8322a", R: "#8e1220", g: "#3fbf4f", y: "#ffcc33", Y: "#c98a12", c: "#8fe9ff", C: "#2f7fb0", w: "#ffffff", a: "#ff5a24" };
    const STRIP = ["cherry", "bell", "seven", "diamond", "star", "chip", "bell", "cherry", "diamond", "star"];
    const reels = [0, 1, 2].map((i) => ({ pos: 3 + i * 3.3, v: 0, spinning: false, stop: null }));
    const symCache = {};
    function sym(name, k) {
      const key = name + k;
      if (symCache[key]) return symCache[key];
      const c = mk(8 * k, 8 * k), x = c.getContext("2d");
      SYMS[name].forEach((row, yy) => [...row].forEach((ch, xx) => { if (SPAL[ch]) { x.fillStyle = SPAL[ch]; x.fillRect(xx * k, yy * k, k, k); } }));
      return (symCache[key] = c);
    }

    function layout() {
      const floorY = Math.round(H * 0.8);
      const mh = Math.round(Math.min(H * 0.8, W * 1.2));
      const mw = Math.round(mh * 0.5);
      const cx = Math.round(W / 2), top = floorY - mh;
      const tH = Math.round(mh * 0.2), wY = top + tH + Math.round(mh * 0.05), wH = Math.round(mh * 0.25);
      const wPad = Math.max(3, Math.round(mw * 0.1));
      const wX = cx - (mw >> 1) + wPad, wW = mw - wPad * 2;
      const reelW = Math.floor((wW - 4) / 3), cell = Math.floor(wH / 2.3);
      const ledY = wY + wH + Math.round(mh * 0.035), ledH = Math.max(10, Math.round(mh * 0.06));
      const deckY = ledY + ledH + Math.round(mh * 0.03), deckH = Math.round(mh * 0.05);
      const hr = Math.max(5, Math.round(mw * 0.12));
      L = {
        floorY, mh, mw, cx, top, x0: cx - (mw >> 1), x1: cx + (mw >> 1), tH, wX, wY, wW, wH, reelW, cell,
        ledY, ledH, deckY, deckH,
        lever: { x: cx + (mw >> 1) + 3, y: wY + Math.round(wH * 0.55), len: Math.round(mh * 0.2) },
        head: { x: cx - Math.round(mw * 0.16), y: deckY + Math.round(mh * 0.16), r: hr },
      };
      L.shoulder = { x: L.head.x + Math.round(hr * 2.4), y: L.head.y + Math.round(hr * 2.2) };
    }

    function buildRoom() {
      layout();
      const { floorY, cx, x0, x1, top, mw, mh } = L;
      room = paint(W, H, (x, y) => {
        if (y < floorY) {
          // wall: dark wine to navy, a glow behind the machine, ceiling light bars
          const v = 0.12 + 0.4 * (y / floorY);
          const gd = Math.hypot((x - cx) / (mw * 1.5), (y - (top + mh * 0.35)) / (mh * 0.7));
          const gl = Math.max(0, 1 - gd);
          if (gl * 0.85 > bay(x, y) + 0.12) return gl > 0.6 ? [96, 30, 14] : [40, 14, 12];
          return pick([[5, 5, 12], [12, 8, 20], [22, 12, 28]], v, x, y);
        }
        // casino carpet: diamond pattern, darker toward the edges
        const fy = (y - floorY) / (H - floorY);
        const u = x - cx, w = y - floorY + 4;
        const p = ((((u + w * 2) >> 3) ^ ((u - w * 2) >> 3)) & 1);
        const vig = 1 - Math.min(1, Math.abs(u) / (W * 0.6)) * 0.6;
        const glow = Math.max(0, 1 - Math.hypot(u / (mw * 1.1), fy * 2.4));
        if (glow * 0.7 > bay(x, y) + 0.1) return [80, 26, 14];
        return bay(x, y) < (p ? 0.55 : 0.3) * vig ? (p ? [58, 14, 22] : [16, 22, 48]) : [8, 6, 14];
      });
      const r = room.getContext("2d");
      r.imageSmoothingEnabled = false;
      const R = (c, x, y, w, h) => { r.fillStyle = typeof c === "string" ? c : rgb(c); r.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };
      // neighbouring machines
      for (const k of [2, 1]) for (const side of [-1, 1]) {
        const sc = k === 1 ? 0.72 : 0.56, w = Math.round(mw * sc), h = Math.round(mh * sc);
        const sx = Math.round(cx + side * mw * (k === 1 ? 1.15 : 2.0) - w / 2), sy = floorY - h;
        R([24, 8, 12], sx, sy, w, h);
        R([60, 20, 16], sx + 1, sy + 1, w - 2, Math.round(h * 0.18));
        R([6, 6, 12], sx + Math.round(w * 0.12), sy + Math.round(h * 0.26), Math.round(w * 0.76), Math.round(h * 0.24));
        R(side < 0 ? [20, 60, 90] : [90, 40, 20], sx + Math.round(w * 0.16), sy + Math.round(h * 0.3), Math.round(w * 0.68), Math.round(h * 0.16));
        R([120, 128, 145], sx - 1, sy, 1, h); R([120, 128, 145], sx + w, sy, 1, h);
        r.fillStyle = `rgba(5,5,12,${k === 1 ? 0.4 : 0.6})`; r.fillRect(sx - 2, sy, w + 4, h);
      }
      // the machine
      const CH = "#9aa3b5", CHD = "#5a6275";
      R("#1c0a0e", x0, top + L.tH, mw, mh - L.tH);
      R(CH, x0 - 1, top + L.tH, 1, mh - L.tH); R(CHD, x0, top + L.tH, 1, mh - L.tH); R(CH, x1, top + L.tH, 1, mh - L.tH);
      // topper (stepped arch)
      const tw = mw + 4, tx = x0 - 2, th = L.tH;
      for (let i = 0; i < th; i++) {
        const inset = i < 4 ? [6, 3, 2, 1][i] : 0;
        R(i < 2 ? "#ff5a24" : "#3a0f0c", tx + inset, top + i, tw - inset * 2, 1);
      }
      R("#14060a", tx + 4, top + 4, tw - 8, th - 7);
      let fs = Math.max(8, Math.floor((th * 0.42) / 8) * 8);
      r.textAlign = "center"; r.textBaseline = "middle";
      r.font = `${fs}px Silkscreen, monospace`;
      while (fs > 8 && r.measureText("OM KASHYAP").width > tw - 14) { fs -= 8; r.font = `${fs}px Silkscreen, monospace`; }
      r.fillStyle = "#2a0d06"; r.fillText("OM KASHYAP", cx + 1, top + th / 2 + 1);
      r.fillStyle = "#ffe2d6"; r.fillText("OM KASHYAP", cx, top + th / 2);
      // reel bezel
      R(CH, L.wX - 3, L.wY - 3, L.wW + 6, L.wH + 6);
      R("#0b0d14", L.wX - 1, L.wY - 1, L.wW + 2, L.wH + 2);
      // LED panel + deck + buttons
      R("#05060b", L.wX, L.ledY, L.wW, L.ledH);
      R(CHD, L.wX - 1, L.ledY - 1, L.wW + 2, 1);
      R("#2a1216", x0 - 3, L.deckY, mw + 6, L.deckH);
      R(CH, x0 - 3, L.deckY, mw + 6, 1);
      for (let i = 0; i < 3; i++) R(["#ff5a24", "#8fe9ff", "#ffcc33"][i], x0 + Math.round(mw * (0.25 + i * 0.22)), L.deckY + 2, Math.max(2, Math.round(mw * 0.08)), 2);
      // belly glass
      const by = L.deckY + L.deckH + 2, bh = Math.round(mh * 0.12);
      R("#2a0f12", L.wX, by, L.wW, bh);
      R("#ff5a24", L.wX, by, L.wW, 1);
      r.font = `8px Silkscreen, monospace`; r.fillStyle = "#ff9a74"; r.fillText("THE HOUSE", cx, by + bh / 2);
      // coin tray
      const ty = floorY - Math.round(mh * 0.1);
      R(CH, L.wX - 2, ty, L.wW + 4, 2); R("#0b0d14", L.wX, ty + 2, L.wW, Math.round(mh * 0.04));
      L.tray = { x: cx, y: ty };
      // lever housing
      R(CH, L.lever.x - 1, L.lever.y - 2, 4, 6); R(CHD, L.lever.x, L.lever.y - 1, 2, 4);
      R("#05050a", x0 - 1, floorY - 2, mw + 2, 2);
      buildPlayer();
    }

    // the player, from behind: a silhouette with rim light from the machine
    function buildPlayer() {
      const { x: hx, y: hy, r: hr } = L.head;
      const mask = new Uint8Array(W * H);
      const set = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = 1; };
      for (let y = hy - hr - 1; y <= hy + hr; y++) {
        const dy = (y - hy) / (hr + (y < hy ? 1 : 0));
        const half = Math.round(hr * 0.92 * Math.sqrt(Math.max(0, 1 - dy * dy)));
        for (let x = hx - half; x <= hx + half; x++) set(x, y);
      }
      const nw = Math.round(hr * 0.45);
      for (let y = hy + hr - 1; y < hy + hr * 1.5; y++) for (let x = hx - nw; x <= hx + nw; x++) set(x, y);
      const y0 = Math.round(hy + hr * 1.3);
      for (let y = y0; y < H; y++) {
        const t = clamp((y - y0) / (hr * 1.3), 0, 1);
        const half = Math.round(lerp(hr * 0.9, hr * 2.9, smooth(t)) + (y - y0) * 0.08);
        for (let x = hx - half; x <= hx + half; x++) set(x, y);
      }
      player = paint(W, H, (x, y) => {
        if (!mask[y * W + x]) return null;
        const up = y > 0 && !mask[(y - 1) * W + x];
        const right = x < W - 1 && !mask[y * W + x + 1];
        const left = x > 0 && !mask[y * W + x - 1];
        if (up) return [255, 150, 110];
        if (right) return [150, 60, 30];
        if (left) return [30, 60, 90];
        return bay(x, y) < 0.08 ? [16, 12, 22] : [6, 6, 12];
      });
    }

    function genClouds() {
      const hw = Math.ceil(W / 2), hh = Math.ceil(H / 2);
      const mkLayer = (len, sc, seedX, alpha) => {
        const lh = Math.round(hh * len);
        const ramp = [hex3("#22325c"), hex3("#4a5f94"), hex3("#8ea4d6"), hex3("#d5e0f7")];
        const c = paint(hw, lh, (x, y) => {
          const yn = y / lh;
          const env = smooth(clamp((yn - 0.12) / 0.25, 0, 1)) * smooth(clamp((0.9 - yn) / 0.25, 0, 1));
          if (env <= 0) return null;
          const n = fbm(x * sc + seedX, y * sc * 1.6, 4);
          const v = n * env * 1.55 - 0.42;
          if (v <= 0) return null;
          const lit = clamp(v * 2.2 + (fbm(x * sc + seedX, (y - 3) * sc * 1.6, 3) - n) * -4, 0, 1);
          const col = pick(ramp, lit, x, y);
          return [col[0], col[1], col[2], alpha];
        });
        return { c, len };
      };
      clouds = [mkLayer(2.2, 0.03, 10, 200), mkLayer(3.1, 0.022, 40, 230), mkLayer(4.4, 0.016, 90, 255)];
      gstars = Array.from({ length: 140 }, () => [Math.random(), Math.random(), Math.random()]);
    }

    function resize() {
      const iw = innerWidth, ih = innerHeight;
      S = iw >= 1500 ? 4 : iw >= 800 ? 3 : 2;
      W = Math.ceil(iw / S); H = Math.ceil(ih / S);
      cv.width = W; cv.height = H;
      cv.style.width = W * S + "px"; cv.style.height = H * S + "px";
      g.imageSmoothingEnabled = false;
      buildRoom();
      if (clouds) genClouds();
    }
    resize();
    addEventListener("resize", resize);
    setTimeout(() => { if (!clouds) genClouds(); }, 350);

    // timeline (seconds after enter)
    const T = { reach: 0.28, pull: 0.55, back: 0.85, spin: 0.5, stops: [1.15, 1.45, 1.75], jackpot: 1.95, zoom: 2.25, zoomEnd: 3.2, beamEnd: 3.6, flyEnd: 5.8 };

    function leverState(te) {
      // 0 = up, 1 = fully pulled
      if (te < 0) return 0;
      if (te < T.reach) return 0;
      if (te < T.pull) return easeIn((te - T.reach) / (T.pull - T.reach));
      if (te < T.back) return 1 - easeOut((te - T.pull) / (T.back - T.pull));
      return 0;
    }

    function drawMachine(t, te) {
      const { cx, x0, mw, top, tH } = L;
      // topper bulbs
      const jack = te >= T.jackpot;
      const per = [];
      for (let x = x0; x <= x0 + mw; x += 3) per.push([x, top + 1]);
      for (let y = top + 3; y < top + tH - 2; y += 3) { per.push([x0 - 1, y]); per.push([x0 + mw + 1, y]); }
      per.forEach(([x, y], i) => {
        const on = jack ? Math.floor(t * 12) % 2 === 0 : (i + Math.floor(t * 8)) % 3 === 0;
        g.fillStyle = on ? "#fff3c4" : "#5a2416"; g.fillRect(x, y, 1, 1);
      });
      // reels
      g.save();
      g.beginPath(); g.rect(L.wX, L.wY, L.wW, L.wH); g.clip();
      g.fillStyle = "#f2ece2"; g.fillRect(L.wX, L.wY, L.wW, L.wH);
      const k = Math.max(1, Math.floor(Math.min(L.reelW, L.cell) * 0.78 / 8));
      const cyR = L.wY + L.wH / 2;
      reels.forEach((rl, i) => {
        const rx = L.wX + 1 + i * (L.reelW + 1);
        const fast = rl.spinning && !rl.stop;
        for (let j = Math.floor(rl.pos) - 2; j <= Math.floor(rl.pos) + 2; j++) {
          const name = STRIP[((j % STRIP.length) + STRIP.length) % STRIP.length];
          const yy = Math.round(cyR + (rl.pos - j) * L.cell - 4 * k);
          const xx = Math.round(rx + (L.reelW - 8 * k) / 2);
          if (fast) { g.globalAlpha = 0.45; g.drawImage(sym(name, k), xx, yy - Math.round(L.cell * 0.18)); g.drawImage(sym(name, k), xx, yy + Math.round(L.cell * 0.18)); g.globalAlpha = 1; }
          else g.drawImage(sym(name, k), xx, yy);
        }
        if (i < 2) { g.fillStyle = "#9aa3b5"; g.fillRect(rx + L.reelW, L.wY, 1, L.wH); }
      });
      // curvature shading (dithered)
      for (let y = L.wY; y < L.wY + L.wH; y++) {
        const d = Math.abs(y - cyR) / (L.wH / 2);
        if (d < 0.45) continue;
        for (let x = L.wX; x < L.wX + L.wW; x++) if (bay(x, y) < (d - 0.45) * 1.3) { g.fillStyle = "#0b0d14"; g.fillRect(x, y, 1, 1); }
      }
      g.fillStyle = jack && Math.floor(t * 12) % 2 ? "#ffcc33" : "#e8322a"; g.fillRect(L.wX, Math.round(cyR), L.wW, 1);
      g.restore();
      // LED text
      g.font = "8px Silkscreen, monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      let txt, col;
      if (te >= T.jackpot) { txt = "JACKPOT"; col = Math.floor(t * 10) % 2 ? "#ffcc33" : "#ff5a24"; }
      else if (te >= 0) { txt = "GOOD LUCK"; col = "#8fe9ff"; }
      else if (!ready) { txt = `LOADING ${String(Math.round(prog * 100)).padStart(3, "0")}`; col = "#8fe9ff"; }
      else { txt = Math.floor(t * 1.6) % 2 ? "PULL TO PLAY" : "PRESS ENTER"; col = "#ffd0bd"; }
      g.fillStyle = col; g.fillText(txt, cx, L.ledY + L.ledH / 2 + 1);
    }

    function drawLever(te) {
      const p = leverState(te), lv = L.lever;
      const tipY = Math.round(lv.y - lv.len * (1 - p) + lv.len * 0.25 * p);
      const ballR = Math.max(2, Math.round(lv.len * 0.09 * (1 + p * 0.5)));
      g.fillStyle = "#c9d1e0"; g.fillRect(lv.x + 1, Math.min(tipY, lv.y), 2, Math.abs(lv.y - tipY) + 1);
      g.fillStyle = "#5a6275"; g.fillRect(lv.x + 2, Math.min(tipY, lv.y), 1, Math.abs(lv.y - tipY) + 1);
      for (let dy = -ballR; dy <= ballR; dy++) { const hw = Math.round(Math.sqrt(ballR * ballR - dy * dy)); g.fillStyle = "#e8322a"; g.fillRect(lv.x + 2 - hw, tipY + dy, hw * 2 + 1, 1); }
      g.fillStyle = "#ffb0a0"; g.fillRect(lv.x + 1 - Math.round(ballR / 2), tipY - Math.round(ballR / 2), 1, 1);
      return { x: lv.x + 2, y: tipY };
    }

    function drawArm(ball, te) {
      const sh = L.shoulder, hr = L.head.r;
      const rest = { x: sh.x - Math.round(hr * 0.7), y: sh.y + Math.round(hr * 2.2) };
      let reach = 0;
      if (te >= 0) {
        if (te < T.reach) reach = easeOut(te / T.reach);
        else if (te < T.back) reach = 1;
        else if (te < T.back + 0.3) reach = 1 - easeInOut((te - T.back) / 0.3);
      }
      const hand = { x: Math.round(lerp(rest.x, ball.x, reach)), y: Math.round(lerp(rest.y, ball.y + 2, reach)) };
      const elbow = { x: Math.round(lerp(sh.x + hr * 0.4, (sh.x + hand.x) / 2 + hr * 0.8, reach)), y: Math.round(lerp(sh.y + hr * 1.3, (sh.y + hand.y) / 2 + hr * 0.6, reach)) };
      const th = Math.max(2, Math.round(hr * 0.55));
      const rim = (x, y) => { g.fillStyle = "#ff966e"; g.fillRect(x - (th >> 1), y - (th >> 1) - 1, th, th); };
      const stamp = (x, y) => { g.fillStyle = "#06060c"; g.fillRect(x - (th >> 1), y - (th >> 1), th, th); };
      if (reach > 0.05) { bres(sh.x, sh.y, elbow.x, elbow.y, rim); bres(elbow.x, elbow.y, hand.x, hand.y, rim); }
      bres(sh.x, sh.y, elbow.x, elbow.y, stamp); bres(elbow.x, elbow.y, hand.x, hand.y, stamp);
      g.fillStyle = "#06060c"; g.fillRect(hand.x - th, hand.y - th + 1, th * 2, th * 2 - 1);
      if (reach > 0.05) { g.fillStyle = "#ff966e"; g.fillRect(hand.x - th, hand.y - th + 1, th * 2, 1); }
    }

    function updateReels(te, dt) {
      reels.forEach((rl, i) => {
        if (te >= T.spin && !rl.spinning && !rl.done) { rl.spinning = true; rl.v = 0; }
        if (!rl.spinning) return;
        if (!rl.stop && te >= T.stops[i]) {
          let tgt = Math.ceil(rl.pos + 2);
          while (STRIP[((tgt % STRIP.length) + STRIP.length) % STRIP.length] !== "seven") tgt++;
          rl.stop = { from: rl.pos, to: tgt, t0: te };
          Sound.reel();
        }
        if (rl.stop) {
          const p = clamp((te - rl.stop.t0) / 0.42, 0, 1);
          const e = p < 1 ? 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2) : 1;
          rl.pos = lerp(rl.stop.from, rl.stop.to, e);
          if (p >= 1) { rl.spinning = false; rl.done = true; rl.pos = rl.stop.to; }
        } else {
          rl.v = Math.min(22, rl.v + dt * 90);
          rl.pos += rl.v * dt;
        }
      });
    }

    function drawCoins(dt) {
      for (const c of coins) {
        c.vy += 220 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        g.fillStyle = (c.s + Math.floor(c.y)) & 2 ? "#ffcc33" : "#c98a12";
        g.fillRect(Math.round(c.x), Math.round(c.y), 2, c.s & 1 ? 2 : 1);
      }
    }

    function scene(k, fx, fy, t, te, dt) {
      g.setTransform(k, 0, 0, k, W / 2 - k * fx, H / 2 - k * fy);
      g.imageSmoothingEnabled = false;
      if (room) g.drawImage(room, 0, 0);
      drawMachine(t, te);
      const ball = drawLever(te);
      if (coins.length) drawCoins(dt);
      if (player) g.drawImage(player, 0, 0);
      drawArm(ball, te);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    let last = performance.now();
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      const targetP = Math.min(t / 2.4, loaded ? 1 : 0.88);
      prog = Math.min(1, prog + (targetP - prog) * 0.08 + 0.0015);
      if (prog > 0.999) prog = 1;
      const pct = Math.round(prog * 100);
      countEl.textContent = String(pct).padStart(3, "0");
      barEl.style.width = pct + "%";
      if (pct === 100 && !ready) { ready = true; gate.classList.add("is-ready"); }

      if (tEnter < 0) {
        scene(1, W / 2, H / 2, t, -1, dt);
      } else {
        const te = (now - tEnter) / 1000;
        updateReels(te, dt);
        if (te >= T.jackpot && !jackpotFired) {
          jackpotFired = true; Sound.jackpot();
          for (let i = 0; i < 46; i++) coins.push({ x: L.tray.x + (Math.random() - 0.5) * L.wW * 0.6, y: L.tray.y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 150, s: i });
        }
        const mid = { x: L.wX + 1 + L.reelW * 1.5 + 1, y: L.wY + L.wH / 2 };
        if (te < T.zoom) scene(1, W / 2, H / 2, t, te, dt);
        else if (te < T.zoomEnd) {
          const p = easeIn((te - T.zoom) / (T.zoomEnd - T.zoom));
          const K = Math.max(W / L.reelW, H / L.cell) * 1.15;
          scene(lerp(1, K, p), lerp(W / 2, mid.x, Math.min(1, p * 1.5)), lerp(H / 2, mid.y, Math.min(1, p * 1.5)), t, te, dt);
          if (p > 0.6) { g.fillStyle = `rgba(255,240,232,${Math.pow((p - 0.6) / 0.4, 2) * 0.95})`; g.fillRect(0, 0, W, H); }
        } else if (te < T.beamEnd) {
          const p = (te - T.zoomEnd) / (T.beamEnd - T.zoomEnd);
          drawSky(0);
          const beam = Math.round(H * (1 - p));
          g.fillStyle = "#fff0e8"; g.fillRect(0, 0, W, beam);
          for (let y = beam; y < Math.min(H, beam + 10); y++) for (let x = 0; x < W; x++) if (bay(x, y) < 1 - (y - beam) / 10) { g.fillStyle = y - beam < 2 ? "#ff5a24" : "#fff0e8"; g.fillRect(x, y, 1, 1); }
          g.fillStyle = "rgba(255,90,36,0.9)"; g.fillRect(0, beam, W, 1);
        } else {
          const p = clamp((te - T.beamEnd) / (T.flyEnd - T.beamEnd), 0, 1);
          drawSky(p);
          if (p > 0.55 && !unlocked) { unlocked = true; document.body.classList.remove("is-locked"); Scene.show(); }
          if (p > 0.72 && !landed) { landed = true; Scene.land(); Sound.land(); }
          cv.style.opacity = p > 0.74 ? String(1 - (p - 0.74) / 0.26) : "1";
          if (p >= 1) finish();
        }
      }
      if (running) requestAnimationFrame(frame);
    }

    function drawSky(p) {
      const top = [lerp(14, 2, p), lerp(32, 4, p), lerp(72, 9, p)], bot = [lerp(36, 4, p), lerp(70, 8, p), lerp(130, 20, p)];
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, rgb(top)); gr.addColorStop(1, rgb(bot));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (p > 0.45) {
        const a = clamp((p - 0.45) / 0.3, 0, 1);
        for (const s of gstars) { g.fillStyle = `rgba(230,240,255,${a * (0.4 + s[2] * 0.6)})`; g.fillRect((s[0] * W) | 0, (s[1] * H) | 0, 1, 1); }
      }
      if (!clouds) return;
      const e = easeInOut(p);
      for (const L2 of clouds) {
        const c = L2.c, lh = c.height * 2;
        g.drawImage(c, 0, Math.round(H - lh + (lh - H) * e), c.width * 2, lh);
      }
    }

    function finish() {
      if (!running) return;
      running = false;
      if (!unlocked) { document.body.classList.remove("is-locked"); Scene.show(); }
      if (!landed) Scene.land();
      gate.remove();
      onDone && onDone();
    }
    skipBtn.addEventListener("click", () => { Sound.land(); finish(); });
    requestAnimationFrame(frame);

    return {
      get ready() { return ready; },
      start(cb) {
        if (tEnter >= 0) return;
        onDone = cb;
        if (reduceMotion) {
          gate.style.transition = "opacity .5s"; gate.style.opacity = "0";
          document.body.classList.remove("is-locked"); Scene.show();
          setTimeout(finish, 500);
          return;
        }
        if (!clouds) genClouds();
        tEnter = performance.now();
        gate.classList.add("is-flying");
        skipBtn.hidden = false;
        setTimeout(() => Sound.lever(), T.reach * 1000);
        setTimeout(() => Sound.spin(), T.spin * 1000);
        setTimeout(() => Sound.whoosh(), (T.zoomEnd - 0.2) * 1000);
      },
    };
  })();

  function afterEnter() {
    document.body.classList.add("is-in");
    setTimeout(() => document.body.classList.add("is-settled"), 1800);
    Scene.recompute();
    measure();
  }
  const enter = (withSound) => {
    if (!Gate || !Gate.ready) return;
    Sound.set(withSound);
    syncSnd();
    if (withSound) { Sound.unlock(); Sound.coin(); }
    store.sset("house-entered", "1");
    Gate.start(afterEnter);
  };
  if (store.sget("house-entered") || !Gate) {
    document.body.classList.remove("is-locked");
    $("#gate")?.remove();
    Scene.show();
    requestAnimationFrame(afterEnter);
  } else {
    $("#gateEnter").addEventListener("click", () => enter(true));
    $("#gateSilent").addEventListener("click", () => enter(false));
    addEventListener("keydown", (e) => {
      if (e.key === "Enter" && $("#gate") && Gate.ready && document.activeElement?.id !== "gateSilent") { e.preventDefault(); enter(true); }
    });
    cvTapToEnter();
  }
  function cvTapToEnter() {
    const c = $("#gateCanvas");
    c && c.addEventListener("click", () => enter(Sound.enabled));
  }

  /* ----------------------------------------------------------
     CURSOR — reticle + light-cycle trail (right-angle turns)
     ---------------------------------------------------------- */
  const Cursor = (() => {
    if (!finePointer) return null;
    document.documentElement.classList.add("has-cursor");
    const el = $("#cursor"), tc = $("#trail"), tg = tc.getContext("2d");
    let dpr = 1, x = -100, y = -100, rx = -100, ry = -100, pts = [], hidden = true;
    const LIFE = 340;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); tc.width = innerWidth * dpr; tc.height = innerHeight * dpr; };
    size(); addEventListener("resize", size);
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      const lp = pts[pts.length - 1];
      if (lp && !reduceMotion) {
        // light cycles only turn at right angles
        if (Math.abs(e.clientX - lp.x) > 1 && Math.abs(e.clientY - lp.y) > 1) pts.push({ x: e.clientX, y: lp.y, t: now });
      }
      pts.push({ x: e.clientX, y: e.clientY, t: now });
      x = e.clientX; y = e.clientY;
      if (hidden) { hidden = false; rx = x; ry = y; el.classList.remove("is-hidden"); }
    }, { passive: true });
    document.addEventListener("mouseleave", () => { hidden = true; el.classList.add("is-hidden"); pts = []; });
    document.addEventListener("pointerover", (e) => el.classList.toggle("is-hover", !!e.target.closest("a, button, .card, iframe, [role='button']")));
    addEventListener("pointerdown", () => el.classList.add("is-down"));
    addEventListener("pointerup", () => el.classList.remove("is-down"));
    return {
      frame(now) {
        rx = lerp(rx, x, 0.32); ry = lerp(ry, y, 0.32);
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        const ring = el.firstElementChild;
        ring.style.translate = `${(rx - x).toFixed(1)}px ${(ry - y).toFixed(1)}px`;
        tg.setTransform(dpr, 0, 0, dpr, 0, 0);
        tg.clearRect(0, 0, innerWidth, innerHeight);
        while (pts.length && now - pts[0].t > LIFE) pts.shift();
        if (pts.length < 2) return;
        const B = 3;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const age = clamp((now - b.t) / LIFE, 0, 1);
          const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / B));
          for (let k = 0; k <= steps; k++) {
            const x = Math.round(lerp(a.x, b.x, k / steps) / B) * B, y = Math.round(lerp(a.y, b.y, k / steps) / B) * B;
            tg.fillStyle = `rgba(255,90,36,${(1 - age) * 0.28})`; tg.fillRect(x - B, y - B, B * 3, B * 3);
            tg.fillStyle = age < 0.35 ? `rgba(255,236,226,${1 - age})` : `rgba(255,120,70,${1 - age})`; tg.fillRect(x - 1, y - 1, B, B);
          }
        }
      },
    };
  })();

  /* ----------------------------------------------------------
     MUSIC — Apple Music playlist widget
     ---------------------------------------------------------- */
  (() => {
    const box = $("#music"); if (!box) return;
    const tracks = (MUSIC.tracks && MUSIC.tracks.length) ? MUSIC.tracks : [{ title: "Playlist coming soon", artist: "", url: "" }];
    const panel = $("#mPanel"), toggle = $("#mToggle"), now = $("#mNow"), trackEl = $("#mTrack"), list = $("#mList"), embed = $("#mEmbed");
    $("#mLabel").textContent = MUSIC.title || "The House Mix";
    let idx = 0, embedded = false;
    const urlOf = (tr) => tr.url || MUSIC.playlistUrl || "";
    function render() {
      const tr = tracks[idx];
      trackEl.textContent = tr.artist ? `${tr.title} — ${tr.artist}` : tr.title;
      const u = urlOf(tr);
      now.href = u || "#";
      now.setAttribute("aria-label", `Open ${tr.title} on Apple Music`);
      $$("a", list).forEach((a, i) => a.classList.toggle("is-current", i === idx));
    }
    list.innerHTML = tracks.map((tr, i) => `<li><a href="${esc(urlOf(tr) || "#")}" target="_blank" rel="noopener" data-i="${i}">${esc(tr.title)}<small>${esc(tr.artist || "")}</small></a></li>`).join("");
    const guard = (e, u) => { if (!u) { e.preventDefault(); toast("Playlist coming soon"); } };
    now.addEventListener("click", (e) => guard(e, urlOf(tracks[idx])));
    list.addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; idx = +a.dataset.i; render(); guard(e, urlOf(tracks[idx])); });
    $("#mNext").addEventListener("click", () => { idx = (idx + 1) % tracks.length; render(); Sound.tick(); });
    function open(v) {
      panel.hidden = !v;
      toggle.setAttribute("aria-expanded", String(v));
      if (v && !embedded) {
        embedded = true;
        if (MUSIC.embedUrl) {
          embed.innerHTML = `<iframe title="Apple Music playlist" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" src="${esc(MUSIC.embedUrl)}"></iframe>`;
          box.classList.add("is-playing");
        } else {
          embed.innerHTML = `<p class="m-empty">Playlist dropping soon. Each track opens straight in Apple Music.</p>`;
        }
      }
    }
    toggle.addEventListener("click", () => open(panel.hidden));
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) open(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    render();
  })();

  /* ----------------------------------------------------------
     PIXEL CHIPS — drawn into tiny canvases, scaled up crisp
     ---------------------------------------------------------- */
  const CHIP_COL = { red: ["#c61e2e", "#7d0f1b"], acc: ["#ff5a24", "#8a2a0e"], navy: ["#1e3a78", "#0f1f45"], cyan: ["#2f8fb0", "#14465a"] };
  function drawChip(cv, ang, col, face = true) {
    const n = cv.width, c = cv.getContext("2d"), r = n / 2 - 1, cx = n / 2 - 0.5, cy = n / 2 - 0.5;
    const [base, dark] = CHIP_COL[col] || CHIP_COL.red;
    c.clearRect(0, 0, n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d > r) continue;
      let fill = base;
      if (d > r - 1.2) fill = dark;
      else if (d > r * 0.72) { const a = Math.atan2(dy, dx) + ang; fill = Math.floor(((a % 6.283) + 6.283) / (6.283 / 16)) % 2 ? "#f2ece2" : base; }
      else if (face && Math.abs(d - r * 0.5) < 0.7) fill = Math.floor(((Math.atan2(dy, dx) - ang * 0.5 + 6.283) % 6.283) / 0.35) % 2 ? "#f2ece2" : base;
      else if (d > r * 0.66) fill = dark;
      c.fillStyle = fill; c.fillRect(x, y, 1, 1);
    }
  }
  const chipCanvases = $$("canvas[data-chip]").map((cv) => ({ cv, col: cv.dataset.chip, a: Math.random() * 6, sp: parseFloat(cv.dataset.spin || "0.4") }));
  chipCanvases.forEach((o) => drawChip(o.cv, o.a, o.col));
  let chipHover = false;
  $(".pchip")?.addEventListener("pointerenter", () => (chipHover = true));
  $(".pchip")?.addEventListener("pointerleave", () => (chipHover = false));
  function chipsFrame(dt) {
    for (const o of chipCanvases) {
      const r = o.cv.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      o.a += dt * o.sp * (o.cv.closest(".pchip") && chipHover ? 6 : 1) + Math.abs(state.vel) * 0.002;
      drawChip(o.cv, o.a, o.col);
    }
  }

  /* ----------------------------------------------------------
     DOM PARALLAX
     ---------------------------------------------------------- */
  const para = $$("[data-speed]").map((el) => ({ el, speed: parseFloat(el.dataset.speed) || 0, top: 0, h: 0 }));
  const mouseEls = $$("[data-mouse]").map((el) => ({ el, d: parseFloat(el.dataset.mouse) || 0 }));
  const skewEls = $$("[data-skew]");
  const heroW1 = $(".hero-name .w1"), heroW2 = $(".hero-name .w2");
  function measure() {
    para.forEach((p) => {
      p.el.style.transform = "";
      const r = p.el.getBoundingClientRect();
      p.top = r.top + scrollY; p.h = r.height;
    });
  }
  addEventListener("resize", () => setTimeout(() => { measure(); Scene.recompute(); }, 160));
  addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  measure();

  /* ----------------------------------------------------------
     TABLE — sit down, deal, stand up
     ---------------------------------------------------------- */
  const table = $("#tablePlane .felt");
  const spot = $(".spotlight");
  const fullhouse = $(".fullhouse");
  const cards = $$(".card", cardsEl);
  const discs = $$(".pchip-sm", table).map((el) => ({ el, d: parseFloat(el.dataset.depth) || 1, r: Math.random() * 360 }));
  const cardDepth = cards.map(() => 0.6 + Math.random() * 0.9);
  let dealt = 0, darkNow = 0.55, sp = { x: innerWidth / 2, y: innerHeight / 2 }, houseUp = false;
  const useSpot = !noHover && !reduceMotion;
  if (!useSpot) document.body.classList.add("no-spot");

  function deal(card, silent) {
    if (card.classList.contains("is-dealt")) return;
    card.classList.add("is-dealt");
    dealt++;
    if (!silent) Sound.flip();
    if (dealt === cards.length && !houseUp) {
      houseUp = true;
      setTimeout(() => {
        fullhouse.classList.remove("is-on"); void fullhouse.offsetWidth; fullhouse.classList.add("is-on");
        Sound.jackpot();
        const h = $("#tableHint .hint-text"); if (h) h.textContent = "Full house. Every card's on the table.";
      }, 500);
    }
  }
  function reshuffle() {
    cards.forEach((c, i) => setTimeout(() => c.classList.remove("is-dealt"), i * 70));
    dealt = 0; houseUp = false; Sound.chip(4);
    const h = $("#tableHint .hint-text"); if (h) h.textContent = noHover ? "Tap a card to turn it over." : "Hover a card to turn it over.";
  }
  $("#dealAll").addEventListener("click", () => cards.forEach((c, i) => setTimeout(() => deal(c), i * 110)));
  $("#reshuffle").addEventListener("click", reshuffle);
  cards.forEach((c) => {
    c.addEventListener("click", (e) => { if (!e.target.closest("a")) deal(c); });
    c.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); deal(c); } });
    c.addEventListener("focusin", () => deal(c));
    c.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") deal(c); });
    if (!noHover) {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--ry", `${u * 18}deg`); c.style.setProperty("--rx", `${-v * 18}deg`);
      });
      c.addEventListener("pointerleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); });
    }
  });
  if (reduceMotion) cards.forEach((c) => deal(c, true));
  else if (noHover) { const h = $("#tableHint .hint-text"); if (h) h.textContent = "Tap a card to turn it over."; }


  function transitions(now) { Floor.frame(now); }

  function tableFrame(now) {
    if (!Floor.holding) return;
    const r = table.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const mx = state.smx - 0.5, my = state.smy - 0.5;
    cards.forEach((c, i) => {
      const d = cardDepth[i];
      c.style.setProperty("--px", `${(-mx * 40 * d).toFixed(2)}px`);
      c.style.setProperty("--py", `${(-my * 26 * d).toFixed(2)}px`);
    });
    discs.forEach((ds) => {
      ds.el.style.setProperty("--px", `${(-mx * 60 * ds.d).toFixed(2)}px`);
      ds.el.style.setProperty("--py", `${(-my * 40 * ds.d).toFixed(2)}px`);
      ds.el.style.setProperty("--r", `${(ds.r + state.sy * 0.05 * ds.d).toFixed(1)}deg`);
    });
    if (!useSpot) return;
    const inside = state.px >= r.left && state.px <= r.right && state.py >= r.top && state.py <= r.bottom && now - state.lastMove < 3000;
    let tx, ty, k;
    if (inside) { tx = state.px; ty = state.py; k = 0.22; }
    else {
      const visTop = Math.max(r.top, 0), visBot = Math.min(r.bottom, innerHeight), tt = now / 1000;
      tx = r.left + r.width * (0.5 + 0.4 * Math.sin(tt * 0.42));
      ty = visTop + (visBot - visTop) * (0.5 + 0.36 * Math.sin(tt * 0.67 + 1.1));
      k = 0.035;
    }
    sp.x = lerp(sp.x, tx, k); sp.y = lerp(sp.y, ty, k);
    const radius = clamp(innerWidth * 0.22, 210, 380);
    spot.style.setProperty("--sx", `${(sp.x - r.left).toFixed(1)}px`);
    spot.style.setProperty("--sy", `${(sp.y - r.top).toFixed(1)}px`);
    spot.style.setProperty("--r", `${radius.toFixed(0)}px`);
    const targetDark = houseUp ? 0.08 : 0.55 - 0.3 * (dealt / Math.max(1, cards.length));
    darkNow = lerp(darkNow, targetDark, 0.04);
    spot.style.setProperty("--dark", darkNow.toFixed(3));
  }

  /* ----------------------------------------------------------
     THE FLOOR — one continuous, scroll-driven camera.
     walk → sit → (the table page) → stand → slot corridor →
     cashier cage (shutter, payout, coins) → through the window →
     vault door → the cash-out page.
     ---------------------------------------------------------- */
  const Floor = (() => {
    const floor = $("#floor"), stageEl = $("#floorStage"), world = $("#world");
    const tablePlane = $("#tablePlane"), cashPlane = $("#cashPlane");
    const fx = $("#fx"), fg = fx.getContext("2d"), flash = $("#flash");
    const cap = $("#cap"), capLabel = $("#capLabel"), capText = $("#capText");
    const receipt = $("#receipt"), payoutTotal = $("#payoutTotal");
    if (reduceMotion) { floor.classList.add("is-static"); return { frame() {}, holding: true, chapter: null }; }

    const SEG = [["walk", 1.7], ["sit", 1.0], ["hold", 1.7], ["stand", 0.8], ["corridor", 2.2], ["cage", 1.3], ["push", 0.6], ["vault", 1.3], ["reveal", 1.0], ["end", 0.5]];
    const START = {}; let TOTAL = 0;
    for (const [k, len] of SEG) { START[k] = [TOTAL, len]; TOTAL += len; }
    const seg = (s, k) => clamp((s - START[k][0]) / START[k][1], 0, 1);
    const PERSP = 900;

    // ---------- pixel sprites ----------
    const sprite = (w, h, draw, cls) => { const c = mk(w, h), x = c.getContext("2d"); x.imageSmoothingEnabled = false; draw(x, w, h); c.className = cls; return c; };
    const LANT = ["...#####...", "..#######..", ".ooaaaaaoo.", "oooaayaaooo", "ooaayyyaaoo", "ooayyyyyaoo", "ooayyWyyaoo", "ooayyyyyaoo", "ooayyyyyaoo", "ooaayyyaaoo", "oooaayaaooo", "rooaaaaaoor", ".rrooooorr.", "..#######..", "...#####...", ".....r.....", ".....r....."];
    const LMAP = { "#": "#2a0e10", o: "#a3300f", a: "#ff5a24", y: "#ff9a5e", W: "#ffe2d6", r: "#c61e2e" };
    const lantern = () => sprite(11, 17, (x) => LANT.forEach((row, yy) => [...row].forEach((ch, xx) => { if (LMAP[ch]) { x.fillStyle = LMAP[ch]; x.fillRect(xx, yy, 1, 1); } })), "wobj w-lantern");
    const SYMC = ["#e8322a", "#ffcc33", "#8fe9ff", "#3fbf4f", "#ff5a24"];
    function slotMachine(seed) {
      const c = mk(40, 72); c.className = "wobj w-slot"; c.seed = seed;
      c.draw = (t) => {
        const x = c.getContext("2d"), F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
        x.clearRect(0, 0, 40, 72);
        F("#1c0a0e", 2, 10, 36, 62); F("#9aa3b5", 1, 10, 1, 62); F("#9aa3b5", 38, 10, 1, 62);
        F("#3a0f0c", 3, 2, 34, 9); F(seed % 2 ? "#ff5a24" : "#c61e2e", 3, 2, 34, 1);
        for (let i = 0; i < 9; i++) F(((i + Math.floor(t * 8) + seed) % 3) ? "#5a2416" : "#fff3c4", 4 + i * 4, 4, 1, 1);
        F("#9aa3b5", 6, 15, 28, 16); F("#f2ece2", 7, 16, 26, 14);
        for (let r = 0; r < 3; r++) { const s = (seed * 3 + r + Math.floor(t * (seed % 3 === 0 ? 6 : 0.5))) % SYMC.length; F(SYMC[s], 9 + r * 8, 20, 6, 6); F("#9aa3b5", 15 + r * 8, 16, 1, 14); }
        F("#e8322a", 7, 23, 26, 1);
        F("#05060b", 7, 33, 26, 5); F(((Math.floor(t * 2) + seed) % 2) ? "#8fe9ff" : "#2f7fb0", 9, 35, 22, 1);
        F("#2a1216", 4, 40, 32, 4); F("#9aa3b5", 4, 40, 32, 1);
        F("#ff5a24", 9, 41, 3, 2); F("#8fe9ff", 18, 41, 3, 2); F("#ffcc33", 27, 41, 3, 2);
        F("#2a0f12", 7, 47, 26, 12); F("#ff5a24", 7, 47, 26, 1);
        F("#9aa3b5", 7, 63, 26, 1); F("#0b0d14", 8, 64, 24, 3);
        F("#c9d1e0", 38, 18, 1, 12); F("#e8322a", 37, 16, 3, 3);
      };
      c.draw(0);
      return c;
    }
    function cageWrap() {
      const wrap = document.createElement("div");
      wrap.className = "wobj w-cage";
      const c = sprite(120, 90, (x, w, h) => {
        const F = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
        F("#140a0e", 0, 0, w, h);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (bay(xx, yy) < 0.12) F("#20101a", xx, yy, 1, 1);
        F("#ff5a24", 0, 0, w, 1); F("#3a0f0c", 0, 1, w, 1);
        F("#05060b", 30, 6, 60, 14); F("#ff5a24", 30, 6, 60, 1); F("#ff5a24", 30, 19, 60, 1);
        x.font = "8px Silkscreen, monospace"; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillStyle = "#5a1a0c"; x.fillText("CASHIER", 61, 14); x.fillStyle = "#ffe2d6"; x.fillText("CASHIER", 60, 13);
        const wx = 36, wy = 26, ww = 48, wh = 36;
        F("#9aa3b5", wx - 3, wy - 3, ww + 6, wh + 6); F("#5a6275", wx - 2, wy - 2, ww + 4, wh + 4);
        x.clearRect(wx, wy, ww, wh);
        for (let i = 1; i < 8; i++) { F("#c9a24a", wx + i * 6, wy, 1, wh); F("#7a5e22", wx + i * 6 + 1, wy, 1, wh); }
        F("#3a1a14", wx - 10, wy + wh + 3, ww + 20, 5); F("#9aa3b5", wx - 10, wy + wh + 3, ww + 20, 1);
        F("#2a0f12", 8, 24, 10, 66); F("#ff5a24", 8, 24, 1, 66); F("#2a0f12", w - 18, 24, 10, 66); F("#ff5a24", w - 9, 24, 1, 66);
        F("#05060b", 34, 72, 52, 10); F("#ff5a24", 34, 72, 52, 1);
      }, "cage-art");
      wrap.appendChild(c);
      wrap.insertAdjacentHTML("beforeend", `<div class="cage-shutter"></div><div class="cage-bulbs"></div><div class="cage-led"><span>PAYOUT</span><b id="cageCount">000000</b></div>`);
      return wrap;
    }
    function vaultWrap() {
      const wrap = document.createElement("div");
      wrap.className = "wobj w-vault";
      wrap.innerHTML = `<div class="vault-light"></div>`;
      const door = mk(96, 96); door.className = "vault-door";
      door.draw = (ang) => {
        const x = door.getContext("2d"), c0 = 47.5, R = 46;
        x.clearRect(0, 0, 96, 96);
        for (let yy = 0; yy < 96; yy++) for (let xx = 0; xx < 96; xx++) {
          const d = Math.hypot(xx - c0, yy - c0);
          if (d > R) continue;
          let col = "#3a3f4d";
          if (d > R - 2) col = "#9aa3b5"; else if (d > R - 5) col = "#1c2030";
          else if (d > R - 7) col = "#6a7285";
          else if (bay(xx, yy) < 0.18) col = "#2c3140";
          const a = Math.atan2(yy - c0, xx - c0);
          if (d > R - 5 && d < R - 2 && Math.floor(((a + 7) / 6.283) * 24) % 2 === 0) col = "#c9d1e0";
          x.fillStyle = col; x.fillRect(xx, yy, 1, 1);
        }
        // the wheel
        x.save(); x.translate(c0, c0); x.rotate(ang);
        x.fillStyle = "#ff5a24";
        for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.fillRect(-1, 6, 2, 16); x.fillRect(-3, 21, 6, 3); }
        x.restore();
        for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) { const d = Math.hypot(xx, yy); if (d < 8) { x.fillStyle = d > 6 ? "#ff5a24" : d > 3 ? "#1c2030" : "#ffe2d6"; x.fillRect(c0 + xx, c0 + yy, 1, 1); } }
        x.fillStyle = "#9aa3b5"; x.fillRect(0, 30, 4, 10); x.fillRect(0, 56, 4, 10);
      };
      door.draw(0);
      wrap.appendChild(door);
      wrap.door = door;
      return wrap;
    }
    function ghostTable() {
      const d = document.createElement("div");
      d.className = "wobj w-table";
      d.innerHTML = `<div class="pt-felt"></div>`;
      return d;
    }

    // ---------- build the world ----------
    const objs = [];
    const place = (el, x, y, z, ry = 0, rx = 0) => { world.appendChild(el); const o = { el, x, y, z, ry, rx }; objs.push(o); return o; };
    let vw = innerWidth, vh = innerHeight;
    const TZ = -2900;                 // where the table stands
    let CW = 600, FY = 450, CY = -450, VW = 2400, VH = 1500;
    const room = [];
    const CAGE_X = 7000, VAULT_X = 8400;
    function build() {
      world.innerHTML = ""; objs.length = 0; room.length = 0;
      vw = innerWidth; vh = innerHeight;
      // walk-in: only lanterns hanging over the table
      [[-0.32, -0.36, -800], [0.3, -0.42, -1600], [-0.16, -0.34, -2400], [0.36, -0.38, -3300]].forEach(([lx, ly, lz]) => place(lantern(), lx * vw, ly * vh, lz));
      // the cage is the front wall of the hallway; size the room to it
      cage = place(cageWrap(), CAGE_X, 0, TZ, -90); room.push(cage);
      vault = place(vaultWrap(), VAULT_X, 0, TZ, -90); room.push(vault);
      const cw = cage.el.offsetWidth || 1200, ch = cage.el.offsetHeight || 900;
      VW = vault.el.offsetWidth || 2400; VH = vault.el.offsetHeight || 1500;
      CW = cw / 2; FY = ch / 2; CY = -ch / 2;
      const panel = (cls, w, h, x, y, z, ry, rx, kind) => {
        const d = document.createElement("div");
        d.className = "wobj rplane " + cls; d.style.width = w + "px"; d.style.height = h + "px";
        const o = place(d, x, y, z, ry, rx); o.kind = kind; room.push(o); return o;
      };
      const run = (x0, x1, fn) => { const n = Math.ceil((x1 - x0) / 900), L = (x1 - x0) / n; for (let i = 0; i < n; i++) fn(x0 + L * (i + 0.5), L, i); };
      // hallway: carpet, panelled walls, light-strip ceiling
      run(-600, CAGE_X, (xc, L, i) => {
        panel("r-floor", L + 2, cw, xc, FY, TZ, 0, 90, "floor");
        panel("r-ceil", L + 2, cw, xc, CY, TZ, 0, 90, "ceil");
        panel("r-wall", L + 2, ch, xc, 0, TZ - CW, 0, 0, "wallL");
        panel("r-wall", L + 2, ch, xc, 0, TZ + CW, 0, 0, "wallR");
      });
      // vault room: steel
      run(CAGE_X, VAULT_X, (xc, L) => {
        panel("r-steel-floor", L + 2, VW, xc, VH / 2, TZ, 0, 90, "floor");
        panel("r-steel-ceil", L + 2, VW, xc, -VH / 2, TZ, 0, 90, "ceil");
        panel("r-steel", L + 2, VH, xc, 0, TZ - VW / 2, 0, 0, "wallL");
        panel("r-steel", L + 2, VH, xc, 0, TZ + VW / 2, 0, 0, "wallR");
      });
      // slot machines line both walls, standing on the carpet
      const slotH = vw < 760 ? 270 : 414, slotW = vw < 760 ? 150 : 230;
      for (let i = 0; i < 8; i++) {
        const x = 700 + i * 760;
        room.push(place(slotMachine(i * 2), x, FY - slotH / 2, TZ - CW + 4, 0));
        room.push(place(slotMachine(i * 2 + 1), x, FY - slotH / 2, TZ + CW - 4, 180));
      }
      for (let i = 0; i < 7; i++) room.push(place(lantern(), 600 + i * 900, CY + 70, TZ + (i % 2 ? CW * 0.45 : -CW * 0.45)));
      const sign = document.createElement("div");
      sign.className = "wobj w-sign"; sign.innerHTML = "<span>Cashier</span><b>▸</b>";
      room.push(place(sign, 3400, CY + 120, TZ - CW * 0.4, -90));
      room.push(place(sign.cloneNode(true), 5400, CY + 120, TZ + CW * 0.4, -90));
      room.forEach((o) => (o.room = true));
      objs.forEach((o) => { o.el.style.transform = `translate(-50%, -50%) translate3d(${o.x}px, ${o.y}px, ${o.z}px) rotateY(${o.ry}deg) rotateX(${o.rx}deg)`; });
      slots = objs.filter((o) => o.el.classList.contains("w-slot"));
      roomB = -1;
    }
    let cage, vault, slots = [], roomB = -1;
    const sceneEl = $("#scene");
    const tf = (o, dx = 0, dy = 0, dz = 0) => `translate(-50%, -50%) translate3d(${(o.x + dx).toFixed(1)}px, ${(o.y + dy).toFixed(1)}px, ${(o.z + dz).toFixed(1)}px) rotateY(${o.ry}deg) rotateX(${o.rx}deg)`;

    // chips you sweep off the table when you stand
    const sweep = [0, 1, 2, 3, 4, 5].map((i) => { const c = mk(16, 16); c.className = "sweep-chip"; drawChip(c, i, ["red", "acc", "navy", "red", "cyan", "acc"][i]); stageEl.appendChild(c); return { c, sx: (i % 3 - 1) * 0.28 + (Math.random() - 0.5) * 0.08, sy: 0.18 + Math.floor(i / 3) * 0.16, d: 0.85 + Math.random() * 0.3 }; });

    function size() {
      vw = innerWidth; vh = innerHeight;
      floor.style.height = `${(TOTAL + 1) * vh}px`;
      $("#table").style.top = `${START.hold[0] * vh + vh * 0.25}px`;
      $("#cashout").style.top = `${START.reveal[0] * vh + START.reveal[1] * vh}px`;
      fx.width = Math.ceil(vw / 3); fx.height = Math.ceil(vh / 3);
      build();
    }
    size();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); Scene.recompute(); }, 150); });

    // ---------- coins (fx) ----------
    const coins = [];
    const burst = (n, x, y, spread = 1) => { for (let i = 0; i < n; i++) coins.push({ x, y, vx: (Math.random() - 0.5) * 220 * spread, vy: -80 - Math.random() * 200, life: 2.6, s: i }); };
    const rain = (n) => { for (let i = 0; i < n; i++) coins.push({ x: Math.random() * fx.width, y: -5 - Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 40, life: 4, s: i }); };
    function drawFx(dt) {
      fg.clearRect(0, 0, fx.width, fx.height);
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.vy += 260 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt;
        if (c.life <= 0 || c.y > fx.height + 4) { coins.splice(i, 1); continue; }
        const spin = Math.floor(c.y / 3 + c.s) % 4;
        fg.fillStyle = spin === 0 ? "#fff3c4" : spin === 3 ? "#c98a12" : "#ffcc33";
        fg.fillRect(Math.round(c.x), Math.round(c.y), spin === 1 ? 1 : 3, 3);
      }
    }

    // ---------- helpers ----------
    const setT = (el, x, y, z, rx = 0, ry = 0, s = 1) => { el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(4)})`; };
    const show = (el, op) => { el.style.opacity = op.toFixed(3); el.style.visibility = op < 0.01 ? "hidden" : "visible"; };
    let capKey = "";
    const caption = (key, label, text, op) => {
      if (key !== capKey) { capKey = key; capLabel.textContent = label; capText.textContent = text; }
      cap.style.opacity = op.toFixed(3);
    };
    const once = new Set();
    const fire = (k, fn) => { if (!once.has(k)) { once.add(k); fn(); } };
    const reset = (k) => once.delete(k);

    let last = performance.now(), slotTick = 0;
    const api = { holding: false, chapter: null, frame };

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const r = floor.getBoundingClientRect();
      const on = r.top < vh && r.bottom > 0;
      api.chapter = null;
      if (!on) { Scene.override(null); api.holding = false; sceneEl.style.opacity = r.bottom <= 0 ? "0" : "1"; return; }
      const s = clamp(-r.top / vh, 0, TOTAL);
      const walk = easeInOut(seg(s, "walk")), sitAll = seg(s, "sit"), sit = easeInOut(clamp(sitAll / 0.45, 0, 1)), look = easeInOut(clamp((sitAll - 0.45) / 0.55, 0, 1));
      const hold = seg(s, "hold"), stand = easeInOut(seg(s, "stand"));
      const corr = seg(s, "corridor"), turn = easeInOut(clamp(corr / 0.25, 0, 1)), stroll = easeInOut(clamp((corr - 0.2) / 0.8, 0, 1));
      const cageP = seg(s, "cage"), push = easeIn(seg(s, "push")), vaultP = seg(s, "vault"), reveal = seg(s, "reveal");
      const walking = (walk > 0 && walk < 1) || (stroll > 0 && stroll < 1);
      const bobPhase = walk * 10 + stroll * 16 + seg(s, "vault") * 6;
      const bob = Math.sin(bobPhase * Math.PI) * (walking ? 7 : 0);

      // ---- camera through the world
      let camX = 0, camY = 0, camZ = lerp(0, TZ + 300, walk), yaw = 0;
      camY = lerp(0, 0.14 * vh, sit) * (1 - stand);              // sitting lowers the eye
      yaw = 90 * turn;
      camZ = lerp(camZ, TZ, turn);
      camX = lerp(0, CAGE_X - 1250, stroll);
      camX = lerp(camX, CAGE_X - 700, easeInOut(cageP));
      camX = lerp(camX, CAGE_X + 80, push);                       // through the window
      camX = lerp(camX, VAULT_X - 1250, easeInOut(clamp(vaultP / 0.5, 0, 1)));
      camX = lerp(camX, VAULT_X - 300, easeIn(clamp((vaultP - 0.7) / 0.3, 0, 1)));
      const shake = (cageP > 0.4 && cageP < 0.95 ? Math.sin(now * 0.07) * 2 : 0) + (vaultP > 0.55 && vaultP < 0.7 ? Math.sin(now * 0.11) * 5 : 0);
      world.style.transform = `rotateY(${yaw.toFixed(2)}deg) translate3d(${(-camX + shake).toFixed(1)}px, ${(-camY - bob).toFixed(1)}px, ${(-(camZ) + PERSP).toFixed(1)}px)`;
      // cull anything at or behind the eye
      const sy = Math.sin((yaw * Math.PI) / 180), cy = Math.cos((yaw * Math.PI) / 180);
      for (const o of objs) {
        const zr = -(o.x - camX) * sy + (o.z - camZ) * cy;
        const vis = (o.kind ? zr < 520 : zr < -90) && zr > -9000 && !(o.room && roomB <= 0);
        if (o.vis !== vis) { o.vis = vis; o.el.style.visibility = vis ? "visible" : "hidden"; }
      }
      // the room assembles around you as you turn: walls slide in, floor rises, ceiling drops
      const b = easeOut(clamp((corr - 0.04) / 0.36, 0, 1));
      if (b !== roomB) {
        roomB = b;
        for (const o of room) {
          const k = 1 - b;
          if (o.kind === "wallL") o.el.style.transform = tf(o, 0, 0, -k * 1800);
          else if (o.kind === "wallR") o.el.style.transform = tf(o, 0, 0, k * 1800);
          else if (o.kind === "floor") o.el.style.transform = tf(o, 0, k * 1200, 0);
          else if (o.kind === "ceil") o.el.style.transform = tf(o, 0, -k * 1200, 0);
          else o.el.style.transform = tf(o, 0, o.kind ? 0 : -k * 400, 0);
          o.el.style.opacity = (o.kind ? b : clamp((b - 0.35) / 0.65, 0, 1)).toFixed(3);
        }
        for (const o of room) { const v = o.vis && b > 0; o.el.style.visibility = v ? "visible" : "hidden"; }
      }
      sceneEl.style.opacity = (1 - b).toFixed(3);
      // the walk-in set dissolves once you're seated; the corridor appears as you turn
      world.style.opacity = (1 - look * (1 - stand)).toFixed(3);

      // ---- the table page, laid on the table
      api.holding = false;
      if (s < START.stand[0] + START.stand[1] + START.corridor[1]) {
        let y = lerp(0.44 * vh, 0.58 * vh, walk), z = lerp(-3300, -720, walk), rx = lerp(82, 76, walk), x = 0, ry = 0;
        y = lerp(y, 0.2 * vh, sit); z = lerp(z, -260, sit); rx = lerp(rx, 50, sit);
        y = lerp(y, 0, look); z = lerp(z, 0, look); rx = lerp(rx, 0, look);
        // stand back up, then turn away from it
        y = lerp(y, 0.58 * vh, stand); z = lerp(z, -720, stand); rx = lerp(rx, 76, stand);
        x = lerp(0, -1.35 * vw, turn); z = lerp(z, -1150, turn); ry = lerp(0, 32, turn);
        if (look >= 1 && stand <= 0) { tablePlane.style.transform = "none"; api.holding = true; }
        else setT(tablePlane, x, y + bob, z, rx, ry);
        show(tablePlane, 1 - clamp((turn - 0.55) / 0.45, 0, 1));
      } else show(tablePlane, 0);

      // scroll-deal while you sit at the table

      // chips swept up into your hands
      sweep.forEach((ch) => {
        const p = clamp((stand - 0.05) / 0.7, 0, 1), e = easeIn(p);
        if (p <= 0 || p >= 1) { show(ch.c, 0); return; }
        show(ch.c, 1 - clamp((p - 0.8) / 0.2, 0, 1));
        ch.c.style.transform = `translate(-50%, -50%) translate3d(${(ch.sx * vw * (1 + e * 1.6)).toFixed(1)}px, ${(ch.sy * vh * (1 - e * 2.4)).toFixed(1)}px, ${(lerp(-500, 760, e) * ch.d).toFixed(1)}px) rotateX(${(e * 540).toFixed(0)}deg)`;
      });
      if (stand > 0.2) fire("sweep", () => Sound.chip(5)); else if (stand <= 0) reset("sweep");

      // slot machines blink as you pass
      slotTick += dt;
      if (corr > 0 && slotTick > 0.12) { slotTick = 0; for (const o of slots) if (o.vis) o.el.draw(now / 1000); }

      // ---- the cage: shutter rolls up, payout counts, coins fly
      if (cage) {
        cage.el.style.setProperty("--shutter", (1 - easeInOut(clamp(cageP / 0.35, 0, 1))).toFixed(3));
        const count = Math.round(easeOut(clamp((cageP - 0.3) / 0.55, 0, 1)) * 777777);
        const ce = $("#cageCount"); if (ce) ce.textContent = String(count).padStart(6, "0");
        cage.el.classList.toggle("is-jackpot", cageP > 0.85);
        if (cageP > 0.32) fire("shutter", () => Sound.lever()); else if (cageP <= 0) reset("shutter");
        if (cageP > 0.45 && cageP < 0.98 && Math.random() < 0.35) { burst(3, fx.width / 2 + (Math.random() - 0.5) * fx.width * 0.15, fx.height * 0.42, 1.4); if (Math.random() < 0.3) Sound.tick(); }
        if (cageP > 0.85) fire("payout", () => { Sound.jackpot(); burst(60, fx.width / 2, fx.height * 0.42, 2.2); }); else if (cageP <= 0.8) reset("payout");
      }
      // ---- the vault: wheel spins, door swings, light floods
      if (vault) {
        const spin = easeInOut(clamp((vaultP - 0.3) / 0.3, 0, 1)), open = easeInOut(clamp((vaultP - 0.58) / 0.42, 0, 1));
        if (vaultP > 0) vault.el.door.draw(spin * Math.PI * 3);
        vault.el.door.style.transform = `rotateY(${(-108 * open).toFixed(2)}deg)`;
        vault.el.style.setProperty("--light", open.toFixed(3));
        if (vaultP > 0.32) fire("wheel", () => Sound.spin()); else if (vaultP <= 0.25) reset("wheel");
        if (vaultP > 0.6) fire("door", () => { Sound.lever(); Sound.land(); }); else if (vaultP <= 0.55) reset("door");
      }
      flash.style.opacity = (clamp((vaultP - 0.85) / 0.15, 0, 1) * (1 - clamp(reveal / 0.35, 0, 1)) + push * (1 - clamp(seg(s, "vault") / 0.15, 0, 1)) * 0.6).toFixed(3);

      // ---- the cash-out page assembles inside the vault
      if (reveal > 0) {
        const e = easeOut(clamp(reveal / 0.55, 0, 1));
        if (e >= 1) cashPlane.style.transform = "none";
        else setT(cashPlane, 0, (1 - e) * 0.1 * vh, lerp(-1400, 0, e), lerp(8, 0, e));
        show(cashPlane, clamp(reveal / 0.25, 0, 1));
        receipt.style.setProperty("--print", easeInOut(clamp((reveal - 0.35) / 0.55, 0, 1)).toFixed(3));
        payoutTotal.textContent = reveal > 0.85 ? "All in" : String(Math.round(reveal * 777777)).padStart(6, "0");
        if (reveal > 0.15) fire("rain", () => rain(120)); else if (reveal <= 0.05) reset("rain");
        if (reveal > 0.3 && Math.random() < 0.25) rain(2);
        world.style.opacity = (1 - clamp(reveal / 0.3, 0, 1)).toFixed(3);
      } else show(cashPlane, 0);
      if (reveal >= 1) world.style.opacity = "0";
      drawFx(dt);

      // ---- captions
      if (walk > 0.02 && walk < 0.95) caption("walk", "02 — The table", "Pull up a chair", seg(s, "walk") < 0.12 ? seg(s, "walk") / 0.12 : 1 - clamp((seg(s, "walk") - 0.8) / 0.2, 0, 1));
      else if (stand > 0.05 && turn < 0.6) caption("stand", "03 — Cash out", "Chips in hand", Math.min(clamp(stand / 0.3, 0, 1), 1 - clamp((turn - 0.3) / 0.3, 0, 1)));
      else if (stroll > 0.05 && stroll < 0.95) caption("corr", "03 — Cash out", "This way to the cashier", Math.min(clamp(stroll / 0.15, 0, 1), 1 - clamp((stroll - 0.8) / 0.15, 0, 1)));
      else if (cageP > 0.1 && cageP < 0.95) caption("cage", "03 — Cash out", "Counting your chips", Math.min(clamp((cageP - 0.1) / 0.15, 0, 1), 1 - clamp((cageP - 0.8) / 0.15, 0, 1)));
      else if (vaultP > 0.15 && vaultP < 0.8) caption("vault", "03 — Cash out", "Opening the vault", Math.min(clamp((vaultP - 0.15) / 0.15, 0, 1), 1 - clamp((vaultP - 0.65) / 0.15, 0, 1)));
      else cap.style.opacity = "0";

      // ---- the space behind: tip down as you sit, back up as you stand
      Scene.override(lerp(lerp(lerp(0.6, 0.5, walk), -0.45, look), 0.52, stand));
      api.chapter = s < START.stand[0] + START.stand[1] * 0.5 ? ["02", "The table"] : ["03", "Cash out"];
    }
    return api;
  })();

  /* ----------------------------------------------------------
     CHAPTER HUD
     ---------------------------------------------------------- */
  const chapters = $$("section[data-chapter]");
  const chNum = $("#chapterNum"), chName = $("#chapterName");
  let curCh = "";
  function chapterFrame() {
    if (typeof Floor !== "undefined" && Floor.chapter) { const [n, nm] = Floor.chapter; if (curCh !== n) { curCh = n; chNum.textContent = n; chName.textContent = nm; } return; }
    const mid = innerHeight * 0.5;
    for (const s of chapters) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) {
        if (curCh !== s.id) { curCh = s.id; chNum.textContent = s.dataset.chapter; chName.textContent = s.dataset.name; }
        break;
      }
    }
  }

  /* ----------------------------------------------------------
     LOOP
     ---------------------------------------------------------- */
  function frame(now) {
    state.t = now / 1000;
    state.sy = scrollY;
    state.vel = lerp(state.vel, state.sy - state.lastSy, 0.2);
    state.lastSy = state.sy;
    state.smx = lerp(state.smx, state.mx, 0.07);
    state.smy = lerp(state.smy, state.my, 0.07);

    Scene.draw(now);
    const vh = innerHeight;
    for (const p of para) p.el.style.transform = `translate3d(0, ${(((p.top + p.h / 2) - (state.sy + vh / 2)) * p.speed).toFixed(1)}px, 0)`;
    const mx = state.smx - 0.5, my = state.smy - 0.5;
    for (const m of mouseEls) m.el.style.transform = `translate3d(${(-mx * m.d).toFixed(1)}px, ${(-my * m.d * 0.5).toFixed(1)}px, 0)`;
    if (state.sy < vh * 1.2 && heroW1 && heroW2) {
      heroW1.style.setProperty("--wd1", (150 - state.smx * 45).toFixed(1) + "%");
      heroW2.style.setProperty("--wd2", (56 + state.smx * 24).toFixed(1) + "%");
    }
    const sk = clamp(state.vel * 0.05, -2.5, 2.5);
    for (const el of skewEls) el.style.transform = `skewY(${sk.toFixed(2)}deg)`;
    transitions(now);
    tableFrame(now);
    chapterFrame();
    Cursor && Cursor.frame(now);
    chipsFrame(Math.min(0.05, (now - (frame.last || now)) / 1000)); frame.last = now;
    requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    const still = () => { Scene.draw(performance.now()); chapterFrame(); };
    addEventListener("scroll", still, { passive: true });
    setTimeout(still, 50);
    const lite = (now) => { Cursor && Cursor.frame(now); requestAnimationFrame(lite); };
    requestAnimationFrame(lite);
  } else {
    requestAnimationFrame(frame);
  }
})();

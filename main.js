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
    el.style.setProperty("--rot", `${ROT[i % ROT.length]}deg`);
    el.style.setProperty("--off", `${OFF[i % OFF.length]}px`);
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
     SCENE — the grid world (smooth vector, full resolution)
     ---------------------------------------------------------- */
  const Scene = (() => {
    const cv = $("#scene"), ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, stars = [], cloudTex = null;
    const cam = { hz: 0.6, h: 1.3, sp: 3, z: 0 };
    let landStart = -1, visible = false;
    const ACC = [255, 90, 36], CY = [143, 233, 255];

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      let seed = 9;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      stars = Array.from({ length: Math.round((W * H) / 5200) }, () => ({ x: rnd(), y: rnd() * 0.9, r: rnd() < 0.08 ? 1.6 : rnd() < 0.4 ? 1.1 : 0.7, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.2, warm: rnd() < 0.12 }));
      // soft cloud texture for the earth
      const tw = 256, th = 128;
      cloudTex = mk(tw, th);
      const g = cloudTex.getContext("2d"), img = g.createImageData(tw, th);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const n = fbm(x * 0.05, y * 0.11, 5);
        const a = clamp((n - 0.5) * 3, 0, 1);
        const i = (y * tw + x) * 4;
        img.data[i] = 220; img.data[i + 1] = 235; img.data[i + 2] = 255; img.data[i + 3] = a * 255;
      }
      g.putImageData(img, 0, 0);
      computeKeys();
    }

    // camera keyframes per section
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

    // light cycles
    const cycles = [ACC, ACC, CY].map((c, i) => ({ c, x: (i - 1) * 4, z: 16 + i * 7, dir: i % 2 ? [0, 1] : [0, -1], trail: [], next: 0 }));
    cycles.forEach((cy) => cy.trail.push([cy.x, cy.z]));
    function stepCycles(dt) {
      for (const cy of cycles) {
        const sp = 5.5;
        const nx = cy.x + cy.dir[0] * sp * dt, nz = cy.z + cy.dir[1] * sp * dt;
        const crossed = Math.floor(cy.x) !== Math.floor(nx) || Math.floor(cy.z) !== Math.floor(nz);
        cy.x = nx; cy.z = nz;
        const out = Math.abs(cy.x) > 11 || cy.z < 13 || cy.z > 50;
        if (crossed && (out || Math.random() < 0.08)) {
          cy.x = Math.round(cy.x); cy.z = Math.round(cy.z);
          cy.trail.push([cy.x, cy.z]);
          const opts = cy.dir[0] ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
          let d = opts[Math.random() < 0.5 ? 0 : 1];
          if (out) {
            if (cy.x > 11) d = [-1, 0]; else if (cy.x < -11) d = [1, 0]; else if (cy.z > 50) d = [0, -1]; else if (cy.z < 13) d = [0, 1];
          }
          cy.dir = d;
        }
        // trim trail to ~16 units
        let len = Math.abs(cy.x - cy.trail[cy.trail.length - 1][0]) + Math.abs(cy.z - cy.trail[cy.trail.length - 1][1]);
        for (let i = cy.trail.length - 1; i > 0; i--) {
          const a = cy.trail[i], b = cy.trail[i - 1];
          const seg = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
          if (len + seg > 16) {
            const keep = 16 - len, t = keep / (seg || 1);
            cy.trail.splice(0, i - 1);
            cy.trail[0] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            break;
          }
          len += seg;
        }
      }
    }

    let last = performance.now();
    function draw(now = performance.now()) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible) return;
      const t = now / 1000;
      // camera
      const tg = target(scrollY + H * 0.5);
      const k = reduceMotion ? 1 : 0.07;
      cam.hz = lerp(cam.hz, tg.hz, k); cam.h = lerp(cam.h, tg.h, k); cam.sp = lerp(cam.sp, tg.sp + Math.min(14, Math.abs(state.vel) * 0.25), k);
      let hz = cam.hz, h = cam.h;
      if (landStart >= 0) {
        const lt = clamp((now - landStart) / 1800, 0, 1), e = easeOut(lt);
        hz = lerp(1.15, hz, e); h = lerp(9, h, e);
        if (lt >= 1) landStart = -1;
      }
      if (!reduceMotion) { cam.z += cam.sp * dt; stepCycles(dt); }
      const mx = state.smx - 0.5, my = state.smy - 0.5;
      const hzY = H * (hz - my * 0.04);
      const vx = W / 2 - mx * W * 0.14;
      const f = H * 0.95;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, Math.max(H * 0.2, hzY));
      sky.addColorStop(0, "#020409"); sky.addColorStop(1, "#071228");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // nebula wash
      const nb = ctx.createRadialGradient(W * 0.78 - mx * 40, hzY - H * 0.42, 0, W * 0.78, hzY - H * 0.42, W * 0.5);
      nb.addColorStop(0, "rgba(60,110,255,0.16)"); nb.addColorStop(1, "rgba(60,110,255,0)");
      ctx.fillStyle = nb; ctx.fillRect(0, 0, W, H);
      const nb2 = ctx.createRadialGradient(W * 0.15 - mx * 30, hzY - H * 0.5, 0, W * 0.15, hzY - H * 0.5, W * 0.35);
      nb2.addColorStop(0, "rgba(255,90,36,0.08)"); nb2.addColorStop(1, "rgba(255,90,36,0)");
      ctx.fillStyle = nb2; ctx.fillRect(0, 0, W, H);
      // stars
      const sOff = (scrollY * 0.03) % H;
      for (const s of stars) {
        const x = s.x * W - mx * 18, y = ((s.y * H - sOff + H) % H) - my * 10;
        if (y > hzY) continue;
        const a = reduceMotion ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = s.warm ? `rgba(255,170,140,${a})` : `rgba(225,240,255,${a})`;
        ctx.fillRect(x, y, s.r, s.r);
      }
      // earth, far below the plane — seen through the grid
      if (hzY < H) {
        const R = Math.max(W, H) * 1.25, ex = vx + (W / 2 - vx) * 0.6, ey = hzY + R + H * 0.07;
        ctx.save();
        ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.closePath();
        const eg = ctx.createRadialGradient(ex, ey - R * 0.9, R * 0.05, ex, ey, R);
        eg.addColorStop(0, "#1b4a8c"); eg.addColorStop(0.35, "#0b2350"); eg.addColorStop(1, "#030a1a");
        ctx.fillStyle = eg; ctx.fill();
        ctx.clip();
        ctx.globalAlpha = 0.28;
        const cw = R * 2.2, chh = R * 0.55;
        ctx.drawImage(cloudTex, ex - cw / 2 + ((t * 6) % 40) - mx * 30, ey - R * 1.02, cw, chh);
        ctx.globalAlpha = 1;
        ctx.restore();
        // atmosphere rim
        ctx.save();
        ctx.beginPath(); ctx.arc(ex, ey, R, Math.PI * 1.05, Math.PI * 1.95);
        ctx.strokeStyle = "rgba(143,233,255,0.9)"; ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(120,200,255,1)"; ctx.shadowBlur = 24; ctx.stroke();
        ctx.lineWidth = 10; ctx.strokeStyle = "rgba(100,170,255,0.12)"; ctx.shadowBlur = 40; ctx.stroke();
        ctx.restore();
      }
      // horizon glow
      if (hzY > -40 && hzY < H + 40) {
        const hg = ctx.createLinearGradient(0, hzY - H * 0.12, 0, hzY + H * 0.1);
        hg.addColorStop(0, "rgba(255,90,36,0)"); hg.addColorStop(0.55, "rgba(255,90,36,0.2)"); hg.addColorStop(0.62, "rgba(255,140,100,0.32)"); hg.addColorStop(1, "rgba(255,90,36,0)");
        ctx.fillStyle = hg; ctx.fillRect(0, hzY - H * 0.12, W, H * 0.22);
        ctx.fillStyle = "rgba(255,190,165,0.75)"; ctx.fillRect(0, hzY, W, 1);
      }
      // grid floor
      const near = 0.5, far = 70;
      const P = (X, Z) => [vx + (X * f) / Z, hzY + (h * f) / Z];
      ctx.lineWidth = 1;
      for (let i = -36; i <= 36; i++) {
        const a = P(i, near), b = P(i, far);
        const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        const base = i === 0 ? 0.55 : 0.32;
        g.addColorStop(0, `rgba(143,233,255,${base})`); g.addColorStop(0.6, `rgba(143,233,255,${base * 0.35})`); g.addColorStop(1, "rgba(143,233,255,0)");
        ctx.strokeStyle = g;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      const off = cam.z % 1;
      for (let z = Math.ceil(near) - off + 1; z < far; z += 1) {
        const y = hzY + (h * f) / z;
        if (y > H + 2) continue;
        const a = clamp(1 - z / 34, 0, 1);
        ctx.fillStyle = `rgba(143,233,255,${0.34 * a * a})`;
        ctx.fillRect(0, y, W, 1);
      }
      // light cycles
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const cy of cycles) {
        const pts = [...cy.trail, [cy.x, cy.z]];
        if (pts.some((p) => p[1] < 9)) continue;
        const wallH = 0.32;
        // wall
        ctx.beginPath();
        pts.forEach((p, i) => { const q = [vx + (p[0] * f) / p[1], hzY + ((h - wallH) * f) / p[1]]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
        for (let i = pts.length - 1; i >= 0; i--) { const q = P(pts[i][0], pts[i][1]); ctx.lineTo(q[0], q[1]); }
        ctx.closePath();
        ctx.fillStyle = rgb(cy.c, 0.12); ctx.fill();
        // floor line + top edge
        ctx.save();
        ctx.shadowColor = rgb(cy.c, 1); ctx.shadowBlur = 14;
        ctx.strokeStyle = rgb(cy.c, 0.95); ctx.lineWidth = 1.6;
        ctx.beginPath();
        pts.forEach((p, i) => { const q = [vx + (p[0] * f) / p[1], hzY + ((h - wallH) * f) / p[1]]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
        ctx.stroke();
        ctx.restore();
        const hd = P(cy.x, cy.z);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hd[0], hd[1], 1.8, 0, 6.29); ctx.fill();
      }
      // fade to sky at the far plane
      if (hzY > 0 && hzY < H) {
        const fg = ctx.createLinearGradient(0, hzY, 0, hzY + H * 0.06);
        fg.addColorStop(0, "rgba(7,18,40,0.85)"); fg.addColorStop(1, "rgba(7,18,40,0)");
        ctx.fillStyle = fg; ctx.fillRect(0, hzY + 1, W, H * 0.06);
      }
    }

    addEventListener("resize", () => { resize(); });
    addEventListener("load", computeKeys);
    document.fonts?.ready.then(computeKeys);
    resize();
    return {
      draw,
      show() { visible = true; },
      land() { visible = true; landStart = performance.now(); },
      recompute: computeKeys,
    };
  })();

  /* ----------------------------------------------------------
     LOADER — an arcade cabinet on earth; enter pulls you
     through the screen, up through the clouds, onto the grid.
     ---------------------------------------------------------- */
  const Gate = (() => {
    const gate = $("#gate"), cv = $("#gateCanvas");
    if (!gate || !cv) return null;
    const g = cv.getContext("2d");
    const countEl = $("#gateCount"), barEl = $("#gateBar"), skipBtn = $("#gateSkip");
    let S = 3, W = 0, H = 0, room = null, scr = null, sg = null, simg = null, L = {};
    let clouds = null, gstars = [];
    let running = true, ready = false, tEnter = -1, onDone = null, landed = false, unlocked = false, prog = 0;
    const t0 = performance.now();
    let loaded = false;
    Promise.all([
      new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))),
      document.fonts ? document.fonts.ready : Promise.resolve(),
    ]).then(() => { loaded = true; buildRoom(); });

    const C = {
      wall0: hex3("#05060f"), wall1: hex3("#0a0d1f"), wall2: hex3("#121734"), floor0: hex3("#030409"), floor1: hex3("#0a0e20"),
      cab: hex3("#0d1122"), cabD: hex3("#070912"), cabL: hex3("#1a2038"), acc: hex3("#ff5a24"), accD: hex3("#8f2a0c"), accH: hex3("#ffd0bd"),
      cy: hex3("#8fe9ff"), cyD: hex3("#1f5a7a"), iv: hex3("#f2ece2"), crt: hex3("#020611"), dim: hex3("#1e3a78"),
    };

    function layout() {
      const floorY = Math.round(H * 0.84);
      const ch = Math.round(Math.min(H * 0.74, W * 1.15));
      const cw = Math.round(ch * 0.46);
      const cx = Math.round(W / 2);
      const top = floorY - ch;
      const mh = Math.round(ch * 0.12);
      const bh = Math.round(ch * 0.4);
      const ph = Math.round(ch * 0.09);
      const pad = Math.max(3, Math.round(cw * 0.08));
      L = {
        floorY, ch, cw, cx, top, x0: cx - (cw >> 1), x1: cx + (cw >> 1),
        mY: top, mH: mh,
        bY: top + mh + 1, bH: bh,
        sX: cx - (cw >> 1) + pad, sY: top + mh + 1 + pad, sW: cw - pad * 2, sH: bh - pad * 2,
        pY: top + mh + 1 + bh, pH: ph,
        lY: top + mh + 1 + bh + ph,
      };
    }

    function buildRoom() {
      layout();
      const { floorY, cx, x0, x1, top, sX, sY, sW, sH } = L;
      const scx = sX + sW / 2, scy = sY + sH / 2;
      room = paint(W, H, (x, y) => {
        if (y < floorY) {
          let v = 0.15 + 0.35 * (y / floorY);
          const d = Math.hypot((x - scx) / (L.cw * 1.6), (y - scy) / (L.cw * 1.3));
          const glow = Math.max(0, 1 - d);
          const md = Math.hypot((x - cx) / (L.cw * 1.4), (y - (L.mY + L.mH / 2)) / (L.cw * 0.6));
          const mg = Math.max(0, 1 - md);
          if (mg * 0.7 > bay(x, y) + 0.15) return mg > 0.75 && bay(x + 2, y + 1) < 0.25 ? C.accD : [40, 14, 10];
          if (glow * 0.9 > bay(x, y) + 0.1) return glow > 0.7 ? C.cyD : [14, 30, 58];
          return pick([C.wall0, C.wall1, C.wall2], v, x, y);
        }
        // floor: dark, with reflection of the screen + cabinet light
        const fy = (y - floorY) / (H - floorY);
        const rd = Math.hypot((x - scx) / (L.cw * 1.2), fy * 2.2);
        const rg = Math.max(0, 1 - rd) * (1 - fy);
        if (Math.abs(x - x0) < 1 || Math.abs(x - x1) < 1) { if (bay(x, y) < 0.7 - fy) return C.accD; }
        if (rg * 0.8 > bay(x, y) + 0.1) return rg > 0.6 ? C.cyD : [12, 24, 46];
        return pick([C.floor0, C.floor1], 0.25 * (1 - fy), x, y);
      });
      const r = room.getContext("2d");
      r.imageSmoothingEnabled = false;
      const R = (c, x, y, w, h) => { r.fillStyle = rgb(c); r.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };
      // neighbouring cabinets: same build, smaller, dimmer
      for (const k of [2, 1]) {
        for (const side of [-1, 1]) {
          const sc = k === 1 ? 0.8 : 0.64, cw = Math.round(L.cw * sc), ch = Math.round(L.ch * sc);
          const sx = Math.round(cx + side * L.cw * (k === 1 ? 1.22 : 2.15) - cw / 2), sy = floorY - ch;
          const glowC = side < 0 ? [24, 70, 104] : [104, 34, 16], trim = side < 0 ? [40, 110, 150] : [150, 50, 22];
          const mh = Math.round(ch * 0.12), bh = Math.round(ch * 0.4), pad = Math.max(2, Math.round(cw * 0.08));
          R([9, 11, 22], sx, sy, cw, ch);
          R(trim, sx - 1, sy, 1, ch); R(trim, sx + cw, sy, 1, ch);
          R(glowC, sx + 1, sy + 1, cw - 2, mh - 2);
          R([3, 4, 8], sx + 1, sy + mh, cw - 2, bh);
          R(side < 0 ? [8, 22, 40] : [36, 12, 8], sx + pad, sy + mh + pad, cw - pad * 2, bh - pad * 2);
          for (let q = 0; q < 6; q++) R(trim, sx + pad + 2 + ((q * 7 + k * 3) % Math.max(3, cw - pad * 2 - 4)), sy + mh + pad + 3 + ((q * 5) % Math.max(3, bh - pad * 2 - 6)), 1, 1);
          R([20, 24, 42], sx - 2, sy + mh + bh, cw + 4, Math.round(ch * 0.05));
          R([4, 5, 10], sx, floorY - 2, cw, 2);
          r.fillStyle = `rgba(4,5,11,${k === 1 ? 0.35 : 0.55})`; r.fillRect(sx - 3, sy, cw + 6, ch);
        }
      }
      // cabinet body
      R(C.cab, x0, top, L.cw, L.ch);
      R(C.cabD, x0, top, 2, L.ch);
      R(C.cabL, x1 - 2, top, 2, L.ch);
      // T-molding light strips
      R(C.acc, x0 - 1, top, 1, L.ch); R(C.acc, x1, top, 1, L.ch);
      r.fillStyle = "rgba(255,90,36,0.35)"; r.fillRect(x0 - 2, top, 1, L.ch); r.fillRect(x1 + 1, top, 1, L.ch);
      // marquee
      R([24, 8, 4], x0, L.mY, L.cw, L.mH);
      for (let i = 0; i < L.mH - 2; i++) { const t = i / (L.mH - 2); r.fillStyle = `rgba(255,${90 + 60 * (1 - t)},${36 + 40 * (1 - t)},${0.75 - t * 0.35})`; r.fillRect(x0 + 2, L.mY + 1 + i, L.cw - 4, 1); }
      r.fillStyle = "#2a0d06"; r.fillRect(x0 + 2, L.mY + L.mH - 2, L.cw - 4, 1);
      const fs = Math.max(8, Math.floor(L.mH * 0.55 / 8) * 8);
      r.font = `${fs}px Silkscreen, monospace`; r.textAlign = "center"; r.textBaseline = "middle";
      r.fillStyle = "#1a0603"; r.fillText("OM KASHYAP", cx + 1, L.mY + L.mH / 2 + 1);
      r.fillStyle = "#fff3ec"; r.fillText("OM KASHYAP", cx, L.mY + L.mH / 2);
      // bezel
      R([3, 4, 8], x0 + 1, L.bY, L.cw - 2, L.bH);
      R([12, 15, 28], sX - 2, sY - 2, sW + 4, sH + 4);
      // control panel
      R(C.cabL, x0 - 3, L.pY, L.cw + 6, Math.ceil(L.pH * 0.55));
      R([9, 11, 22], x0 - 3, L.pY + Math.ceil(L.pH * 0.55), L.cw + 6, L.pH - Math.ceil(L.pH * 0.55));
      R(C.acc, x0 - 3, L.pY, L.cw + 6, 1);
      const jy = L.pY + Math.round(L.pH * 0.3), jx = x0 + Math.round(L.cw * 0.3);
      R([30, 30, 40], jx, jy - 3, 1, 4); R(C.acc, jx - 1, jy - 5, 3, 3);
      R(C.cy, x0 + Math.round(L.cw * 0.58), jy - 1, 3, 2); R(C.acc, x0 + Math.round(L.cw * 0.72), jy - 2, 3, 2);
      // lower body + coin door
      const dw = Math.round(L.cw * 0.4), dh = Math.round((floorY - L.lY) * 0.45), dx = cx - (dw >> 1), dy = L.lY + Math.round((floorY - L.lY) * 0.2);
      R([16, 20, 38], dx, dy, dw, dh);
      R([5, 6, 12], dx + 1, dy + 1, dw - 2, 1);
      L.coin = [[dx + Math.round(dw * 0.25), dy + Math.round(dh * 0.3)], [dx + Math.round(dw * 0.62), dy + Math.round(dh * 0.3)]];
      R([5, 6, 12], x0, floorY - 3, L.cw, 3);
      // screen buffer
      scr = mk(sW, sH); sg = scr.getContext("2d"); simg = sg.createImageData(sW, sH);
    }

    function genClouds() {
      // three layers at half resolution; clear at both ends, dense in the middle
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

    // ---- the game on the screen: dithered octahedron + roulette ball
    const N = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) N.push([a, b, c]);
    const LV = (() => { const v = [-0.45, -0.65, -0.62]; const m = Math.hypot(...v); return v.map((k) => k / m); })();
    let ax = 0.6, ay = 0.4;
    function renderScreen(t, flash) {
      const w = scr.width, h = scr.height, d = simg.data;
      const put = (i, c) => { const k = i * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; };
      if (!reduceMotion) { ay += 0.016 * (0.32 + (state.mx - 0.5) * 0.9); ax += ((0.55 + (state.my - 0.5) * 0.9) - ax) * 0.04; }
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
      const toObj = (x, y, z) => { const y1 = ca * y + sa * z, z1 = -sa * y + ca * z; return [cb * x - sb * z1, y1, sb * x + cb * z1]; };
      const toWorld = (x, y, z) => { const x1 = cb * x + sb * z, z1 = -sb * x + cb * z; return [x1, ca * y - sa * z1, sa * y + ca * z1]; };
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) put(i, y & 1 ? [1, 4, 12] : C.crt);
      const R = Math.min(w, h) * 0.27, cx = w / 2, cy = h * 0.44;
      const ex = 1.3 / R;
      const dir = toObj(0, 0, 1);
      const cover = new Uint8Array(w * h);
      // orbit (behind)
      const orx = R * 1.7, ory = R * 0.4;
      for (let k = 0; k < 120; k += 3) { const a = (k / 120) * 6.283; const x = (cx + Math.cos(a) * orx) | 0, y = (cy + Math.sin(a) * ory) | 0; if (x >= 0 && y >= 0 && x < w && y < h) put(y * w + x, C.dim); }
      for (let y = Math.max(0, (cy - R * 1.05) | 0); y <= Math.min(h - 1, cy + R * 1.05); y++) for (let x = Math.max(0, (cx - R * 1.05) | 0); x <= Math.min(w - 1, cx + R * 1.05); x++) {
        const o = toObj((x - cx) / R, (y - cy) / R, -3);
        let tin = -1e9, tout = 1e9, ni = -1, miss = false;
        for (let k = 0; k < 8; k++) {
          const n = N[k];
          const nd = n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2], no = n[0] * o[0] + n[1] * o[1] + n[2] * o[2];
          if (Math.abs(nd) < 1e-6) { if (no > 1) { miss = true; break; } continue; }
          const tt = (1 - no) / nd;
          if (nd < 0) { if (tt > tin) { tin = tt; ni = k; } } else if (tt < tout) tout = tt;
        }
        if (miss || tin > tout || ni < 0) continue;
        const p = [o[0] + dir[0] * tin, o[1] + dir[1] * tin, o[2] + dir[2] * tin];
        const i = y * w + x;
        cover[i] = 1;
        if (Math.min(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])) < ex) { put(i, C.acc); continue; }
        const n = N[ni], nw = toWorld(n[0] / 1.732, n[1] / 1.732, n[2] / 1.732);
        let v = Math.max(0, -(nw[0] * LV[0] + nw[1] * LV[1] + nw[2] * LV[2]));
        v = 0.08 + 0.92 * Math.pow(v, 1.3);
        put(i, bay(x, y) < v ? C.iv : C.crt);
      }
      const ba = t * 1.35, bx = Math.round(cx + Math.cos(ba) * orx), by = Math.round(cy + Math.sin(ba) * ory);
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const X = bx + ox, Y = by + oy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        if (Math.sin(ba) < 0 && cover[Y * w + X]) continue;
        put(Y * w + X, C.accH);
      }
      // CRT corners
      for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [1, 0], [0, 1], [w - 2, 0], [w - 1, 1], [0, h - 2], [1, h - 1], [w - 2, h - 1], [w - 1, h - 2]]) put(y * w + x, [3, 4, 8]);
      sg.putImageData(simg, 0, 0);
      // HUD text
      const fs = 8;
      sg.font = `${fs}px Silkscreen, monospace`; sg.textAlign = "center"; sg.textBaseline = "alphabetic";
      const txt = !ready ? `LOADING ${String(Math.round(prog * 100)).padStart(3, "0")}` : (Math.floor(t * 1.6) % 2 ? "PRESS ENTER" : "INSERT COIN");
      if (ready || Math.floor(t * 4) % 4) { sg.fillStyle = ready ? "#ffd0bd" : "#8fe9ff"; sg.fillText(txt, w / 2, h - 5); }
      sg.textAlign = "left"; sg.fillStyle = "#ff5a24"; sg.fillText("1UP", 4, fs + 2);
      sg.textAlign = "right"; sg.fillStyle = "#f2ece2"; sg.fillText("HI 2026", w - 4, fs + 2);
      if (flash > 0) { sg.fillStyle = `rgba(255,240,232,${flash})`; sg.fillRect(0, 0, w, h); }
    }

    function drawRoom(k, fx, fy, t, flash) {
      g.setTransform(k, 0, 0, k, W / 2 - k * fx, H / 2 - k * fy);
      g.imageSmoothingEnabled = false;
      if (room) g.drawImage(room, 0, 0);
      if (scr) {
        renderScreen(t, flash);
        g.drawImage(scr, L.sX, L.sY);
        // screen glow pulse
        g.fillStyle = `rgba(143,233,255,${0.03 + Math.sin(t * 7) * 0.01})`;
        g.fillRect(L.sX, L.sY, L.sW, L.sH);
      }
      if (L.coin) for (const [x, y] of L.coin) { g.fillStyle = Math.floor(t * 2) % 2 ? "#ff5a24" : "#8f2a0c"; g.fillRect(x, y, 2, 4); }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    const A = 1.05, B = 0.4, Cc = 2.3; // zoom, digitize, ascent durations
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
        drawRoom(1, W / 2, H / 2, t, 0);
      } else {
        const te = (now - tEnter) / 1000;
        const scx = L.sX + L.sW / 2, scy = L.sY + L.sH / 2;
        if (te < A) {
          const p = easeIn(te / A);
          const K = Math.max(W / L.sW, H / L.sH) * 1.06;
          drawRoom(lerp(1, K, p), lerp(W / 2, scx, Math.min(1, p * 1.4)), lerp(H / 2, scy, Math.min(1, p * 1.4)), t, Math.pow(p, 5) * 0.95);
        } else if (te < A + B) {
          const p = (te - A) / B;
          drawSky(0, t);
          const beam = Math.round(H * (1 - p));
          g.fillStyle = "#fff0e8"; g.fillRect(0, 0, W, beam);
          for (let y = beam; y < Math.min(H, beam + 10); y++) for (let x = 0; x < W; x++) if (bay(x, y) < 1 - (y - beam) / 10) { g.fillStyle = (y - beam) < 2 ? "#ff5a24" : "#fff0e8"; g.fillRect(x, y, 1, 1); }
          g.fillStyle = "rgba(255,90,36,0.9)"; g.fillRect(0, beam, W, 1);
        } else {
          const p = clamp((te - A - B) / Cc, 0, 1);
          drawSky(p, t);
          if (p > 0.55 && !unlocked) { unlocked = true; document.body.classList.remove("is-locked"); Scene.show(); }
          if (p > 0.72 && !landed) { landed = true; Scene.land(); Sound.land(); }
          cv.style.opacity = p > 0.74 ? String(1 - (p - 0.74) / 0.26) : "1";
          if (p >= 1) finish();
        }
      }
      if (running) requestAnimationFrame(frame);
    }

    function drawSky(p, t) {
      // night sky turning to space
      const top = [lerp(14, 2, p), lerp(32, 4, p), lerp(72, 9, p)], bot = [lerp(36, 4, p), lerp(70, 8, p), lerp(130, 20, p)];
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, rgb(top)); gr.addColorStop(1, rgb(bot));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // stars appear above the clouds
      if (p > 0.45) {
        const a = clamp((p - 0.45) / 0.3, 0, 1);
        for (const s of gstars) { g.fillStyle = `rgba(230,240,255,${a * (0.4 + s[2] * 0.6)})`; g.fillRect((s[0] * W) | 0, (s[1] * H) | 0, 1, 1); }
      }
      if (!clouds) return;
      const e = easeInOut(p);
      for (const L2 of clouds) {
        const c = L2.c, lh = c.height * 2;
        const y = H - lh + (lh - H) * e;
        g.drawImage(c, 0, Math.round(y), c.width * 2, lh);
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
        setTimeout(() => Sound.whoosh(), (A + B) * 1000 - 300);
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
        tg.lineCap = "square"; tg.lineJoin = "miter";
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const age = clamp((now - b.t) / LIFE, 0, 1);
            tg.strokeStyle = pass ? `rgba(255,230,220,${(1 - age) * 0.9})` : `rgba(255,90,36,${(1 - age) * 0.35})`;
            tg.lineWidth = pass ? 1.2 * (1 - age) + 0.3 : 6 * (1 - age);
            tg.beginPath(); tg.moveTo(a.x, a.y); tg.lineTo(b.x, b.y); tg.stroke();
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
     MOLECULES — C60 and ATP as rotating line drawings
     ---------------------------------------------------------- */
  (() => {
    const PHI = (1 + Math.sqrt(5)) / 2;
    function c60() {
      const base = [[0, 1, 3 * PHI], [1, 2 + PHI, 2 * PHI], [PHI, 2, 2 * PHI + 1]];
      const set = new Map();
      for (const b of base) for (let r = 0; r < 3; r++) {
        const v = [b[r % 3], b[(r + 1) % 3], b[(r + 2) % 3]];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const p = [v[0] * sx, v[1] * sy, v[2] * sz];
          set.set(p.map((n) => n.toFixed(4)).join(","), p);
        }
      }
      const atoms = [...set.values()].map((p) => ({ p: p.map((n) => n / 4.95), e: "C" }));
      const bonds = [];
      for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        const a = atoms[i].p, b = atoms[j].p;
        if (Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 2 / 4.95) < 0.01) bonds.push([i, j, 1]);
      }
      return { atoms, bonds, spin: true };
    }
    function atp() {
      const A = {
        N1: [-0.866, 0.5], C2: [-0.866, -0.5], N3: [0, -1], C4: [0.866, -0.5], C5: [0.866, 0.5], C6: [0, 1], N6: [0, 2],
        N7: [1.817, 0.809], C8: [2.405, 0], N9: [1.817, -0.809],
        C1r: [2.3, -1.75], O4r: [3.3, -1.5], C4r: [3.75, -2.4], C3r: [3.05, -3.15], C2r: [2.15, -2.75], O2r: [1.4, -3.35], O3r: [3.2, -4.1],
        C5r: [4.8, -2.25], O5r: [5.4, -1.45],
        Pa: [6.4, -1.25], Oa1: [6.6, -0.25], Oa2: [6.2, -2.25], Oab: [7.4, -1.45],
        Pb: [8.4, -1.25], Ob1: [8.6, -0.25], Ob2: [8.2, -2.25], Obg: [9.4, -1.45],
        Pg: [10.4, -1.25], Og1: [10.6, -0.25], Og2: [10.2, -2.25], Og3: [11.4, -1.05],
      };
      const B = [
        ["N1", "C2", 1], ["C2", "N3", 2], ["N3", "C4", 1], ["C4", "C5", 2], ["C5", "C6", 1], ["C6", "N1", 2], ["C6", "N6", 1],
        ["C5", "N7", 1], ["N7", "C8", 2], ["C8", "N9", 1], ["N9", "C4", 1], ["N9", "C1r", 1],
        ["C1r", "O4r", 1], ["O4r", "C4r", 1], ["C4r", "C3r", 1], ["C3r", "C2r", 1], ["C2r", "C1r", 1], ["C2r", "O2r", 1], ["C3r", "O3r", 1],
        ["C4r", "C5r", 1], ["C5r", "O5r", 1], ["O5r", "Pa", 1], ["Pa", "Oa1", 2], ["Pa", "Oa2", 1], ["Pa", "Oab", 1], ["Oab", "Pb", 1],
        ["Pb", "Ob1", 2], ["Pb", "Ob2", 1], ["Pb", "Obg", 1], ["Obg", "Pg", 1], ["Pg", "Og1", 2], ["Pg", "Og2", 1], ["Pg", "Og3", 1],
      ];
      const names = Object.keys(A);
      let cx = 0, cy = 0;
      names.forEach((n) => { cx += A[n][0]; cy += A[n][1]; });
      cx /= names.length; cy /= names.length;
      const atoms = names.map((n) => {
        const [x, y] = A[n];
        const z = Math.sin((x - cx) * 0.55) * 0.9 + (n === "C2r" ? 0.5 : 0) + (n.startsWith("O") && n.length === 3 && /[12]$/.test(n) ? (n.endsWith("1") ? 0.6 : -0.6) : 0);
        return { p: [(x - cx) / 6.4, -(y - cy) / 6.4, z / 6.4], e: n.match(/^[A-Z]/)[0] };
      });
      const bonds = B.map(([a, b, o]) => [names.indexOf(a), names.indexOf(b), o]);
      return { atoms, bonds, spin: false };
    }
    const COL = { C: [242, 236, 226], N: [143, 233, 255], O: [255, 154, 116], P: [255, 90, 36] };
    const RAD = { C: 1.7, N: 2.1, O: 2, P: 3.6 };

    $$("canvas.mol").forEach((cv) => {
      const mol = cv.dataset.mol === "atp" ? atp() : c60();
      const ctx = cv.getContext("2d");
      let w = 0, h = 0, dpr = 1, vis = false, hover = 0;
      const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; };
      size(); addEventListener("resize", size);
      new IntersectionObserver((en) => { vis = en[0].isIntersecting; if (vis) requestAnimationFrame(loop); }).observe(cv);
      cv.parentElement.addEventListener("pointerenter", () => (hover = 1));
      cv.parentElement.addEventListener("pointerleave", () => (hover = 0));
      let spd = 0;
      function loop(now) {
        if (!vis) return;
        spd = lerp(spd, hover ? 1 : 0, 0.05);
        const t = now / 1000;
        const ry = mol.spin ? t * (0.35 + spd * 0.9) + scrollY * 0.002 : Math.sin(t * 0.45) * 0.75 + scrollY * 0.0015;
        const rx = (mol.spin ? 0.35 : 0.25) + (state.smy - 0.5) * 0.5;
        const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
        const S = Math.min(w, h) * (mol.spin ? 0.42 : 0.44);
        const pr = mol.atoms.map((a) => {
          let [x, y, z] = a.p;
          const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
          const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
          const persp = 1 / (1 + z2 * 0.5);
          return { x: w / 2 + x1 * S * persp, y: h / 2 + y1 * S * persp, z: z2, s: persp, e: a.e };
        });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        // floor ring
        ctx.strokeStyle = "rgba(143,233,255,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(w / 2, h * 0.9, S * 0.8, S * 0.12, 0, 0, 6.283); ctx.stroke();
        // bonds
        for (const [i, j, o] of mol.bonds) {
          const a = pr[i], b = pr[j];
          const depth = clamp(0.55 - (a.z + b.z) * 0.6, 0.12, 1);
          ctx.strokeStyle = `rgba(143,233,255,${depth * 0.85})`;
          ctx.lineWidth = 1;
          if (o === 2) {
            const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * 1.6, ny = (dx / l) * 1.6;
            ctx.beginPath(); ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny); ctx.moveTo(a.x - nx, a.y - ny); ctx.lineTo(b.x - nx, b.y - ny); ctx.stroke();
          } else { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        // atoms, back to front
        pr.map((p, i) => [p, i]).sort((A, B) => B[0].z - A[0].z).forEach(([p]) => {
          const c = COL[p.e] || COL.C, r = (RAD[p.e] || 1.8) * p.s;
          const depth = clamp(0.65 - p.z * 0.7, 0.2, 1);
          if (p.e === "P") { ctx.save(); ctx.shadowColor = "rgba(255,90,36,1)"; ctx.shadowBlur = 12; }
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${depth})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
          if (p.e === "P") ctx.restore();
        });
        requestAnimationFrame(loop);
      }
    });
  })();

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
  const stage = $("#tableStage");
  const table = $("#table .felt");
  const spot = $(".spotlight");
  const fullhouse = $(".fullhouse");
  const cards = $$(".card", cardsEl);
  const discs = $$(".disc", table).map((el) => ({ el, d: parseFloat(el.dataset.depth) || 1, r: Math.random() * 360 }));
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
    const h = $("#tableHint .hint-text"); if (h) h.textContent = useSpot ? "Move your light across the felt to deal the cards." : "Scroll to deal the cards.";
  }
  $("#dealAll").addEventListener("click", () => cards.forEach((c, i) => setTimeout(() => deal(c), i * 110)));
  $("#reshuffle").addEventListener("click", reshuffle);
  cards.forEach((c) => {
    c.addEventListener("click", (e) => { if (!e.target.closest("a")) deal(c); });
    c.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); deal(c); } });
    c.addEventListener("focusin", () => deal(c));
    if (!noHover) {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--ry", `${u * 18}deg`); c.style.setProperty("--rx", `${-v * 18}deg`);
      });
      c.addEventListener("pointerleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); });
    }
  });
  if (!useSpot) {
    if (reduceMotion) cards.forEach((c) => deal(c, true));
    else {
      $("#tableHint .hint-text").textContent = "Scroll to deal the cards.";
      const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { setTimeout(() => deal(en.target), 120); io.unobserve(en.target); } }), { threshold: 0.6 });
      cards.forEach((c) => io.observe(c));
    }
  }

  function transitions() {
    if (reduceMotion) return;
    const vh = innerHeight;
    // the table: approach at a low angle, sit (flatten), then stand and walk away (tilt back)
    const r = stage.getBoundingClientRect();
    if (r.bottom > -vh && r.top < vh * 2) {
      const pin = easeOut(clamp((vh * 1.0 - r.top) / (vh * 0.85), 0, 1));
      const pout = easeIn(clamp((vh * 0.7 - r.bottom) / (vh * 0.6), 0, 1));
      if (pout > 0.001) {
        stage.style.transformOrigin = "50% 100%";
        stage.style.transform = `translateY(${(-pout * 6).toFixed(2)}vh) rotateX(${(pout * 58).toFixed(2)}deg) scale(${(1 - pout * 0.14).toFixed(4)})`;
        stage.style.opacity = (1 - pout * 0.75).toFixed(3);
      } else if (pin < 0.999) {
        stage.style.transformOrigin = "50% 0%";
        stage.style.transform = `translateY(${((1 - pin) * 14).toFixed(2)}vh) rotateX(${((1 - pin) * 66).toFixed(2)}deg) scale(${(0.84 + 0.16 * pin).toFixed(4)})`;
        stage.style.opacity = (0.25 + 0.75 * pin).toFixed(3);
      } else if (stage.style.transform !== "none") {
        stage.style.transform = "none"; stage.style.opacity = "1";
      }
    }
    // cash out: walk up to the cage, bars part
    const cg = $("#cashGrid"), cage = $("#cage"), cr = $("#cashout").getBoundingClientRect();
    if (cr.top < vh * 1.4 && cr.bottom > 0) {
      const p = easeOut(clamp((vh * 1.05 - cr.top) / (vh * 0.9), 0, 1));
      cg.style.transform = p > 0.999 ? "none" : `translate3d(0, ${((1 - p) * 60).toFixed(1)}px, ${((1 - p) * -520).toFixed(1)}px)`;
      cg.style.opacity = (0.15 + 0.85 * p).toFixed(3);
      cage.style.setProperty("--open", (p * 380).toFixed(1));
    }
  }
  $$("#cage i").forEach((b, i) => b.style.setProperty("--dir", String((i - 2) * 1.2)));

  function tableFrame(now) {
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
    for (const c of cards) {
      if (c.classList.contains("is-dealt")) continue;
      const cr = c.getBoundingClientRect();
      if (Math.hypot(cr.left + cr.width / 2 - sp.x, cr.top + cr.height / 2 - sp.y) < radius * 0.75) deal(c);
    }
  }

  /* ----------------------------------------------------------
     CHAPTER HUD
     ---------------------------------------------------------- */
  const chapters = $$("[data-chapter]");
  const chNum = $("#chapterNum"), chName = $("#chapterName");
  let curCh = "";
  function chapterFrame() {
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
    transitions();
    tableFrame(now);
    chapterFrame();
    Cursor && Cursor.frame(now);
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

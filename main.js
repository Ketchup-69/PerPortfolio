/* ==========================================================
   THE HOUSE — engine
   Pixel scene (canvas), parallax, spotlight table, sound.
   No dependencies.
   ========================================================== */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const SITE = window.SITE || {};
  const PROJECTS = window.PROJECTS || [];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = matchMedia("(hover: none)").matches;

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
    const rows = SUITS[suit] || SUITS.spade;
    let d = "";
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => { if (ch === "#") d += `M${x} ${y}h1v1h-1z`; });
    });
    return `<svg class="${cls}" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
        <div class="card-face card-back"><div class="back-emblem"><span>OK</span></div><p class="back-no">No. ${n}</p></div>
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

  // Site fields + links
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
    if (label) $(".r-val", a) && ($(".r-val", a).textContent = label);
  };
  linkRow("github", SITE.github);
  linkRow("email", SITE.email ? `mailto:${SITE.email}` : "", SITE.email);
  linkRow("linkedin", SITE.linkedin, "Connect ↗");
  $("#year").textContent = new Date().getFullYear();

  // tiny toast
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      Object.assign(toastEl.style, {
        position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", zIndex: 200,
        fontFamily: "var(--pixel)", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase",
        padding: "12px 16px", background: "var(--ivory)", color: "var(--void)", boxShadow: "4px 4px 0 var(--accent)",
        transition: "opacity .3s", opacity: 0, pointerEvents: "none",
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
  const state = {
    mx: 0.5, my: 0.5, smx: 0.5, smy: 0.5,
    px: -9999, py: -9999, lastMove: 0,
    sy: scrollY, ssy: scrollY, lastSy: scrollY, vel: 0,
    t: 0,
  };
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    state.mx = e.clientX / innerWidth;
    state.my = e.clientY / innerHeight;
    state.px = e.clientX;
    state.py = e.clientY;
    state.lastMove = performance.now();
  }, { passive: true });
  addEventListener("pointerleave", () => { state.lastMove = 0; });
  // gyro tilt on phones (where allowed without a prompt)
  if (noHover) {
    addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      state.mx = clamp(0.5 + e.gamma / 60, 0, 1);
      state.my = clamp(0.5 + (e.beta - 45) / 80, 0, 1);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     SOUND — synthesized, no files
     ---------------------------------------------------------- */
  const Sound = (() => {
    let ac = null, master = null, noiseBuf = null, ambient = null;
    let enabled = store.get("house-sound") !== "0";

    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = enabled ? 0.8 : 0;
        const comp = ac.createDynamicsCompressor();
        master.connect(comp).connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    const ready = () => enabled && ensure();

    function noise(dur, type, freq, q, gain, when = 0, dest = master) {
      const t = ac.currentTime + when;
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      const f = ac.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(dest);
      s.start(t, Math.random() * 1.5);
      s.stop(t + dur + 0.05);
    }
    function tone(freq, dur, type, gain, when = 0, endFreq, dest = master) {
      const t = ac.currentTime + when;
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    function chipClack(n = 2, vol = 1, dest = master) {
      for (let i = 0; i < n; i++) {
        const w = i * (0.045 + Math.random() * 0.03);
        tone(2400 + Math.random() * 1200, 0.05, "triangle", 0.14 * vol, w, null, dest);
        tone(5200 + Math.random() * 800, 0.025, "sine", 0.05 * vol, w, null, dest);
        noise(0.035, "highpass", 3200, 0.7, 0.28 * vol, w, dest);
      }
    }

    function startAmbient() {
      if (ambient || !ac) return;
      const g = ac.createGain();
      g.gain.value = 0;
      g.connect(master);
      // room tone: brown noise
      const len = ac.sampleRate * 4;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
      const src = ac.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
      const rg = ac.createGain(); rg.gain.value = 0.5;
      src.connect(lp).connect(rg).connect(g);
      src.start();
      // lounge pad
      const pad = ac.createGain(); pad.gain.value = 0.018; pad.connect(g);
      [110, 164.81, 220.5, 277.18].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f;
        const og = ac.createGain(); og.gain.value = 0.6;
        const lfo = ac.createOscillator(); lfo.frequency.value = 0.07 + i * 0.03;
        const lg = ac.createGain(); lg.gain.value = 0.4;
        lfo.connect(lg).connect(og.gain);
        o.connect(og).connect(pad); o.start(); lfo.start();
      });
      g.gain.setTargetAtTime(0.9, ac.currentTime, 1.5);
      // distant chips around the room
      const far = ac.createGain(); far.gain.value = 0.18;
      const flp = ac.createBiquadFilter(); flp.type = "lowpass"; flp.frequency.value = 2600;
      far.connect(flp).connect(g);
      const loop = () => {
        if (enabled && ac.state === "running") chipClack(1 + Math.floor(Math.random() * 4), 0.6, far);
        ambient.timer = setTimeout(loop, 2500 + Math.random() * 6000);
      };
      ambient = { g, timer: setTimeout(loop, 3000) };
    }

    return {
      get enabled() { return enabled; },
      unlock() { if (enabled && ensure()) startAmbient(); },
      set(v) {
        enabled = v;
        store.set("house-sound", v ? "1" : "0");
        if (v) { ensure(); master.gain.setTargetAtTime(0.8, ac.currentTime, 0.08); startAmbient(); }
        else if (ac) master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      },
      flip() { if (!ready()) return; noise(0.09, "bandpass", 2300, 0.9, 0.35); tone(820, 0.08, "triangle", 0.05, 0, 260); noise(0.05, "highpass", 5200, 0.5, 0.14, 0.07); },
      chip(n = 2) { if (ready()) chipClack(n); },
      tick() { if (ready()) tone(1900, 0.02, "square", 0.012); },
      ding() { if (!ready()) return; [1318.5, 1975.5, 2637].forEach((f, i) => tone(f, 1.6, "sine", 0.09 / (i + 1))); },
      jackpot() {
        if (!ready()) return;
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => tone(f, 0.32, "square", 0.035, i * 0.065));
        for (let i = 0; i < 6; i++) setTimeout(() => chipClack(2, 0.8), 450 + i * 90);
      },
    };
  })();

  const sndBtn = $("#sndToggle");
  const syncSnd = () => sndBtn.setAttribute("aria-pressed", String(Sound.enabled));
  syncSnd();
  sndBtn.addEventListener("click", () => { Sound.set(!Sound.enabled); syncSnd(); if (Sound.enabled) Sound.chip(2); });
  addEventListener("pointerdown", () => Sound.unlock(), { passive: true });
  addEventListener("keydown", () => Sound.unlock());

  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("a, button");
    if (t && !t.contains(e.relatedTarget)) Sound.tick();
  });

  /* ----------------------------------------------------------
     LOADER — a dithered octahedron (the diamond, in three dimensions)
     rendered in 1-bit ordered dither, with a single ember ball on a
     roulette orbit. Exits through a Bayer dissolve.
     ---------------------------------------------------------- */
  const Gate = (() => {
    const gate = $("#gate");
    const cv = $("#gateCanvas");
    if (!gate || !cv) return null;
    const g = cv.getContext("2d");
    const countEl = $("#gateCount"), barEl = $("#gateBar");
    let S = 3, W = 0, H = 0, img, data, cover;
    let running = true, ready = false, leaving = -1, onDone = null;
    const t0 = performance.now();
    let loaded = false;
    Promise.all([
      new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))),
      document.fonts ? document.fonts.ready : Promise.resolve(),
    ]).then(() => (loaded = true));

    // 8x8 Bayer
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

    const IV = [242, 233, 216], GD = [217, 70, 28], GH = [255, 205, 180], VD = [5, 7, 15], DIM = [30, 58, 120];
    const N = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) N.push([a, b, c]);
    const L = (() => { const v = [-0.45, -0.65, -0.62]; const m = Math.hypot(...v); return v.map((k) => k / m); })();

    function resize() {
      const iw = innerWidth, ih = innerHeight;
      S = iw >= 1500 ? 4 : iw >= 800 ? 3 : 2;
      W = Math.ceil(iw / S); H = Math.ceil(ih / S);
      cv.width = W; cv.height = H;
      cv.style.width = W * S + "px"; cv.style.height = H * S + "px";
      img = g.createImageData(W, H); data = img.data;
      cover = new Uint8Array(W * H);
    }
    resize();
    addEventListener("resize", resize);

    let ax = 0.6, ay = 0.4, mx = 0.5, my = 0.5;
    const onMove = (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; };
    addEventListener("pointermove", onMove, { passive: true });

    const put = (i, c, a = 255) => { const k = i * 4; data[k] = c[0]; data[k + 1] = c[1]; data[k + 2] = c[2]; data[k + 3] = a; };
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    let last = performance.now(), prog = 0;
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;

      // progress: real load + a minimum dwell so the piece is seen
      const target = Math.min(t / 2.6, loaded ? 1 : 0.88);
      prog = Math.min(1, prog + (target - prog) * 0.08 + 0.0015);
      if (prog > 0.999) prog = 1;
      const pct = Math.round(prog * 100);
      countEl.textContent = String(pct).padStart(3, "0");
      barEl.style.width = pct + "%";
      if (pct === 100 && !ready) { ready = true; gate.classList.add("is-ready"); }

      // rotation
      if (!reduceMotion) {
        ay += dt * (0.32 + (mx - 0.5) * 0.9);
        ax += ((0.55 + (my - 0.5) * 0.9) - ax) * 0.04;
      }
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
      // world = Rx(ax) * Ry(ay) * obj ; inverse = Ry(-ay) * Rx(-ax)
      const toObj = (x, y, z) => { const y1 = ca * y + sa * z, z1 = -sa * y + ca * z; return [cb * x - sb * z1, y1, sb * x + cb * z1]; };
      const toWorld = (x, y, z) => { const x1 = cb * x + sb * z, z1 = -sb * x + cb * z; return [x1, ca * y - sa * z1, sa * y + ca * z1]; };

      let lt = leaving < 0 ? 0 : Math.min(1, (now - leaving) / 1300);
      const shrink = leaving < 0 ? 1 : Math.max(0, 1 - ease(Math.min(1, lt / 0.45)));
      const R = Math.min(W, H) * 0.24 * (0.96 + Math.sin(t * 0.9) * 0.02) * shrink;
      const cx = W / 2, cy = H * 0.47;

      // background (opaque void, dissolving when leaving)
      const dis = leaving < 0 ? -1 : (lt - 0.32) / 0.68;
      const maxD = Math.hypot(W / 2, H / 2);
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
        cover[i] = 0;
        if (dis < 0) { put(i, VD); continue; }
        const d = Math.hypot(x - cx, y - cy) / maxD;
        put(i, VD, bay(x, y) > dis * 1.35 - d * 0.35 ? 255 : 0);
      }

      // floor shadow — sparse dither ellipse
      if (R > 1) {
        const sy = cy + R * 1.5, srx = R * 0.95, sry = R * 0.16;
        for (let y = Math.floor(sy - sry); y <= sy + sry; y++) for (let x = Math.floor(cx - srx); x <= cx + srx; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const e = ((x - cx) / srx) ** 2 + ((y - sy) / sry) ** 2;
          if (e < 1 && bay(x, y) < (1 - e) * 0.22) put(y * W + x, DIM);
        }
      }

      // orbit (roulette ball track) — dotted, behind pass
      const orx = R * 1.75, ory = R * 0.42, tilt = -0.18;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const ballA = t * 1.35;
      const orbitPt = (a) => { const ex = Math.cos(a) * orx, ey = Math.sin(a) * ory; return [cx + ex * ct - ey * st, cy + ex * st + ey * ct, Math.sin(a)]; };
      if (R > 1) for (let k = 0; k < 220; k += 1) {
        if (k % 4) continue;
        const [x, y] = orbitPt((k / 220) * Math.PI * 2);
        const xi = x | 0, yi = y | 0;
        if (xi >= 0 && yi >= 0 && xi < W && yi < H) put(yi * W + xi, DIM);
      }

      // octahedron — analytic ray / 8 half-spaces, orthographic
      if (R > 1) {
        const ex = 1.6 / R;
        const x0 = Math.max(0, Math.floor(cx - R * 1.05)), x1 = Math.min(W - 1, Math.ceil(cx + R * 1.05));
        const y0 = Math.max(0, Math.floor(cy - R * 1.05)), y1 = Math.min(H - 1, Math.ceil(cy + R * 1.05));
        const d = toObj(0, 0, 1);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const o = toObj((x - cx) / R, (y - cy) / R, -3);
          let tin = -1e9, tout = 1e9, ni = -1, miss = false;
          for (let k = 0; k < 8; k++) {
            const n = N[k];
            const nd = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
            const no = n[0] * o[0] + n[1] * o[1] + n[2] * o[2];
            if (Math.abs(nd) < 1e-6) { if (no > 1) { miss = true; break; } continue; }
            const tt = (1 - no) / nd;
            if (nd < 0) { if (tt > tin) { tin = tt; ni = k; } } else if (tt < tout) tout = tt;
          }
          if (miss || tin > tout || ni < 0) continue;
          const p = [o[0] + d[0] * tin, o[1] + d[1] * tin, o[2] + d[2] * tin];
          const i = y * W + x;
          cover[i] = 1;
          const ax_ = Math.abs(p[0]), ay_ = Math.abs(p[1]), az_ = Math.abs(p[2]);
          if (Math.min(ax_, ay_, az_) < ex) { put(i, (ax_ + ay_ < ex * 3 || ay_ + az_ < ex * 3 || ax_ + az_ < ex * 3) ? GH : GD); continue; }
          const n = N[ni];
          const nw = toWorld(n[0] / 1.732, n[1] / 1.732, n[2] / 1.732);
          let v = Math.max(0, -(nw[0] * L[0] + nw[1] * L[1] + nw[2] * L[2]));
          v = 0.06 + 0.94 * Math.pow(v, 1.3);
          // subtle banding across each facet for depth
          v *= 0.86 + 0.14 * (1 - Math.min(1, (ax_ + ay_ + az_ - Math.max(ax_, ay_, az_)) * 1.1));
          if (bay(x, y) < v) put(i, IV);
          else if (bay(x + 3, y + 5) < v * 0.18) put(i, DIM);
          else put(i, VD);
        }
      }

      // the ball
      if (R > 1) {
        const [bx, by, depth] = orbitPt(ballA);
        const xi = Math.round(bx), yi = Math.round(by);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const X = xi + ox, Y = yi + oy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const i = Y * W + X;
          if (depth < 0 && cover[i]) continue; // behind the diamond
          const edge = Math.abs(ox) + Math.abs(oy) === 2;
          if (edge) continue;
          put(i, ox === 0 && oy === 0 ? GH : GD);
        }
      }

      g.putImageData(img, 0, 0);
      if (leaving >= 0 && lt >= 1) { running = false; onDone && onDone(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      get ready() { return ready; },
      leave(cb) {
        if (leaving >= 0) return;
        leaving = performance.now();
        onDone = () => { removeEventListener("pointermove", onMove); removeEventListener("resize", resize); cb && cb(); };
        gate.classList.add("is-leaving");
      },
    };
  })();

  const enter = (withSound) => {
    if (!Gate || !Gate.ready) return;
    Sound.set(withSound);
    syncSnd();
    if (withSound) { Sound.unlock(); Sound.ding(); }
    store.sset("house-entered", "1");
    document.body.classList.remove("is-locked");
    Gate.leave(() => $("#gate")?.remove());
    setTimeout(() => document.body.classList.add("is-in"), 700);
    setTimeout(() => document.body.classList.add("is-settled"), 2400);
  };
  if (store.sget("house-entered") || !Gate) {
    document.body.classList.remove("is-locked");
    $("#gate")?.remove();
    requestAnimationFrame(() => document.body.classList.add("is-in"));
    setTimeout(() => document.body.classList.add("is-settled"), 1700);
  } else {
    $("#gateEnter").addEventListener("click", () => enter(true));
    $("#gateSilent").addEventListener("click", () => enter(false));
    addEventListener("keydown", (e) => { if (e.key === "Enter" && $("#gate") && Gate.ready && document.activeElement?.id !== "gateSilent") { e.preventDefault(); enter(true); } });
  }

  /* ----------------------------------------------------------
     PIXEL SCENE
     ---------------------------------------------------------- */
  const Scene = (() => {
    const canvas = $("#scene");
    const ctx = canvas.getContext("2d");
    let S = 3, W = 0, H = 0;
    let backdrop, earth, flareWarm, flareCool, lanternSpr, lanternGlow;
    let stars = [], cols = [], lanterns = [];

    const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const P = {
      void: hex("#05070F"), deep: hex("#070B1A"), navy: hex("#0A1633"), navy2: hex("#13244F"), navy3: hex("#1E3A78"),
      blue: hex("#3D7BFF"), ice: hex("#9CC4FF"), white: hex("#E8F0FF"), ember: hex("#FF4E1A"), amber: hex("#FFB23E"),
      red: hex("#C61E2E"), accent: hex("#D9461C"), accentDeep: hex("#8A2A0E"), accentHot: hex("#FFD9C6"), accentSoft: hex("#FF9670"), ivory: hex("#F2E9D8"), land1: hex("#3A2C24"), land2: hex("#7A5C3E"), land3: hex("#B08A5C"), teal: hex("#1F5A5A"),
    };
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

    // value noise
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const smooth = (t) => t * t * (3 - 2 * t);
    function vnoise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      const u = smooth(xf), v = smooth(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s / 0.9375; }

    // seeded rand
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
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
    const pick = (ramp, v, x, y) => ramp[clamp(Math.floor(v * (ramp.length - 1) + bayer(x, y)), 0, ramp.length - 1)];

    function buildBackdrop() {
      const pad = 30, w = W + pad * 2, h = Math.ceil(H * 1.7);
      const ramp = [P.void, P.deep, P.navy, P.navy2, P.navy3, P.blue, P.ice];
      backdrop = paint(w, h, (x, y) => {
        let v = 0.02 + 0.14 * (y / h);
        // nebula band from upper-right
        const nx = x / w, ny = y / H;
        const dl = Math.abs((ny - 0.05) - (nx - 0.55) * 1.4) / 1.72;
        const mask = Math.max(0, 1 - dl / 0.32) * (nx > 0.35 ? 1 : 0.2) * (ny < 1.2 ? 1 : Math.max(0, 1 - (ny - 1.2) * 3));
        if (mask > 0) {
          const n = fbm(x * 0.022, y * 0.03, 5);
          const neb = mask * smooth(clamp((n - 0.38) / 0.4, 0, 1));
          v += neb * 0.72;
        }
        return pick(ramp, clamp(v, 0, 1), x, y);
      });
      backdrop.pad = pad;
      // stars
      seed = 11;
      stars = [];
      const count = Math.floor((w * h) / 900);
      for (let i = 0; i < count; i++) {
        const r = rnd();
        stars.push({
          x: Math.floor(rnd() * w), y: Math.floor(rnd() * h),
          c: r < 0.1 ? P.accentSoft : r < 0.55 ? P.ice : P.white,
          ph: rnd() * Math.PI * 2, sp: 0.4 + rnd() * 1.2,
          big: rnd() < 0.035,
        });
      }
    }

    function buildEarth() {
      const w = W + 40, h = Math.ceil(H * 0.95);
      const R = W * 0.95, cx = w / 2, cy = R + 14;
      const ocean = [P.void, P.navy, P.navy2, P.navy3, P.blue];
      const cloud = [P.navy3, P.blue, P.ice, P.white, P.white];
      const land = [P.land1, P.teal, P.land2, P.land3];
      earth = paint(w, h, (x, y) => {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        const fade = (y - h * 0.45) / (h * 0.55);
        if (fade > 0 && bayer(x, y) < fade * 1.1) return null;
        if (d < R) {
          const u = dx / R, vv = dy / R, z = Math.sqrt(Math.max(0, 1 - u * u - vv * vv));
          const light = clamp(0.5 + 0.35 * z - u * 0.15, 0, 1);
          const sx = u / (z + 0.25), sy = vv / (z + 0.25);
          const cl = fbm(sx * 9 + 3, sy * 14 + 1, 5);
          const ln = fbm(sx * 5 + 40, sy * 8 + 12, 4);
          const rim = R - d;
          if (rim < 1.5) return P.ice;
          if (rim < 3.5 && bayer(x, y) < 0.5) return P.blue;
          if (cl > 0.54) return pick(cloud, clamp((cl - 0.54) / 0.3 * light, 0, 1), x, y);
          if (ln > 0.56) return pick(land, clamp((ln - 0.56) / 0.25 * light, 0, 1), x, y);
          return pick(ocean, clamp(light * 0.75 + cl * 0.2, 0, 1), x, y);
        }
        const a = d - R;
        if (a < 10) {
          const t = 1 - a / 10 + (bayer(x, y) - 0.5) * 0.5;
          if (t > 0.85) return P.ice;
          if (t > 0.6) return P.blue;
          if (t > 0.35) return [...P.navy3, 200];
        }
        return null;
      });
    }

    function buildFlare(core, glow, R) {
      const s = R * 2 + 1;
      return paint(s, s, (x, y) => {
        const d = Math.hypot(x - R, y - R) / R;
        if (d > 1) return null;
        const t = 1 - d + (bayer(x, y) - 0.5) * 0.35;
        if (t > 0.86) return P.white;
        if (t > 0.72) return core;
        if (t > 0.5) return [...glow, 200];
        if (t > 0.28) return [...glow, 90];
        if (t > 0.12 && bayer(x, y) < 0.4) return [...glow, 60];
        return null;
      });
    }

    function buildLanterns() {
      // 11 x 17 paper lantern
      const art = [
        "...#####...",
        "..#######..",
        ".ooaaaaaoo.",
        "oooaayaaooo",
        "ooaayyyaaoo",
        "ooayyyyyaoo",
        "ooayyWyyaoo",
        "ooayyyyyaoo",
        "ooayyyyyaoo",
        "ooaayyyaaoo",
        "oooaayaaooo",
        "rooaaaaaoor",
        ".rrooooorr.",
        "..#######..",
        "...#####...",
        ".....r.....",
        ".....r.....",
      ];
      const map = { "#": hex("#2A0E10"), o: P.accentDeep, a: P.accent, y: hex("#FF9A5E"), W: P.accentHot, r: P.red };
      lanternSpr = paint(11, art.length, (x, y) => { const ch = art[y][x]; return ch === "." ? null : map[ch]; });
      lanternGlow = buildFlare(P.accent, P.accentDeep, 30);
    }

    function makeColumn(cw, th, shades, neon, g) {
      const w = cw + g * 2;
      const N = shades.length, nr = neon;
      const fs = Math.max(4, Math.round(cw / 7));
      return paint(w, th, (x, y) => {
        const lx = x - g;
        if (lx < 0 || lx >= cw) {
          const dd = lx < 0 ? -lx : lx - cw + 1;
          const t = 1 - dd / (g + 1);
          return t * 0.6 > bayer(x, y) ? [...nr, 70] : null;
        }
        // ring band
        if (y < 2) return nr;
        if (y === 2 || y === th - 1) return shades[0];
        const u = lx / Math.max(1, cw - 1);
        let l = Math.max(0, Math.cos((u - 0.36) * Math.PI * 0.95));
        l = 0.05 + l * 0.85;
        if (cw >= 14 && lx > 2 && lx < cw - 3 && lx % fs === 0) l *= 0.4;
        let c = pick(shades, clamp(l, 0, 1), x, y);
        if (lx === 1 || lx === cw - 2) return nr;
        if ((lx === 2 || lx === cw - 3) && bayer(x, y) < 0.55) c = mix(c, nr, 0.45);
        if (y < 6 && bayer(x, y) < (6 - y) / 7) c = mix(c, nr, 0.35);
        if (lx === 0 || lx === cw - 1) c = shades[0];
        return c;
      });
    }

    function buildColumns() {
      const near = [hex("#020309"), hex("#080B16"), hex("#111729"), hex("#1D2640")];
      const mid = [hex("#050811"), hex("#0C1226"), hex("#18213F"), hex("#283862")];
      const far = [hex("#0A1029"), hex("#111B42"), hex("#1A2A5E"), hex("#25397A")];
      const defs = [
        { f: 0.5, w: 0.026, th: 30, shades: far, neon: mix(P.accent, P.navy2, 0.6), g: 2, xs: [0.1, 0.36, 0.64, 0.9] },
        { f: 1.0, w: 0.065, th: 54, shades: mid, neon: mix(P.blue, P.navy2, 0.25), g: 4, xs: [0.2, 0.8] },
        { f: 1.9, w: 0.16, th: 84, shades: near, neon: P.accent, g: 8, xs: [-0.08, 0.92] },
      ];
      if (innerWidth < 700) { defs[0].xs = [0.18, 0.82]; defs[1].xs = []; defs[2].w = 0.12; }
      cols = defs.map((d) => {
        const cw = Math.max(d.f > 1.5 ? 24 : d.f > 0.8 ? 9 : 5, Math.round(W * d.w));
        return { ...d, cw, spr: makeColumn(cw, d.th, d.shades, d.neon, d.g) };
      });
    }

    function buildLanternLayout() {
      lanterns = [
        { x: 0.64, len: 0.14, f: 1.25, ph: 0.0, sc: 2 },
        { x: 0.73, len: 0.24, f: 1.25, ph: 1.3, sc: 2 },
        { x: 0.82, len: 0.34, f: 1.25, ph: 2.1, sc: 2 },
      ];
    }

    function resize() {
      const iw = innerWidth, ih = innerHeight;
      S = iw >= 1700 ? 4 : iw >= 900 ? 3 : 2;
      W = Math.ceil(iw / S);
      H = Math.ceil(ih / S);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = W * S + "px";
      canvas.style.height = H * S + "px";
      ctx.imageSmoothingEnabled = false;
      buildBackdrop();
      buildEarth();
      flareWarm = buildFlare(P.accent, P.accentDeep, Math.round(Math.min(W, H) * 0.12));
      flareCool = buildFlare(P.ice, P.blue, Math.round(Math.min(W, H) * 0.06));
      buildLanterns();
      buildColumns();
      buildLanternLayout();
    }

    function px(x, y, c, a = 1) {
      ctx.fillStyle = a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x | 0, y | 0, 1, 1);
    }
    function rays(x, y, len, c) {
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect((x - len) | 0, y | 0, len * 2 + 1, 1);
      ctx.fillRect(x | 0, (y - len) | 0, 1, len * 2 + 1);
      ctx.fillStyle = `rgba(255,255,255,.9)`;
      ctx.fillRect((x - 1) | 0, (y - 1) | 0, 3, 3);
    }

    function draw() {
      const t = state.t;
      const sl = state.ssy / S;
      const mxo = (state.smx - 0.5), myo = (state.smy - 0.5);
      ctx.fillStyle = "#05070F";
      ctx.fillRect(0, 0, W, H);

      // backdrop + stars
      const bf = 0.06;
      const bx = -backdrop.pad - mxo * W * 0.02;
      const by = -Math.min(sl * bf, backdrop.height - H) - myo * 6;
      ctx.drawImage(backdrop, Math.round(bx), Math.round(by));
      for (const s of stars) {
        const x = s.x + bx, y = s.y + by;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const b = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        if (b < 0.2) continue;
        if (s.big && b > 0.6) rays(x, y, 1 + Math.round(b * 2), s.c);
        else px(x, y, s.c, b > 0.65 ? 1 : 0.45);
      }
      // flares
      const fwx = Math.round(W * 0.13 + bx + backdrop.pad), fwy = Math.round(H * 0.15 + by);
      if (fwy + flareWarm.height > 0) {
        ctx.drawImage(flareWarm, fwx - (flareWarm.width >> 1), fwy - (flareWarm.height >> 1));
        rays(fwx, fwy, Math.round(flareWarm.width * 0.62 + Math.sin(t * 1.3) * 3), P.accent);
      }
      const fcx = Math.round(W * 0.76 + bx + backdrop.pad), fcy = Math.round(H * 0.17 + by);
      if (fcy + flareCool.height > 0) {
        ctx.drawImage(flareCool, fcx - (flareCool.width >> 1), fcy - (flareCool.height >> 1));
        rays(fcx, fcy, Math.round(flareCool.width * 0.9 + Math.sin(t * 2.1) * 2), P.ice);
      }

      // earth (hero only)
      const ey = Math.round(H * 0.7 - sl * 0.55 - myo * 10);
      if (ey < H) ctx.drawImage(earth, Math.round(-20 - mxo * W * 0.035), ey);

      // columns: far, mid
      const drawCols = (L) => {
        const ox = -mxo * W * 0.07 * L.f;
        const oy = -sl * L.f - myo * H * 0.05 * L.f;
        const start = ((oy % L.th) + L.th) % L.th - L.th;
        for (const fx of L.xs) {
          const x = Math.round(fx * W + ox - L.g);
          if (x > W || x + L.spr.width < 0) continue;
          for (let y = start; y < H; y += L.th) ctx.drawImage(L.spr, x, Math.round(y));
        }
      };
      drawCols(cols[0]);
      drawCols(cols[1]);

      // lanterns
      for (const L of lanterns) {
        const top = -sl * L.f - 10;
        const ly = top + 10 + H * L.len;
        if (ly < -40) continue;
        const ax = Math.round(L.x * W - mxo * W * 0.08 * L.f);
        const sw = Math.sin(t * 0.6 + L.ph) * 2 * L.sc;
        const sprW = lanternSpr.width * L.sc, sprH = lanternSpr.height * L.sc;
        const lx = Math.round(ax + sw - sprW / 2);
        // string
        ctx.fillStyle = "#4A1A16";
        const steps = Math.max(1, Math.round(ly - top));
        for (let i = 0; i < steps; i++) ctx.fillRect(Math.round(ax + sw * (i / steps)), Math.round(top + i), 1, 1);
        const flick = 0.85 + Math.sin(t * 9 + L.ph * 3) * 0.05 + Math.sin(t * 23 + L.ph) * 0.04;
        ctx.globalAlpha = flick;
        const gs = L.sc === 2 ? 1 : 0.6;
        const gw = lanternGlow.width * gs;
        ctx.drawImage(lanternGlow, Math.round(lx + sprW / 2 - gw / 2), Math.round(ly + sprH / 2 - gw / 2), Math.round(gw), Math.round(gw));
        ctx.globalAlpha = 1;
        ctx.drawImage(lanternSpr, lx, Math.round(ly), sprW, sprH);
      }

      // push the room back once we leave the lobby
      const dim = clamp((state.ssy - innerHeight * 0.6) / innerHeight, 0, 1) * 0.5;
      if (dim > 0) { ctx.fillStyle = `rgba(5,7,15,${dim.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

      // near columns
      drawCols(cols[2]);
    }

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 140); });
    resize();
    return { draw };
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
      p.top = r.top + scrollY;
      p.h = r.height;
    });
  }
  addEventListener("resize", () => setTimeout(measure, 160));
  addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  measure();

  /* ----------------------------------------------------------
     TABLE — spotlight, dealing, card parallax
     ---------------------------------------------------------- */
  const table = $("#table .felt");
  const spot = $(".spotlight");
  const fullhouse = $(".fullhouse");
  const cards = $$(".card", cardsEl);
  const chips = $$(".chip", table).map((el) => ({ el, d: parseFloat(el.dataset.depth) || 1, r: Math.random() * 360 }));
  const cardDepth = cards.map(() => 0.6 + Math.random() * 0.9);
  let dealt = 0, darkNow = 0.62, sp = { x: innerWidth / 2, y: innerHeight / 2 }, houseUp = false;
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
        fullhouse.classList.remove("is-on");
        void fullhouse.offsetWidth;
        fullhouse.classList.add("is-on");
        Sound.jackpot();
        const h = $("#tableHint .hint-text");
        if (h) h.textContent = "Full house. Every card's on the table.";
      }, 500);
    }
  }
  function reshuffle() {
    cards.forEach((c, i) => setTimeout(() => c.classList.remove("is-dealt"), i * 70));
    dealt = 0;
    houseUp = false;
    Sound.chip(4);
    const h = $("#tableHint .hint-text");
    if (h) h.textContent = useSpot ? "Move your light across the felt to deal the cards." : "Scroll to deal the cards.";
  }
  $("#dealAll").addEventListener("click", () => cards.forEach((c, i) => setTimeout(() => deal(c), i * 110)));
  $("#reshuffle").addEventListener("click", reshuffle);

  cards.forEach((c) => {
    c.addEventListener("click", (e) => { if (!e.target.closest("a")) deal(c); });
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { if (e.target === c) { e.preventDefault(); deal(c); } } });
    c.addEventListener("focusin", () => deal(c));
    if (!noHover) {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--ry", `${u * 18}deg`);
        c.style.setProperty("--rx", `${-v * 18}deg`);
      });
      c.addEventListener("pointerleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); });
    }
  });

  if (!useSpot) {
    if (reduceMotion) cards.forEach((c) => deal(c, true));
    else {
      $("#tableHint .hint-text").textContent = "Scroll to deal the cards.";
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { setTimeout(() => deal(en.target), 120); io.unobserve(en.target); } });
      }, { threshold: 0.6 });
      cards.forEach((c) => io.observe(c));
    }
  }

  function tableFrame(now) {
    const r = table.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const mx = state.smx - 0.5, my = state.smy - 0.5;
    cards.forEach((c, i) => {
      const d = cardDepth[i];
      c.style.setProperty("--px", `${(-mx * 46 * d).toFixed(2)}px`);
      c.style.setProperty("--py", `${(-my * 30 * d).toFixed(2)}px`);
    });
    chips.forEach((ch) => {
      ch.el.style.setProperty("--px", `${(-mx * 60 * ch.d).toFixed(2)}px`);
      ch.el.style.setProperty("--py", `${(-my * 40 * ch.d - (state.sy - (r.top + scrollY)) * 0.04 * ch.d).toFixed(2)}px`);
      ch.el.style.setProperty("--r", `${(ch.r + state.sy * 0.05 * ch.d).toFixed(1)}deg`);
    });
    if (!useSpot) return;

    const inside = state.px >= r.left && state.px <= r.right && state.py >= r.top && state.py <= r.bottom && now - state.lastMove < 3000;
    let tx, ty, k;
    if (inside) { tx = state.px; ty = state.py; k = 0.22; }
    else {
      const visTop = Math.max(r.top, 0), visBot = Math.min(r.bottom, innerHeight);
      const tt = now / 1000;
      tx = r.left + r.width * (0.5 + 0.4 * Math.sin(tt * 0.42));
      ty = visTop + (visBot - visTop) * (0.5 + 0.36 * Math.sin(tt * 0.67 + 1.1));
      k = 0.035;
    }
    sp.x = lerp(sp.x, tx, k);
    sp.y = lerp(sp.y, ty, k);
    const radius = clamp(innerWidth * 0.21, 200, 360);
    spot.style.setProperty("--sx", `${(sp.x - r.left).toFixed(1)}px`);
    spot.style.setProperty("--sy", `${(sp.y - r.top).toFixed(1)}px`);
    spot.style.setProperty("--r", `${radius.toFixed(0)}px`);
    const targetDark = houseUp ? 0.12 : 0.62 - 0.32 * (dealt / Math.max(1, cards.length));
    darkNow = lerp(darkNow, targetDark, 0.04);
    spot.style.setProperty("--dark", darkNow.toFixed(3));

    for (const c of cards) {
      if (c.classList.contains("is-dealt")) continue;
      const cr = c.getBoundingClientRect();
      const dx = cr.left + cr.width / 2 - sp.x, dy = cr.top + cr.height / 2 - sp.y;
      if (Math.hypot(dx, dy) < radius * 0.75) deal(c);
    }
  }

  /* ----------------------------------------------------------
     LOOP
     ---------------------------------------------------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    state.sy = scrollY;
    state.vel = lerp(state.vel, state.sy - state.lastSy, 0.2);
    state.lastSy = state.sy;
    state.ssy = lerp(state.ssy, state.sy, 0.12);
    state.smx = lerp(state.smx, state.mx, 0.07);
    state.smy = lerp(state.smy, state.my, 0.07);

    Scene.draw();

    const vh = innerHeight;
    for (const p of para) {
      const off = (p.top + p.h / 2) - (state.sy + vh / 2);
      p.el.style.transform = `translate3d(0, ${(off * p.speed).toFixed(1)}px, 0)`;
    }
    const mx = state.smx - 0.5, my = state.smy - 0.5;
    for (const m of mouseEls) m.el.style.transform = `translate3d(${(-mx * m.d).toFixed(1)}px, ${(-my * m.d * 0.5).toFixed(1)}px, 0)`;
    if (state.sy < innerHeight * 1.2 && heroW1 && heroW2) {
      heroW1.style.setProperty("--wd1", (150 - state.smx * 45).toFixed(1) + "%");
      heroW2.style.setProperty("--wd2", (56 + state.smx * 24).toFixed(1) + "%");
    }
    const sk = clamp(state.vel * 0.06, -3, 3);
    for (const el of skewEls) el.style.transform = `skewY(${sk.toFixed(2)}deg)`;

    tableFrame(now);

    requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    Scene.draw();
    addEventListener("scroll", () => { state.ssy = scrollY; Scene.draw(); }, { passive: true });
  } else {
    requestAnimationFrame(frame);
  }
})();

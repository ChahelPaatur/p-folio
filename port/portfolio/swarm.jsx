/* === Hero: drone light show ==========================================
   ~2,600 points ("drones") on one canvas. On load they light up as a dot
   picture of San Francisco (Golden Gate in front, downtown behind), then
   lift off and fly up to spell the name. Scrolling re-forms them:
   quadcopter, Gaussian histogram, and back to the skyline. The cursor
   pushes them like wind.
   Helpers (clamp, lerp, onFrame, frame, ...) are globals from motion.jsx.
   ==================================================================== */
const { useEffect: ueS, useRef: urS, useState: usS } = React;

const SW_BONE = [236, 232, 223];
const SW_SIGNAL = [255, 91, 31];

/* Scroll ranges where each formation holds still. Between them, it morphs. */
const SW_STOPS = [[0.0, 0.08], [0.3, 0.4], [0.6, 0.7], [0.9, 1.0]];
const SW_SKY = 3;          // index of the skyline formation
const SW_RISE_AT = 2.3;    // seconds the skyline holds before lifting off
const SW_RISE_LEN = 2.4;   // stagger + flight time for the lift-off

const SW_FORMS = [
  {
    code: "01", name: "CALLSIGN",
    cap: <>I build machines that have to decide things on their own: autonomous drones, fault detection for spacecraft, robots that take orders in plain English.</>
  },
  {
    code: "02", name: "QUAD-X",
    cap: <>I design, wire, tune and fly my own airframes. Orange props mark the nose, the way FPV pilots do it.</>
  },
  {
    code: "03", name: "N(0,1)",
    cap: <>New paper on Gaussian maxima: when the expected max can hit its minimum exactly, and how big the gap is when it can't. <a href="https://arxiv.org/abs/2610.14086" target="_blank" rel="noreferrer" data-lock="ARXIV">arXiv:2610.14086 <window.Arrow size={11} /></a></>
  },
  {
    code: "04", name: "SF BAY",
    cap: <>Back over the bay. The hangar is next.</>
  }
];

/* Hard-edged core with a faint halo, so dots read crisp instead of fuzzy */
function swSprite(rgb, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = size / 2;
  const [R, G, B] = rgb;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.16, `rgba(${R},${G},${B},1)`);
  grd.addColorStop(0.36, `rgba(${R},${G},${B},1)`);
  grd.addColorStop(0.42, `rgba(${R},${G},${B},0.16)`);
  grd.addColorStop(0.7, `rgba(${R},${G},${B},0.04)`);
  grd.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

function swBounce(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

/* Small seeded PRNG so a formation looks identical every time it's built */
function swRng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Spread M visible points across N particle slots. Slots without a point
   park invisibly on their neighbour, so transitions stay spatially tidy. */
function swPack(pts, N, size) {
  const key = (p) => (p.x + (p.r || 0) * Math.cos(p.a0 || 0)) + (p.y + (p.r || 0) * Math.sin(p.a0 || 0)) * 0.18;
  let list = pts.slice().sort((a, b) => key(a) - key(b));
  if (list.length > N) {
    const step = list.length / N;
    const out = [];
    for (let i = 0; i < N; i++) out.push(list[Math.floor(i * step)]);
    list = out;
  }
  const M = list.length;
  const f = {
    cx: new Float32Array(N), cy: new Float32Array(N), r: new Float32Array(N),
    a0: new Float32Array(N), w: new Float32Array(N), al: new Float32Array(N),
    hot: new Float32Array(N), sz: new Float32Array(N), tw: new Float32Array(N), size, count: M
  };
  const slotOf = new Int32Array(N).fill(-1);
  for (let k = 0; k < M; k++) slotOf[Math.min(N - 1, Math.floor((k * N) / M))] = k;
  let lastK = 0;
  for (let i = 0; i < N; i++) {
    const k = slotOf[i];
    const visible = k >= 0;
    const p = list[visible ? k : lastK];
    if (visible) lastK = k;
    f.cx[i] = p.x; f.cy[i] = p.y;
    f.r[i] = p.r || 0; f.a0[i] = p.a0 || 0; f.w[i] = p.w || 0;
    f.al[i] = visible ? (p.al == null ? 1 : p.al) : 0;
    f.hot[i] = visible ? (p.hot || 0) : 0;
    f.sz[i] = p.sz || 1;
    f.tw[i] = visible ? (p.tw || 0) : 0;
  }
  return f;
}

/* Shrink or grow the dot spacing until a builder lands near N points */
function swFit(build, N, s0) {
  let s = s0;
  let pts = build(s);
  for (let k = 0; k < 6; k++) {
    s *= Math.pow(pts.length / (N * 0.95), 0.62);
    pts = build(s);
  }
  return [pts, s];
}

/* --- formations ------------------------------------------------------ */
function swName(W, H, N, mobile) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  const lines = ["CHAHEL", "PAATUR"];
  const setFont = (px) => {
    g.font = `900 ${px}px Archivo, "Arial Black", sans-serif`;
    if ("fontStretch" in g) g.fontStretch = mobile ? "normal" : "expanded";
  };
  setFont(100);
  const wMax = Math.max(...lines.map((l) => g.measureText(l).width));
  let fs = (100 * W * (mobile ? 0.88 : 0.64)) / wMax;
  fs = Math.min(fs, H * (mobile ? 0.2 : 0.27));
  setFont(fs);
  const cap = g.measureText("H").actualBoundingBoxAscent || fs * 0.72;
  const gap = fs * 0.16;
  const top = H * (mobile ? 0.36 : 0.42) - (cap * 2 + gap) / 2;
  const shift = mobile ? 0 : W * 0.06;
  const w1 = g.measureText(lines[0]).width;
  const w2 = g.measureText(lines[1]).width;
  g.fillStyle = "#fff";
  g.fillText(lines[0], W / 2 - w1 / 2 - shift, top + cap);
  g.fillText(lines[1], W / 2 - w2 / 2 + shift, top + cap * 2 + gap);
  const data = g.getImageData(0, 0, W, H).data;
  let filled = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 127) filled++;
  const s = Math.max(3, Math.sqrt((filled * 4) / N));
  const pts = [];
  for (let y = s / 2; y < H; y += s) {
    for (let x = s / 2; x < W; x += s) {
      if (data[((y | 0) * W + (x | 0)) * 4 + 3] > 127) pts.push({ x, y });
    }
  }
  return swPack(pts, N, s);
}

/* San Francisco from the Marin side: Golden Gate in front (orange),
   downtown behind it with Transamerica, Salesforce, Coit and Sutro. */
const SW_CITY = [
  { c: 0.17, w: 0.012, v: 0.47, k: "coit" },
  { c: 0.235, w: 0.022, v: 0.5 }, { c: 0.27, w: 0.018, v: 0.46 },
  { c: 0.315, w: 0.042, v: 0.31, k: "pyramid" },
  { c: 0.36, w: 0.024, v: 0.43 }, { c: 0.395, w: 0.036, v: 0.34 },
  { c: 0.432, w: 0.022, v: 0.41 }, { c: 0.462, w: 0.028, v: 0.45 },
  { c: 0.5, w: 0.036, v: 0.2, k: "salesforce" },
  { c: 0.537, w: 0.02, v: 0.27, k: "spire" },
  { c: 0.567, w: 0.03, v: 0.38 }, { c: 0.6, w: 0.022, v: 0.43 },
  { c: 0.63, w: 0.03, v: 0.4 }, { c: 0.664, w: 0.02, v: 0.48 },
  { c: 0.694, w: 0.028, v: 0.46 }, { c: 0.727, w: 0.018, v: 0.52 },
  { c: 0.757, w: 0.024, v: 0.55 },
  { c: 0.865, w: 0, v: 0.35, k: "sutro" }
];
const SW_HILLS = [
  [0, 0.65], [0.04, 0.6], [0.09, 0.575], [0.13, 0.6], [0.17, 0.56], [0.21, 0.6], [0.27, 0.585],
  [0.35, 0.62], [0.5, 0.635], [0.72, 0.625], [0.8, 0.585], [0.865, 0.545], [0.93, 0.58], [1, 0.645]
];

function swSkyline(W, H, N, mobile) {
  const BH = Math.min(H * (mobile ? 0.6 : 0.62), W * (mobile ? 1.1 : 0.5));
  const y0 = H * (mobile ? 0.86 : 0.92) - BH;
  const X = (u) => u * W;
  const Y = (v) => y0 + v * BH;
  const T1 = mobile ? 0.16 : 0.24, T2 = mobile ? 0.84 : 0.76;
  const cityU = (c) => (mobile ? 0.12 + c * 0.86 : 0.34 + c * 0.64);
  const cityK = mobile ? 0.86 : 0.64;
  const vDeck = 0.7, vWater = 0.84, vCity = 0.66, vCable = 0.03;

  const build = (s) => {
    const rnd = swRng(11);
    const pts = [];
    const seen = new Set();
    const blocks = [];
    const add = (x, y, o) => {
      if (x < -s || x > W + s || y > H + s) return;
      const k = Math.round(x / (s * 0.6)) + ":" + Math.round(y / (s * 0.6));
      if (seen.has(k)) return;
      seen.add(k);
      pts.push(o ? Object.assign({ x, y }, o) : { x, y });
    };
    const hidden = (x, y) => blocks.some((b) => x > b[0] - s * 0.6 && x < b[2] + s * 0.6 && y > b[1] - s && y < b[3]);
    const curve = (fx, fy, t0, t1, o, step) => {
      let px = fx(t0), py = fy(t0), acc = 0;
      add(px, py, o);
      for (let i = 1; i <= 500; i++) {
        const t = t0 + ((t1 - t0) * i) / 500;
        const x = fx(t), y = fy(t);
        acc += Math.hypot(x - px, y - py);
        px = x; py = y;
        if (acc >= step) { acc = 0; add(x, y, o); }
      }
    };
    const HOT = { hot: 1 };

    /* Golden Gate towers: two legs, art-deco setbacks, portal struts */
    const legW = Math.max(s * 1.6, W * 0.0095);
    const gap = Math.max(s * 4, W * 0.024);
    const tops = [];
    [T1, T2].forEach((u) => {
      const cx = X(u);
      const legs = [[cx - gap / 2 - legW, cx - gap / 2], [cx + gap / 2, cx + gap / 2 + legW]];
      legs.forEach(([a, b], li) => {
        for (let y = Y(0); y <= Y(vWater); y += s) {
          const v = (y - y0) / BH;
          const inset = v < 0.2 ? s * 0.8 : v < 0.42 ? s * 0.4 : 0;
          const a2 = li === 0 ? a + inset : a, b2 = li === 0 ? b : b - inset;
          for (let x = a2; x <= b2 + 0.01; x += s) add(x, y, HOT);
        }
        blocks.push([a, Y(0), b, Y(vWater)]);
        for (let y = Y(vWater) + s; y < Y(vWater) + BH * 0.15; y += s * 1.3) {
          const k = (y - Y(vWater)) / (BH * 0.15);
          add((a + b) / 2 + (rnd() - 0.5) * s * 2.4 * k, y, { hot: 1, al: 0.42 * (1 - k) });
        }
      });
      [0.0, 0.13, 0.29, 0.47, 0.6].forEach((v) => {
        for (let r = 0; r < 2; r++) for (let x = cx - gap / 2; x <= cx + gap / 2; x += s) add(x, Y(v) + r * s * 0.9, HOT);
      });
      tops.push(cx);
    });

    /* Cables, suspenders, deck */
    const [c1, c2] = tops;
    const yT = Y(vCable), ySag = Y(0.6), yDk = Y(vDeck);
    const mid = (c1 + c2) / 2, half = (c2 - c1) / 2;
    const cableY = (x) => ySag + (yT - ySag) * Math.pow((x - mid) / half, 2);
    curve((t) => t, cableY, c1, c2, HOT, s * 0.85);
    const sus = Math.max(s * 2.8, W * 0.021);
    for (let x = c1 + sus; x < c2 - sus * 0.5; x += sus) {
      for (let y = cableY(x) + s * 1.2; y < yDk - s * 0.6; y += s * 1.3) add(x, y, { hot: 1, al: 0.5 });
    }
    [[c1, -W * 0.03], [c2, W * 1.03]].forEach(([cx, ex]) => {
      const p1x = (cx + ex) / 2, p1y = Y(0.56), p2y = Y(0.69);
      const bx = (t) => (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * p1x + t * t * ex;
      const by = (t) => (1 - t) * (1 - t) * yT + 2 * (1 - t) * t * p1y + t * t * p2y;
      curve(bx, by, 0, 1, HOT, s * 0.85);
      const dir = ex < cx ? -1 : 1;
      for (let x = cx + dir * sus; dir < 0 ? x > 0 : x < W; x += dir * sus) {
        let t = 0, best = 1e9;
        for (let i = 0; i <= 120; i++) { const d = Math.abs(bx(i / 120) - x); if (d < best) { best = d; t = i / 120; } }
        for (let y = by(t) + s * 1.2; y < yDk - s * 0.6; y += s * 1.3) add(x, y, { hot: 1, al: 0.5 });
      }
    });
    for (let x = 0; x <= W; x += s) {
      add(x, yDk, HOT);
      add(x, yDk + s * 0.9, HOT);
      if (Math.round(x / s) % 2 === 0) add(x, yDk + s * 1.9, { hot: 1, al: 0.55 });
    }

    /* Downtown behind the bridge */
    const hillY = (c) => {
      for (let i = 1; i < SW_HILLS.length; i++) {
        if (c <= SW_HILLS[i][0]) {
          const [ca, va] = SW_HILLS[i - 1], [cb, vb] = SW_HILLS[i];
          const t = (c - ca) / (cb - ca);
          return Y(va + (vb - va) * (0.5 - 0.5 * Math.cos(Math.PI * t)));
        }
      }
      return Y(vCity);
    };
    SW_CITY.forEach((b) => {
      const cx = X(cityU(b.c));
      if (b.k === "sutro") {
        const base = hillY(b.c), top = Y(b.v), spread = W * 0.012 * cityK;
        const at = (t) => base + (top - base) * t;
        curve((t) => cx - spread * (1 - t * 0.85), at, 0, 0.6, { al: 0.85 }, s * 0.9);
        curve((t) => cx + spread * (1 - t * 0.85), at, 0, 0.6, { al: 0.85 }, s * 0.9);
        for (let x = cx - spread; x <= cx + spread; x += s) { add(x, at(0.6), { al: 0.85 }); add(x, at(0.8), { al: 0.85 }); }
        [-spread, 0, spread].forEach((o) => { for (let y = at(0.6); y >= top; y -= s * 0.9) add(cx + o, y, { al: 0.9 }); });
        return;
      }
      const w = Math.max(s * 2, b.w * cityK * W);
      const top = Y(b.v);
      const base = b.k === "coit" ? hillY(b.c) : Y(vCity);
      let row = 0;
      for (let y = top; y <= base; y += s, row++) {
        const t = (y - top) / Math.max(1, base - top);
        let hw = w / 2;
        if (b.k === "pyramid") hw = (w / 2) * Math.min(1, 0.06 + t * 1.02);
        if (b.k === "salesforce" && t < 0.16) hw = (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / 0.16, 2)));
        if (b.k === "coit" && row < 2) hw = w * 0.62;
        const cols = Math.max(1, Math.round((hw * 2) / s));
        for (let j = 0; j <= cols; j++) {
          const x = cx - hw + (j * hw * 2) / cols;
          if (hidden(x, y)) continue;
          const edge = j === 0 || j === cols || row === 0;
          const lit = rnd();
          add(x, y, edge ? { al: 0.95 } : { al: lit < 0.3 ? 0.85 : 0.26, tw: lit < 0.13 ? 0.85 : 0 });
        }
      }
      if (b.k === "pyramid" || b.k === "spire") {
        for (let y = top - s; y > top - BH * 0.06; y -= s * 0.9) if (!hidden(cx, y)) add(cx, y, { al: 0.9 });
      }
    });
    curve((c) => X(cityU(c)), (c) => hillY(c), 0, 1, { al: 0.7 }, s);
    for (let c = 0; c <= 1; c += s / (W * cityK)) {
      const x = X(cityU(c));
      for (let y = hillY(c) + s * 1.5; y < Y(vCity); y += s * 1.2) {
        if (!hidden(x, y) && rnd() < 0.22) add(x, y, { al: 0.22 + rnd() * 0.3, tw: rnd() < 0.2 ? 0.7 : 0 });
      }
    }
    for (let x = X(cityU(0)); x <= X(cityU(1)); x += s) if (!hidden(x, Y(vCity))) add(x, Y(vCity), { al: 0.45 });

    /* Water: sparse streaks under the deck */
    const streaks = Math.round(W / (s * 7));
    for (let i = 0; i < streaks; i++) {
      const y = Y(0.76 + rnd() * 0.24), x0 = rnd() * W, n = 2 + Math.floor(rnd() * 8);
      for (let j = 0; j < n; j++) add(x0 + j * s * 1.15, y, { al: 0.1 + rnd() * 0.18 });
    }
    return pts;
  };

  const [pts, s] = swFit(build, N, Math.max(4, W / 210));
  return swPack(pts, N, s);
}

function swQuad(W, H, N, mobile) {
  const cx = W / 2, cy = H * 0.49;
  const S = Math.min(W * (mobile ? 0.92 : 0.6), H * 0.72);
  const build = (s) => {
    const pts = [];
    const D = S * 0.3;
    const R = S * 0.18;
    const bw = S * 0.2, bh = S * 0.34, rc = s * 2.2;
    const inBody = (x, y) => Math.abs(x - cx) < bw / 2 + s * 0.8 && Math.abs(y - cy) < bh / 2 + s * 0.8;
    const rotors = [[-D, -D, 1], [D, -D, -1], [-D, D, -1], [D, D, 1]];
    rotors.forEach(([ox, oy, dir], k) => {
      const front = oy < 0;
      const rx = cx + ox, ry = cy + oy;
      [R, R - s * 0.95].forEach((rr, j) => {
        const n = Math.max(12, Math.round((2 * Math.PI * rr) / s));
        for (let i = 0; i < n; i++) {
          pts.push({ x: rx, y: ry, r: rr, a0: (i / n) * Math.PI * 2, w: 0.22 * dir, hot: front ? 1 : 0, al: j ? 0.5 : 1 });
        }
      });
      const nb = Math.max(4, Math.round((R * 0.8) / s));
      for (let i = 2; i <= nb; i++) {
        const rr = (i / nb) * R * 0.8;
        pts.push({ x: rx, y: ry, r: rr, a0: k, w: 6.5 * dir, al: 0.9 });
        pts.push({ x: rx, y: ry, r: rr, a0: k + Math.PI, w: 6.5 * dir, al: 0.9 });
      }
      for (let i = 0; i < 6; i++) pts.push({ x: rx, y: ry, r: s * 0.75, a0: i, w: 1.5 * dir, hot: 1 });
      const len = Math.hypot(ox, oy);
      const ux = ox / len, uy = oy / len, nx = -uy, ny = ux;
      const reach = len - R * 0.2;
      const na = Math.round(reach / s);
      for (let i = 1; i < na; i++) {
        const t = (i / na) * reach;
        [0.55, -0.55].forEach((o) => {
          const x = cx + ux * t + nx * o * s, y = cy + uy * t + ny * o * s;
          if (!inBody(x, y)) pts.push({ x, y, al: 0.85 });
        });
      }
    });
    for (let y = -bh / 2; y <= bh / 2; y += s) {
      for (let x = -bw / 2; x <= bw / 2; x += s) {
        const ex = Math.max(0, Math.abs(x) - (bw / 2 - rc));
        const ey = Math.max(0, Math.abs(y) - (bh / 2 - rc));
        if (ex * ex + ey * ey > rc * rc) continue;
        pts.push({ x: cx + x, y: cy + y, al: 0.95 });
      }
    }
    const tipY = cy - bh / 2 - s * 5;
    pts.push({ x: cx, y: tipY, hot: 1 });
    for (let i = 1; i < 5; i++) {
      pts.push({ x: cx - i * s * 0.8, y: tipY + i * s * 0.8, hot: 1 });
      pts.push({ x: cx + i * s * 0.8, y: tipY + i * s * 0.8, hot: 1 });
    }
    return pts;
  };
  const [pts, s] = swFit(build, N, Math.max(4, S / 60));
  return swPack(pts, N, s);
}

function swGauss(W, H, N, mobile) {
  const Wg = Math.min(W * (mobile ? 0.9 : 0.68), 1100);
  const Hm = Math.min(H * (mobile ? 0.34 : 0.44), 420);
  const base = H * (mobile ? 0.66 : 0.72);
  const zMax = 3.3;
  const s = Math.max(3.2, Math.sqrt((Wg * Hm * 0.38) / (N * 0.94)));
  const cols = Math.floor(Wg / s);
  const x0 = W / 2 - ((cols - 1) * s) / 2;
  const pts = [];
  for (let k = 0; k < cols; k++) {
    const z = ((k / (cols - 1)) * 2 - 1) * zMax;
    const h = Math.round((Hm / s) * Math.exp((-z * z) / 2));
    for (let j = 0; j < h; j++) pts.push({ x: x0 + k * s, y: base - j * s, hot: z > 2.1 ? 1 : 0 });
  }
  for (let k = -2; k < cols + 2; k += 2) pts.push({ x: x0 + k * s, y: base + s * 2.4, al: 0.4, sz: 0.7 });
  return swPack(pts, N, s);
}

/* --- component ------------------------------------------------------- */
function Hero() {
  const secRef = urS(null);
  const cvsRef = urS(null);
  const markRef = urS(null);
  const [form, setForm] = usS(0);
  const [units, setUnits] = usS(0);
  const [intro, setIntro] = usS(!reduceMotion);

  ueS(() => {
    const sec = secRef.current;
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const sprBone = swSprite(SW_BONE);
    const sprHot = swSprite(SW_SIGNAL);
    const st = {
      W: 0, H: 0, dpr: 1, N: 0, forms: [], shown: -1, t0: 0, built: false,
      introDone: reduceMotion, introFlag: !reduceMotion, riseAt: SW_RISE_AT, visible: true, stirred: 0
    };
    let OX, OY, VX, VY, PH, LIFT, SWAY, L0, D0, DEL, stars = [];

    const build = () => {
      const W = cvs.clientWidth, H = cvs.clientHeight;
      if (!W || !H) return;
      const mobile = W < 760 || W / H < 0.78;   // phones and portrait tablets get the stacked layout
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      const N = W < 760 ? 1400 : W < 1200 ? 1900 : 2600;
      Object.assign(st, { W, H, dpr, N });
      st.forms = [swName(W, H, N, mobile), swQuad(W, H, N, mobile), swGauss(W, H, N, mobile), swSkyline(W, H, N, mobile)];
      if (!OX || OX.length !== N) {
        OX = new Float32Array(N); OY = new Float32Array(N); VX = new Float32Array(N); VY = new Float32Array(N);
        PH = new Float32Array(N); LIFT = new Float32Array(N); SWAY = new Float32Array(N);
        L0 = new Float32Array(N); D0 = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          PH[i] = Math.random() * Math.PI * 2;
          SWAY[i] = (Math.random() - 0.5) * 80;
        }
      }
      // City lights come on left to right; lift-off ripples out with some randomness
      const S = st.forms[SW_SKY];
      for (let i = 0; i < N; i++) {
        L0[i] = (S.cx[i] / W) * 0.8 + Math.random() * 0.3;
        D0[i] = Math.random() * 0.55 + (S.cx[i] / W) * 0.3 + (1 - S.cy[i] / H) * 0.15;
        LIFT[i] = (40 + (PH[i] / 6.283) * 170) * (H / 900);
      }
      DEL = st.forms.map((f) => {
        const d = new Float32Array(N);
        for (let i = 0; i < N; i++) d[i] = clamp((f.cx[i] / W) * 0.72 + ((PH[i] * 7.13) % 1) * 0.28);
        return d;
      });
      stars = Array.from({ length: mobile ? 70 : 150 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.5, a: 0.05 + Math.random() * 0.2, p: Math.random() * 6 }));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0b0c0e";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      if (!st.built) { st.built = true; st.t0 = performance.now(); }
      st.shown = -1;
    };

    let lastW = 0, lastH = 0, rto;
    const onResize = () => {
      clearTimeout(rto);
      rto = setTimeout(() => {
        const W = cvs.clientWidth, H = cvs.clientHeight;
        // Phones: ignore the address bar sliding in/out. Desktop: redraw on any change.
        const tolerance = window.matchMedia("(pointer: coarse)").matches ? 140 : 0;
        if (W === lastW && Math.abs(H - lastH) <= tolerance) return;
        lastW = W; lastH = H;
        build();
      }, 120);
    };

    const fontReady = Promise.race([
      document.fonts ? document.fonts.load('900 100px "Archivo"') : Promise.resolve(),
      new Promise((r) => setTimeout(r, 2500))
    ]);
    let alive = true;
    fontReady.then(() => {
      if (!alive) return;
      lastW = cvs.clientWidth; lastH = cvs.clientHeight;
      build();
      window.addEventListener("resize", onResize);
    });

    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }, { rootMargin: "60px" });
    io.observe(sec);

    const segment = (p) => {
      for (let k = 0; k < SW_STOPS.length; k++) {
        if (p <= SW_STOPS[k][1]) {
          if (k === 0 || p >= SW_STOPS[k][0]) return [k, k, 0];
          return [k - 1, k, (p - SW_STOPS[k - 1][1]) / (SW_STOPS[k][0] - SW_STOPS[k - 1][1])];
        }
      }
      return [3, 3, 0];
    };
    const twinkle = (f, i, t) => (f.tw[i] ? 1 - f.tw[i] * (0.5 + 0.5 * Math.sin(t * 1.9 + PH[i] * 5)) : 1);

    const off = onFrame((f, dt) => {
      if (!st.visible || !st.forms.length) return;
      const { W, H, N, dpr, forms } = st;
      const t = f.t / 1000;
      const sr = sec.getBoundingClientRect();
      const p = clamp(-sr.top / Math.max(1, sr.height - window.innerHeight));
      const [ia, ib, m] = segment(p);

      const introT = st.introDone ? 99 : (f.t - st.t0) / 1000;
      if (!st.introDone && f.y > 4 && introT < st.riseAt) st.riseAt = introT;   // scrolling skips the hold
      const introEnd = st.riseAt + SW_RISE_LEN;
      if (introT > introEnd) st.introDone = true;
      const holding = !st.introDone && introT < st.riseAt + 0.5;
      if (holding !== st.introFlag) { st.introFlag = holding; setIntro(holding); }

      const shown = holding ? SW_SKY : m < 0.5 ? ia : ib;
      if (shown !== st.shown) { st.shown = shown; setForm(holding ? 0 : shown); setUnits(forms[shown].count); }
      if (markRef.current) markRef.current.style.top = (p * 100).toFixed(2) + "%";

      const cr = cvs.getBoundingClientRect();
      const mx = frame.mx - cr.left, my = frame.my - cr.top;
      const A = forms[ia], B = forms[ib], DB = DEL[ib], S = forms[SW_SKY];
      const k60 = Math.min(2, dt / 16.67);
      const RW = W < 760 ? 70 : 120, RW2 = RW * RW;

      // Trails only while things are moving, so resting dots stay sharp
      const moving = !st.introDone || m > 0 || st.stirred > 0.4;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = moving && !reduceMotion ? "rgba(11,12,14,0.5)" : "#0b0c0e";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ece8df";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t * 0.8 + s.p));
        ctx.fillRect(s.x, s.y, 1, 1);
      }
      ctx.globalCompositeOperation = "lighter";

      let stir = 0;
      for (let i = 0; i < N; i++) {
        let r0 = A.r[i];
        const ax = r0 ? A.cx[i] + r0 * Math.cos(A.a0[i] + A.w[i] * t) : A.cx[i];
        const ay = r0 ? A.cy[i] + r0 * Math.sin(A.a0[i] + A.w[i] * t) : A.cy[i];
        let x = ax, y = ay, al = A.al[i] * twinkle(A, i, t), hot = A.hot[i], sz = A.sz[i] * A.size;
        if (m > 0) {
          const u = clamp((m - DB[i] * 0.45) / 0.55);
          if (u > 0) {
            r0 = B.r[i];
            const bx = r0 ? B.cx[i] + r0 * Math.cos(B.a0[i] + B.w[i] * t) : B.cx[i];
            const by = r0 ? B.cy[i] + r0 * Math.sin(B.a0[i] + B.w[i] * t) : B.cy[i];
            const e = easeInOut(u);
            if (ib === 2) {
              x = ax + (bx - ax) * easeOut(clamp(u * 1.6));
              y = ay + (by - ay) * swBounce(u);
            } else {
              const arc = Math.sin(Math.PI * e);
              x = ax + (bx - ax) * e + arc * SWAY[i];
              y = ay + (by - ay) * e - arc * LIFT[i];
            }
            al += (B.al[i] * twinkle(B, i, t) - al) * e;
            hot += (B.hot[i] - hot) * e;
            sz += (B.sz[i] * B.size - sz) * e;
            sz *= 1 + 0.45 * Math.sin(Math.PI * u);
          }
        }
        if (introT < introEnd) {
          // Skyline lights up, holds, then every dot lifts off toward the current formation
          const sx = S.cx[i], sy = S.cy[i];
          const sAl = S.al[i] * twinkle(S, i, t) * clamp((introT - L0[i]) / 0.35);
          const sSz = S.sz[i] * S.size;
          const u = clamp((introT - st.riseAt - D0[i]) / 1.4);
          if (u <= 0) {
            x = sx; y = sy; al = sAl; hot = S.hot[i]; sz = sSz;
          } else {
            const e = easeInOut(u);
            const arc = Math.sin(Math.PI * e);
            x = sx + (x - sx) * e + arc * SWAY[i] * 0.5;
            y = sy + (y - sy) * e - arc * LIFT[i];
            al = sAl + (al - sAl) * e;
            hot = S.hot[i] + (hot - S.hot[i]) * e;
            sz = (sSz + (sz - sSz) * e) * (1 + 0.5 * arc);
          }
        }
        if (!reduceMotion && st.introDone) {
          x += Math.sin(t * 1.5 + PH[i]) * 0.35;
          y += Math.cos(t * 1.2 + PH[i] * 1.3) * 0.35;
        }
        let ox = OX[i], oy = OY[i], vx = VX[i], vy = VY[i];
        const dx = x + ox - mx, dy = y + oy - my, d2 = dx * dx + dy * dy;
        if (d2 < RW2) {
          const d = Math.sqrt(d2) + 0.01;
          const q = 1 - d / RW;
          const force = q * q * 3.4 * k60;
          vx += (dx / d) * force;
          vy += (dy / d) * force;
        }
        vx = (vx - ox * 0.045 * k60) * 0.86;
        vy = (vy - oy * 0.045 * k60) * 0.86;
        ox += vx * k60; oy += vy * k60;
        OX[i] = ox; OY[i] = oy; VX[i] = vx; VY[i] = vy;
        const mag = Math.abs(vx) + Math.abs(vy);
        if (mag > stir) stir = mag;
        x += ox; y += oy;
        if (al < 0.01) continue;
        const rad = sz * 0.9;
        if (hot < 0.99) {
          ctx.globalAlpha = al * (1 - hot);
          ctx.drawImage(sprBone, x - rad, y - rad, rad * 2, rad * 2);
        }
        if (hot > 0.01) {
          ctx.globalAlpha = al * hot;
          ctx.drawImage(sprHot, x - rad, y - rad, rad * 2, rad * 2);
        }
      }
      st.stirred = stir;
      ctx.globalAlpha = 1;
    });

    return () => {
      alive = false;
      off();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const jump = (k) => {
    const sec = secRef.current;
    const span = sec.offsetHeight - window.innerHeight;
    const mid = (SW_STOPS[k][0] + SW_STOPS[k][1]) / 2;
    const y = sec.offsetTop + span * mid;
    if (frame.lenis) frame.lenis.scrollTo(y, { duration: 1.8 });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const label = intro ? { code: "00", name: "SF BAY" } : SW_FORMS[form];

  return (
    <section className="hero" id="top" ref={secRef} data-tone="dark" data-name="CALLSIGN">
      <div className="hero-pin">
        <canvas ref={cvsRef} className="hero-canvas" aria-hidden="true" />
        <h1 className="sr-only">Chahel Paatur</h1>

        <div className="hud hud-tl">
          <div className="hud-k">FORMATION <span className="dot">{label.code}</span> / 04</div>
          <div className="hud-form">{label.name}</div>
        </div>

        <div className="hud hud-tr">
          <div><span className="dot">{units.toLocaleString("en-US")}</span> UNITS LIT</div>
          <div className="hud-link">LINK <i /><i /><i /><i /> OK</div>
          <div className="hud-dim">{intro || form === 3 ? "37.8199°N 122.4783°W" : "40.1164°N 88.2434°W"}</div>
        </div>

        <div className="hud hud-bl">
          {SW_FORMS.map((f, i) => (
            <p key={i} className={"hud-cap" + (i === form ? " on" : "")} aria-hidden={i !== form}>{f.cap}</p>
          ))}
        </div>

        <div className="hud hud-br">
          <div className="alt">
            <div className="alt-mark" ref={markRef} />
            {SW_FORMS.map((f, i) => (
              <button key={i} className={"alt-stop" + (i === form && !intro ? " on" : "")}
                style={{ top: ((SW_STOPS[i][0] + SW_STOPS[i][1]) / 2) * 100 + "%" }}
                onClick={() => jump(i)} data-lock={f.name} aria-label={"Formation " + f.code}>
                {f.code}
              </button>
            ))}
          </div>
          <div className="alt-hint">SCROLL<br />TO RE&#8209;FORM</div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero });

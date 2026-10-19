/* === Motion core ====================================================
   One rAF loop drives everything (smooth scroll, swarm, scrubbed type,
   the lock-on cursor). Components subscribe with onFrame(cb).
   ==================================================================== */
const { useEffect: ueM, useRef: urM, useState: usM } = React;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* --- frame loop ------------------------------------------------------ */
const frame = { subs: new Set(), y: 0, vy: 0, t: 0, lenis: null, mx: -9999, my: -9999 };
function onFrame(cb) { frame.subs.add(cb); return () => frame.subs.delete(cb); }

/* The hero intro plays from the top, so don't let reloads restore a scroll position */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) window.scrollTo(0, 0);

if (!reduceMotion && window.Lenis) {
  frame.lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
}

(function loop() {
  let last = performance.now();
  let lastY = window.scrollY;
  function tick(now) {
    const dt = Math.min(64, now - last);
    last = now;
    if (frame.lenis) frame.lenis.raf(now);
    const y = window.scrollY;
    frame.vy = lerp(frame.vy, (y - lastY) / Math.max(1, dt) * 16.67, 0.2);
    lastY = y;
    frame.y = y;
    frame.t = now;
    frame.subs.forEach((cb) => cb(frame, dt));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

window.addEventListener("pointermove", (e) => { frame.mx = e.clientX; frame.my = e.clientY; }, { passive: true });

function scrollToId(id) {
  const el = id === "top" ? 0 : document.getElementById(id);
  if (el === null) return;
  if (frame.lenis) frame.lenis.scrollTo(el, { duration: 1.6 });
  else if (el === 0) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}

/* --- hooks ----------------------------------------------------------- */
function useInView(opts = {}) {
  const { threshold = 0.2, once = true, margin = "0px" } = opts;
  const ref = urM(null);
  const [inView, setInView] = usM(false);
  ueM(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect(); }
      else if (!once) setInView(false);
    }, { threshold, rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once, margin]);
  return [ref, inView];
}

/* Runs cb on every frame, but only while the element is near the viewport. */
function useFrameWhileVisible(ref, cb, margin = "20% 0px") {
  const cbRef = urM(cb);
  cbRef.current = cb;
  ueM(() => {
    const el = ref.current;
    if (!el) return;
    let off = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !off) off = onFrame((f, dt) => cbRef.current(f, dt));
      else if (!e.isIntersecting && off) { off(); off = null; }
    }, { rootMargin: margin });
    io.observe(el);
    return () => { io.disconnect(); if (off) off(); };
  }, []);
}

/* 0 when the element's top hits the bottom of the viewport, 1 when its
   top reaches `end` (fraction of viewport height). */
function viewProgress(el, end = 0.25) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp((vh - r.top) / (vh * (1 - end)));
}

/* --- StretchTitle ----------------------------------------------------
   Archivo is variable on width (62..125) and weight. Each letter starts
   condensed and thin, then stretches out as the title scrolls into view. */
function StretchTitle({ text, className = "", as = "h2", from = 62, to = 125, wFrom = 200, wTo = 860 }) {
  const ref = urM(null);
  const lettersRef = urM(null);
  const last = urM(-1);
  useFrameWhileVisible(ref, () => {
    const el = ref.current;
    if (!lettersRef.current) lettersRef.current = el.querySelectorAll(".l");
    const p = reduceMotion ? 1 : viewProgress(el, 0.35);
    if (Math.abs(p - last.current) < 0.002) return;
    last.current = p;
    const spans = lettersRef.current;
    const n = spans.length;
    for (let i = 0; i < n; i++) {
      const local = easeInOut(clamp(p * 1.7 - (i / n) * 0.7));
      spans[i].style.fontVariationSettings = `"wdth" ${lerp(from, to, local).toFixed(1)}, "wght" ${lerp(wFrom, wTo, local).toFixed(0)}`;
    }
  });
  const Tag = as;
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={`stretch ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <React.Fragment key={wi}>
          <span className="w" aria-hidden="true">
            {w.split("").map((c, i) => <span key={i} className="l">{c}</span>)}
          </span>
          {wi < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/* --- DotCounter ------------------------------------------------------
   Doto is a dot-matrix face whose weight axis swells the dots. Digits
   power on from hairline dots to full weight while counting up. */
function DotCounter({ to, pad = 2, suffix = "", duration = 1400 }) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  const [val, setVal] = usM(0);
  const [w, setW] = usM(100);
  ueM(() => {
    if (!inView) return;
    if (reduceMotion) { setVal(to); setW(800); return; }
    const t0 = performance.now();
    const off = onFrame((f) => {
      const t = clamp((f.t - t0) / duration);
      setVal(Math.round(easeOut(t) * to));
      setW(Math.round(lerp(100, 800, easeOut(clamp(t * 1.3)))));
      if (t >= 1) off();
    });
    return off;
  }, [inView, to, duration]);
  return (
    <span ref={ref} className="dotnum" style={{ fontVariationSettings: `"wght" ${w}` }}>
      {String(val).padStart(pad, "0")}{suffix}
    </span>
  );
}

/* --- ScrubWords: words brighten as the paragraph scrolls past ------- */
function ScrubWords({ text, className = "" }) {
  const ref = urM(null);
  const words = text.split(" ");
  useFrameWhileVisible(ref, () => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = reduceMotion ? 1 : clamp((vh * 0.82 - r.top) / (r.height + vh * 0.2));
    const spans = el.children;
    const n = spans.length;
    for (let i = 0; i < n; i++) {
      const o = clamp(p * n * 1.15 - i, 0, 1);
      const v = (0.16 + 0.84 * o).toFixed(2);
      if (spans[i].dataset.o !== v) { spans[i].dataset.o = v; spans[i].style.opacity = v; }
    }
  });
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => <span key={i}>{w}{i < words.length - 1 ? " " : ""}</span>)}
    </p>
  );
}

/* --- WaveText: letters ripple like a carrier wave on hover ---------- */
function WaveText({ text }) {
  return (
    <span className="wave" aria-label={text}>
      {text.split("").map((c, i) => (
        <span key={i} aria-hidden="true" style={{ "--i": i }}>{c === " " ? " " : c}</span>
      ))}
    </span>
  );
}

/* --- LockCursor ------------------------------------------------------
   A small reticle that follows the pointer. Over anything clickable the
   four brackets fly out and lock onto that element's box. */
function LockCursor() {
  const boxRef = urM(null);
  const dotRef = urM(null);
  const tagRef = urM(null);
  ueM(() => {
    if (!finePointer) return;
    document.documentElement.classList.add("has-cursor");
    const s = { x: innerWidth / 2, y: innerHeight / 2, w: 22, h: 22, dx: 0, dy: 0, target: null, label: "" };
    const sel = "a, button, [data-lock]";
    const over = (e) => {
      const t = e.target.closest && e.target.closest(sel);
      s.target = t || null;
      const label = t ? (t.getAttribute("data-lock") || (t.tagName === "A" ? "OPEN" : "SELECT")) : "";
      if (label !== s.label) { s.label = label; tagRef.current.textContent = label; }
    };
    const leaveDoc = () => { s.target = null; frame.mx = -9999; };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerleave", leaveDoc);
    const off = onFrame(() => {
      const mx = frame.mx, my = frame.my;
      let tx, ty, tw, th;
      if (s.target && s.target.isConnected) {
        const r = s.target.getBoundingClientRect();
        const pad = 6;
        tx = r.left - pad; ty = r.top - pad; tw = r.width + pad * 2; th = r.height + pad * 2;
        if (tw > innerWidth * 0.7 || th > innerHeight * 0.7) { tx = mx - 18; ty = my - 18; tw = 36; th = 36; }
      } else { tx = mx - 11; ty = my - 11; tw = 22; th = 22; }
      const k = reduceMotion ? 1 : 0.24;
      s.x = lerp(s.x, tx, k); s.y = lerp(s.y, ty, k);
      s.w = lerp(s.w, tw, k); s.h = lerp(s.h, th, k);
      s.dx = lerp(s.dx, mx, 0.5); s.dy = lerp(s.dy, my, 0.5);
      const box = boxRef.current, dot = dotRef.current;
      box.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      box.style.width = s.w + "px";
      box.style.height = s.h + "px";
      box.classList.toggle("locked", !!s.target);
      dot.style.transform = `translate3d(${s.dx - 2}px, ${s.dy - 2}px, 0)`;
    });
    return () => {
      off();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leaveDoc);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);
  if (!finePointer) return null;
  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor-box" ref={boxRef}>
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        <span className="cursor-tag" ref={tagRef} />
      </div>
      <div className="cursor-dot" ref={dotRef} />
    </div>
  );
}

/* --- TelemetryTape ---------------------------------------------------
   Scrolling readout strip. Drifts on its own, speeds up with scroll
   velocity and runs backwards when you scroll up. */
function TelemetryTape({ items }) {
  const ref = urM(null);
  const trackRef = urM(null);
  const st = urM({ x: 0, dir: 1 });
  useFrameWhileVisible(ref, (f, dt) => {
    const track = trackRef.current;
    const half = track.scrollWidth / 2;
    if (!half) return;
    if (Math.abs(f.vy) > 0.5) st.current.dir = f.vy > 0 ? 1 : -1;
    const speed = reduceMotion ? 0 : (0.05 + Math.min(2.4, Math.abs(f.vy) * 0.05)) * st.current.dir;
    st.current.x -= speed * dt;
    if (st.current.x <= -half) st.current.x += half;
    if (st.current.x > 0) st.current.x -= half;
    track.style.transform = `translate3d(${st.current.x}px,0,0)`;
  });
  const row = (k) => items.map((it, i) => (
    <span className="tape-item" key={k + i}>
      <span className="tape-k">{it.k}</span>
      <span className="tape-v">{it.v}</span>
      <i className="tape-sep" />
    </span>
  ));
  return (
    <div className="tape" ref={ref} aria-hidden="true">
      <div className="tape-track" ref={trackRef}>{row("a")}{row("b")}</div>
    </div>
  );
}

function useClock(tz = "America/Los_Angeles") {
  const [t, setT] = usM("");
  ueM(() => {
    const tick = () => {
      try { setT(new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })); }
      catch (e) { setT(""); }
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [tz]);
  return t;
}

function Arrow({ size = 14 }) {
  return (
    <svg className="arrow" viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12 L12 4 M5.5 4 H12 V10.5" />
    </svg>
  );
}

Object.assign(window, {
  reduceMotion, finePointer, clamp, lerp, easeInOut, easeOut,
  frame, onFrame, scrollToId,
  useInView, useFrameWhileVisible, viewProgress, useClock,
  StretchTitle, DotCounter, ScrubWords, WaveText, LockCursor, TelemetryTape, Arrow
});

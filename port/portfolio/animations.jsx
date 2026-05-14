/* === Animation helpers ============================================= */
const _a = React;

/* Letters — split text into per-character spans for stagger animations */
function Letters({ text, delay = 0, step = 40, className = "letter" }) {
  const arr = text.split("");
  return arr.map((c, i) => (
    _a.createElement("span", {
      key: i,
      className,
      style: { animationDelay: `${delay + i * step}ms` },
    }, c === " " ? "\u00A0" : c)
  ));
}

/* useReveal — adds .in class when element enters viewport */
function useInView(threshold = 0.2) {
  const ref = _a.useRef(null);
  const [inView, setInView] = _a.useState(false);
  _a.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      });
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* Scramble — cycles random chars per position then resolves left-to-right */
function Scramble({ text, charset = "#$%&*+=-_/<>[]{}|", duration = 900, className = "" }) {
  const [ref, inView] = useInView(0.4);
  const [display, setDisplay] = _a.useState(text);
  const startedRef = _a.useRef(false);

  _a.useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const total = duration;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / total);
      const revealed = Math.floor(t * text.length);
      const out = text.split("").map((c, i) => {
        if (c === " ") return " ";
        if (i < revealed) return c;
        return charset[Math.floor(Math.random() * charset.length)];
      }).join("");
      setDisplay(out);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, text, charset, duration]);

  return _a.createElement("span", { ref, className }, display);
}

/* Counter — animates 0 → target when entering viewport */
function Counter({ to, duration = 1200, suffix = "", className = "" }) {
  const [ref, inView] = useInView(0.4);
  const [val, setVal] = _a.useState(0);
  const startedRef = _a.useRef(false);

  _a.useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const e = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(e * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  const padded = String(val).padStart(String(to).length, "0");
  return _a.createElement("span", { ref, className }, padded + suffix);
}

/* useScrollProgress — 0..1 over `range` px from document top */
function useScrollProgress(range = 700) {
  const [p, setP] = _a.useState(0);
  _a.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setP(Math.max(0, Math.min(1, y / range)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [range]);
  return p;
}

Object.assign(window, { Letters, Scramble, Counter, useScrollProgress, useInView });

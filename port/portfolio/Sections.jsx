/* ============================================================
   Sections: Nav, Tape, Hangar (projects), Numbers, Papers,
   Logbook, About, Contact.
   Helpers (clamp, lerp, onFrame, frame, StretchTitle, ...) are
   globals from motion.jsx.
   ============================================================ */
const { useState: usX, useEffect: ueX, useRef: urX } = React;

const ARXIV_ID = "2610.14086";

/* === Nav ============================================================ */
const NAV_LINKS = [
  { id: "work", label: "Hangar", key: "1" },
  { id: "papers", label: "Papers", key: "2" },
  { id: "log", label: "Logbook", key: "3" },
  { id: "about", label: "Operator", key: "4" },
  { id: "contact", label: "Contact", key: "5" }
];

function goTo(id) {
  return (e) => { e.preventDefault(); scrollToId(id); };
}

function Nav() {
  const [where, setWhere] = usX({ idx: "00", name: "CALLSIGN", tone: "dark" });
  const altRef = urX(null);
  const clock = useClock();

  ueX(() => {
    const sections = Array.from(document.querySelectorAll("[data-tone]"));
    let lastKey = "";
    const off = onFrame((f) => {
      let cur = null;
      for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= 24 && r.bottom > 24) { cur = sections[i]; break; }
      }
      const key = cur ? cur.dataset.idx + cur.dataset.tone : lastKey;
      if (cur && key !== lastKey) {
        lastKey = key;
        setWhere({ idx: cur.dataset.idx || "00", name: cur.dataset.name || "", tone: cur.dataset.tone });
      }
      if (altRef.current) altRef.current.textContent = String(Math.round(f.y / 10)).padStart(5, "0");
    });
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "0") scrollToId("top");
      const l = NAV_LINKS.find((x) => x.key === e.key);
      if (l) scrollToId(l.id);
    };
    window.addEventListener("keydown", onKey);
    return () => { off(); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <header className={"nav tone-" + where.tone}>
      <a className="nav-mark" href="#top" onClick={goTo("top")} data-lock="TOP">
        <span className="nav-cp">CP</span>
        <span className="nav-name">Chahel Paatur</span>
      </a>
      <div className="nav-read" aria-live="polite">
        <span className="dot">{where.idx}</span>
        <span>{where.name}</span>
      </div>
      <div className="nav-tele">
        <span>ALT <b ref={altRef}>00000</b> M</span>
        <span>{clock} PT</span>
      </div>
      <nav className="nav-links" aria-label="Sections">
        {NAV_LINKS.map((l) => (
          <a key={l.id} href={"#" + l.id} onClick={goTo(l.id)} data-lock={"KEY " + l.key}>
            <kbd>{l.key}</kbd>{l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

/* === Telemetry tape ================================================= */
const TAPE = [
  { k: "POS", v: "37.7397°N 121.4252°W" },
  { k: "ALT", v: "052 M AGL" },
  { k: "VBAT", v: "16.4 V" },
  { k: "RSSI", v: "−61 dBm" },
  { k: "MODE", v: "AUTO" },
  { k: "AETHER", v: "v0.4 RUNTIME" },
  { k: "FDIR", v: "100+ FAULT MODES" },
  { k: "PREPRINT", v: "arXiv:" + ARXIV_ID },
  { k: "SAURON", v: "2ND OVERALL" },
  { k: "PII", v: "1,000+ RESEARCHERS" },
  { k: "GAUSSIAN", v: "200+ DOWNLOADS" }
];

function Tape() {
  return <window.TelemetryTape items={TAPE} />;
}

/* === Hangar visuals ================================================= */

/* AETHER: one sentence in, a plan for a specific body out */
const AETHER_RUNS = [
  { say: "fly to the orange marker and hold at two meters", body: "DRONE",
    plan: ["arm()", "takeoff(alt=1.0)", "goto(find('marker', color='orange'))", "hold(alt=2.0)"] },
  { say: "pick up the screwdriver and hand it to me", body: "HUMANOID",
    plan: ["locate('screwdriver')", "reach(grasp_pose)", "grip(force=0.6)", "handover(to='user')"] },
  { say: "map the hallway, then come back", body: "ROVER",
    plan: ["explore(region='hallway')", "slam.save('hallway')", "return_home()"] }
];

function AetherPipe() {
  const [ref, inView] = useInView({ threshold: 0.3, once: false });
  const [st, setSt] = usX({ run: 0, chars: 0, lines: 0, parsed: false });
  ueX(() => {
    if (!inView) return;
    let alive = true, tm;
    const run = AETHER_RUNS[st.run];
    const next = (fn, ms) => { tm = setTimeout(() => alive && fn(), reduceMotion ? 0 : ms); };
    if (st.chars < run.say.length) next(() => setSt((s) => ({ ...s, chars: s.chars + 1 })), 30);
    else if (!st.parsed) next(() => setSt((s) => ({ ...s, parsed: true })), 420);
    else if (st.lines < run.plan.length) next(() => setSt((s) => ({ ...s, lines: s.lines + 1 })), 380);
    else next(() => setSt((s) => ({ run: (s.run + 1) % AETHER_RUNS.length, chars: 0, lines: 0, parsed: false })), 2200);
    return () => { alive = false; clearTimeout(tm); };
  }, [inView, st]);
  const run = AETHER_RUNS[st.run];
  const done = st.lines === run.plan.length;
  return (
    <div className="aether" ref={ref}>
      <div className="aether-bar"><span>AETHER · SESSION 0x3F</span><span>DEMO LOOP</span></div>
      <div className="aether-say">
        <span className="aether-prompt">&gt;</span>
        <span>{run.say.slice(0, st.chars)}</span>
        {!st.parsed && <span className="caret" />}
      </div>
      <div className="aether-row">
        <span className="aether-k">BODY</span>
        <div className="aether-bodies">
          {["DRONE", "ROVER", "HUMANOID"].map((b) => (
            <span key={b} className={st.parsed && b === run.body ? "on" : ""}>{b}</span>
          ))}
        </div>
      </div>
      <div className="aether-k">PLAN</div>
      <ol className="aether-plan">
        {run.plan.map((ln, i) => (
          <li key={st.run + "-" + i} className={i < st.lines ? "on" : ""}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <code>{ln}</code>
            <span className="ok">{i < st.lines ? "ok" : ""}</span>
          </li>
        ))}
      </ol>
      <div className="aether-foot">
        <span className="aether-k">LOOP</span>
        <span className={"aether-loop" + (done ? " on" : "")}>perceive → plan → act → check → adapt</span>
      </div>
    </div>
  );
}

/* FDIR: live telemetry where thruster 3 fails, gets caught, and is isolated */
const FDIR_CH = [
  { id: "SYS_PWR", base: 0.72, unit: "V", scale: 28 },
  { id: "RCS_A", base: 0.6, unit: "%", scale: 100 },
  { id: "IMU_DRIFT", base: 0.35, unit: "°/s", scale: 1.2 },
  { id: "THRUSTER_3", base: 0.5, unit: "N", scale: 22 }
];
const FDIR_LOOP = 9, FDIR_FAULT = 3.4, FDIR_DETECT = 4.2, FDIR_ISO = 5.0;

function fdirValue(c, t) {
  const ph = ((t % FDIR_LOOP) + FDIR_LOOP) % FDIR_LOOP;
  let v = FDIR_CH[c].base
    + 0.035 * Math.sin(t * 7.1 + c * 1.7)
    + 0.022 * Math.sin(t * 13.7 + c * 2.9)
    + 0.015 * Math.sin(t * 29.3 + c * 5.3);
  if (c === 3 && ph > FDIR_FAULT) {
    if (ph > FDIR_ISO) return null;
    const k = (ph - FDIR_FAULT) / (FDIR_ISO - FDIR_FAULT);
    v += k * 0.32 + Math.sin(t * 40) * 0.06 * k;
  }
  if (c === 1 && ph > FDIR_ISO) v += 0.08 * Math.min(1, (ph - FDIR_ISO) * 2);
  return v;
}

function FdirTrace() {
  const wrapRef = urX(null);
  const cvsRef = urX(null);
  const [state, setState] = usX(0);
  const [vals, setVals] = usX(FDIR_CH.map(() => 0));
  const lastUi = urX(0);
  useFrameWhileVisible(wrapRef, (f) => {
    const cvs = cvsRef.current;
    const W = cvs.clientWidth, H = cvs.clientHeight;
    // CSS zoom on big monitors scales the box; render at the zoomed size so lines stay sharp
    const zoom = W ? cvs.getBoundingClientRect().width / W : 1;
    const dpr = Math.min(3, (window.devicePixelRatio || 1) * zoom);
    if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) { cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); }
    const g = cvs.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const now = f.t / 1000;
    const span = 6;
    const lane = H / FDIR_CH.length;
    const ph = ((now % FDIR_LOOP) + FDIR_LOOP) % FDIR_LOOP;

    g.strokeStyle = "rgba(236,232,223,0.08)";
    g.lineWidth = 1;
    for (let k = 1; k < FDIR_CH.length; k++) { g.beginPath(); g.moveTo(0, k * lane + 0.5); g.lineTo(W, k * lane + 0.5); g.stroke(); }
    for (let s = Math.ceil(now - span); s <= now; s++) {
      const x = W - ((now - s) / span) * W;
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke();
    }

    const loop0 = Math.floor(now / FDIR_LOOP) * FDIR_LOOP;
    [loop0 - FDIR_LOOP, loop0].forEach((L) => {
      [[FDIR_DETECT, "DETECT"], [FDIR_ISO, "ISOLATE"]].forEach(([at, label]) => {
        const te = L + at;
        if (te < now - span || te > now) return;
        const x = W - ((now - te) / span) * W;
        g.strokeStyle = "rgba(255,91,31,0.85)";
        g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
        g.setLineDash([]);
        g.fillStyle = "#ff5b1f";
        g.font = "500 9px 'Martian Mono', monospace";
        g.fillText(label, x + 5, 12);
      });
    });

    FDIR_CH.forEach((ch, c) => {
      const y0 = c * lane;
      g.lineWidth = 1.25;
      let pen = false;
      g.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const t = now - span + (x / W) * span;
        const v = fdirValue(c, t);
        if (v == null) { pen = false; continue; }
        const y = y0 + lane - v * lane * 0.85;
        if (!pen) { g.moveTo(x, y); pen = true; } else g.lineTo(x, y);
      }
      const faulty = c === 3 && ph > FDIR_FAULT && ph < FDIR_ISO;
      g.strokeStyle = faulty ? "#ff5b1f" : c === 3 ? "rgba(236,232,223,0.85)" : "rgba(236,232,223,0.7)";
      g.stroke();
      if (c === 3 && ph > FDIR_ISO) {
        g.strokeStyle = "rgba(236,232,223,0.25)";
        g.setLineDash([2, 4]);
        g.beginPath();
        const xIso = W - ((ph - FDIR_ISO) / span) * W;
        g.moveTo(Math.max(0, xIso), y0 + lane * 0.5);
        g.lineTo(W, y0 + lane * 0.5);
        g.stroke();
        g.setLineDash([]);
      }
    });

    if (f.t - lastUi.current > 180) {
      lastUi.current = f.t;
      setState(ph < FDIR_FAULT ? 0 : ph < FDIR_DETECT ? 1 : ph < FDIR_ISO ? 2 : 3);
      setVals(FDIR_CH.map((ch, c) => { const v = fdirValue(c, now); return v == null ? null : v * ch.scale; }));
    }
  });
  const STATES = [
    ["NOMINAL", "All channels inside envelope"],
    ["ANOMALY", "THRUSTER_3 drifting"],
    ["FAULT", "THRUSTER_3 · PPO proposes ISOLATE T3 · conf 0.94"],
    ["ISOLATED", "T3 offline · RCS_A compensating · rules check passed"]
  ];
  return (
    <div className="fdir" ref={wrapRef}>
      <div className="fdir-names">
        {FDIR_CH.map((ch, c) => (
          <div key={ch.id} className={c === 3 && state >= 1 ? "warn" : ""}>
            <span>{ch.id}</span>
            <b>{vals[c] == null ? "OFF" : vals[c].toFixed(c === 2 ? 2 : 1) + " " + ch.unit}</b>
          </div>
        ))}
      </div>
      <canvas ref={cvsRef} className="fdir-canvas" aria-hidden="true" />
      <div className={"fdir-state s" + state}>
        <span className="fdir-flag">{STATES[state][0]}</span>
        <span>{STATES[state][1]}</span>
      </div>
    </div>
  );
}

/* Gaussian: the language and its ML framework, typing itself */
function GaussIDE() {
  const [ref, inView] = useInView({ threshold: 0.3, once: false });
  const [step, setStep] = usX(0);
  const code = [
    <><span className="cm">// main.gx · build a classifier</span></>,
    <><span className="kw">import</span> nnx <span className="kw">from</span> <span className="st">"neurolang"</span></>,
    <><span className="kw">let</span> model = nnx.<span className="fn">sequential</span>([</>,
    <>{"  "}nnx.<span className="fn">dense</span>(784, 128, <span className="st">"relu"</span>),</>,
    <>{"  "}nnx.<span className="fn">dense</span>(128, 10, <span className="st">"softmax"</span>),</>,
    <>]);</>,
    <>model.<span className="fn">train</span>(data, epochs=<span className="nm">12</span>)</>
  ];
  const out = [
    ["", "$ gauss build main.gx"],
    ["ok", "parsed AST · lowered to IR"],
    ["ok", "codegen llvm · 14 kb binary"],
    ["hot", "training · loss 0.84 → 0.21"],
    ["ok", "saved model.bin · acc 0.97"]
  ];
  ueX(() => {
    if (!inView) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % (code.length + out.length + 4)), step < code.length ? 520 : 760);
    return () => clearTimeout(id);
  }, [inView, step]);
  const shownCode = Math.min(step + 1, code.length);
  const shownOut = Math.max(0, step - code.length + 1);
  return (
    <div className="gide" ref={ref}>
      <div className="gide-bar"><span>main.gx</span><span>GAUSSIAN 1.x</span></div>
      <div className="gide-code">
        {code.slice(0, shownCode).map((l, i) => (
          <div key={i}><span className="ln">{i + 1}</span>{l}{i === shownCode - 1 && shownOut === 0 && <span className="caret" />}</div>
        ))}
      </div>
      <div className="gide-out">
        {out.slice(0, shownOut).map(([k, t], i) => <div key={i} className={k}>{t}</div>)}
      </div>
    </div>
  );
}

/* === Hangar ========================================================= */
const PROJECTS = [
  {
    code: "01", tag: "RUNTIME", status: ["live", "ACTIVE"], name: "AETHER", sub: "Adaptive Embodied Task Hierarchy",
    desc: "A runtime that turns one sentence into robot actions. The same instruction runs on a drone, a rover or a humanoid, with perception, planning, execution, feedback and adaptation in one loop.",
    spec: [["STACK", "VLA · PPO · PyTorch"], ["BODIES", "Drones · rovers · humanoids"]],
    links: [{ href: "https://aether-robotics.com", label: "aether-robotics.com" }],
    visual: "aether"
  },
  {
    code: "02", tag: "FLIGHT", status: ["live", "IN FLIGHT"], name: "Autonomous Drone", sub: "Custom FPV airframe",
    desc: "A SpeedyBee F7 runs the motors and keeps it stable. A Raspberry Pi on top runs the autonomy and sends commands down to it.",
    spec: [["FLIGHT CTRL", "SpeedyBee F7"], ["COMPANION", "Raspberry Pi"], ["FOCUS", "Sensor fusion"]],
    visual: "drone"
  },
  {
    code: "03", tag: "RF MESH", status: ["hot", "2ND OVERALL"], name: "SAURON", sub: "Search and rescue node mesh",
    desc: "ESP32 nodes that triangulate a signal from RSSI, filtered to hold up under noise and interference. A drone flies out to confirm the fix. 2nd overall, plus the Palantir sponsor award.",
    spec: [["HARDWARE", "ESP32 mesh"], ["METHOD", "RSSI triangulation"], ["AWARD", "Palantir sponsor prize"]],
    links: [{ href: "https://devpost.com/software/sauron-sfbc74", label: "Devpost" }],
    badge: true,
    visual: "sauron"
  },
  {
    code: "04", tag: "SPACECRAFT", status: ["", "PATENT PENDING"], name: "Spacecraft FDIR", sub: "Fault detection, isolation and recovery",
    desc: "A PPO agent handles spacecraft faults inside hard rule-based limits, so it can't take an action the rules forbid. Tested against 100+ simulated failure modes.",
    spec: [["AGENT", "PPO (deep RL)"], ["GUARD", "Rule-based safety layer"], ["TESTED", "100+ failure modes"]],
    links: [{ href: "assets/fdir-paper.docx", label: "Read the paper" }],
    visual: "fdir"
  },
  {
    code: "05", tag: "HUMANOID", status: ["", "IN PROGRESS"], name: "Atlas", sub: "Desk-mounted assistant",
    desc: "Camera, projector and laser on a desk mount. It finds the wires and parts on your bench, points them out, and talks you through the build.",
    spec: [["SENSES", "Camera · CV"], ["OUTPUT", "Projection · laser · voice"]],
    visual: "atlas"
  },
  {
    code: "06", tag: "LANGUAGE", status: ["", "OPEN SOURCE"], name: "Gaussian + NeuroLang", sub: "A programming language, and ML on top of it",
    desc: "Gaussian is a language I wrote from scratch, compiler included, with 200+ downloads. NeuroLang is the ML framework on top: a neural net training in about twelve lines.",
    spec: [["PARTS", "Lexer · parser · IR · codegen"], ["USERS", "200+ downloads"]],
    links: [
      { href: "https://www.gaussiancode.org/", label: "gaussiancode.org", logo: "assets/logo-gaussian.png" },
      { href: "https://energy-fabric-40991681.figma.site/", label: "NeuroLang", logo: "assets/logo-neurolang.png" }
    ],
    visual: "lang"
  }
];

function ProjectVisual({ kind }) {
  if (kind === "aether") return <AetherPipe />;
  if (kind === "drone") return <window.DroneScene />;
  if (kind === "sauron") return <window.SauronScene />;
  if (kind === "fdir") return <FdirTrace />;
  if (kind === "atlas") return <window.HumanoidScene />;
  return <GaussIDE />;
}

function Panel({ p }) {
  return (
    <article className={"panel panel-" + p.visual}>
      <div className="panel-ghost" aria-hidden="true">{p.code}</div>
      <div className="panel-text">
        <div className="panel-meta">
          <span>{p.code} / {p.tag}</span>
          <span className={"state " + p.status[0]}><i />{p.status[1]}</span>
        </div>
        <h3 className={"panel-name" + (p.name.length > 9 ? " long" : "")}>{p.name}</h3>
        <p className="panel-sub">{p.sub}</p>
        <p className="panel-desc">{p.desc}</p>
        <dl className="spec">
          {p.spec.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {(p.links || p.badge) && (
          <div className="panel-links">
            {p.badge && (
              <span className="palantir"><img src="assets/logo-palantir.png" alt="" />Palantir award</span>
            )}
            {(p.links || []).map((l) => (
              <a key={l.href} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {l.logo && <img src={l.logo} alt="" />}
                {l.label}<window.Arrow size={12} />
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="panel-visual"><ProjectVisual kind={p.visual} /></div>
    </article>
  );
}

function Hangar() {
  const secRef = urX(null);
  const trackRef = urX(null);
  const fillRef = urX(null);
  const [active, setActive] = usX(-1);

  ueX(() => {
    const sec = secRef.current, track = trackRef.current;
    const mq = window.matchMedia("(min-width: 900px)");
    let dist = 0, lastActive = -1;
    const measure = () => {
      if (!mq.matches) { sec.style.height = ""; track.style.transform = ""; dist = 0; return; }
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      sec.style.height = dist + window.innerHeight + "px";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    const panels = Array.from(track.querySelectorAll(".panel"));
    const intro = track.querySelector(".hangar-intro");
    const off = onFrame(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
      const p = dist ? clamp(-r.top / dist) : clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      if (dist) track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      const vw = window.innerWidth;
      // -1 while the intro screen is the one in view, so no project is highlighted yet
      const ir = intro.getBoundingClientRect();
      let best = -1, bestD = Math.abs((ir.left + ir.width / 2 - vw / 2) / vw);
      panels.forEach((el, i) => {
        const pr = el.getBoundingClientRect();
        const c = (pr.left + pr.width / 2 - vw / 2) / vw;
        el.style.setProperty("--off", c.toFixed(3));
        const d = Math.abs(c);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== lastActive) { lastActive = best; setActive(best); }
    });
    return () => { off(); ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const jumpTo = (i) => {
    const sec = secRef.current, panel = trackRef.current.querySelectorAll(".panel")[i];
    const horizontal = window.matchMedia("(min-width: 900px)").matches;
    const dist = trackRef.current.scrollWidth - window.innerWidth;
    const y = horizontal
      ? sec.offsetTop + clamp(panel.offsetLeft + panel.offsetWidth / 2 - window.innerWidth / 2, 0, dist)
      : panel.getBoundingClientRect().top + window.scrollY - 40;
    if (frame.lenis) frame.lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section className="hangar" id="work" ref={secRef} data-tone="dark" data-idx="01" data-name="HANGAR">
      <div className="hangar-pin">
        <div className="hangar-track" ref={trackRef}>
          <div className="hangar-intro">
            <nav className="hangar-index" aria-label="Projects">
              {PROJECTS.map((p, i) => (
                <button key={p.code} onClick={() => jumpTo(i)} data-lock="JUMP">
                  <span className="hi-n">{p.code}</span>
                  <span className="hi-name">{p.name}</span>
                  <i className="hi-lead" />
                  <span className="hi-tag">{p.tag}</span>
                </button>
              ))}
            </nav>
            {/* finishes stretching before the section pins, so it never freezes half-done */}
            <StretchTitle text="Hangar" className="hangar-title" end={0.8} />
            <div className="hangar-intro-foot">
              <p>Six things I've built or am building. The 3D ones are my real CAD files: drag them around.</p>
              <div className="hangar-go">06 PROJECTS · SCROLL <window.Arrow size={12} /></div>
            </div>
          </div>
          {PROJECTS.map((p) => <Panel key={p.code} p={p} />)}
          <div className="hangar-outro">
            <a href="https://github.com/ChahelPaatur" target="_blank" rel="noreferrer" data-lock="GITHUB">
              <span>More on</span>
              <b>GitHub</b>
              <window.Arrow size={28} />
            </a>
          </div>
        </div>
        <div className={"hangar-ruler" + (active < 0 ? " off" : "")}>
          <div className="hangar-fill" ref={fillRef} />
          {PROJECTS.map((p, i) => (
            <span key={p.code} className={i === active ? "on" : ""}>{p.code} {p.name.split(" ")[0]}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* === Numbers ======================================================== */
function Numbers() {
  const items = [
    { to: 8, suffix: "+", label: "projects shipped" },
    { to: 5, label: "papers" },
    { to: 2, label: "patents filed" },
    { to: 10, suffix: "K+", label: "users reached" }
  ];
  return (
    <section className="numbers" aria-label="Numbers">
      {items.map((it) => (
        <div className="num" key={it.label}>
          <window.DotCounter to={it.to} suffix={it.suffix || ""} />
          <span className="num-label">{it.label}</span>
        </div>
      ))}
    </section>
  );
}

/* === Papers ========================================================= */

/* Figure 1: live Monte Carlo of the max of n i.i.d. standard Gaussians */
function gaussSample() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function MaxFigure() {
  const wrapRef = urX(null);
  const cvsRef = urX(null);
  const [n, setN] = usX(64);
  const [read, setRead] = usX({ trials: 0, mean: 0 });
  const sim = urX(null);

  ueX(() => {
    sim.current = { n, bins: new Float32Array(90), trials: 0, sum: 0, last: [], lastMax: 0, lastT: 0, ui: 0 };
  }, [n]);

  useFrameWhileVisible(wrapRef, (f) => {
    const S = sim.current;
    if (!S) return;
    const cvs = cvsRef.current;
    const W = cvs.clientWidth, H = cvs.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) {
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    }
    const lo = -1.5, hi = 4.5, nb = S.bins.length;
    const toX = (v) => 34 + ((v - lo) / (hi - lo)) * (W - 50);

    const batch = S.trials < 400 ? 14 : 5;
    for (let b = 0; b < batch; b++) {
      let mx = -Infinity;
      const keep = b === batch - 1 && f.t - S.lastT > 260;
      const pts = keep ? [] : null;
      for (let i = 0; i < S.n; i++) {
        const z = gaussSample();
        if (z > mx) mx = z;
        if (pts) pts.push(z);
      }
      const bi = Math.floor(((mx - lo) / (hi - lo)) * nb);
      if (bi >= 0 && bi < nb) S.bins[bi]++;
      S.trials++; S.sum += mx;
      if (pts) { S.last = pts; S.lastMax = mx; S.lastT = f.t; }
    }

    const g = cvs.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const ink = "#151311", mute = "rgba(21,19,17,0.45)", sig = "#e8461a";
    const stripY = 18, stripH = 46, histTop = 92, base = H - 34;

    g.fillStyle = mute;
    g.font = "italic 13px 'CMU Serif', Georgia, serif";
    g.fillText("one trial: n samples", 34, stripY - 4);
    const age = clamp((f.t - S.lastT) / 260);
    S.last.forEach((z, i) => {
      const x = toX(z);
      const y = stripY + 6 + (((i * 7919) % 97) / 97) * (stripH - 12);
      g.fillStyle = `rgba(21,19,17,${0.25 + 0.4 * age})`;
      g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill();
    });
    if (S.last.length) {
      const x = toX(S.lastMax);
      g.strokeStyle = sig; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, stripY); g.lineTo(x, stripY + stripH); g.stroke();
      g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(x, stripY + stripH); g.lineTo(x, histTop - 4); g.stroke();
      g.setLineDash([]);
      g.fillStyle = sig;
      g.beginPath(); g.arc(x, stripY + stripH / 2, 3.2, 0, Math.PI * 2); g.fill();
    }

    let peak = 1;
    for (let i = 0; i < nb; i++) if (S.bins[i] > peak) peak = S.bins[i];
    const bw = (W - 50) / nb;
    g.strokeStyle = ink; g.lineWidth = 1;
    g.fillStyle = "rgba(21,19,17,0.07)";
    g.beginPath();
    g.moveTo(34, base);
    for (let i = 0; i < nb; i++) {
      const h = (S.bins[i] / peak) * (base - histTop);
      g.lineTo(34 + i * bw, base - h);
      g.lineTo(34 + (i + 1) * bw, base - h);
    }
    g.lineTo(W - 16, base);
    g.closePath();
    g.fill(); g.stroke();

    g.strokeStyle = ink;
    g.beginPath(); g.moveTo(34, base + 0.5); g.lineTo(W - 16, base + 0.5); g.stroke();
    g.fillStyle = ink;
    g.font = "12px 'CMU Serif', Georgia, serif";
    g.textAlign = "center";
    for (let v = -1; v <= 4; v++) {
      const x = toX(v);
      g.beginPath(); g.moveTo(x + 0.5, base); g.lineTo(x + 0.5, base + 4); g.stroke();
      g.fillText(v < 0 ? "−" + Math.abs(v) : String(v), x, base + 17);
    }

    const mean = S.sum / Math.max(1, S.trials);
    const bound = Math.sqrt(2 * Math.log(S.n));
    const xm = toX(mean), xb = toX(bound);
    g.strokeStyle = sig; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(xm, histTop - 6); g.lineTo(xm, base); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 1; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(xb, histTop - 6); g.lineTo(xb, base); g.stroke();
    g.setLineDash([]);
    g.font = "italic 13px 'CMU Serif', Georgia, serif";
    g.textAlign = "right";
    g.fillStyle = sig;
    g.fillText("mean of max", xm - 5, histTop + 6);
    g.textAlign = "left";
    g.fillStyle = ink;
    g.fillText("√(2 log n)", xb + 5, histTop + 6);
    g.textAlign = "start";

    if (f.t - S.ui > 200) { S.ui = f.t; setRead({ trials: S.trials, mean }); }
  });

  return (
    <div className="fig" ref={wrapRef}>
      <div className="fig-controls">
        <span><i>n</i> =</span>
        {[4, 16, 64, 256].map((k) => (
          <button key={k} className={k === n ? "on" : ""} onClick={() => setN(k)} data-lock={"N = " + k}>{k}</button>
        ))}
        <span className="fig-read">
          trials {read.trials.toLocaleString("en-US")} · mean of max {read.mean.toFixed(3)} · √(2 log n) = {Math.sqrt(2 * Math.log(n)).toFixed(3)}
        </span>
      </div>
      <canvas ref={cvsRef} className="fig-canvas" aria-label="Histogram of the maximum of n standard Gaussian samples, updating live" role="img" />
    </div>
  );
}

const BIB = [
  {
    yr: "2026", ttl: "Self-Modifying Program Synthesis via Online Library Evolution", venue: "TechRxiv",
    note: "Program synthesis that keeps growing its own library while the task distribution shifts.",
    href: "https://www.techrxiv.org/doi/full/10.36227/techrxiv.176784644.48617663/v1"
  },
  {
    yr: "2025", ttl: "The Effectiveness and Comparison of Rule-Based and DRL Agents for Simulated Spacecraft FDIR", venue: "Academia",
    note: "Deep RL against classical rule engines when the faults are safety-critical.",
    href: "https://www.academia.edu/129145181/The_Effectiveness_and_Comparison_of_Rule_Based_and_DRL_Agents_for_Simulated_Spacecraft_FDIR"
  },
  {
    yr: "2025", ttl: "Microwave Technology in Aeronautical Applications", venue: "engrXiv",
    note: "Survey of microwave systems in aerospace communication, sensing and propulsion.",
    href: "https://engrxiv.org/preprint/view/4612"
  },
  {
    yr: "2025", ttl: "Quantum vs Classical vs Hybrid Computing Paradigms", venue: "TechRxiv",
    note: "Where each compute model actually wins, and where hybrid stacks make sense.",
    href: "https://www.techrxiv.org/doi/full/10.36227/techrxiv.174585695.51861430/v1"
  }
];

const FILINGS = [
  { id: "P1", ttl: "AI-Based Spacecraft Fault Detection System", meta: "Ref. 63/842,839 · non-provisional · 2025" },
  { id: "P2", ttl: "Eye-Tracking and Gesture-Based AR Interface for Assistive Tech", meta: "Provisional, filing in progress · 2026" },
  { id: "P3", ttl: "Aerospace AI Fault Detection (FDIR)", meta: "Regeneron STS submission · 2025" }
];

function Papers() {
  return (
    <section className="papers" id="papers" data-tone="paper" data-idx="02" data-name="PAPERS">
      <div className="tex">
        <header className="tex-head">
          <div className="tex-stamp">arXiv:{ARXIV_ID}v1 [math.PR] 8 Oct 2026</div>
          <h2 className="tex-title">Papers and Patents</h2>
          <p className="tex-author">Chahel Paatur</p>
          <p className="tex-affil">Tracy, California</p>
        </header>

        <div className="tex-abstract">
          <span className="tex-abs-k">Abstract</span>
          <p>Five preprints and three filings, across probability, program synthesis, spacecraft autonomy and computing. The newest is pure math. Entries are listed newest first; links go to the full text.</p>
        </div>

        <h3 className="tex-h"><span>1</span>Newest</h3>
        <article className="lead">
          <a className="lead-title" href={"https://arxiv.org/abs/" + ARXIV_ID} target="_blank" rel="noreferrer" data-lock="ARXIV">
            Linear stability and divisibility gaps for Gaussian maxima
          </a>
          <p className="lead-meta">C. Paatur · arXiv:{ARXIV_ID} [math.PR] · October 2026 · 17 pp., 1 table · MSC 60E15, 52A40, 60G15, 42C15</p>
          <p className="lead-body">
            Take a family of unit vectors that is <i>isotropic</i> and look at the Gaussian maxima it produces. I show that the
            amount the expected maximum exceeds its baseline is controlled by how far the vectors are from an orthonormal basis.
            For correlation matrices whose nonzero eigenvalues are all equal, that gives an exact minimum when the matrix size is a
            multiple of the rank, and a quantitative gap when it isn't. In dimension two I get the leading asymptotic term and
            describe the near-optimal configurations.
          </p>
          <div className="lead-links">
            <a href={"https://arxiv.org/abs/" + ARXIV_ID} target="_blank" rel="noreferrer">Abstract<window.Arrow size={12} /></a>
            <a href={"https://arxiv.org/pdf/" + ARXIV_ID} target="_blank" rel="noreferrer">PDF<window.Arrow size={12} /></a>
          </div>
          <figure className="tex-fig">
            <MaxFigure />
            <figcaption>
              <b>Figure 1.</b> Live Monte Carlo of max(<i>g</i><sub>1</sub>, …, <i>g<sub>n</sub></i>) for independent standard Gaussians,
              which is the orthonormal case. Top: one trial, its maximum in orange. Bottom: every maximum so far. The paper asks how this
              changes when the unit vectors behind the <i>g<sub>i</sub></i> stop being orthonormal.
            </figcaption>
          </figure>
        </article>

        <h3 className="tex-h"><span>2</span>Preprints</h3>
        <ol className="bib">
          {BIB.map((b, i) => (
            <li key={b.href}>
              <span className="bib-n">[{i + 2}]</span>
              <a className="bib-main" href={b.href} target="_blank" rel="noreferrer" data-lock={b.venue.toUpperCase()}>
                C. Paatur. <i>{b.ttl}.</i> {b.venue}, {b.yr}.
              </a>
              <span className="bib-note">{b.note}</span>
            </li>
          ))}
        </ol>

        <h3 className="tex-h"><span>3</span>Patents and filings</h3>
        <ol className="bib">
          {FILINGS.map((p) => (
            <li key={p.id}>
              <span className="bib-n">[{p.id}]</span>
              <span className="bib-main"><i>{p.ttl}.</i> {p.meta}.</span>
            </li>
          ))}
        </ol>

        <div className="tex-page">2</div>
      </div>
    </section>
  );
}

/* === Logbook ======================================================== */
const LOG_EDU = [
  { when: "NOW", what: "University of Illinois Urbana-Champaign", where: "Champaign, IL", note: "Aerospace Engineering and Computer Engineering", logo: "assets/logo-uiuc.jpeg" },
  { when: "2024–26", what: "John C. Kimball High School", where: "Tracy, CA", note: "GPA 3.83 / 4.40 weighted · rank 31 of 373", logo: "assets/logo-kimball.jpg" },
  { when: "2022–24", what: "Washington High School", where: "Fremont, CA", note: "Earlier coursework", logo: "assets/logo-paw-washington.png" }
];

const LOG_CERT = [
  { when: "2025", what: "GATI Research Program", where: "UC Irvine", note: "Picked for UC Irvine's top entrepreneurial cohort: $50K in startup funding, faculty mentorship and applied AI research.", tags: "Research · AI · $50K", logo: "assets/logo-uci.png" },
  { when: "2024", what: "Autonomous Air Vehicle Racing", where: "MIT BWSI", note: "Designed and programmed autonomous quadcopters for the BWSI summer racing track.", tags: "Aerospace · Flight sim", logo: "assets/logo-mit.png" },
  { when: "2024", what: "Python Core", where: "MIT BWSI", note: "The foundations course that feeds the BWSI summer programs: Python, numerics, PyTorch.", tags: "Python · PyTorch", logo: "assets/logo-mit.png" },
  { when: "2023", what: "Statistics", where: "Stanford University", note: "Probability plus descriptive and inferential statistics, done in MATLAB.", tags: "Math · MATLAB", logo: "assets/logo-stanford.png" },
  { when: "2023", what: "Astronautics and Human Spaceflight", where: "MIT · edX", note: "Orbital mechanics, propulsion, and how human spaceflight systems get engineered.", tags: "Aerospace", logo: "assets/logo-mit.png" },
  { when: "2022", what: "Accelerated CS Fundamentals", where: "UIUC", note: "Object-oriented data structures and algorithms in C++, on the accelerated track.", tags: "C++ · Data structures", logo: "assets/logo-uiuc.jpeg" },
  { when: "2021", what: "CS50x", where: "Harvard University", note: "Harvard's intro to computer science: algorithms, data structures, C, Python, web.", tags: "Algorithms · Web", logo: "assets/logo-harvard.png" },
  { when: "--", what: "Python 3 Programming", where: "U. of Michigan", note: "Five-course specialization: classes, files, data and applications.", tags: "Python · OOP", logo: "assets/logo-michigan.png" },
  { when: "--", what: "Fusion 360 Certified", where: "Autodesk · Udemy", note: "Parametric CAD for product design, simulation and fabrication.", tags: "CAD", logo: "assets/logo-autodesk.png" }
];

const LOG_NET = [
  { when: "INT'L VP", what: "PII Research Network", where: "pii-international.org", note: "Grew the network to 20+ schools and 1,000+ student researchers. Built the mentorship pipeline and the engineering project tracks.", href: "https://www.pii-international.org/", logo: "assets/logo-pii.png" },
  { when: "AWARD", what: "Palantir Technologies", where: "Sponsor award · 2nd overall", note: "SAURON took the Palantir sponsor award for the ESP32 mesh and drone verification pipeline.", href: "https://devpost.com/software/sauron-sfbc74", logo: "assets/logo-palantir.png" },
  { when: "FELLOW", what: "UC Irvine GATI", where: "$50K startup cohort", note: "Startup funding, faculty mentorship and applied AI research through the GATI program.", href: "https://gati.uci.edu/", logo: "assets/logo-uci.png" },
  { when: "CHAMPION", what: "Science Olympiad", where: "Regional · Chemistry", note: "First place at regionals in Chemistry, plus team placements in other events across the season.", href: "https://scioly.org/", logo: "assets/logo-sof.jpeg" },
  { when: "RESEARCH", what: "Princeton University", where: "Student network", note: "Working with Princeton students I know on physical AI research: problem framing, paper drafts, review.", href: "https://www.princeton.edu/", logo: "assets/logo-princeton.png" },
  { when: "INVITED", what: "University of Oxford", where: "Research program", note: "Invited to an Oxford research program and did collaborative work with the cohort, without formally enrolling.", href: "https://www.ox.ac.uk/", logo: "assets/logo-oxford.jpeg" }
];

function LogRow({ r, onEnter, onLeave }) {
  const inner = (
    <>
      <span className="log-when">{r.when}</span>
      <span className="log-what">{r.what}</span>
      <span className="log-where">{r.where}</span>
      <span className="log-tags">{r.tags || ""}</span>
      <span className="log-go">{r.href ? <window.Arrow size={14} /> : null}</span>
      {r.note && <span className="log-note"><span>{r.note}</span></span>}
    </>
  );
  const props = { className: "log-row", onPointerEnter: () => onEnter(r.logo), onPointerLeave: onLeave };
  return r.href
    ? <a {...props} href={r.href} target="_blank" rel="noreferrer" data-lock="VISIT">{inner}</a>
    : <div {...props}>{inner}</div>;
}

function Logbook() {
  const followRef = urX(null);
  const imgRef = urX(null);
  const st = urX({ x: 0, y: 0, vx: 0, on: false });
  const secRef = urX(null);

  useFrameWhileVisible(secRef, () => {
    const el = followRef.current;
    if (!el) return;
    const s = st.current;
    const tx = frame.mx + 28, ty = frame.my - 70;
    const nx = lerp(s.x, tx, 0.16), ny = lerp(s.y, ty, 0.16);
    s.vx = lerp(s.vx, nx - s.x, 0.2);
    s.x = nx; s.y = ny;
    el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${clamp(s.vx * 0.8, -14, 14)}deg) scale(${s.on ? 1 : 0.6})`;
    el.style.opacity = s.on ? 1 : 0;
  });

  const enter = (logo) => {
    if (!finePointer || !logo) return;
    if (imgRef.current.getAttribute("src") !== logo) imgRef.current.setAttribute("src", logo);
    if (!st.current.on) { st.current.x = frame.mx + 28; st.current.y = frame.my - 70; }
    st.current.on = true;
  };
  const leave = () => { st.current.on = false; };

  const group = (n, code, title, blurb, rows) => (
    <div className="log-group">
      <header className="log-group-head">
        <div className="lg-pin">
          <span className="lg-n">{n}</span>
          <h3 className="lg-title">{title}</h3>
          <p className="lg-blurb">{blurb}</p>
          <span className="lg-count">{code} · {String(rows.length).padStart(2, "0")} ENTRIES</span>
        </div>
      </header>
      <div className="log-rows">
        {rows.map((r) => <LogRow key={r.what + r.when} r={r} onEnter={enter} onLeave={leave} />)}
      </div>
    </div>
  );

  return (
    <section className="log" id="log" ref={secRef} data-tone="dark" data-idx="03" data-name="LOGBOOK">
      <div className="log-head">
        <StretchTitle text="Logbook" className="big-title" />
        <p>Schools, certificates, and the people I build with. Hover a line for details.</p>
      </div>
      {group("01", "EDU", "Education", "Where I study now, and where I came from.", LOG_EDU)}
      {group("02", "CRT", "Certifications", "Courses and programs, newest first.", LOG_CERT)}
      {group("03", "NET", "Leadership and network", "What I run, what I've won, and who I build with.", LOG_NET)}
      {finePointer && (
        <div className="log-follow" ref={followRef} aria-hidden="true"><img ref={imgRef} alt="" /></div>
      )}
    </section>
  );
}

/* === About ========================================================== */
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21
];

/* Portrait as a 1-bit ordered dither. Hover (or tap) opens a lens onto the photo. */
function DitherPortrait({ src }) {
  const wrapRef = urX(null);
  const cvsRef = urX(null);
  const st = urX({ img: null, dither: null, cell: 18, lensR: 0, lensT: 0, lx: 0, ly: 0, dirty: true, revealed: false });
  const [inViewRef, inView] = useInView({ threshold: 0.3 });

  const setRefs = (el) => { wrapRef.current = el; inViewRef.current = el; };

  const coverDraw = (g, img, W, H) => {
    const ir = img.width / img.height, r = W / H;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; }
    else { sh = img.width / r; sy = (img.height - sh) * 0.2; }
    g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  };

  const renderDither = () => {
    const s = st.current, wrap = wrapRef.current;
    if (!s.img || !wrap) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cell = s.cell;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const small = document.createElement("canvas");
    small.width = cols; small.height = rows;
    const sg = small.getContext("2d", { willReadFrequently: true });
    coverDraw(sg, s.img, cols, rows);
    const d = sg.getImageData(0, 0, cols, rows).data;
    const lum = new Float32Array(cols * rows);
    let lo = 1, hi = 0;
    for (let i = 0; i < lum.length; i++) {
      const v = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      lum[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const out = document.createElement("canvas");
    out.width = Math.round(W * dpr); out.height = Math.round(H * dpr);
    const og = out.getContext("2d");
    og.scale(dpr, dpr);
    og.fillStyle = "#0b0c0e";
    og.fillRect(0, 0, W, H);
    og.fillStyle = "#ece8df";
    const gap = cell > 6 ? 1.5 : cell > 3 ? 1 : 0.5;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = (lum[y * cols + x] - lo) / Math.max(0.01, hi - lo);
        const thr = (BAYER8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
        if (Math.pow(v, 1.1) > thr) og.fillRect(x * cell, y * cell, cell - gap, cell - gap);
      }
    }
    s.dither = out;
    s.dirty = true;
  };

  ueX(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => { st.current.img = img; renderDither(); };
    const onResize = () => renderDither();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src]);

  ueX(() => {
    if (!inView) return;
    const steps = window.innerWidth < 760 ? [14, 9, 6, 4, 3] : [18, 12, 8, 5, 4];
    if (reduceMotion) { st.current.cell = steps[steps.length - 1]; renderDither(); return; }
    let k = 0;
    const id = setInterval(() => {
      st.current.cell = steps[k];
      renderDither();
      k++;
      if (k >= steps.length) clearInterval(id);
    }, 170);
    return () => clearInterval(id);
  }, [inView]);

  useFrameWhileVisible(wrapRef, () => {
    const s = st.current, cvs = cvsRef.current, wrap = wrapRef.current;
    if (!s.dither) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) {
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); s.dirty = true;
    }
    const r = wrap.getBoundingClientRect();
    const inside = frame.mx >= r.left && frame.mx <= r.right && frame.my >= r.top && frame.my <= r.bottom;
    const target = s.revealed ? Math.hypot(W, H) : inside && finePointer ? Math.min(W, H) * 0.24 : 0;
    const prevR = s.lensR;
    s.lensR = lerp(s.lensR, target, 0.14);
    if (inside) { s.lx = lerp(s.lx, frame.mx - r.left, 0.3); s.ly = lerp(s.ly, frame.my - r.top, 0.3); }
    if (!s.dirty && Math.abs(s.lensR - prevR) < 0.05 && s.lensR < 0.5) return;
    s.dirty = false;
    const g = cvs.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(s.dither, 0, 0, cvs.width, cvs.height);
    if (s.lensR > 0.5) {
      g.save();
      g.scale(dpr, dpr);
      g.beginPath();
      g.arc(s.lx, s.ly, s.lensR, 0, Math.PI * 2);
      g.clip();
      coverDraw(g, s.img, W, H);
      g.restore();
      g.save();
      g.scale(dpr, dpr);
      g.strokeStyle = "#ff5b1f";
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(s.lx, s.ly, s.lensR, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  });

  return (
    <div className="portrait" ref={setRefs} data-lock="LENS"
      onClick={() => {
        const s = st.current;
        s.revealed = !s.revealed;
        const wrap = wrapRef.current;
        s.lx = wrap.clientWidth / 2; s.ly = wrap.clientHeight / 2;
      }}>
      <canvas ref={cvsRef} role="img" aria-label="Portrait of Chahel Paatur" />
      <span className="portrait-tag">IMG_0001 · 1-BIT</span>
    </div>
  );
}

function About() {
  return (
    <section className="about" id="about" data-tone="dark" data-idx="04" data-name="OPERATOR">
      <div className="about-grid">
        <DitherPortrait src="assets/portrait-school.jpg" />
        <div className="about-text">
          <div className="kicker">04 / OPERATOR</div>
          <ScrubWords className="about-bio" text="I'm Chahel. I study Aerospace and Computer Engineering at the University of Illinois Urbana-Champaign, and I'm building Aether Robotics, a company making robots that turn plain-English instructions into action. I'm also a researcher, with papers on spacecraft fault detection, program synthesis and, most recently, probability theory. On the side I'm International VP of the PII Research Network: 1,000+ student researchers across 20+ schools." />
          <dl className="about-spec">
            <div><dt>STUDYING</dt><dd>Aerospace + Computer Engineering, UIUC</dd></div>
            <div><dt>BUILDING</dt><dd><a href="https://aether-robotics.com" target="_blank" rel="noreferrer">Aether Robotics<window.Arrow size={12} /></a></dd></div>
            <div><dt>RESEARCH</dt><dd>Physical AI, spacecraft FDIR, probability</dd></div>
            <div><dt>BASED</dt><dd>Champaign, IL · from Tracy, CA</dd></div>
            <div><dt>LANGUAGES</dt><dd>Python, C/C++, Java, TypeScript, SQL</dd></div>
            <div><dt>STACK</dt><dd>PyTorch, ESP32, Raspberry Pi, SpeedyBee F7, Fusion 360</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/* === Contact ======================================================== */
function Contact() {
  const clock = useClock();
  const rtb = (e) => { e.preventDefault(); scrollToId("top"); };
  return (
    <section className="contact" id="contact" data-tone="signal" data-idx="05" data-name="CHANNEL">
      <div className="rings" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="contact-top">
        <span>05 / OPEN CHANNEL</span>
        <span>{clock} PT · TRACY, CA</span>
      </div>
      <StretchTitle text="Open channel." className="contact-title" wFrom={300} wTo={900} />
      <p className="contact-sub">Internships, lab placements, research collaborations, or just a good robotics problem. I reply fast.</p>
      <a className="contact-mail" href="mailto:chahelpaatur@gmail.com" data-lock="TRANSMIT">
        <window.WaveText text="chahelpaatur@gmail.com" />
        <window.Arrow size={36} />
      </a>
      <dl className="contact-grid">
        <div><dt>PHONE</dt><dd><a href="tel:+19254759513">925 475 9513</a></dd></div>
        <div><dt>LINKEDIN</dt><dd><a href="https://www.linkedin.com/in/chahel-paatur-88a9b4229/" target="_blank" rel="noreferrer">/in/chahel-paatur</a></dd></div>
        <div><dt>GITHUB</dt><dd><a href="https://github.com/ChahelPaatur" target="_blank" rel="noreferrer">@ChahelPaatur</a></dd></div>
        <div><dt>RESUME</dt><dd><a href="assets/resume.pdf" target="_blank" rel="noreferrer">resume.pdf</a></dd></div>
      </dl>
      <footer className="foot">
        <span>© 2026 Chahel Paatur</span>
        <span>37.7397°N 121.4252°W</span>
        <span>END OF TRANSMISSION</span>
        <a href="#top" onClick={rtb} data-lock="RTB">↑ Return to base</a>
      </footer>
    </section>
  );
}

Object.assign(window, { Nav, Tape, Hangar, Numbers, Papers, Logbook, About, Contact });

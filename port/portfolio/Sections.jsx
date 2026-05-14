/* ============================================================
   Portfolio UI Kit · Sections
   Section-level recreations: Nav, Hero+Portrait, Marquee, Work
   (with Project + visuals), Research, Patents, Hire, Education,
   Certifications, Leadership, About, Contact, Footer.
   ============================================================ */
const _s = React;
const { useState: usK, useEffect: ueK, useRef: urK, useCallback: ucK } = React;

/* === Nav ============================================================ */
function Nav() {
  return (
    <nav className="nav">
      <div className="nav-mark">
        <window.DotMark />
        <span className="mono">CHAHEL PAATUR · PORTFOLIO</span>
      </div>
      <div className="nav-links">
        <a href="#work"><span className="idx mono">01</span> Work</a>
        <a href="#research"><span className="idx mono">02</span> Research</a>
        <a href="#education"><span className="idx mono">03</span> Education</a>
        <a href="#certs"><span className="idx mono">04</span> Certs</a>
        <a href="#leadership"><span className="idx mono">05</span> Leadership</a>
        <a href="#about"><span className="idx mono">06</span> About</a>
      </div>
      <a className="nav-cta" href="#hire">
        <span>Hire me</span>
        <window.ArrowGlyph size={12} />
      </a>
    </nav>
  );
}

/* === Portrait (parallax tilt) ======================================= */
function Portrait() {
  const stageRef = urK(null);
  const frameRef = urK(null);
  const onMove = ucK((e) => {
    const el = stageRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (frameRef.current) frameRef.current.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
  }, []);
  const onLeave = ucK(() => {
    if (frameRef.current) frameRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  }, []);
  return (
    <div className="portrait-stage" ref={stageRef} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="portrait-frame" ref={frameRef}>
        <img src="assets/portrait-school.jpg" className="portrait-img" alt="Chahel Paatur portrait" />
        <div className="portrait-veil"></div>
        <window.CornerBrackets />
        <span className="portrait-tag t1 mono">OPERATOR · 06</span>
        <span className="portrait-tag t2 mono">LIVE</span>
      </div>
    </div>
  );
}

/* === Hero =========================================================== */
function Hero() {
  const chahelRef = urK(null);
  const paaturRef = urK(null);
  ueK(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const range = window.innerHeight * 0.85;
      const p = Math.max(0, Math.min(1, y / range));
      if (chahelRef.current) {
        chahelRef.current.style.transform = `translateX(${-p * 110}vw)`;
        chahelRef.current.style.opacity = String(Math.max(0, 1 - p * 1.3));
      }
      if (paaturRef.current) {
        paaturRef.current.style.transform = `translateX(${p * 110}vw)`;
        paaturRef.current.style.opacity = String(Math.max(0, 1 - p * 1.3));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <section className="hero" id="top">
      <div className="hero-meta-top mono">
        <div className="pair"><span>Portfolio</span><span className="sep">/</span><span>2026</span></div>
        <div className="pair"><span>Tracy, CA</span><span className="sep">/</span><span>Pacific</span></div>
      </div>
      <div className="hero-left">
        <div>
          <window.Eyebrow>PHYSICAL AI / EMBEDDED SYSTEMS</window.Eyebrow>
          <h1 className="hero-name" style={{ marginTop: 18 }}>
            <span className="ln line-chahel" ref={chahelRef}>
              <window.Letters text="Chahel" delay={200} step={50} />
            </span>
            <span className="ln indent line-paatur" ref={paaturRef}>
              <window.Letters text="Paatur" delay={650} step={50} />
            </span>
          </h1>
        </div>
        <div className="hero-tag">
          <p>I build physical AI systems — autonomous drones, RF-localization meshes, and robotic platforms that have to think and act in the real world. Currently working on <strong>AETHER</strong>, a runtime that turns natural language into executable robotic behavior.</p>
          <div className="role-strip">
            <window.RoleChip accent>Available — Summer 2026</window.RoleChip>
            <window.RoleChip>Research collaborations</window.RoleChip>
            <window.RoleChip>Hardware × ML</window.RoleChip>
          </div>
        </div>
      </div>
      <div className="hero-right"><Portrait /></div>
    </section>
  );
}

/* === Marquee ======================================================== */
function Marquee() {
  const items = [
    { name: "AETHER", sub: "v0.4 · runtime" },
    { name: "SAURON", sub: "RF mesh" },
    { name: "Drone", sub: "FPV · autonomous", dim: true },
    { name: "FDIR", sub: "spacecraft" },
    { name: "ATLAS", sub: "humanoid", dim: true },
    { name: "Gaussian", sub: "language" },
    { name: "NeuroLang", sub: "framework", dim: true },
    { name: "Ionic Thruster", sub: "propulsion" }
  ];
  const block = (key) =>
    <span key={key}>
      {items.map((it, i) =>
        <React.Fragment key={key + i}>
          <span className={"marquee-item" + (it.dim ? " dim" : "")}>{it.name} <span className="sub">{it.sub}</span></span>
          <span className="marquee-sep" />
        </React.Fragment>
      )}
    </span>;
  return (
    <div className="marquee">
      <div className="marquee-track">{block("a")}{block("b")}</div>
    </div>
  );
}

/* === Project card =================================================== */
function Project({ num, name, sub, desc, tags, status, span, theme, badge, link, cornerLogos, children }) {
  const ref = urK(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", (e.clientX - r.left) / r.width * 100 + "%");
    ref.current.style.setProperty("--my", (e.clientY - r.top) / r.height * 100 + "%");
  };
  const Wrap = link ? "a" : "article";
  const wrapProps = link ? { href: link, target: "_blank", rel: "noreferrer" } : {};
  return (
    <Wrap ref={ref} className={`project ${span} reveal ${theme ? "theme-" + theme : ""}`} onMouseMove={onMove} {...wrapProps}>
      {cornerLogos
        ? <div className="corner-logos">
            {cornerLogos.map((c, i) =>
              <a key={i} href={c.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="corner-logo">
                <img src={c.src} alt={c.alt} />
                {c.label && <span className="mono">{c.label}</span>}
              </a>
            )}
          </div>
        : <div className="row">
            <span className="num">{num}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {badge}
              {status && <window.StatusPill kind={status.kind}>{status.label}</window.StatusPill>}
            </div>
          </div>}
      <div className="visual">{children}</div>
      <div className="name">{name}</div>
      <div className="sub mono">{sub}</div>
      <p className="desc">{desc}</p>
      <div className="tags">{tags.map((t) => <window.TagChip key={t}>{t}</window.TagChip>)}</div>
    </Wrap>
  );
}

function PalantirBadge() {
  return <span className="palantir-badge"><img src="assets/logo-palantir.png" alt="Palantir" /><span className="palantir-mark">Palantir</span></span>;
}

function CPMark() {
  return (
    <span className="cp-mark" aria-label="Chahel Paatur">
      <window.DotMark size={7} accent />
      <span className="cp-mark-text mono">CP</span>
    </span>
  );
}

/* === Project visuals (Sauron grid + Gaussian mock IDE + FDIR readout) */
function VizSauron() {
  const nodes = [{ x: 14, y: 30 }, { x: 35, y: 60 }, { x: 65, y: 25 }, { x: 86, y: 70 }, { x: 50, y: 85 }];
  const target = { x: 50, y: 50 };
  return (
    <div className="viz-sauron">
      <div className="grid">
        {nodes.map((n, i) => {
          const dx = target.x - n.x, dy = target.y - n.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <React.Fragment key={i}>
              <span className="line" style={{ left: n.x + "%", top: n.y + "%", width: len + "%", transform: `rotate(${ang}deg)` }} />
              <span className="node" style={{ left: n.x + "%", top: n.y + "%" }} />
            </React.Fragment>
          );
        })}
        <span className="target" style={{ left: target.x + "%", top: target.y + "%" }} />
      </div>
    </div>
  );
}
function VizGauss() {
  const [step, setStep] = usK(0);
  const codeLines = [
    { t: <><span className="cm">// gaussian/lang · build neural net</span></>, ms: 600 },
    { t: <><span className="kw">import</span> nnx <span className="kw">from</span> <span className="nm">"neurolang"</span></>, ms: 600 },
    { t: <><span className="kw">let</span> model = nnx.<span className="nm">sequential</span>([</>, ms: 500 },
    { t: <>{"  "}nnx.<span className="nm">dense</span>(784, 128, <span className="nm">"relu"</span>),</>, ms: 500 },
    { t: <>{"  "}nnx.<span className="nm">dense</span>(128, 10, <span className="nm">"softmax"</span>),</>, ms: 500 },
    { t: <>]);</>, ms: 500 },
    { t: <>model.<span className="nm">train</span>(data, epochs=<span className="ac">12</span>)<span className="caret" /></>, ms: 1200 }
  ];
  const consoleLines = [
    { kind: "", t: "> gauss compile main.gx" },
    { kind: "ok", t: "✓ parsed AST  · lowered IR" },
    { kind: "ok", t: "✓ codegen llvm · binary 14kb" },
    { kind: "ac", t: "▶ training…  loss ↓ 0.84 → 0.21" },
    { kind: "ok", t: "✓ model.bin saved  · acc 0.97" }
  ];
  ueK(() => {
    let i = 0; let cancelled = false;
    const next = () => {
      if (cancelled) return;
      i = (i + 1) % (codeLines.length + 3);
      setStep(i);
      setTimeout(next, i < codeLines.length ? 600 : 1100);
    };
    const id = setTimeout(next, 800);
    return () => { cancelled = true; clearTimeout(id); };
  }, []);
  const visibleCode = codeLines.slice(0, Math.min(step + 1, codeLines.length));
  const consoleShown = Math.max(0, step - codeLines.length + 1);
  return (
    <div className="viz-gauss">
      <div className="editor">
        <div className="editor-bar">
          <span className="dot live" /><span className="dot" /><span className="dot" />
          <span className="name">main.gx · gaussian</span>
        </div>
        <div className="editor-body">
          {visibleCode.map((ln, i) => <div key={i}>{ln.t}</div>)}
        </div>
      </div>
      <div className="console">
        {consoleLines.slice(0, consoleShown).map((c, i) => <div key={i} className={c.kind}>{c.t}</div>)}
      </div>
    </div>
  );
}
function VizFDIR() {
  return (
    <div className="viz-fdir"><div className="panel">
      <div className="ln ok"><span>SYS_PWR</span><span className="v">NOMINAL</span></div>
      <div className="ln ok"><span>RCS_A</span><span className="v">98.4%</span></div>
      <div className="ln warn"><span>IMU_DRIFT</span><span className="v">0.42°/s</span></div>
      <div className="ln crit"><span>THRUSTER_3</span><span className="v">FAULT</span></div>
      <hr />
      <div className="ln ok"><span>PPO_ACTION</span><span className="v">ISOLATE T3</span></div>
      <div className="ln ok"><span>CONFIDENCE</span><span className="v">0.94</span></div>
    </div></div>
  );
}

/* === Work ========================================================== */
function Work() {
  return (
    <section className="block" id="work">
      <window.BlockHeader tag="SELECTED WORK / 06" title={<>Systems that move, sense, <em>and decide.</em></>} />
      <div className="projects">
        <Project num="01 / AETHER" span="span-7" badge={<CPMark />} status={{ kind: "amber", label: "Active" }}
          link="https://github.com/ChahelPaatur/AETHER" name="AETHER" sub="Adaptive Embodied Task Hierarchy"
          desc="A physical-AI runtime that translates natural language into executable robotic actions across drones, rovers and humanoids. Full pipeline — perception, planning, execution, feedback, adaptation."
          tags={["VLA", "PPO", "PyTorch", "Cross-platform"]}><window.AetherScene /></Project>
        <Project num="02 / FLIGHT" span="span-5" theme="orange" status={{ kind: "live", label: "In flight" }}
          name="Autonomous Drone" sub="FPV + Onboard Compute"
          desc="Custom FPV airframe with SpeedyBee F7 + Raspberry Pi bridging autonomy and low-level motor control."
          tags={["F7", "RPi", "Sensor fusion"]}><window.DroneScene /></Project>
        <Project num="03 / SAURON" span="span-5" theme="red" badge={<PalantirBadge />} status={{ kind: "r", label: "2nd Overall" }}
          link="https://devpost.com/software/sauron-sfbc74"
          name="SAURON" sub="RF Search & Rescue"
          desc="Distributed ESP32 mesh using RSSI triangulation, hardened against signal noise and interference, with drone verification. Won the Palantir sponsor award at hackathon."
          tags={["ESP32", "RSSI", "RF", "Palantir"]}><window.SauronScene /></Project>
        <Project num="04 / FDIR" span="span-7" status={{ kind: "r", label: "Patent pending" }}
          name="Spacecraft FDIR" sub="Fault Detection & Isolation"
          desc="Hybrid DRL + rule-based safety system for spacecraft fault detection. PPO agent with hard safety constraints, simulated against 100+ failure modes."
          tags={["DRL", "PPO", "Safety", "Aerospace"]}><VizFDIR /></Project>
        <Project num="05 / ATLAS" span="span-6" status={{ kind: "", label: "In progress" }}
          name="Atlas" sub="Humanoid Engineering Assistant"
          desc="Desk-mounted physical-AI assistant with camera, projection and laser guidance. Detects wiring and components, overlays real-time instructions via voice."
          tags={["CV", "AR", "Humanoid"]}><window.HumanoidScene /></Project>
        <Project num="06 / LANG" span="span-6" theme="lang"
          cornerLogos={[
            { src: "assets/logo-gaussian.png", alt: "Gaussian", href: "https://www.gaussiancode.org/", label: "Gaussian" },
            { src: "assets/logo-neurolang.png", alt: "NeuroLang", href: "https://energy-fabric-40991681.figma.site/", label: "NeuroLang" }
          ]}
          name="Gaussian + NeuroLang" sub="A coding language I'm building"
          desc="Gaussian is a custom programming language I designed from scratch — full compiler architecture, 200+ downloads. NeuroLang is the companion ML framework that lets you ship neural nets in roughly twelve lines of code."
          tags={["Compilers", "DSL", "ML", "Open source"]}><VizGauss /></Project>
      </div>
    </section>
  );
}

/* === Research ====================================================== */
function Research() {
  const rows = [
    { yr: "2026", ttl: "Self-Modifying Program Synthesis via Online Library Evolution", desc: "Online library evolution for program synthesis under shifting task distributions.", venue: "TechRxiv", href: "https://www.techrxiv.org/doi/full/10.36227/techrxiv.176784644.48617663/v1" },
    { yr: "2025", ttl: "Microwave Technology in Aeronautical Applications", desc: "Survey of microwave systems in aerospace communication, sensing and propulsion.", venue: "engrXiv", href: "https://engrxiv.org/preprint/view/4612" },
    { yr: "2025", ttl: "DRL vs Rule-Based Systems for Spacecraft FDIR", desc: "Comparative study of deep RL and classical rule engines for safety-critical fault handling.", venue: "Academia", href: "https://www.academia.edu/129145181/The_Effectiveness_and_Comparison_of_Rule_Based_and_DRL_Agents_for_Simulated_Spacecraft_FDIR" },
    { yr: "2025", ttl: "Quantum vs Classical vs Hybrid Computing Paradigms", desc: "Performance and applicability across emerging hybrid compute stacks.", venue: "TechRxiv", href: "https://www.techrxiv.org/doi/full/10.36227/techrxiv.174585695.51861430/v1" }
  ];
  return (
    <section className="block" id="research">
      <window.BlockHeader tag="RESEARCH" title="Papers." />
      <div className="research-list reveal">
        {rows.map((r, i) =>
          <a className="research-row" key={i} href={r.href || "#"} target="_blank" rel="noreferrer">
            <span className="yr">{r.yr}</span>
            <span className="ttl">{r.ttl}</span>
            <span className="desc">{r.desc}</span>
            <span className="venue">{r.venue}</span>
            <span className="arrow"><window.ArrowRight /></span>
          </a>
        )}
      </div>
    </section>
  );
}

/* === Patents ======================================================= */
function Patents() {
  const items = [
    { ref: "Ref. 63/842,839", name: "AI-Based Spacecraft Fault Detection System", meta: "NON-PROVISIONAL · 2025" },
    { ref: "Provisional · WIP", name: "Eye-Tracking + Gesture-Based AR Interface for Assistive Tech", meta: "FILING IN PROGRESS · 2026" },
    { ref: "Regeneron STS", name: "Aerospace AI Fault Detection (FDIR) Submission", meta: "COMPETITION ENTRY · 2025" }
  ];
  return (
    <section className="block" id="patents">
      <window.BlockHeader tag="PATENTS" title="Filed." />
      <div className="patents reveal">
        {items.map((p, i) =>
          <div className="patent" key={i}>
            <div className="ref mono">{p.ref}</div>
            <div className="name">{p.name}</div>
            <div className="meta">{p.meta}</div>
          </div>
        )}
      </div>
    </section>
  );
}

/* === HireMe ======================================================== */
function HireMe() {
  return (
    <section className="hire" id="hire">
      <div className="hire-left">
        <div className="hire-eyebrow">Open — Summer 2026</div>
        <h2 className="hire-title reveal">
          Hire <span className="stroke">me</span>.<br />
          Build something <em style={{ color: "var(--accent)", fontStyle: "normal" }}>physical</em>.
        </h2>
        <p className="hire-sub reveal">Open to internships, lab placements, and research collaborations in robotics, autonomy, and aerospace. If you build hardware that has to think — get in touch.</p>
        <div className="hire-actions reveal">
          <window.Button variant="primary" href="mailto:chahelpaatur@gmail.com">chahelpaatur@gmail.com</window.Button>
          <window.Button href="https://www.linkedin.com/in/chahel-paatur-88a9b4229/" target="_blank">LinkedIn</window.Button>
          <window.Button href="assets/resume.pdf" target="_blank" glyph="download">Resume / CV</window.Button>
        </div>
      </div>
      <div className="hire-right reveal">
        <div className="hire-stat">
          <div className="num"><window.Counter to={8} duration={1200} /><span className="small">+</span></div>
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 18l1 2a3 3 0 0 0 2.5 1.5h11A3 3 0 0 0 20 20l1-2" />
            <path d="M4 14l8 2 8-2-1-3H5l-1 3z" />
            <path d="M12 16V5" />
            <path d="M12 5l5 4H7l5-4z" />
          </svg>
          <div className="label">Shipped projects</div>
        </div>
        <div className="hire-stat">
          <div className="num"><window.Counter to={4} duration={1100} /></div>
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 3h8l4 4v14H7z" />
            <path d="M15 3v4h4" />
            <path d="M10 12h6M10 16h6M10 8h2" />
          </svg>
          <div className="label">Research papers</div>
        </div>
        <div className="hire-stat">
          <div className="num"><window.Counter to={2} duration={1000} /></div>
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="9" r="5" />
            <path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
          </svg>
          <div className="label">Patents · filed/pending</div>
        </div>
        <div className="hire-stat">
          <div className="num"><window.Counter to={10} duration={1400} />K<span className="small">+</span></div>
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="9" r="3" />
            <circle cx="17" cy="10" r="2.4" />
            <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
            <path d="M14 19c0-2.4 2-4 4-4s3.5 1.6 3.5 4" />
          </svg>
          <div className="label">Users reached</div>
        </div>
      </div>
    </section>
  );
}

/* === Education ===================================================== */
function Education() {
  const schools = [
    { logo: "assets/logo-kimball.jpg", tag: "Current · 11th", name: "John C. Kimball High School", loc: "Tracy, CA", years: "2024 — 2027 · GPA 3.83 / 4.40w", crestClass: "kimball" },
    { logo: "assets/logo-paw-washington.png", tag: "Prior coursework", name: "Washington High School", loc: "Fremont, CA", years: "2023 — 2024", crestClass: "washington" },
    { logo: "assets/logo-uw.png", tag: "Target · Undergrad", name: "University of Washington", loc: "Seattle, WA", years: "Electrical & Computer Engineering · Applying 2027", crestClass: "uw" }
  ];
  return (
    <section className="block" id="education">
      <window.BlockHeader tag="EDUCATION" title="Schools." />
      <div className="schools">
        {schools.map((s) =>
          <article className="school reveal" key={s.name}>
            <div className="top">
              <div className={`crest ${s.crestClass || ""}`}><img src={s.logo} alt={s.name} /></div>
              <div className="meta"><span className="tag mono">{s.tag}</span></div>
            </div>
            <div className="name">{s.name}</div>
            <div className="loc">{s.loc}</div>
            <div className="years">{s.years}</div>
          </article>
        )}
      </div>
    </section>
  );
}

/* === Certifications ================================================ */
function Certifications() {
  const certs = [
    { logo: "assets/logo-stanford.png", logoKind: "circle", issuer: "Stanford University", year: "2023", name: "Statistics", skills: ["Math", "MATLAB"], desc: "Probability, descriptive and inferential statistics applied through MATLAB." },
    { logo: "assets/logo-mit.png", logoKind: "wide", issuer: "MIT BWSI", year: "2024", name: "Autonomous Air Vehicle Racing", skills: ["Aerospace", "Flight sim"], desc: "Designed and coded autonomous quadcopters for the BWSI summer racing track." },
    { logo: "assets/logo-mit.png", logoKind: "wide", issuer: "MIT BWSI", year: "2024", name: "Python Core", skills: ["Python", "PyTorch"], desc: "Foundations course feeding the BWSI summer programs — Python, numerics, PyTorch." },
    { logo: "assets/logo-mit.png", logoKind: "wide", issuer: "MIT · edX", year: "2023", name: "Astronautics & Human Spaceflight", skills: ["Aerospace"], desc: "Orbital mechanics, propulsion, and the engineering of human spaceflight systems." },
    { logo: "assets/logo-harvard.png", logoKind: "harvard", issuer: "Harvard University", year: "2021", name: "CS50x", skills: ["Algorithms", "Web dev"], desc: "Harvard's intro to computer science — algorithms, data structures, C, Python, web." },
    { logo: "assets/logo-uiuc.jpeg", logoKind: "circle", issuer: "UIUC", year: "2022", name: "Accelerated CS Fundamentals", skills: ["C++", "Data structures"], desc: "Object-oriented data structures and algorithms in C++ — the accelerated track." },
    { logo: "assets/logo-michigan.png", logoKind: "circle", issuer: "U. of Michigan", year: "—", name: "Python 3 Programming", skills: ["Python", "OOP"], desc: "Five-course specialization in Python 3 — classes, files, data, and applications." },
    { logo: "assets/logo-autodesk.png", logoKind: "circle", issuer: "Autodesk · Udemy", year: "—", name: "Fusion 360 Certified", skills: ["CAD", "+7"], desc: "Parametric 3D CAD modeling for product design, simulation and fabrication." },
    { logo: "assets/logo-uci.png", logoKind: "circle", issuer: "UC Irvine", year: "2025", name: "GATI Research Program", skills: ["Research", "AI"], desc: "Applied AI and engineering research methodology under UC Irvine faculty mentorship." }
  ];
  return (
    <section className="block" id="certs">
      <window.BlockHeader tag="CERTIFICATIONS" title="Certifications" />
      <div className="certs">
        {certs.map((c, i) =>
          <article className="cert reveal" key={i}>
            <div className="cert-top">
              <div className="issuer mono">{c.issuer}</div>
              <div className="year mono">{c.year}</div>
            </div>
            <div className="name">{c.name}</div>
            <p className="cert-desc">{c.desc}</p>
            <div className="cert-foot">
              <div className="skills">{c.skills.map((s) => <span key={s}>{s}</span>)}</div>
              <div className={`logo${c.logoKind ? " logo-" + c.logoKind : ""}`}><img src={c.logo} alt={c.issuer} /></div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

/* === Leadership ==================================================== */
function Leadership() {
  const items = [
    { role: "Int'l Vice President", name: "PII Research Network", desc: "Expanded the network to 20+ schools globally and 1,000+ student researchers. Built the mentorship pipeline and engineering project tracks.", href: "https://www.pii-international.org/", logo: "assets/logo-pii.png", logoKind: "square" },
    { role: "Sponsor Award · 2nd Overall", name: "Palantir Technologies", desc: "SAURON — RF-based search & rescue — picked up the Palantir sponsor award at hackathon for the distributed ESP32 mesh + drone verification pipeline.", href: "https://www.palantir.com/", logo: "assets/logo-palantir.png", logoKind: "wide" },
    { role: "Regional Champion", name: "Science Olympiad", desc: "First place regional in the Chemistry event; contributed to multi-event team placements across the season.", href: "#", logo: "assets/logo-sof.jpeg", logoKind: "square" },
    { role: "Research · Student Network", name: "Princeton University", desc: "Working with a couple of Princeton students I know on physical-AI research threads — shared problem framings, paper drafts and review.", href: "https://www.princeton.edu/", logo: "assets/logo-princeton.png", logoKind: "square" },
    { role: "Invited Collaborator", name: "University of Oxford", desc: "Invited to engage with an Oxford research program. Did some collaborative work alongside the cohort — didn't formally enroll.", href: "https://www.ox.ac.uk/", logo: "assets/logo-oxford.jpeg", logoKind: "square" },
    { role: "GATI Research Fellow", name: "UC Irvine", desc: "Applied AI and engineering research methodology under UC Irvine faculty mentorship through the GATI program.", href: "https://uci.edu/", logo: "assets/logo-uci.png", logoKind: "square" }
  ];
  return (
    <section className="block" id="leadership">
      <window.BlockHeader tag="LEADERSHIP / NETWORK" title={<>Built <em>with.</em></>} />
      <div className="leadership-grid">
        {items.map((it, i) =>
          <a className="lead-card reveal" key={i} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            <div className="lead-top">
              <div className={`lead-logo${it.markClass ? " " + it.markClass : ""}${it.logoKind ? " lead-logo-" + it.logoKind : ""}`}>{it.logo ? <img src={it.logo} alt={it.name} /> : <span className="mono">{it.mark}</span>}</div>
              <div className="lead-role mono">{it.role}</div>
            </div>
            <div className="lead-name">{it.name}</div>
            <p className="lead-desc">{it.desc}</p>
            <div className="lead-cta mono">Visit <window.ArrowGlyph size={12} /></div>
          </a>
        )}
      </div>
    </section>
  );
}

/* === About ========================================================= */
function About() {
  return (
    <section className="block" id="about">
      <window.BlockHeader tag="ABOUT" title="Operator." />
      <div className="about-grid">
        <p className="about-bio reveal">High-school junior in Tracy, CA. I spend most of my time building autonomous drones, writing fault-detection systems for spacecraft, and publishing research on physical AI. Outside the lab I run the PII Research Network — 1,000+ student researchers across 20+ schools.</p>
        <div className="about-meta reveal">
          <div className="cell"><div className="label">Based</div><div className="val lg">Tracy, CA</div></div>
          <div className="cell"><div className="label">GPA</div><div className="val lg">3.83 / 4.40w</div></div>
          <div className="cell"><div className="label">Languages</div><div className="val">Python · C/C++ · Java · TypeScript · SQL</div></div>
          <div className="cell"><div className="label">Stack</div><div className="val">PyTorch · ESP32 · RPi · Fusion 360</div></div>
          <div className="cell"><div className="label">Network</div><div className="val">PII Research · UC Irvine GATI</div></div>
          <div className="cell"><div className="label">Reach</div><div className="val">10K+ users · 1K+ researchers</div></div>
        </div>
      </div>
    </section>
  );
}

/* === Contact + Footer ============================================== */
function useClock(tz = "America/Los_Angeles") {
  const [t, setT] = usK("");
  ueK(() => {
    const tick = () => {
      try { setT(new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })); } catch { setT(""); }
    };
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [tz]);
  return t;
}
function Contact() {
  const clock = useClock();
  return (
    <section className="contact" id="contact">
      <div className="block-head reveal"><div className="block-tag mono">CONTACT / OPEN</div><div></div></div>
      <div className="contact-grid">
        <div className="reveal">
          <h2 className="contact-title">Get in <em>touch.</em></h2>
          <a href="mailto:chahelpaatur@gmail.com" className="contact-mail">chahelpaatur@gmail.com<window.ArrowGlyph size={18} /></a>
        </div>
        <div className="contact-meta reveal">
          <div className="field"><div className="label">PHONE</div><div className="val">925 · 475 · 9513</div></div>
          <div className="field"><div className="label">LINKEDIN</div><div className="val"><a href="https://www.linkedin.com/in/chahel-paatur-88a9b4229/" target="_blank" rel="noreferrer">/in/chahel-paatur</a></div></div>
          <div className="field"><div className="label">GITHUB</div><div className="val"><a href="https://github.com/ChahelPaatur" target="_blank" rel="noreferrer">@ChahelPaatur</a></div></div>
          <div className="field"><div className="label">LOCAL TIME</div><div className="val mono">{clock} PT</div></div>
        </div>
      </div>
    </section>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 · CHAHEL PAATUR</span>
      <div className="social-row">
        <a href="https://www.linkedin.com/in/chahel-paatur-88a9b4229/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><img src="assets/icon-linkedin.png" alt="" /></a>
        <a href="https://github.com/ChahelPaatur" target="_blank" rel="noreferrer" aria-label="GitHub"><img src="assets/icon-github.png" alt="" /></a>
        <a href="#" aria-label="Instagram"><img src="assets/icon-instagram.png" alt="" /></a>
      </div>
      <span>TRACY, CA</span>
    </footer>
  );
}

Object.assign(window, {
  Nav, Hero, Marquee, Work, Research, Patents, HireMe,
  Education, Certifications, Leadership, About, Contact, Footer
});

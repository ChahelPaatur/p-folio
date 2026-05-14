/* === 3D Scenes — GLB model viewers with CSS 3D fallback ============= */
var _r3 = React;

/* --- Detect WebGL support -------------------------------------------- */
var _webglOk = (function () {
  try {
    var c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch (e) { return false; }
})();

/* --- Wait for Three.js + GLTFLoader (loaded via ES module in HTML) --- */
function loadThree() {
  if (window.THREE && window.THREE.GLTFLoader) return Promise.resolve(window.THREE);
  return new Promise(function (resolve) {
    window.addEventListener("three-ready", function () { resolve(window.THREE); }, { once: true });
    /* safety timeout — if module already fired before this listener */
    setTimeout(function () {
      if (window.THREE && window.THREE.GLTFLoader) resolve(window.THREE);
    }, 100);
  });
}

/* --- GLB Model Viewer component -------------------------------------- */
function ModelViewer(props) {
  var url = props.url;
  var label = props.label;
  var autoSpeed = props.autoSpeed || 0.004;

  var containerRef = _r3.useRef(null);
  var stateRef = _r3.useRef({});
  var _s = _r3.useState("loading");
  var status = _s[0], setStatus = _s[1];
  var _p = _r3.useState(0);
  var progress = _p[0], setProgress = _p[1];
  var _e = _r3.useState("");
  var errMsg = _e[0], setErrMsg = _e[1];

  _r3.useEffect(function () {
    var el = containerRef.current;
    if (!el) return;
    var cancelled = false;

    loadThree()
      .then(function (T) {
        if (cancelled) return;
        var scene = new T.Scene();
        var w = el.clientWidth || 400;
        var h = el.clientHeight || 380;
        var camera = new T.PerspectiveCamera(35, w / h, 0.01, 1000);
        var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        el.appendChild(renderer.domElement);

        /* lighting */
        scene.add(new T.AmbientLight(0xffffff, 1.2));
        var key = new T.DirectionalLight(0xffffff, 1.8);
        key.position.set(5, 10, 7); scene.add(key);
        var fill = new T.DirectionalLight(0x8899cc, 0.8);
        fill.position.set(-6, -3, -5); scene.add(fill);
        var rim = new T.DirectionalLight(0xaabbff, 1.0);
        rim.position.set(0, 5, -10); scene.add(rim);
        var top = new T.DirectionalLight(0xffffff, 0.6);
        top.position.set(0, 12, 0); scene.add(top);
        var bottom = new T.DirectionalLight(0x445566, 0.4);
        bottom.position.set(0, -8, 3); scene.add(bottom);

        /* interaction state */
        var s = stateRef.current;
        s.drag = false; s.rotX = 0; s.rotY = 0;
        s.lx = 0; s.ly = 0; s.zoom = 1; s.pivot = null;

        /* load GLB */
        var loader = new T.GLTFLoader();
        loader.load(
          url,
          function (gltf) {
            if (cancelled) return;
            var model = gltf.scene;

            /* compute full bounding box, center model perfectly */
            var box = new T.Box3().setFromObject(model);
            var center = new T.Vector3();
            box.getCenter(center);
            model.position.sub(center);

            /* scale to fit view */
            var size = new T.Vector3();
            box.getSize(size);
            var maxDim = Math.max(size.x, size.y, size.z);
            var scaleFactor = 2.2 / maxDim;
            model.scale.setScalar(scaleFactor);

            /* create a pivot group for rotation */
            var pivot = new T.Group();
            pivot.add(model);
            scene.add(pivot);
            s.pivot = pivot;

            /* position camera to frame the model */
            camera.position.set(0, 0.3, 3.5);
            camera.lookAt(0, 0, 0);

            if (!cancelled) setStatus("ready");
          },
          function (xhr) {
            if (xhr.total > 0 && !cancelled) {
              setProgress(Math.round((xhr.loaded / xhr.total) * 100));
            }
          },
          function (err) {
            if (!cancelled) { setErrMsg("Failed to load model"); setStatus("error"); }
          }
        );

        /* mouse interaction */
        var cvs = renderer.domElement;
        cvs.style.cursor = "grab";
        var onDown = function (e) { s.drag = true; s.lx = e.clientX; s.ly = e.clientY; cvs.style.cursor = "grabbing"; };
        var onMove = function (e) {
          if (!s.drag) return;
          s.rotY += (e.clientX - s.lx) * 0.008;
          s.rotX += (e.clientY - s.ly) * 0.008;
          s.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.rotX));
          s.lx = e.clientX; s.ly = e.clientY;
        };
        var onUp = function () { s.drag = false; cvs.style.cursor = "grab"; };
        var onWheel = function (e) { e.preventDefault(); s.zoom = Math.max(0.4, Math.min(3, s.zoom * (1 - e.deltaY * 0.001))); };
        var onTS = function (e) { if (e.touches.length === 1) { s.drag = true; s.lx = e.touches[0].clientX; s.ly = e.touches[0].clientY; } };
        var onTM = function (e) {
          if (!s.drag || e.touches.length !== 1) return; e.preventDefault();
          s.rotY += (e.touches[0].clientX - s.lx) * 0.008;
          s.rotX += (e.touches[0].clientY - s.ly) * 0.008;
          s.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.rotX));
          s.lx = e.touches[0].clientX; s.ly = e.touches[0].clientY;
        };
        var onTE = function () { s.drag = false; };

        cvs.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        cvs.addEventListener("wheel", onWheel, { passive: false });
        cvs.addEventListener("touchstart", onTS, { passive: true });
        cvs.addEventListener("touchmove", onTM, { passive: false });
        cvs.addEventListener("touchend", onTE);

        /* render loop */
        var raf;
        var animate = function () {
          raf = requestAnimationFrame(animate);
          if (s.pivot) {
            if (!s.drag) s.rotY += autoSpeed;
            s.pivot.rotation.x = s.rotX;
            s.pivot.rotation.y = s.rotY;
          }
          camera.position.z = 3.5 / s.zoom;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        animate();

        /* resize */
        var ro = new ResizeObserver(function () {
          var rw = el.clientWidth, rh = el.clientHeight;
          if (rw === 0 || rh === 0) return;
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        });
        ro.observe(el);

        s._cleanup = function () {
          cancelAnimationFrame(raf); ro.disconnect();
          cvs.removeEventListener("mousedown", onDown);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          cvs.removeEventListener("wheel", onWheel);
          cvs.removeEventListener("touchstart", onTS);
          cvs.removeEventListener("touchmove", onTM);
          cvs.removeEventListener("touchend", onTE);
          renderer.dispose();
          if (el.contains(cvs)) el.removeChild(cvs);
        };
      })
      .catch(function (e) {
        if (!cancelled) { setErrMsg(e.message || "3D engine failed"); setStatus("error"); }
      });

    return function () {
      cancelled = true;
      if (stateRef.current._cleanup) stateRef.current._cleanup();
    };
  }, [url]);

  return (
    <div className="stl-viewer" ref={containerRef}>
      {status === "loading" && (
        <div className="stl-loading">
          <div className="stl-spinner" />
          <span className="mono stl-pct">{progress > 0 ? progress + "%" : "Loading model\u2026"}</span>
        </div>
      )}
      {status === "error" && <div className="stl-error mono">{errMsg}</div>}
      {label && <div className="stl-label mono">{label}</div>}
      {status === "ready" && <div className="stl-hint mono">drag to rotate</div>}
    </div>
  );
}

/* =====================================================================
   CSS 3D FALLBACK SCENES (used when WebGL is unavailable)
   ===================================================================== */
function DroneFallback() {
  return (
    <div className="drone3d">
      <div className="drone3d-stage">
        <div className="drone-grid"></div>
        <div className="drone-body">
          <div className="drone-arm a1"></div>
          <div className="drone-arm a2"></div>
          <div className="drone-core"><div className="drone-fpv"></div></div>
          <div className="drone-motor m1"><div className="drone-prop"></div><div className="drone-disc"></div></div>
          <div className="drone-motor m2"><div className="drone-prop r"></div><div className="drone-disc"></div></div>
          <div className="drone-motor m3"><div className="drone-prop"></div><div className="drone-disc"></div></div>
          <div className="drone-motor m4"><div className="drone-prop r"></div><div className="drone-disc"></div></div>
        </div>
      </div>
    </div>
  );
}
function SauronFallback() {
  var nodes = [{ x: 14, y: 30 }, { x: 35, y: 60 }, { x: 65, y: 25 }, { x: 86, y: 70 }, { x: 50, y: 85 }];
  var target = { x: 50, y: 50 };
  return (
    <div className="viz-sauron">
      <div className="grid">
        {nodes.map(function (n, i) {
          var dx = target.x - n.x, dy = target.y - n.y;
          var len = Math.sqrt(dx * dx + dy * dy);
          var ang = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <React.Fragment key={i}>
              <span className="line" style={{ left: n.x + "%", top: n.y + "%", width: len + "%", transform: "rotate(" + ang + "deg)" }} />
              <span className="node" style={{ left: n.x + "%", top: n.y + "%" }} />
            </React.Fragment>
          );
        })}
        <span className="target" style={{ left: target.x + "%", top: target.y + "%" }} />
      </div>
    </div>
  );
}
function HumanoidFallback() {
  return (
    <div className="humanoid3d">
      <div className="humanoid-floor"></div>
      <svg viewBox="0 0 200 280" className="humanoid-svg">
        <defs>
          <linearGradient id="hum-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d1d22" />
            <stop offset="1" stopColor="#0e0e11" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="270" rx="56" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <g className="hum-leg-l">
          <rect x="84" y="170" width="14" height="60" rx="4" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="83" y="226" width="16" height="40" rx="3" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <ellipse cx="91" cy="266" rx="12" ry="4" fill="#16161a" stroke="#39393f" />
        </g>
        <g className="hum-leg-r">
          <rect x="102" y="170" width="14" height="60" rx="4" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="101" y="226" width="16" height="40" rx="3" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <ellipse cx="109" cy="266" rx="12" ry="4" fill="#16161a" stroke="#39393f" />
        </g>
        <g className="hum-torso">
          <rect x="72" y="90" width="56" height="62" rx="6" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="78" y="152" width="44" height="28" rx="4" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="86" y="108" width="28" height="3" fill="currentColor" />
          <circle cx="100" cy="124" r="3" fill="currentColor" opacity="0.7" />
          <circle cx="100" cy="124" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5">
            <animate attributeName="r" values="3;9;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
        <g className="hum-arm hum-arm-l">
          <rect x="56" y="92" width="14" height="50" rx="5" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="56" y="138" width="14" height="46" rx="4" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="54" y="180" width="18" height="14" rx="3" fill="#16161a" stroke="#39393f" strokeWidth="0.6" />
        </g>
        <g className="hum-arm hum-arm-r">
          <rect x="130" y="92" width="14" height="50" rx="5" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="130" y="138" width="14" height="46" rx="4" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="128" y="180" width="18" height="14" rx="3" fill="#16161a" stroke="#39393f" strokeWidth="0.6" />
        </g>
        <g className="hum-head">
          <rect x="78" y="40" width="44" height="52" rx="10" fill="url(#hum-body)" stroke="#39393f" strokeWidth="0.6" />
          <rect x="82" y="58" width="36" height="10" rx="2" fill="#0a0a0c" stroke="currentColor" strokeWidth="0.5" />
          <rect x="85" y="61" width="30" height="4" fill="currentColor" opacity="0.9" />
          <line x1="100" y1="40" x2="100" y2="30" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="100" cy="28" r="2" fill="currentColor" />
        </g>
      </svg>
      <div className="humanoid-tag mono">ATLAS-01 / IDLE</div>
    </div>
  );
}

/* =====================================================================
   PUBLIC SCENE COMPONENTS — auto-select WebGL or CSS fallback
   ===================================================================== */
function DroneScene() {
  if (!_webglOk) return <DroneFallback />;
  return <ModelViewer url="models/drone.glb" label="DRONE / FPV" />;
}
function SauronScene() {
  if (!_webglOk) return <SauronFallback />;
  return <ModelViewer url="models/sauron.glb" label="SAURON / RF" />;
}
function HumanoidScene() {
  if (!_webglOk) return <HumanoidFallback />;
  return <ModelViewer url="models/atlas.glb" label="ATLAS-01 / IDLE" />;
}

/* === AETHER: SVG wireframe icosahedron + ASCII ======================= */
function AetherScene() {
  var phi = (1 + Math.sqrt(5)) / 2;
  var raw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  var _ph = _r3.useState(0);
  var phase = _ph[0], setPhase = _ph[1];
  _r3.useEffect(function () {
    var raf; var t0 = performance.now();
    var loop = function () { setPhase((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="aether3d">
      <div className="aether-mark mono" style={{ color: "rgb(255, 127, 0)" }}>AETHER</div>
      <pre className="aether-ascii">{`    ████████████████████████████████
   █░██████████████████████████████░█
  █░████╔═══════════════════╗████░█
  █░████║  ▄████▄   ▄████▄  ║████░█
  █░████║ ████████████████ ║████░█
  █░████║ ██░██████████░██ ║████░█
  █░████║ █▀▀████████▀▀█ ║████░█
  █░████║  ▀████▀   ▀████▀  ║████░█
  █░████║▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄║████░█
  █░████║  ━━━━━━━━━━━━━━━  ║████░█
  █░████║  ▌ AETHER  v3 ▐  ║████░█
  █░████║  ━━━━━━━━━━━━━━━  ║████░█
  █░████╚═══════════════════╝████░█
   █░██████████████████████████████░█
    ████████████████████████████████`}</pre>
    </div>
  );
}

Object.assign(window, { DroneScene: DroneScene, AetherScene: AetherScene, HumanoidScene: HumanoidScene, SauronScene: SauronScene });

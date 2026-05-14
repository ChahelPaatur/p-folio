/* === 3D Scenes — STL viewers with CSS 3D fallback =================== */
var _r3 = React;

/* --- Detect WebGL support -------------------------------------------- */
var _webglOk = (function () {
  try {
    var c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch (e) { return false; }
})();

/* --- Load Three.js on demand ----------------------------------------- */
var _threePromise = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (_threePromise) return _threePromise;
  _threePromise = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = "https://unpkg.com/three@0.158.0/build/three.min.js";
    s.onload = function () { resolve(window.THREE); };
    s.onerror = function () { reject(new Error("Failed to load 3D engine")); };
    document.head.appendChild(s);
  });
  return _threePromise;
}

/* --- Binary STL parser ----------------------------------------------- */
function parseSTLBinary(buffer) {
  var dv = new DataView(buffer);
  var numTri = dv.getUint32(80, true);
  var positions = new Float32Array(numTri * 9);
  var normals = new Float32Array(numTri * 9);
  var off = 84;
  for (var i = 0; i < numTri; i++) {
    var nx = dv.getFloat32(off, true);
    var ny = dv.getFloat32(off + 4, true);
    var nz = dv.getFloat32(off + 8, true);
    off += 12;
    for (var v = 0; v < 3; v++) {
      var idx = i * 9 + v * 3;
      positions[idx]     = dv.getFloat32(off, true);
      positions[idx + 1] = dv.getFloat32(off + 4, true);
      positions[idx + 2] = dv.getFloat32(off + 8, true);
      normals[idx]     = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;
      off += 12;
    }
    off += 2;
  }
  return { positions: positions, normals: normals };
}

/* --- Fetch with progress --------------------------------------------- */
function fetchWithProgress(url, onProgress) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error("Model not found (" + res.status + ")");
    var total = parseInt(res.headers.get("content-length") || "0", 10);
    var reader = res.body.getReader();
    var chunks = [];
    var received = 0;
    function pump() {
      return reader.read().then(function (result) {
        if (result.done) return new Blob(chunks).arrayBuffer();
        chunks.push(result.value);
        received += result.value.length;
        if (total > 0) onProgress(Math.round((received / total) * 100));
        return pump();
      });
    }
    return pump();
  });
}

/* --- WebGL STL Viewer component -------------------------------------- */
function STLViewer(props) {
  var url = props.url;
  var label = props.label;
  var color = props.color || 0x5bb1e8;
  var emissive = props.emissive || 0x112233;
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
        var w = el.clientWidth || 300;
        var h = el.clientHeight || 260;
        var camera = new T.PerspectiveCamera(40, w / h, 0.1, 10000);
        var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        scene.add(new T.AmbientLight(0xffffff, 0.7));
        var key = new T.DirectionalLight(0xffffff, 1.4);
        key.position.set(5, 10, 7); scene.add(key);
        var fill = new T.DirectionalLight(0x8899cc, 0.6);
        fill.position.set(-6, -3, -5); scene.add(fill);
        var rim = new T.DirectionalLight(0xaabbff, 0.8);
        rim.position.set(0, 5, -10); scene.add(rim);
        var top = new T.DirectionalLight(0xffffff, 0.5);
        top.position.set(0, 12, 0); scene.add(top);

        var s = stateRef.current;
        s.drag = false; s.rotX = -0.2; s.rotY = 0;
        s.lx = 0; s.ly = 0; s.zoom = 1; s.mesh = null;

        return fetchWithProgress(url, function (pct) {
          if (!cancelled) setProgress(pct);
        }).then(function (buf) {
          if (cancelled) return;
          var parsed = parseSTLBinary(buf);
          var geo = new T.BufferGeometry();
          geo.setAttribute("position", new T.BufferAttribute(parsed.positions, 3));
          geo.setAttribute("normal", new T.BufferAttribute(parsed.normals, 3));
          geo.computeBoundingBox();
          geo.computeBoundingSphere();

          var mat = new T.MeshPhongMaterial({
            color: color, emissive: emissive, emissiveIntensity: 0.25,
            specular: 0x999999, shininess: 90,
            reflectivity: 0.8,
          });
          var mesh = new T.Mesh(geo, mat);
          var box = geo.boundingBox;
          var center = new T.Vector3(); box.getCenter(center);
          mesh.position.sub(center);
          var size = new T.Vector3(); box.getSize(size);
          mesh.scale.setScalar(200 / Math.max(size.x, size.y, size.z));

          scene.add(mesh);
          camera.position.set(0, 15, 90);
          camera.lookAt(0, 0, 0);
          s.mesh = mesh;
          if (!cancelled) setStatus("ready");

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

          var raf;
          var animate = function () {
            raf = requestAnimationFrame(animate);
            if (s.mesh) {
              if (!s.drag) s.rotY += autoSpeed;
              s.mesh.rotation.x = s.rotX;
              s.mesh.rotation.y = s.rotY;
            }
            camera.position.z = 90 / s.zoom;
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
          };
          animate();

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
        });
      })
      .catch(function (e) {
        if (!cancelled) { setErrMsg(e.message); setStatus("error"); }
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

/* --- CSS Drone fallback ---------------------------------------------- */
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

/* --- CSS Sauron fallback (RF mesh viz) ------------------------------- */
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

/* --- CSS Humanoid fallback ------------------------------------------- */
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
  return <STLViewer url="models/drone-web.stl" label="DRONE / FPV" color={0xe08030} emissive={0x331800} />;
}
function SauronScene() {
  if (!_webglOk) return <SauronFallback />;
  return <STLViewer url="models/sauron-web.stl" label="SAURON / RF" color={0xcc3333} emissive={0x330808} />;
}
function HumanoidScene() {
  if (!_webglOk) return <HumanoidFallback />;
  return <STLViewer url="models/atlas-web.stl" label="ATLAS-01 / IDLE" color={0x5bb1e8} emissive={0x0a1a2a} />;
}

/* === AETHER: SVG wireframe icosahedron + ASCII ======================= */
function AetherScene() {
  var phi = (1 + Math.sqrt(5)) / 2;
  var raw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  var edges = [
    [0, 1], [0, 5], [0, 7], [0, 10], [0, 11], [1, 5], [1, 7], [1, 8], [1, 9],
    [2, 3], [2, 4], [2, 6], [2, 10], [2, 11], [3, 4], [3, 6], [3, 8], [3, 9],
    [4, 5], [4, 9], [4, 11], [5, 9], [5, 11], [6, 7], [6, 8], [6, 10],
    [7, 8], [7, 10], [8, 9], [10, 11]
  ];
  var _ph = _r3.useState(0);
  var phase = _ph[0], setPhase = _ph[1];
  _r3.useEffect(function () {
    var raf; var t0 = performance.now();
    var loop = function () { setPhase((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); };
  }, []);
  var project = function (p, ax, ay) {
    var ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
    var x = p[0], y = p[1], z = p[2];
    var x1 = x * cb + z * sb, z1 = -x * sb + z * cb;
    var y1 = y * ca - z1 * sa, z2 = y * sa + z1 * ca;
    var f = 4 / (4 - z2);
    return { x: x1 * f, y: y1 * f, z: z2, depth: (z2 + 2) / 4 };
  };
  var ax = phase * 0.4, ay = phase * 0.6;
  var pts = raw.map(function (p) { return project(p, ax, ay); });
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

/* === 3D models: STL viewers with a LIDAR-style scan reveal ===========
   Each model arrives as an orange point cloud. When it scrolls into view
   a scan ring sweeps bottom to top and the solid mesh fills in behind it.
   Drag to orbit (with inertia), double-click to rescan.
   Helpers (clamp, onFrame, easeInOut, ...) are globals from motion.jsx.
   ==================================================================== */
var _r3 = React;

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
    s.onerror = function () { reject(new Error("3D engine failed to load")); };
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
  return { positions: positions, normals: normals, tris: numTri };
}

/* --- Smooth normals ---------------------------------------------------
   The web STLs are decimated, so flat facet normals look like static.
   Average normals across triangles that share a vertex, but keep the
   facet normal where the surface folds sharper than ~55°. */
function smoothNormals(positions, normals) {
  var count = positions.length / 3;
  var ids = new Uint32Array(count);
  var map = new Map();
  var acc = [];
  var q = 1e4;
  for (var i = 0; i < count; i++) {
    var k = Math.round(positions[i * 3] * q) + "," + Math.round(positions[i * 3 + 1] * q) + "," + Math.round(positions[i * 3 + 2] * q);
    var id = map.get(k);
    if (id === undefined) { id = acc.length / 3; map.set(k, id); acc.push(0, 0, 0); }
    ids[i] = id;
    acc[id * 3] += normals[i * 3];
    acc[id * 3 + 1] += normals[i * 3 + 1];
    acc[id * 3 + 2] += normals[i * 3 + 2];
  }
  var out = new Float32Array(positions.length);
  var crease = Math.cos(55 * Math.PI / 180);
  for (var j = 0; j < count; j++) {
    var a = ids[j] * 3;
    var x = acc[a], y = acc[a + 1], z = acc[a + 2];
    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    x /= len; y /= len; z /= len;
    var fx = normals[j * 3], fy = normals[j * 3 + 1], fz = normals[j * 3 + 2];
    if (x * fx + y * fy + z * fz < crease) { x = fx; y = fy; z = fz; }
    out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = z;
  }
  return out;
}

/* --- Fetch with progress --------------------------------------------- */
function fetchWithProgress(url, onProgress) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error("Model not found (" + res.status + ")");
    var total = parseInt(res.headers.get("content-length") || "0", 10);
    if (!res.body || !res.body.getReader) return res.arrayBuffer();
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

/* --- STL Model Viewer ------------------------------------------------ */
function ModelViewer(props) {
  var url = props.url;
  var label = props.label;
  var autoSpeed = props.autoSpeed || 0.0035;
  var tilt = props.tilt == null ? -0.18 : props.tilt;

  var hostRef = _r3.useRef(null);
  var _ph = _r3.useState("idle");
  var phase = _ph[0], setPhase = _ph[1];
  var _pc = _r3.useState(0);
  var pct = _pc[0], setPct = _pc[1];
  var _tr = _r3.useState(0);
  var tris = _tr[0], setTris = _tr[1];
  var _er = _r3.useState("");
  var errMsg = _er[0], setErrMsg = _er[1];

  _r3.useEffect(function () {
    var el = hostRef.current;
    if (!el) return;
    var disposed = false, started = false, visible = false;
    var api = null;

    function boot() {
      setPhase("fetch");
      loadThree()
        .then(function (T) {
          return fetchWithProgress(url, function (p) { if (!disposed) setPct(p); })
            .then(function (buf) { if (!disposed) api = mount(T, buf); });
        })
        .catch(function (e) {
          if (!disposed) { setErrMsg(e.message || "3D failed"); setPhase("error"); }
        });
    }

    function mount(T, buf) {
      var w = el.clientWidth || 400, h = el.clientHeight || 400;
      var scene = new T.Scene();
      var camera = new T.PerspectiveCamera(32, w / h, 0.01, 100);
      camera.position.set(0, 0.55, 4.6);
      camera.lookAt(0, -0.05, 0);

      var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.localClippingEnabled = true;
      el.appendChild(renderer.domElement);

      /* Lighting: warm key, orange rim from behind, cool fill from below */
      scene.add(new T.AmbientLight(0xffffff, 0.3));
      var key = new T.DirectionalLight(0xfff4e6, 1.6); key.position.set(4, 7, 6); scene.add(key);
      var rim = new T.DirectionalLight(0xff5b1f, 2.1); rim.position.set(-5, 3, -6); scene.add(rim);
      var rim2 = new T.DirectionalLight(0xff8a4f, 0.9); rim2.position.set(6, 1, -4); scene.add(rim2);
      var fill = new T.DirectionalLight(0x8fa6c4, 0.55); fill.position.set(-6, -4, 4); scene.add(fill);

      var parsed = parseSTLBinary(buf);
      var geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(parsed.positions, 3));
      geo.setAttribute("normal", new T.BufferAttribute(smoothNormals(parsed.positions, parsed.normals), 3));
      /* Z-up models (the drone) get laid flat so they spin like they're on a turntable */
      if (props.zUp) geo.rotateX(-Math.PI / 2);
      geo.computeBoundingBox();
      var center = new T.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      var size = new T.Vector3();
      geo.boundingBox.getSize(size);
      var scale = 2.05 / Math.max(size.x, size.y, size.z);
      var radius = geo.boundingSphere.radius * scale;

      /* Clip planes are in world space, so the scan line stays level while the model turns */
      var solidPlane = new T.Plane(new T.Vector3(0, -1, 0), -radius);
      var cloudPlane = new T.Plane(new T.Vector3(0, 1, 0), radius);

      var mat = new T.MeshPhongMaterial({
        color: 0xd6cfc2, specular: 0x3a342e, shininess: 38,
        emissive: 0x120804, clippingPlanes: [solidPlane]
      });
      var mesh = new T.Mesh(geo, mat);
      mesh.scale.setScalar(scale);

      /* Point cloud: subsample vertices to roughly 40k points */
      var total = parsed.positions.length / 3;
      var stride = Math.max(1, Math.floor(total / 40000));
      var count = Math.floor(total / stride);
      var cloudPos = new Float32Array(count * 3);
      for (var i = 0, j = 0; i < count; i++, j += stride) {
        cloudPos[i * 3] = parsed.positions[j * 3];
        cloudPos[i * 3 + 1] = parsed.positions[j * 3 + 1];
        cloudPos[i * 3 + 2] = parsed.positions[j * 3 + 2];
      }
      var cloudGeo = new T.BufferGeometry();
      cloudGeo.setAttribute("position", new T.BufferAttribute(cloudPos, 3));
      var cloudMat = new T.PointsMaterial({
        color: 0xff5b1f, size: 0.022, sizeAttenuation: true, transparent: true,
        opacity: 0.85, depthWrite: false, clippingPlanes: [cloudPlane]
      });
      var cloud = new T.Points(cloudGeo, cloudMat);
      cloud.scale.setScalar(scale);

      var pivot = new T.Group();
      pivot.add(mesh);
      pivot.add(cloud);
      scene.add(pivot);

      /* Scan ring + faint plane at the cut */
      var ring = new T.Mesh(
        new T.RingGeometry(radius * 1.02, radius * 1.02 + 0.012, 128),
        new T.MeshBasicMaterial({ color: 0xff5b1f, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      var disc = new T.Mesh(
        new T.CircleGeometry(radius * 1.02, 96),
        new T.MeshBasicMaterial({ color: 0xff5b1f, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false })
      );
      disc.rotation.x = -Math.PI / 2;
      var scanner = new T.Group();
      scanner.add(ring); scanner.add(disc);
      scanner.visible = false;
      scene.add(scanner);

      /* Turntable grid under the model */
      var grid = new T.PolarGridHelper(radius * 1.25, 24, 6, 96, 0x6b665e, 0x3a3833);
      grid.position.y = -size.y * scale * 0.5 - 0.06;
      grid.material.transparent = true;
      grid.material.opacity = 0.5;
      scene.add(grid);

      setTris(parsed.tris);
      setPhase("cloud");

      var s = { drag: false, rotX: tilt, rotY: 0.6, velY: 0, velX: 0, lx: 0, ly: 0, scanT0: -1, scanned: false, lastPct: -1 };
      var cvs = renderer.domElement;
      cvs.style.touchAction = "pan-y";
      cvs.setAttribute("data-lock", "DRAG TO ORBIT");

      var setCut = function (y) {
        solidPlane.constant = y;
        cloudPlane.constant = -y;
        scanner.position.y = y;
      };
      setCut(-radius);

      var startScan = function () {
        if (window.reduceMotion) { setCut(radius + 0.01); cloud.visible = false; s.scanned = true; setPhase("ready"); return; }
        s.scanT0 = performance.now();
        s.scanned = false;
        cloud.visible = true;
        scanner.visible = true;
        setPhase("scan");
      };

      var onDown = function (e) {
        s.drag = true; s.lx = e.clientX; s.ly = e.clientY;
        cvs.classList.add("grabbing");
        if (cvs.setPointerCapture) cvs.setPointerCapture(e.pointerId);
      };
      var onMove = function (e) {
        if (!s.drag) return;
        var dx = e.clientX - s.lx, dy = e.clientY - s.ly;
        s.velY = dx * 0.008;
        s.velX = dy * 0.006;
        s.rotY += s.velY;
        s.rotX = clamp(s.rotX + s.velX, -1.1, 1.1);
        s.lx = e.clientX; s.ly = e.clientY;
      };
      var onUp = function () { s.drag = false; cvs.classList.remove("grabbing"); };
      var onDbl = function () { startScan(); };
      cvs.addEventListener("pointerdown", onDown);
      cvs.addEventListener("pointermove", onMove);
      cvs.addEventListener("pointerup", onUp);
      cvs.addEventListener("pointercancel", onUp);
      cvs.addEventListener("dblclick", onDbl);

      var render = function () { renderer.render(scene, camera); };

      var off = onFrame(function (f) {
        if (!visible && s.scanT0 < 0) return;
        if (!s.drag) {
          s.rotY += autoSpeed + s.velY;
          s.velY *= 0.95;
        }
        pivot.rotation.x = s.rotX;
        pivot.rotation.y = s.rotY;
        if (s.scanT0 >= 0) {
          var t = clamp((f.t - s.scanT0) / 2600);
          var y = -radius + easeInOut(t) * radius * 2.02;
          setCut(y);
          var p = Math.round(t * 100);
          if (p - s.lastPct >= 4 || t === 1) { s.lastPct = p; setPct(p); }
          if (t >= 1) {
            s.scanT0 = -1; s.scanned = true; s.lastPct = -1;
            cloud.visible = false; scanner.visible = false;
            setPhase("ready");
          }
        }
        render();
      });

      var ro = new ResizeObserver(function () {
        var rw = el.clientWidth, rh = el.clientHeight;
        if (!rw || !rh) return;
        camera.aspect = rw / rh;
        camera.updateProjectionMatrix();
        renderer.setSize(rw, rh);
        render();
      });
      ro.observe(el);
      render();

      return {
        onVisible: function () { if (!s.scanned && s.scanT0 < 0) startScan(); },
        dispose: function () {
          off(); ro.disconnect();
          cvs.removeEventListener("pointerdown", onDown);
          cvs.removeEventListener("pointermove", onMove);
          cvs.removeEventListener("pointerup", onUp);
          cvs.removeEventListener("pointercancel", onUp);
          cvs.removeEventListener("dblclick", onDbl);
          geo.dispose(); cloudGeo.dispose(); mat.dispose(); cloudMat.dispose();
          renderer.dispose();
          if (el.contains(cvs)) el.removeChild(cvs);
        }
      };
    }

    var near = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !started) { started = true; boot(); near.disconnect(); }
    }, { rootMargin: "100% 120%" });
    var seen = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && api) api.onVisible();
    }, { threshold: 0.35 });
    near.observe(el);
    seen.observe(el);

    /* If the model finishes loading while already on screen, scan right away */
    var poll = setInterval(function () {
      if (api && visible) { api.onVisible(); clearInterval(poll); }
    }, 250);

    return function () {
      disposed = true;
      clearInterval(poll);
      near.disconnect(); seen.disconnect();
      if (api) api.dispose();
    };
  }, [url]);

  var status =
    phase === "idle" ? "STANDBY" :
    phase === "fetch" ? "FETCH " + String(pct).padStart(2, "0") + "%" :
    phase === "cloud" ? "POINT CLOUD · " + tris.toLocaleString("en-US") + " TRI" :
    phase === "scan" ? "SCANNING " + String(pct).padStart(2, "0") + "%" :
    phase === "ready" ? "MESH LOCKED · " + tris.toLocaleString("en-US") + " TRI" :
    "ERR · " + errMsg;

  return (
    <div className="viewer" ref={hostRef}>
      <div className="viewer-hud">
        <span className="viewer-label">{label}</span>
        <span className={"viewer-status" + (phase === "scan" || phase === "fetch" ? " live" : "")}>{status}</span>
      </div>
      {phase === "fetch" && <div className="viewer-bar"><i style={{ width: pct + "%" }} /></div>}
      {(phase === "ready" || phase === "cloud") && <div className="viewer-hint">DRAG TO ORBIT · DOUBLE-CLICK TO RESCAN</div>}
    </div>
  );
}

function ViewerFallback(props) {
  return (
    <div className="viewer viewer-off">
      <div className="viewer-hud"><span className="viewer-label">{props.label}</span><span className="viewer-status">NO WEBGL</span></div>
      <div className="viewer-off-msg">This browser can't draw the 3D model.</div>
    </div>
  );
}

/* =====================================================================
   PUBLIC SCENES
   ===================================================================== */
function DroneScene() {
  if (!_webglOk) return <ViewerFallback label="DRONE / FPV" />;
  return <ModelViewer url="models/drone-mesh.stl" label="DRONE / FPV" zUp tilt={0.38} />;
}
function SauronScene() {
  if (!_webglOk) return <ViewerFallback label="SAURON / RF NODE" />;
  return <ModelViewer url="models/sauron-mesh.stl" label="SAURON / RF NODE" tilt={-0.3} />;
}
function HumanoidScene() {
  if (!_webglOk) return <ViewerFallback label="ATLAS-01" />;
  return <ModelViewer url="models/atlas-mesh.stl" label="ATLAS-01" tilt={-0.08} />;
}

Object.assign(window, { DroneScene: DroneScene, HumanoidScene: HumanoidScene, SauronScene: SauronScene });

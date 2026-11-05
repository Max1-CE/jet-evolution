// 3D-переглядач деталей (вбудовується в сторінку як <script type="module">).
// Дерево деталей приходить з #je-apps (src/catalog.mjs), геометрія будується тут.
// Розріз — площини відсікання з clipIntersection; «заливка» розрізу — задні грані кольором перерізу.
import * as THREE from "./vendor/three.min.js";

const APPS = JSON.parse(document.getElementById("je-apps").textContent);
const el = document.querySelector(".jv");
const $ = (s) => el.querySelector(s);
const view = $(".jv-view");
const tip = $(".jv-tip");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TAU = Math.PI * 2;

// --- матеріали ------------------------------------------------------------------------------------
const LOOK = {
  case: [0xb7bcc3, 0.55, 0.42, 0xece6da],
  rotor: [0x8f969f, 0.8, 0.32, 0xdfe3e8],
  shaft: [0x7d848d, 0.85, 0.28, 0xd7dbe0],
  blade: [0xa9b0b9, 0.85, 0.3, 0xd8dde4],
  vane: [0x9aa1ab, 0.75, 0.38, 0xd0d5dc],
  liner: [0xb6a48f, 0.7, 0.45, 0xf4ece2],
  hot: [0xa98466, 0.65, 0.42, 0xf1d8c6],
  gear: [0x9ea6b0, 0.9, 0.24, 0xdde2e8],
  tbc: [0xe2d7bd, 0.0, 0.85, 0xf1e8d2],
  insert: [0xc9ced5, 0.8, 0.3, 0xe9edf1],
  fixture: [0x6e757e, 0.7, 0.45, 0xc9ccd1],
  hole: [0x2a2d31, 0.2, 0.9, 0x2a2d31],
  brass: [0xb59a5a, 0.85, 0.35, 0xeadfb9],
};
const HILITE = new THREE.Color(0x3e63dd);
const MAT = {}, CAP = {}, HI = {};
let cutOn = null, cutPlanes = [];
for (const [k, [c, metal, rough, cap]] of Object.entries(LOOK)) {
  MAT[k] = new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: rough, clipIntersection: true });
  HI[k] = MAT[k].clone();
  HI[k].emissive = HILITE.clone();
  HI[k].emissiveIntensity = 0.42;
  CAP[k] = new THREE.MeshBasicMaterial({ color: cap, side: THREE.BackSide, clipIntersection: true });
}
/** Матеріали вузла: свої площини розрізу, що їдуть разом із вузлом при розбиранні. */
function matsOf(node, m) {
  if (!node.planes) { node.planes = []; if (cutOn) for (const p of cutPlanes) node.planes.push(p.clone()); }
  node.mats ??= {};
  if (!node.mats[m]) {
    const mk = (t) => { const x = t.clone(); x.clippingPlanes = node.planes; x.clipIntersection = true; return x; };
    node.mats[m] = { mat: mk(MAT[m]), hi: mk(HI[m]), cap: mk(CAP[m]) };
  }
  return node.mats[m];
}

// --- геометрія ------------------------------------------------------------------------------------
const area2 = (p) => p.reduce((a, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return a + x * v - u * y; }, 0);
/** Тіло обертання навколо осі x з меридіанного багатокутника [s, r]. */
function latheGeo(poly, seg = 96) {
  const ccw = area2(poly) > 0;
  const P = ccw ? poly : poly.slice().reverse();
  const n = P.length;
  const pos = [], nor = [], idx = [];
  const edgeN = [];
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n];
    const ds = q[0] - p[0], dr = q[1] - p[1], l = Math.hypot(ds, dr) || 1;
    edgeN.push([dr / l, -ds / l]);
  }
  const smooth = (a, b) => (a[0] * b[0] + a[1] * b[1] > 0.88 ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : a);
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n];
    if (p[1] < 1e-5 && q[1] < 1e-5) continue;
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-7) continue;
    const nA = smooth(edgeN[i], edgeN[(i + n - 1) % n]);
    const nB = smooth(edgeN[i], edgeN[(i + 1) % n]);
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      const a = (TAU * j) / seg, c = Math.cos(a), s = Math.sin(a);
      pos.push(p[0], p[1] * c, p[1] * s, q[0], q[1] * c, q[1] * s);
      const la = Math.hypot(...nA) || 1, lb = Math.hypot(...nB) || 1;
      nor.push(nA[0] / la, (nA[1] / la) * c, (nA[1] / la) * s, nB[0] / lb, (nB[1] / lb) * c, (nB[1] / lb) * s);
    }
    for (let j = 0; j < seg; j++) {
      const a = base + j * 2, b = a + 1, a1 = a + 2, b1 = a + 3;
      idx.push(a, b, a1, b, b1, a1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Лопатка ряду в системі «x — вісь, y — радіус, z — дотична»: закручений профіль між коренем і кінцем. */
function bladeGeo(row) {
  const [lead0, trail0, trail1, lead1] = row.poly;
  const NV = 7, NU = 14;
  const vane = row.kind === "vane";
  const hot = row.hot;
  const sign = (vane ? -1 : 1) * (hot ? -1 : 1);
  const loops = [];
  for (let v = 0; v <= NV; v++) {
    const t = v / NV;
    const r = lead0[1] + (lead1[1] - lead0[1]) * t;
    const sL = lead0[0] + (lead1[0] - lead0[0]) * t;
    const sT = trail0[0] + (trail1[0] - trail0[0]) * t;
    const c = Math.max(0.004, sT - sL);
    // кут установки (від осі) і вигин профілю: турбінні — товсті й сильно вигнуті
    let beta, camber, tk;
    if (row.fan && !vane) { beta = 0.45 + 0.6 * t; camber = 0.06 - 0.03 * t; tk = 0.1 - 0.065 * t; }
    else if (hot && vane) { beta = 0.78; camber = 0.24; tk = 0.24; }
    else if (hot) { beta = 0.42 + 0.1 * t; camber = 0.3 - 0.06 * t; tk = 0.24 - 0.08 * t; }
    else if (vane) { beta = 0.5; camber = 0.1; tk = 0.08; }
    else { beta = 0.62 + 0.22 * t; camber = 0.08 - 0.02 * t; tk = 0.08 - 0.02 * t; }
    beta *= sign;
    const L = c / Math.cos(beta);
    const loop = [];
    const cb = Math.cos(beta), sb = Math.sin(beta), cs = Math.sign(beta || 1);
    for (let i = 0; i < NU * 2; i++) {
      const up = i < NU;
      const k = up ? i : NU * 2 - 1 - i;
      const xi = (1 - Math.cos((Math.PI * (k + 0.5)) / NU)) / 2;
      // NACA 00xx: напівтовщина
      const ht = 5 * tk * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi * xi + 0.2843 * xi ** 3 - 0.1036 * xi ** 4) + 0.004;
      const cam = camber * 4 * xi * (1 - xi) * cs;
      const a = xi * L, b = (cam + (up ? ht : -ht)) * L;
      loop.push([sL + a * cb - b * sb, r, a * sb + b * cb - (L * sb) / 2]);
    }
    loops.push(loop);
  }
  const pos = [], idx = [];
  const M = loops[0].length;
  for (const lp of loops) for (const p of lp) pos.push(...p);
  for (let v = 0; v < NV; v++) for (let i = 0; i < M; i++) {
    const a = v * M + i, b = v * M + ((i + 1) % M), c = a + M, d = b + M;
    idx.push(a, c, b, b, c, d);
  }
  // торці: смуга між верхньою й нижньою точками одного перерізу (профіль може бути серпоподібним)
  for (const [v, flip] of [[0, false], [NV, true]]) {
    const base = pos.length / 3;
    for (const p of loops[v]) pos.push(...p);
    for (let i = 0; i < NU - 1; i++) {
      const u0 = base + i, u1 = base + i + 1, l0 = base + 2 * NU - 1 - i, l1 = base + 2 * NU - 2 - i;
      flip ? idx.push(u0, l0, u1, u1, l0, l1) : idx.push(u0, u1, l0, u1, l1, l0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // напрям обходу: перевіряємо, щоб нормалі дивились назовні (від осі профілю)
  const n = g.getAttribute("normal"), p = g.getAttribute("position");
  const cx0 = loops[0].reduce((s, q) => s + q[0], 0) / M, cz0 = loops[0].reduce((s, q) => s + q[2], 0) / M;
  if ((p.getX(0) - cx0) * n.getX(0) + (p.getZ(0) - cz0) * n.getZ(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** Видавлений контур (з отворами) уздовж z від z0 до z1; ax: "y" — контур у площині (x, z), видавлення вздовж y. */
function extGeo({ shape, holes = [], z0, z1, ax, bevel = 0, curve = 1 }) {
  // three поправляє напрям отворів лише тоді, коли розвертає контур, тож задаємо обидва явно
  const ccw = (p, want) => (area2(p) > 0 === want ? p : p.slice().reverse());
  const sh = new THREE.Shape(ccw(shape, true).map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) sh.holes.push(new THREE.Path(ccw(h, false).map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, z0 + bevel);
  if (ax === "y") g.rotateX(Math.PI / 2);
  if (ax === "x") g.rotateY(Math.PI / 2);
  return g;
}

/** Окремий робочий об'єкт: меш + задні грані для заливки розрізу. */
function meshOf(geom, m, node) {
  const M = matsOf(node, m);
  const mesh = new THREE.Mesh(geom, M.mat);
  mesh.userData = { node, m };
  const cap = new THREE.Mesh(geom, M.cap);
  cap.userData.cap = true;
  cap.raycast = () => {};
  mesh.add(cap);
  mesh.castShadow = true;
  return mesh;
}

function rowMatrix(i, count, spread, out) {
  const a = (TAU * i) / count + 0.11;
  out.makeRotationX(a);
  if (spread) out.multiply(new THREE.Matrix4().makeTranslation(0, spread, 0));
  return out;
}

function buildGeo(g, node) {
  const out = [];
  if (g.t === "lathe") {
    const geom = latheGeo(g.poly, g.seg ?? (g.at ? 48 : 96));
    if (g.ax === "z") geom.rotateY(-Math.PI / 2);
    for (const at of g.at ?? [null]) {
      const m = meshOf(geom, g.m, node);
      if (at) g.ax === "z" ? m.position.set(at[0], at[1], 0) : m.position.set(0, at[0], at[1]);
      out.push(m);
    }
  } else if (g.t === "blades") {
    const geom = bladeGeo(g.row);
    const n = g.row.count;
    const M = matsOf(node, g.m);
    const inst = new THREE.InstancedMesh(geom, M.mat, n);
    const cap = new THREE.InstancedMesh(geom, M.cap, n);
    cap.instanceMatrix = inst.instanceMatrix;
    cap.raycast = () => {};
    cap.userData.cap = true;
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) inst.setMatrixAt(i, rowMatrix(i, n, 0, mtx));
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) inst.setColorAt(i, white);
    inst.userData = { node, m: g.m, row: g.row };
    inst.castShadow = true;
    inst.add(cap);
    node.rowMesh = inst;
    out.push(inst);
  } else if (g.t === "airfoil") {
    out.push(meshOf(bladeGeo(g.row), g.m, node));
  } else if (g.t === "ext") {
    out.push(meshOf(extGeo(g), g.m, node));
  } else if (g.t === "box") {
    const [x0, y0, z0] = g.min, [x1, y1, z1] = g.max;
    const geom = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    geom.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    out.push(meshOf(geom, g.m, node));
  } else if (g.t === "dots") {
    const geom = new THREE.SphereGeometry(g.r, 10, 6);
    const inst = new THREE.InstancedMesh(geom, matsOf(node, g.m).mat, g.pts.length);
    const mtx = new THREE.Matrix4();
    g.pts.forEach((p, i) => inst.setMatrixAt(i, mtx.makeTranslation(p[0], p[1], p[2])));
    inst.userData = { node, m: g.m, dots: true };
    out.push(inst);
  }
  return out;
}

// --- дерево ---------------------------------------------------------------------------------------
function makeNode(spec, parent) {
  const node = { spec, parent, kids: [], group: new THREE.Group(), own: new THREE.Group(), apart: false, t: 0, v: 0, meshes: [] };
  node.group.add(node.own);
  node.depth = parent ? parent.depth + 1 : 0;
  for (const g of spec.geo ?? []) for (const m of buildGeo(g, node)) { node.own.add(m); node.meshes.push(m); }
  for (const k of spec.kids ?? []) {
    const kid = makeNode(k, node);
    node.kids.push(kid);
    node.group.add(kid.group);
  }
  return node;
}
const walk = (n, f) => { f(n); n.kids.forEach((k) => walk(k, f)); };
const within = (n, top) => { for (let x = n; x; x = x.parent) if (x === top) return true; return false; };
const pathOf = (n) => { const out = []; for (let x = n; x; x = x.parent) out.unshift(x); return out; };
const canSplit = (n) => !!n.rowMesh || n.kids.length > 1 || (n.kids.length === 1 && n.kids[0].kids.length > 0);

// --- сцена ----------------------------------------------------------------------------------------
let renderer, scene, camera, controls, floor, key;
let appIndex = -1, app = null, root = null, frameGroup = null, focus = null, hover = null, hoverBlade = -1;
let cut = true, spin = false, raf = 0, last = 0, camAnim = null, open = false;
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();

function init() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  view.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target, new THREE.HemisphereLight(0xffffff, 0xb9b4a8, 0.5));
  floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.raycast = () => {};
  scene.add(floor);
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener("start", () => { camAnim = null; });
  new ResizeObserver(resize).observe(view);
  const cv = renderer.domElement;
  let down = null;
  cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  cv.addEventListener("pointermove", (e) => { pointerAt(e); pick(); });
  cv.addEventListener("pointerleave", () => { setHover(null, -1); tip.hidden = true; });
  cv.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    pointerAt(e);
    pick();
    if (hover) enter(hover);
    else if (hoverBlade >= 0) enterBlade(focus, hoverBlade);
  });
  cv.addEventListener("dblclick", () => { if (!hover && hoverBlade < 0 && focus?.parent) enter(focus.parent); });
}

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  draw();
}

function load(i) {
  if (i === appIndex && root) return;
  if (frameGroup) {
    scene.remove(frameGroup);
    frameGroup.traverse((o) => { if (o.geometry && !o.userData.cap) o.geometry.dispose(); });
  }
  appIndex = i;
  app = APPS[i];
  frameGroup = new THREE.Group();
  if (app.frame === "z") frameGroup.rotation.x = -Math.PI / 2;
  root = makeNode(app.root, null);
  frameGroup.add(root.group);
  setupSpin();
  scene.add(frameGroup);
  frameGroup.updateMatrixWorld(true);
  cutPlanes = (app.cut ?? []).map(([a, b, c, d]) => new THREE.Plane(new THREE.Vector3(a, b, c), d));
  cutOn = null;
  focus = root;
  setCut(cut);
}
/** Розріз: вибір користувача; окрема лопатка двигуна завжди ціла (розріз через неї нічого не показує). */
function setCut(on) { cut = on; applyCut(); }
function applyCut() {
  const single = focus && singleOf(focus) && !app.cutSingle;
  const eff = cut && !single;
  const b = $('[data-act="cut"]');
  b.setAttribute("aria-pressed", String(cut));
  b.innerHTML = (cut ? "Розріз: так" : "Розріз: ні") + (single && cut ? " · деталь ціла" : "") + ' <span class="jv-k">(C)</span>';
  if (frameGroup) frameGroup.traverse((o) => { if (o.userData.cap) o.visible = eff; });
  if (eff !== cutOn) {
    cutOn = eff;
    walkAll((n) => {
      if (!n.planes) return;
      n.planes.length = 0;
      if (eff) for (const p of cutPlanes) n.planes.push(p.clone());
      for (const k in n.mats) for (const x of Object.values(n.mats[k])) x.needsUpdate = true;
    });
  }
  updatePlanes();
  draw();
}
const walkAll = (f) => { if (root) walk(root, f); };
/** Площини розрізу кожного вузла — у його власній системі (з урахуванням зсуву при розбиранні). */
function updatePlanes() {
  if (!cutOn || !frameGroup) return;
  frameGroup.updateMatrixWorld(true);
  walkAll((n) => {
    if (!n.planes || !n.planes.length) return;
    for (let k = 0; k < cutPlanes.length; k++) n.planes[k].copy(cutPlanes[k]).applyMatrix4(n.group.matrixWorld);
  });
}
const clipped = (p, n) => !!n && !!n.planes && n.planes.length > 0 && n.planes.every((pl) => pl.distanceToPoint(p) < 0);
const singleOf = (n) => { for (let x = n; x; x = x.parent) if (x.single) return x; return null; };

// --- видимість, розбирання, кадр ---------------------------------------------------------------------
function visibility() {
  walk(root, (n) => {
    const inside = within(n, focus);
    const onPath = within(focus, n);
    n.group.visible = inside || onPath;
    n.own.visible = inside && !n.hideOwn;
  });
}
function offsets(n, useTarget) {
  const t = useTarget ? (n.apart ? 1 : 0) : n.t;
  for (const k of n.kids) {
    const ex = k.spec.ex ?? [0, 0, 0];
    k.group.position.set(ex[0] * t, ex[1] * t, ex[2] * t);
  }
  if (n.rowMesh) {
    const inst = n.rowMesh, cnt = inst.count, mtx = new THREE.Matrix4();
    for (let i = 0; i < cnt; i++) inst.setMatrixAt(i, rowMatrix(i, cnt, (n.spec.spread ?? 0) * t, mtx));
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingBox();
    inst.computeBoundingSphere();
    // окрема лопатка стоїть вертикально (радіус — угору), щоб її зручно було роздивлятися
    for (const k of n.kids) if (k.single) { k.group.matrix.makeTranslation(0, (n.spec.spread ?? 0) * t, 0); k.group.matrixWorldNeedsUpdate = true; }
  }
}
// --- запуск: ротори крутяться кожен зі своїм валом ----------------------------------------------------
const VIS = 0.0032; // уповільнення: об/хв → рад/с на екрані
let running = false, spools = [], spinners = [], rpmShown = 0;
function setupSpin() {
  running = false;
  spools = (app.spools ?? []).map((sp) => ({ ...sp, w: 0, th: 0 }));
  spinners = [];
  walk(root, (n) => { if (n.spec.spin) { n.own.matrixAutoUpdate = false; spinners.push(n); } });
  const b = $('[data-act="run"]');
  b.hidden = !spools.length;
  runLabel();
  $(".jv-rpm").hidden = !spools.length;
  $(".jv-rpm").textContent = "";
  buildFlow();
}
function runLabel() {
  const b = $('[data-act="run"]');
  b.setAttribute("aria-pressed", String(running));
  b.innerHTML = (running ? "■ Зупинити" : "▶ " + (app?.runLabel ?? "Запуск")) + ' <span class="jv-k">(S)</span>';
}
function setRun(on) { running = on ?? !running; runLabel(); run(); }
const M4 = new THREE.Matrix4(), M4b = new THREE.Matrix4();
/** Розкручування й поворот роторів; повертає true, поки щось обертається. */
function spinTick(dt) {
  if (!spools.length) return false;
  let busy = false;
  const by = {};
  for (const sp of spools) {
    const target = running ? sp.rpm : 0;
    const tau = running ? sp.tau : sp.tau * 1.7;
    sp.w += (target - sp.w) * (1 - Math.exp(-dt / tau));
    if (!running && Math.abs(sp.w) < Math.abs(sp.rpm) * 0.002) sp.w = 0;
    if (running && Math.abs(target - sp.w) < Math.abs(sp.rpm) * 0.001) sp.w = target;
    sp.th = (sp.th + (sp.w / 60) * TAU * (still.matches ? 0 : VIS) * dt) % (TAU * 1e4);
    if (sp.w) busy = true;
    by[sp.id] = sp;
  }
  const main = spools[spools.length - 1];
  if (flowTick(dt, main.rpm ? Math.abs(main.w / main.rpm) : 0)) busy = true;
  for (const n of spinners) {
    const sp = by[n.spec.spin.s];
    if (!sp) continue;
    const a = sp.th * (n.spec.spin.k ?? 1);
    const m = n.own.matrix;
    if (n.spec.spin.axis === "z") {
      const [cx, cy] = n.spec.spin.c ?? [0, 0];
      m.makeTranslation(cx, cy, 0).multiply(M4.makeRotationZ(a)).multiply(M4b.makeTranslation(-cx, -cy, 0));
    } else m.makeRotationX(a);
    n.own.matrixWorldNeedsUpdate = true;
  }
  rpmShown += dt;
  if (rpmShown > 0.12 || !busy) {
    rpmShown = 0;
    const fmt = (x) => Math.round(Math.abs(x) / 10) * 10;
    const shafts = spools.filter((sp) => !sp.text);
    const texts = spools.filter((sp) => sp.text && Math.abs(sp.w) > 0.05).map((sp) => sp.text);
    $(".jv-rpm").textContent = [shafts.length ? shafts.map((sp) => `${sp.name} ${fmt(sp.w).toLocaleString("uk")}${sp.rpm < 0 ? " ↺" : ""}`).join(" · ") + " об/хв" : "", ...texts].filter(Boolean).join(" · ") + (still.matches && running ? " (рух вимкнено в системі)" : "");
  }
  return busy;
}

// --- потік повітря під час запуску (лише для цілого зібраного апарата) -----------------------------
const FLOW_COL = { bypass: new THREE.Color(0x2f6fd6), core: new THREE.Color(0xd99a14), hot: new THREE.Color(0xe0461a) };
let flow = null;
function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildFlow() {
  if (flow) { frameGroup.remove(flow.points); flow.points.geometry.dispose(); }
  flow = null;
  const F = app.flow;
  if (!F) return;
  const per = 170;
  const parts = [];
  if (F.paths) {
    F.paths.forEach((path) => {
      const cum = [0];
      for (let k = 1; k < path.pts.length; k++) { const a = path.pts[k - 1], b = path.pts[k]; cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
      path.cum = cum;
      path.len = cum[cum.length - 1];
    });
    F.paths.forEach((path, pi) => { for (let k = 0; k < path.n; k++) parts.push({ pi, u: Math.random() * path.len, k: 0, jit: (Math.random() - 0.5) * 0.4 }); });
  }
  (F.lanes ?? []).forEach((lane, li) => {
    const n = Math.round(per * (lane.kind === "bypass" ? 1.1 : 1.35));
    const s1 = lane.s0 + lane.ds * (lane.r.length - 1);
    for (let k = 0; k < n; k++) parts.push({ li, s: lane.s0 + Math.random() * (s1 - lane.s0), phi: Math.random() * TAU, jit: (Math.random() - 0.5) * 0.6 });
  });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(parts.length * 3), 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(parts.length * 3), 3));
  const mat = new THREE.PointsMaterial({ size: 5.5, sizeAttenuation: false, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0, clipIntersection: true, clippingPlanes: [] });
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  points.raycast = () => {};
  points.visible = false;
  points.renderOrder = 2;
  frameGroup.add(points);
  flow = { points, parts, F };
}
function flowPlanes() {
  if (!flow) return;
  const pl = flow.points.material.clippingPlanes;
  const want = cutOn ? cutPlanes.length : 0;
  if (pl.length !== want) { pl.length = 0; for (let k = 0; k < want; k++) pl.push(new THREE.Plane()); flow.points.material.needsUpdate = true; }
  frameGroup.updateMatrixWorld(true);
  for (let k = 0; k < want; k++) pl[k].copy(cutPlanes[k]).applyMatrix4(frameGroup.matrixWorld);
}
function flowTick(dt, power) {
  if (!flow) return false;
  // потік видно, поки вибрана частина стоїть на своєму місці в зібраному апараті
  let atRest = !focus.apart && focus.t < 0.02;
  for (let x = focus.parent; x; x = x.parent) if (x.apart || x.t > 0.02) atRest = false;
  if (singleOf(focus)) atRest = false;
  if (flow.F.lanes && focus !== root) atRest = false;
  const show = power > 0.01 && atRest;
  const mat = flow.points.material;
  const target = show ? Math.min(1, power * 1.4) : 0;
  mat.opacity += (target - mat.opacity) * (1 - Math.exp(-dt / 0.25));
  if (mat.opacity < 0.01 && !show) { flow.points.visible = false; return false; }
  flow.points.visible = true;
  flowPlanes();
  const { F, parts } = flow;
  const pos = flow.points.geometry.attributes.position.array, col = flow.points.geometry.attributes.color.array;
  if (F.paths) {
    const go = still.matches ? 0 : power * dt;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i], path = F.paths[p.pi];
      p.u += path.speed * go * (1 + p.jit);
      if (p.u > path.len) { p.u -= path.len; p.k = 0; }
      let k = p.k;
      while (k < path.cum.length - 2 && path.cum[k + 1] < p.u) k++;
      p.k = k;
      const a = path.pts[k], b = path.pts[k + 1], f = Math.min(1, (p.u - path.cum[k]) / (path.cum[k + 1] - path.cum[k] || 1));
      pos[i * 3] = a[0] + (b[0] - a[0]) * f; pos[i * 3 + 1] = a[1] + (b[1] - a[1]) * f; pos[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
      const c = path.kind === "hot" ? FLOW_COL.hot : FLOW_COL.bypass;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    flow.points.geometry.attributes.position.needsUpdate = true;
    flow.points.geometry.attributes.color.needsUpdate = true;
    return true;
  }
  const base = F.size * 1.1 * (still.matches ? 0 : 1);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], lane = F.lanes[p.li];
    const s1 = lane.s0 + lane.ds * (lane.r.length - 1);
    const byp = lane.kind === "bypass";
    const v = byp ? (p.s > F.fanEnd ? 1.5 : 1.05) : p.s < F.hot ? 0.75 : p.s < F.coreEnd ? 1.45 : 2.3;
    p.s += v * base * power * dt * (1 + p.jit * 0.3);
    if (p.s > s1) { p.s = lane.s0 + (p.s - s1) * 0.2; p.phi = Math.random() * TAU; }
    const q = (p.s - lane.s0) / lane.ds, k = Math.min(lane.r.length - 2, Math.floor(q)), f = q - k;
    const r = lane.r[k] + (lane.r[k + 1] - lane.r[k]) * f;
    pos[i * 3] = p.s; pos[i * 3 + 1] = r * Math.cos(p.phi); pos[i * 3 + 2] = r * Math.sin(p.phi);
    const c = byp ? FLOW_COL.bypass : p.s < F.hot ? FLOW_COL.core : FLOW_COL.hot;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  flow.points.geometry.attributes.position.needsUpdate = true;
  flow.points.geometry.attributes.color.needsUpdate = true;
  return true;
}

function boxOf(n, atTarget) {
  const saved = [];
  if (atTarget) walk(n, (x) => { saved.push([x, x.t]); x.t = x.apart ? 1 : 0; offsets(x, false); });
  frameGroup.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  n.group.traverse((o) => {
    if (!(o.isMesh) || o.userData.cap) return;
    let vis = true;
    for (let x = o; x && x !== n.group.parent; x = x.parent) if (!x.visible) { vis = false; break; }
    if (!vis) return;
    if (o.isInstancedMesh) { o.computeBoundingBox(); tmp.copy(o.boundingBox).applyMatrix4(o.matrixWorld); }
    else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
    box.union(tmp);
  });
  if (atTarget) { for (const [x, t] of saved) { x.t = t; offsets(x, false); } frameGroup.updateMatrixWorld(true); }
  return box;
}
function frame(n, { reset = false, instant = false } = {}) {
  const box = boxOf(n, true);
  if (box.isEmpty()) return;
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const dir = reset || !camera.position.lengthSq()
    ? new THREE.Vector3(...(app.view ?? [1, 0.6, 1])).normalize()
    : camera.position.clone().sub(controls.target).normalize();
  const fov = (camera.fov * Math.PI) / 180;
  const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
  const dist = (sph.radius / Math.sin(fit / 2)) * 1.04;
  const to = { target: sph.center.clone(), pos: sph.center.clone().add(dir.multiplyScalar(dist)) };
  camera.near = dist / 200;
  camera.far = dist * 40;
  camera.updateProjectionMatrix();
  controls.minDistance = sph.radius * 0.15;
  controls.maxDistance = dist * 6;
  // підлога з тінню — під усім апаратом
  const all = boxOf(root, true);
  const size = all.getSize(new THREE.Vector3()).length();
  floor.position.set(all.getCenter(new THREE.Vector3()).x, all.min.y - size * 0.02, all.getCenter(new THREE.Vector3()).z);
  floor.scale.set(size * 4, size * 4, 1);
  key.position.copy(all.getCenter(new THREE.Vector3())).add(new THREE.Vector3(size * 0.3, size * 1.2, size * 0.6));
  key.target.position.copy(all.getCenter(new THREE.Vector3()));
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -size;
  sc.right = sc.top = size;
  sc.near = size * 0.05;
  sc.far = size * 4;
  sc.updateProjectionMatrix();
  if (instant || still.matches) { controls.target.copy(to.target); camera.position.copy(to.pos); camAnim = null; }
  else camAnim = { t: 0, from: { target: controls.target.clone(), pos: camera.position.clone() }, to };
  run();
}

function enter(n) {
  if (!n) return;
  clearSingle(n);
  focus = n;
  setHover(null, -1);
  visibility();
  applyCut();
  panel();
  frame(n);
}
/** Одна лопатка ряду як окреме дерево: перо, полиця, хвостовик (для робочих лопаток). */
function bladeSpec(rowNode, index) {
  const spec = rowNode.spec;
  const g = spec.geo[0];
  const row = g.row;
  const [l0, t0, t1, l1] = row.poly;
  const r0 = l0[1], h = l1[1] - l0[1];
  const s0 = Math.min(l0[0], l1[0]), s1 = Math.max(t0[0], t1[0]);
  const c = t0[0] - l0[0];
  const pitch = (TAU * r0) / row.count;
  const name = `${row.kind === "blade" ? "Лопатка" : "Лопатка апарата"} № ${index + 1} з ${row.count}`;
  const base = { id: "one", name, func: spec.func, mat: spec.mat, note: spec.note, facts: spec.facts, kicker: spec.name };
  if (row.kind !== "blade") return { ...base, geo: [{ t: "airfoil", row, m: g.m }] };
  const turb = row.hot;
  const w = Math.min(pitch * 0.92, c * 1.1);
  const plat = Math.max(0.03 * h, 0.0015);
  const depth = turb ? Math.min(0.42 * h, 0.9 * c) : Math.min(0.3 * h, 0.45 * c);
  const neck = w * (turb ? 0.36 : 0.32);
  const rootShape = [];
  const top = r0 - plat;
  if (turb) {
    // ялинка: три пари зубців
    const lobes = 3, step = depth / (lobes + 0.4);
    rootShape.push([-neck / 2, top]);
    for (let k = 0; k < lobes; k++) {
      const y = top - step * (k + 0.5), wl = neck * (1.32 - 0.12 * k), wn = neck * (0.92 - 0.12 * k);
      rootShape.push([-wl / 2, y], [-wn / 2, y - step * 0.5]);
    }
    rootShape.push([-neck * 0.32, top - depth], [neck * 0.32, top - depth]);
    for (let k = lobes - 1; k >= 0; k--) {
      const y = top - step * (k + 0.5), wl = neck * (1.32 - 0.12 * k), wn = neck * (0.92 - 0.12 * k);
      rootShape.push([wn / 2, y - step * 0.5], [wl / 2, y]);
    }
    rootShape.push([neck / 2, top]);
  } else rootShape.push([-neck / 2, top], [-w * 0.48, top - depth], [w * 0.48, top - depth], [neck / 2, top]);
  return {
    ...base,
    kids: [
      { id: "airfoil", name: "Перо", func: turb ? "Аеродинамічна частина лопатки: на ній газ розвертається й штовхає колесо. Усередині сучасних лопаток ВТ — канали охолодження, на поверхні — отвори плівкового охолодження." : "Аеродинамічна частина лопатки: профіль закручений від кореня до кінця, щоб повітря натікало під правильним кутом по всій висоті.", mat: spec.mat, geo: [{ t: "airfoil", row, m: g.m }], ex: [0, h * 0.55, 0] },
      { id: "platform", name: "Полиця", func: "Полиці сусідніх лопаток змикаються в суцільну внутрішню стінку проточної частини й не пускають газ (повітря) до диска.", mat: spec.mat, geo: [{ t: "box", min: [s0 - 0.08 * c, top, -w / 2], max: [s1 + 0.08 * c, r0, w / 2], m: g.m }], ex: [0, h * 0.18, 0] },
      { id: "root", name: turb ? "Ялинковий хвостовик" : "Хвостовик «ластівчин хвіст»", func: turb ? "Ялинковий хвостовик входить у паз диска; кілька пар зубців ділять між собою відцентрову силу лопатки — тонни на кожну." : "Хвостовик заходить у паз диска вздовж осі; клиноподібна форма тримає лопатку проти відцентрової сили.", mat: spec.mat, geo: [{ t: "ext", shape: rootShape, z0: s0 + 0.05 * c, z1: s1 - 0.05 * c, ax: "x", m: g.m }], ex: [0, -h * 0.28, 0] },
    ],
  };
}
function enterBlade(rowNode, index) {
  clearSingle(null);
  const node = makeNode(bladeSpec(rowNode, index), rowNode);
  node.single = true;
  node.index = index;
  node.group.matrixAutoUpdate = false;
  rowNode.kids.push(node);
  rowNode.group.add(node.group);
  rowNode.hideOwn = true;
  offsets(rowNode, false);
  enter(node);
  updatePlanes();
}
/** Прибирає тимчасову лопатку, якщо нова ціль — не всередині неї. */
function clearSingle(target) {
  if (!root) return;
  walk(root, (x) => {
    const one = x.kids.find((k) => k.single);
    if (!one || (target && within(target, one))) return;
    x.kids = x.kids.filter((k) => k !== one);
    x.group.remove(one.group);
    one.group.traverse((o) => { if (o.geometry && !o.userData.cap && !o.userData.shared) o.geometry.dispose(); });
    x.hideOwn = false;
  });
}
function explode(n, on, deep) {
  if (!n) return;
  const want = on ?? !n.apart;
  const list = [];
  if (deep) walk(n, (x) => { if (canSplit(x)) list.push(x); });
  else if (canSplit(n)) list.push(n);
  list.forEach((x, k) => { x.apart = want; x.delay = deep ? x.depth * 0.12 - n.depth * 0.12 : 0; });
  if (!want && !deep) walk(n, (x) => { x.apart = false; });
  panel();
  frame(focus);
}

// --- наведення ------------------------------------------------------------------------------------
function pointerAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  tip.style.left = `${e.clientX - el.getBoundingClientRect().left + 14}px`;
  tip.style.top = `${e.clientY - el.getBoundingClientRect().top + 14}px`;
}
const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
function pick() {
  if (!focus) return;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObject(focus.group, true).filter((h) => !h.object.userData.cap && !h.object.userData.dots && shown(h.object) && !clipped(h.point, h.object.userData.node));
  let kid = null, blade = -1;
  for (const h of hits) {
    let n = h.object.userData.node;
    if (!n) continue;
    if (n === focus && focus.rowMesh && h.instanceId !== undefined) { blade = h.instanceId; break; }
    while (n && n.parent !== focus) n = n.parent;
    if (n) { kid = n; break; }
    if (h.object.userData.node === focus) break;
  }
  setHover(kid, blade);
  if (kid) { tip.textContent = kid.spec.name; tip.hidden = false; }
  else if (blade >= 0) { tip.textContent = `Лопатка № ${blade + 1} — відкрити`; tip.hidden = false; }
  else tip.hidden = true;
  renderer.domElement.style.cursor = kid || blade >= 0 ? "pointer" : "grab";
}
function setHover(n, blade) {
  if (hover === n && hoverBlade === blade) return;
  if (hover) hover.group.traverse((o) => { const M = o.userData.node?.mats?.[o.userData.m]; if (M && !o.userData.cap && o.material === M.hi) o.material = M.mat; });
  if (hoverBlade >= 0 && focus?.rowMesh) { focus.rowMesh.setColorAt(hoverBlade, new THREE.Color(1, 1, 1)); focus.rowMesh.instanceColor.needsUpdate = true; }
  hover = n;
  hoverBlade = blade;
  if (hover) hover.group.traverse((o) => { const M = o.userData.node?.mats?.[o.userData.m]; if (M && !o.userData.cap && !o.userData.dots) o.material = M.hi; });
  if (blade >= 0 && focus?.rowMesh) { focus.rowMesh.setColorAt(blade, new THREE.Color(0.55, 0.75, 2.2)); focus.rowMesh.instanceColor.needsUpdate = true; }
  el.querySelectorAll("[data-kid]").forEach((b) => b.toggleAttribute("data-on", !!hover && b.dataset.kid === String(focus.kids.indexOf(hover))));
  draw();
}

// --- панель ---------------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function panel() {
  const s = focus.spec;
  const path = pathOf(focus);
  $(".jv-crumbs").innerHTML = path.map((n, i) => (i < path.length - 1 ? `<button type="button" data-crumb="${i}">${esc(n.spec.name)}</button><span aria-hidden="true">›</span>` : `<b>${esc(n.spec.name)}</b>`)).join("");
  $(".jv-crumbs").querySelectorAll("[data-crumb]").forEach((b) => b.addEventListener("click", () => enter(path[Number(b.dataset.crumb)])));
  $(".jv-kicker").textContent = s.kicker ?? (focus.parent ? focus.parent.spec.name : app.title ?? "");
  $(".jv-name").textContent = s.name;
  $(".jv-func").textContent = s.func || "—";
  $(".jv-mat").innerHTML = (s.mat ?? []).map((m) => `<li>${esc(m)}</li>`).join("") || "<li>—</li>";
  $(".jv-note").textContent = s.note ?? "";
  $(".jv-note").hidden = !s.note;
  $(".jv-facts").innerHTML = (s.facts ?? []).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("");
  $(".jv-facts-wrap").hidden = !(s.facts ?? []).length;
  const kids = focus.kids;
  const kw = $(".jv-kids");
  if (kids.length) {
    $(".jv-kids-h").textContent = `Складові · ${kids.length}`;
    kw.innerHTML = kids.map((k, i) => `<button type="button" data-kid="${i}"><b>${String(i + 1).padStart(2, "0")}</b>${esc(k.spec.name)}${k.kids.length || k.rowMesh ? '<i aria-hidden="true">›</i>' : ""}</button>`).join("");
  } else if (focus.rowMesh) {
    $(".jv-kids-h").textContent = `Складові · ${focus.rowMesh.count} однакових лопаток`;
    kw.innerHTML = `<button type="button" data-blade="0"><b>01</b>Відкрити одну лопатку<i aria-hidden="true">›</i></button><p class="jv-small">Або клацніть будь-яку лопатку на моделі. «Розібрати» розводить лопатки від диска.</p>`;
  } else {
    $(".jv-kids-h").textContent = "Складові";
    kw.innerHTML = `<p class="jv-small">Окрема деталь — далі не розбирається.</p>`;
  }
  kw.querySelectorAll("[data-kid]").forEach((b) => {
    const k = kids[Number(b.dataset.kid)];
    b.addEventListener("click", () => enter(k));
    b.addEventListener("pointerenter", () => setHover(k, -1));
    b.addEventListener("pointerleave", () => setHover(null, -1));
    b.addEventListener("focus", () => setHover(k, -1));
    b.addEventListener("blur", () => setHover(null, -1));
  });
  kw.querySelectorAll("[data-blade]").forEach((b) => b.addEventListener("click", () => enterBlade(focus, firstVisibleBlade(focus))));
  const split = canSplit(focus);
  const ex = $('[data-act="explode"]');
  ex.disabled = !split;
  ex.setAttribute("aria-pressed", String(!!focus.apart));
  ex.innerHTML = (focus.apart ? "Зібрати" : "Розібрати") + ' <span class="jv-k">(E)</span>';
  let deep = false;
  walk(focus, (x) => { if (x !== focus && canSplit(x)) deep = true; });
  const all = $('[data-act="explode-all"]');
  all.disabled = !deep;
  $('[data-act="up"]').disabled = !focus.parent;
}
function firstVisibleBlade(n) {
  const inst = n.rowMesh, m = new THREE.Matrix4(), p = new THREE.Vector3();
  frameGroup.updateMatrixWorld(true);
  for (let i = 0; i < inst.count; i++) {
    inst.getMatrixAt(i, m);
    p.set(0, n.spec.geo[0].row.poly[0][1] * 1.1, 0).applyMatrix4(m).applyMatrix4(inst.matrixWorld);
    if (!clipped(p, n)) return i;
  }
  return 0;
}

// --- цикл ---------------------------------------------------------------------------------------
function tick(now) {
  raf = 0;
  if (!open) return;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  let busy = false;
  walk(root, (n) => {
    const want = n.apart ? 1 : 0;
    if (n.delay > 0) { n.delay -= dt; busy = true; return; }
    if (n.t === want && !n.v) return;
    if (still.matches) { n.t = want; n.v = 0; }
    else {
      for (let k = 0; k < 4; k++) { n.v += ((want - n.t) * 60 - n.v * 13) * dt / 4; n.t += n.v * dt / 4; }
      if (Math.abs(want - n.t) < 1e-3 && Math.abs(n.v) < 1e-3) { n.t = want; n.v = 0; }
    }
    offsets(n, false);
    busy = true;
  });
  if (camAnim) {
    camAnim.t = Math.min(1, camAnim.t + dt / 0.7);
    const e = 1 - Math.pow(1 - camAnim.t, 3);
    controls.target.lerpVectors(camAnim.from.target, camAnim.to.target, e);
    camera.position.lerpVectors(camAnim.from.pos, camAnim.to.pos, e);
    if (camAnim.t >= 1) camAnim = null;
    busy = true;
  }
  if (spinTick(dt)) busy = true;
  if (busy) updatePlanes();
  const moved = controls.update(dt);
  renderer.render(scene, camera);
  if (busy || moved || spin || controls.autoRotate) run();
}
function run() { if (!raf && open) { raf = requestAnimationFrame(tick); } }
function draw() { run(); }
const ctrlChange = () => run();

// --- відкрити / закрити ----------------------------------------------------------------------------
let lastFocusEl = null;
function show(i = 0, path = []) {
  init();
  open = true;
  el.hidden = false;
  document.documentElement.classList.add("jv-lock");
  lastFocusEl = document.activeElement;
  window.dispatchEvent(new CustomEvent("jv-open"));
  resize();
  const fresh = i !== appIndex;
  load(i);
  if (fresh) { camera.position.set(0, 0, 0); }
  let n = root;
  for (const id of path) {
    const k = n.kids.find((x) => x.spec.id === id);
    if (!k) break;
    n = k;
  }
  // розбираємо предків, щоб вибрана частина стояла там, де її видно в розібраному двигуні
  clearSingle(null);
  focus = n;
  visibility();
  applyCut();
  panel();
  frame(n, { reset: fresh, instant: fresh });
  controls.removeEventListener("change", ctrlChange);
  controls.addEventListener("change", ctrlChange);
  $(".jv-close").focus();
  run();
}
function hide() {
  open = false;
  el.hidden = true;
  document.documentElement.classList.remove("jv-lock");
  tip.hidden = true;
  if (lastFocusEl && lastFocusEl.focus) lastFocusEl.focus();
}

$(".jv-close").addEventListener("click", hide);
el.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  const act = btn?.dataset.act;
  if (!act || btn.disabled) return;
  if (act === "up" && focus.parent) enter(focus.parent);
  if (act === "explode") explode(focus);
  if (act === "explode-all") { let any = false; walk(focus, (x) => { if (canSplit(x) && x.apart) any = true; }); explode(focus, !any, true); }
  if (act === "cut") setCut(!cut);
  if (act === "run") setRun();
  if (act === "spin") { spin = !spin; controls.autoRotate = spin; $('[data-act="spin"]').setAttribute("aria-pressed", String(spin)); run(); }
  if (act === "reset") frame(focus, { reset: true });
});
el.addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea")) return;
  const k = e.key.toLowerCase();
  if (k === "escape") { e.preventDefault(); if (focus.parent) enter(focus.parent); else hide(); }
  else if (k === "backspace") { e.preventDefault(); if (focus.parent) enter(focus.parent); }
  else if (k === "e" || k === "у") { e.preventDefault(); e.shiftKey ? $('[data-act="explode-all"]').click() : explode(focus); }
  else if (k === "c" || k === "с") { e.preventDefault(); setCut(!cut); }
  else if ((k === "s" || k === "і" || k === "ы") && spools.length) { e.preventDefault(); setRun(); }
  else if (k === "a" || k === "ф") { e.preventDefault(); $('[data-act="spin"]').click(); }
  else if (k === "r" || k === "к") { e.preventDefault(); frame(focus, { reset: true }); }
  else if (e.key === "Tab") {
    const f = [...el.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});

window.__viewer = {
  open: (i, path) => show(i, path),
  close: hide,
  get state() { return open ? { app: appIndex, path: pathOf(focus).map((n) => n.spec.name), cut, apart: !!focus.apart } : null; },
  explode: (on, deep) => explode(focus, on, deep),
  cut: (on) => setCut(on),
  run: (on) => setRun(on),
  get rpm() { return spools.map((sp) => [sp.id, Math.round(sp.w)]); },
  enter: (...ids) => { let n = focus; for (const id of ids) { const k = typeof id === "number" ? n.kids[id] : n.kids.find((x) => x.spec.id === id); if (!k) break; n = k; } enter(n); },
  blade: (i) => focus.rowMesh && enterBlade(focus, i ?? firstVisibleBlade(focus)),
  up: () => focus.parent && enter(focus.parent),
  orbit: (az, el2) => { const d = camera.position.distanceTo(controls.target); camera.position.copy(controls.target).add(new THREE.Vector3(Math.cos(el2) * Math.sin(az), Math.sin(el2), Math.cos(el2) * Math.cos(az)).multiplyScalar(d)); camAnim = null; run(); },
  settle: () => { walk(root, (n) => { n.t = n.apart ? 1 : 0; n.v = 0; n.delay = 0; offsets(n, false); }); updatePlanes(); if (camAnim) { controls.target.copy(camAnim.to.target); camera.position.copy(camAnim.to.pos); camAnim = null; } controls.update(); renderer.render(scene, camera); },
};
document.addEventListener("keydown", (e) => {
  if (open || e.defaultPrevented) return;
  if (e.target.closest && e.target.closest("input,textarea,select")) return;
  if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); window.__viewerOpenCurrent?.(); }
});
document.querySelectorAll("[data-open-3d]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); window.__viewerOpenCurrent?.(); }));

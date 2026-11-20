import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------- Tetapan ----------
const REPO = 'ARNA-Tech20/pejabat-syarikat';
const LOG_API = `https://api.github.com/repos/${REPO}/contents/log`;
const REFRESH_MS = 120000;
const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const KL = 8 * 3600e3;

// Senarai ejen dan jadual (waktu Malaysia)
const ROSTER = [
  { kod: 'KETUASTAF', nama: 'Ketua Staf', peranan: 'Pejabat CEO', emoji: '🧭', bilik: 'A', cron: '45 21 * * 0', baju: '#6b7cff', rambut: '#2b2b2b' },
  { kod: 'PELANCAR', nama: 'Pelancar Hasil', peranan: 'Produk & Pelancaran', emoji: '🚀', bilik: 'B', cron: '10 21 * * 0', baju: '#ff8a3d', rambut: '#5a3a22' },
  { kod: 'PENYELIDIK', nama: 'Penyelidik Pasaran', peranan: 'R&D', emoji: '🔭', bilik: 'B', cron: '15 21 1,15 * *', baju: '#2bb3a3', rambut: '#1d1d1d' },
  { kod: 'DESIGNER', nama: 'Designer', peranan: 'Studio Kreatif', emoji: '🎨', bilik: 'C', cron: '10 20 * * 1', baju: '#e65ca8', rambut: '#7a3b8f' },
  { kod: 'PEMASARAN', nama: 'Pemasaran', peranan: 'Studio Kreatif', emoji: '📣', bilik: 'C', cron: '40 20 * * 1', baju: '#f2c230', rambut: '#3b2a1a' },
  { kod: 'DEVELOPER', nama: 'Developer', peranan: 'Makmal Teknologi', emoji: '💻', bilik: 'D', cron: '15 20 * * 4', baju: '#3d8bff', rambut: '#111111' },
  { kod: 'QA', nama: 'QA / Juruaudit', peranan: 'Makmal Teknologi', emoji: '🔍', bilik: 'D', cron: '35 20 * * 3', baju: '#8e5cf0', rambut: '#4a2f1c' },
  { kod: 'JUALAN', nama: 'Jualan B2B', peranan: 'Jualan & Sokongan', emoji: '🤝', bilik: 'E', cron: '25 20 * * 2', baju: '#27a845', rambut: '#262626' },
  { kod: 'SOKONGAN', nama: 'Sokongan Pelanggan', peranan: 'Jualan & Sokongan', emoji: '💬', bilik: 'E', cron: '5 20 * * *', baju: '#17a2d8', rambut: '#6b4423' },
  { kod: 'KEWANGAN', nama: 'Kewangan (CFO)', peranan: 'Kewangan & Pematuhan', emoji: '💰', bilik: 'F', cron: '20 20 1 * *', baju: '#c9a227', rambut: '#1f1f1f' },
  { kod: 'PEMATUHAN', nama: 'Pematuhan', peranan: 'Kewangan & Pematuhan', emoji: '⚖️', bilik: 'F', cron: '50 20 3 * *', baju: '#a05a2c', rambut: '#333333' }
];
const CEO = { kod: 'CEO', nama: 'Ricky (CEO)', peranan: 'Ketua Pegawai Eksekutif', emoji: '👑', bilik: 'A', baju: '#1f2a44', rambut: '#111111', ceo: true };

// Bilik: pusat (x,z), saiz 9 x 8
const BILIK = {
  A: { x: -10, z: -6.5, n: 'PEJABAT CEO', lantai: '#d9c7a3' },
  B: { x: 0, z: -6.5, n: 'PRODUK & R&D', lantai: '#cfd8c3' },
  C: { x: 10, z: -6.5, n: 'STUDIO KREATIF', lantai: '#e8cfd9' },
  D: { x: -10, z: 6.5, n: 'MAKMAL TEKNOLOGI', lantai: '#c9d3e6' },
  E: { x: 0, z: 6.5, n: 'JUALAN & SOKONGAN', lantai: '#d3e6d6' },
  F: { x: 10, z: 6.5, n: 'KEWANGAN & PEMATUHAN', lantai: '#e6dcc3' }
};
const RW = 9, RD = 8;
const PANTRI = { x: 0, z: 0 };

// ---------- Utiliti masa & status ----------
function jam(h, m) { const s = h < 12 ? 'pg' : h < 15 ? 'tgh' : h < 19 ? 'ptg' : 'mlm'; return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + s; }
function cronTeks(c) { const [m, h, dom, , dow] = c.split(' '); const t = jam(+h, +m); if (dom === '*' && dow === '*') return 'Setiap hari, ' + t; if (dow !== '*') return 'Setiap ' + HARI[+dow] + ', ' + t; return dom.split(',').map(d => d + 'hb').join(' & ') + ' setiap bulan, ' + t; }
function seterusnya(c, now = Date.now()) {
  const [m, h, dom, , dow] = c.split(' '); const doms = dom === '*' ? null : dom.split(',').map(Number); const kl = new Date(now + KL);
  for (let i = 0; i < 70; i++) { const d = new Date(Date.UTC(kl.getUTCFullYear(), kl.getUTCMonth(), kl.getUTCDate() + i, +h, +m)); const ok = (dow === '*' || d.getUTCDay() === +dow) && (!doms || doms.includes(d.getUTCDate())); const t = d.getTime() - KL; if (ok && t > now) return t; }
  return null;
}
const fmt = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const tarikh = ms => (ms == null || isNaN(ms)) ? '—' : fmt.format(new Date(ms));
function relatif(ms) { if (ms == null || isNaN(ms)) return ''; const d = ms - Date.now(), a = Math.abs(d); const hr = Math.floor(a / 864e5), j = Math.floor(a % 864e5 / 36e5), mn = Math.floor(a % 36e5 / 6e4); const t = (hr ? hr + ' hari ' + (j ? j + ' jam' : '') : j ? j + ' jam ' + (mn ? mn + ' min' : '') : mn + ' min').trim(); return d >= 0 ? 'dalam ' + t : t + ' lalu'; }
const jamKL = () => new Date(Date.now() + KL).getUTCHours();
const malam = () => { const h = jamKL(); return h >= 19 || h < 7; };

let LOG = [];
function terkini(kod, log = LOG) { let best = null; for (const r of log) { if (r.kod !== kod) continue; if (!best || r.t > best.t) best = r; } return best; }
function keadaan(kod) {
  if (kod === 'CEO') return 'rehat';
  const b = terkini(kod); const now = Date.now();
  if (b) { const u = now - b.t; if (b.keadaan === 'MULA' && u < 2 * 36e5) return 'kerja'; if (b.keadaan === 'GAGAL' && u < 48 * 36e5) return 'gagal'; if (b.keadaan === 'SIAP' && u < 12 * 36e5) return 'siap'; }
  const h = jamKL(); return (h >= 0 && h < 7) ? 'tidur' : 'rehat';
}
const IKON = { kerja: '⌨️', siap: '✅', gagal: '❗', rehat: '☕', tidur: '💤' };
const LABEL = { kerja: 'Sedang bekerja', siap: 'Baru siap', gagal: 'Gagal', rehat: 'Rehat / menunggu giliran', tidur: 'Waktu malam (rehat)' };

// Nama fail log: 2026-11-20T12-05-00Z__SOKONGAN__MULA.md
function parseNama(f) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z__([A-Z]+)__([A-Z]+)/.exec(f.name || '');
  if (!m) return null;
  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return isNaN(t) ? null : { t, kod: m[5], keadaan: m[6], url: f.html_url || '', nama: f.name };
}

// ---------- Adegan 3D ----------
const host = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.getElementById('labels').appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b1530');
scene.fog = new THREE.Fog('#1b1530', 60, 120);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
camera.position.set(22, 26, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.45;
controls.minDistance = 12;
controls.maxDistance = 110;

const hemi = new THREE.HemisphereLight('#fff6e8', '#3a2f55', 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 1.4);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
scene.add(sun);

const matCache = {};
const mat = (c, extra = {}) => { const k = c + JSON.stringify(extra); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra })); };
function box(w, h, d, m, x = 0, y = 0, z = 0, parent = scene) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function label(html, cls, x, y, z, parent = scene) {
  const d = document.createElement('div'); d.className = cls; d.textContent = html;
  const o = new CSS2DObject(d); o.position.set(x, y, z); parent.add(o); return d;
}

// Lantai luar & koridor
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat('#8a7a63'));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const tapak = box(40.6, 0.4, 30.6, mat('#3b3152'), 0, -0.21, 0);
tapak.castShadow = false;

// Bilik
const wallM = mat('#f2ece0');
const trimM = mat('#4b3f5e');
for (const k in BILIK) {
  const b = BILIK[k];
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), mat(b.lantai));
  fl.rotation.x = -Math.PI / 2; fl.position.set(b.x, 0.01, b.z); fl.receiveShadow = true; scene.add(fl);
  const H = 1.1, T = 0.2;
  const luar = b.z < 0 ? b.z - RD / 2 : b.z + RD / 2;      // dinding luar (jauh dari koridor)
  const dalam = b.z < 0 ? b.z + RD / 2 : b.z - RD / 2;     // dinding koridor (ada pintu)
  const tinggi = b.z < 0 ? H * 2.2 : H;   // dinding belakang tinggi, dinding depan rendah supaya nampak ke dalam
  box(RW, tinggi, T, wallM, b.x, tinggi / 2, luar);
  box(RW, 0.08, T + 0.04, trimM, b.x, tinggi, luar);
  box(T, H, RD, wallM, b.x - RW / 2, H / 2, b.z);
  box(T, H, RD, wallM, b.x + RW / 2, H / 2, b.z);
  const gap = 2.2, seg = (RW - gap) / 2;
  box(seg, H, T, wallM, b.x - gap / 2 - seg / 2, H / 2, dalam);
  box(seg, H, T, wallM, b.x + gap / 2 + seg / 2, H / 2, dalam);
  // tingkap pada dinding luar
  if (b.z < 0) for (const dx of [-2.6, 2.6]) {
    box(2, 0.9, 0.05, mat('#9fd8ff', { emissive: '#2a5d7a', emissiveIntensity: 0.4, roughness: 0.2 }), b.x + dx, 1.6, luar + (b.z < 0 ? 0.13 : -0.13));
  }
  label(b.n, 'room', b.x, b.z < 0 ? 2.9 : 1.6, luar);
  // pokok
  const px = b.x + RW / 2 - 0.8, pz = luar + (b.z < 0 ? 0.8 : -0.8);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 12), mat('#9b5a2f'));
  pot.position.set(px, 0.23, pz); pot.castShadow = true; scene.add(pot);
  const daun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat('#3f9b4a', { flatShading: true }));
  daun.position.set(px, 0.85, pz); daun.castShadow = true; scene.add(daun);
}

// Pantri di tengah koridor
box(4, 0.9, 1, mat('#6b4f3a'), PANTRI.x, 0.45, PANTRI.z - 0.2);
box(4.1, 0.08, 1.1, mat('#e8e2d6'), PANTRI.x, 0.94, PANTRI.z - 0.2);
box(0.5, 0.7, 0.45, mat('#2b2b2b'), PANTRI.x - 1.4, 1.33, PANTRI.z - 0.25);
box(0.15, 0.08, 0.05, mat('#ff4444', { emissive: '#ff2222', emissiveIntensity: 1 }), PANTRI.x - 1.4, 1.5, PANTRI.z);
box(0.35, 0.25, 0.35, mat('#ffffff'), PANTRI.x + 1.2, 1.1, PANTRI.z - 0.2);
box(2.4, 0.4, 0.9, mat('#c0504d'), PANTRI.x + 6, 0.3, PANTRI.z + 0.6);
box(2.4, 0.6, 0.25, mat('#a8403d'), PANTRI.x + 6, 0.7, PANTRI.z + 1.0);
box(2.4, 0.4, 0.9, mat('#4d79c0'), PANTRI.x - 6, 0.3, PANTRI.z + 0.6);
box(2.4, 0.6, 0.25, mat('#3d63a8'), PANTRI.x - 6, 0.7, PANTRI.z + 1.0);
label('☕ PANTRI', 'room', PANTRI.x, 1.9, PANTRI.z - 0.2);

// ---------- Watak voxel ----------
function buatOrang(a) {
  const g = new THREE.Group();
  const skin = mat('#f1c27d'), seluar = mat('#3a3f5c'), kasut = mat('#1b1b1b');
  const badan = box(0.62, 0.72, 0.36, mat(a.baju), 0, 1.06, 0, g);
  const kepala = box(0.46, 0.46, 0.46, skin, 0, 1.66, 0, g);
  box(0.5, 0.16, 0.5, mat(a.rambut), 0, 1.93, -0.01, g);
  box(0.5, 0.22, 0.12, mat(a.rambut), 0, 1.78, -0.2, g);
  box(0.07, 0.07, 0.02, mat('#111'), -0.1, 1.68, 0.235, g);
  box(0.07, 0.07, 0.02, mat('#111'), 0.1, 1.68, 0.235, g);
  if (a.ceo) { box(0.34, 0.12, 0.34, mat('#f5c542', { metalness: 0.6, roughness: 0.3 }), 0, 2.08, 0, g); box(0.62, 0.1, 0.37, mat('#c0392b'), 0, 1.25, 0.005, g); }
  const kaki = [-0.15, 0.15].map(x => { const p = new THREE.Group(); p.position.set(x, 0.7, 0); g.add(p); box(0.24, 0.66, 0.28, seluar, 0, -0.33, 0, p); box(0.26, 0.08, 0.34, kasut, 0, -0.66, 0.03, p); return p; });
  const tangan = [-0.42, 0.42].map(x => { const p = new THREE.Group(); p.position.set(x, 1.38, 0); g.add(p); box(0.18, 0.58, 0.2, mat(a.baju), 0, -0.27, 0, p); box(0.16, 0.12, 0.16, skin, 0, -0.6, 0, p); return p; });
  g.traverse(o => { o.userData.kod = a.kod; });
  // label & gelembung
  const wrap = document.createElement('div'); wrap.className = 'lbl';
  const bub = document.createElement('div'); bub.className = 'bub hide';
  const nm = document.createElement('div'); nm.textContent = a.emoji + ' ' + a.nama;
  wrap.append(bub, nm);
  const lo = new CSS2DObject(wrap); lo.position.set(0, 2.45, 0); g.add(lo);
  return { g, kaki, tangan, badan, kepala, bub };
}

function buatMeja(x, z, ceo) {
  const kayu = mat(ceo ? '#6b3e1f' : '#9b6b43');
  box(1.6, 0.08, 0.8, kayu, x, 0.78, z);
  for (const [dx, dz] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) box(0.07, 0.78, 0.07, mat('#3b2a1a'), x + dx, 0.39, z + dz);
  box(0.7, 0.45, 0.05, mat('#1d1d1d'), x, 1.15, z + 0.2);
  const skrin = box(0.62, 0.37, 0.02, mat('#2a3550', { emissive: '#000000' }).clone(), x, 1.15, z + 0.17);
  box(0.08, 0.2, 0.08, mat('#1d1d1d'), x, 0.9, z + 0.22);
  box(0.5, 0.03, 0.18, mat('#333'), x, 0.83, z - 0.15);
  // kerusi
  box(0.6, 0.08, 0.6, mat('#2c3e50'), x, 0.48, z - 0.95);
  box(0.6, 0.6, 0.08, mat('#2c3e50'), x, 0.8, z - 1.25);
  box(0.08, 0.44, 0.08, mat('#555'), x, 0.24, z - 0.95);
  return skrin;
}

const SEMUA = [CEO, ...ROSTER];
const kira = {};
const AGEN = SEMUA.map(a => {
  const b = BILIK[a.bilik]; const i = kira[a.bilik] = (kira[a.bilik] || 0) + 1;
  const dx = b.x + (i === 1 ? -2.2 : 2.2), dz = b.z + 0.3;
  const skrin = buatMeja(dx, dz, a.ceo);
  const o = buatOrang(a);
  const kerusi = new THREE.Vector3(dx, 0, dz - 0.95);
  o.g.position.copy(kerusi);
  scene.add(o.g);
  return { a, ...o, skrin, kerusi, sasaran: kerusi.clone(), duduk: true, k: 'rehat', tunggu: performance.now() + 1500 + Math.random() * 5000, fasa: Math.random() * 10 };
});

// ---------- Logik gerak ----------
const gerak = !matchMedia('(prefers-reduced-motion: reduce)').matches;
function pilihSasaran(o) {
  const b = BILIK[o.a.bilik]; const r = Math.random();
  if (r < 0.33) return new THREE.Vector3(PANTRI.x + (Math.random() * 3 - 1.5), 0, PANTRI.z + 0.7 + Math.random() * 0.6);
  if (r < 0.66) return o.kerusi.clone();
  return new THREE.Vector3(b.x + (Math.random() * 6 - 3), 0, b.z + (b.z < 0 ? 1.8 : -1.8) + Math.random() * 1.2 - 0.6);
}
// laluan: keluar ikut pintu bilik bila bertukar antara bilik dan koridor
function laluan(o, dest) {
  const b = BILIK[o.a.bilik]; const pintu = new THREE.Vector3(b.x, 0, b.z < 0 ? b.z + RD / 2 : b.z - RD / 2);
  const dalamBilik = p => Math.abs(p.z - b.z) < RD / 2 - 0.2 && Math.abs(p.x - b.x) < RW / 2;
  const kini = o.g.position;
  if (dalamBilik(kini) !== dalamBilik(dest)) return [pintu.clone(), dest];
  return [dest];
}

function kemasKiniKeadaan() {
  for (const o of AGEN) {
    const k = keadaan(o.a.kod); o.k = k;
    const on = k === 'kerja';
    o.skrin.material.emissive.set(on ? '#5fe1ff' : '#000000');
    o.skrin.material.emissiveIntensity = on ? 1.2 : 0;
    o.bub.textContent = IKON[k];
    o.bub.classList.toggle('hide', k === 'rehat');
    if (k !== 'rehat') { o.jalan = laluan(o, o.kerusi.clone()); }
  }
}

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1); const now = performance.now(); const t = now / 1000;
  for (const o of AGEN) {
    if (gerak && o.k === 'rehat' && now > o.tunggu && (!o.jalan || !o.jalan.length)) { o.jalan = laluan(o, pilihSasaran(o)); o.tunggu = now + 6000 + Math.random() * 9000; }
    const p = o.g.position;
    let berjalan = false;
    if (o.jalan && o.jalan.length) {
      const s = o.jalan[0]; const d = s.clone().sub(p); d.y = 0; const dist = d.length(); const v = 1.6 * dt;
      if (!gerak) { p.copy(o.jalan[o.jalan.length - 1]); o.jalan = []; }
      else if (dist > v) { d.normalize(); p.addScaledVector(d, v); o.g.rotation.y = Math.atan2(d.x, d.z); berjalan = true; }
      else { p.copy(s); o.jalan.shift(); }
    }
    const diKerusi = p.distanceTo(o.kerusi) < 0.05;
    if (diKerusi && !berjalan) o.g.rotation.y = 0;
    const f = t * 9 + o.fasa;
    if (berjalan) {
      o.g.position.y = 0;
      o.kaki[0].rotation.x = Math.sin(f) * 0.6; o.kaki[1].rotation.x = -Math.sin(f) * 0.6;
      o.tangan[0].rotation.x = -Math.sin(f) * 0.5; o.tangan[1].rotation.x = Math.sin(f) * 0.5;
    } else if (diKerusi) {
      o.g.position.y = -0.28;
      o.kaki[0].rotation.x = o.kaki[1].rotation.x = -1.45;
      if (o.k === 'kerja' && gerak) { o.tangan[0].rotation.x = -1.1 + Math.sin(t * 22) * 0.12; o.tangan[1].rotation.x = -1.1 + Math.cos(t * 22) * 0.12; o.kepala.rotation.x = 0.1; }
      else if (o.k === 'tidur') { o.tangan[0].rotation.x = o.tangan[1].rotation.x = -0.3; o.kepala.rotation.x = 0.35 + (gerak ? Math.sin(t * 1.5) * 0.05 : 0); }
      else { o.tangan[0].rotation.x = o.tangan[1].rotation.x = -0.4; o.kepala.rotation.x = 0; }
    } else {
      o.g.position.y = 0;
      o.kaki[0].rotation.x = o.kaki[1].rotation.x = 0;
      o.tangan[0].rotation.x = gerak ? Math.sin(t * 2 + o.fasa) * 0.08 : 0; o.tangan[1].rotation.x = -0.9; // pegang kopi
      o.kepala.rotation.x = 0;
    }
    if (o.k === 'rehat') o.bub.classList.toggle('hide', !(Math.abs(p.z - PANTRI.z) < 1.6 && Math.abs(p.x - PANTRI.x) < 2.2));
  }
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Siang / malam ikut waktu Malaysia
function cahaya() {
  const m = malam();
  scene.background.set(m ? '#0e0b1c' : '#1b1530');
  scene.fog.color.set(m ? '#0e0b1c' : '#1b1530');
  hemi.intensity = m ? 0.45 : 0.9;
  sun.intensity = m ? 0.35 : 1.4;
  sun.color.set(m ? '#9fb4ff' : '#fff1d6');
}

function saiz() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  const asp = w / h;
  camera.position.setLength(asp >= 1.25 ? 44 : Math.min(70, 44 * 0.72 / asp));
  camera.updateProjectionMatrix();
}
addEventListener('resize', saiz);

// Klik watak
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
let pilihan = null; let turun = null;
renderer.domElement.addEventListener('pointerdown', e => { turun = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!turun || Math.hypot(e.clientX - turun[0], e.clientY - turun[1]) > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(AGEN.map(o => o.g), true)[0];
  if (hit) { pilihan = hit.object.userData.kod; lukisButiran(); document.getElementById('side').classList.add('open'); }
});
document.getElementById('toggle').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));

// ---------- Panel ----------
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function lukisButiran() {
  const box = document.getElementById('det'); box.replaceChildren();
  if (!pilihan) { box.append(el('div', 'muted', 'Klik mana-mana watak dalam pejabat.')); return; }
  if (pilihan === 'CEO') { box.append(el('div', 'nm', '👑 Ricky — CEO'), el('div', 'muted', 'Semua ejen melapor kepada anda melalui Ringkasan CEO setiap Ahad malam.')); return; }
  const a = ROSTER.find(x => x.kod === pilihan); if (!a) return;
  const k = keadaan(a.kod), b = terkini(a.kod), n = seterusnya(a.cron);
  const row = (l, v) => { const r = el('div', 'r'); r.append(el('span', null, l), el('b', null, v)); box.append(r); };
  box.append(el('div', 'nm', a.emoji + ' ' + a.nama + ' — ' + a.peranan));
  row('Keadaan', IKON[k] + ' ' + LABEL[k]);
  row('Jadual', cronTeks(a.cron));
  row('Seterusnya', tarikh(n) + ' (' + relatif(n) + ')');
  if (b) {
    row('Status terakhir', b.keadaan);
    row('Masa', tarikh(b.t) + ' (' + relatif(b.t) + ')');
    if (/^https:\/\/github\.com\//.test(b.url)) { const l = el('a', null, 'Lihat nota status di GitHub'); l.href = b.url; l.target = '_blank'; l.rel = 'noopener'; box.append(l); }
  } else row('Status terakhir', 'Belum pernah melapor');
}
function lukisPanel(ralat) {
  const now = Date.now();
  const ks = ROSTER.map(a => keadaan(a.kod));
  document.getElementById('t-kerja').textContent = ks.filter(k => k === 'kerja').length;
  document.getElementById('t-gagal').textContent = ks.filter(k => k === 'gagal').length;
  document.getElementById('t-siap').textContent = ROSTER.filter(a => LOG.some(r => r.kod === a.kod && r.keadaan === 'SIAP' && now - r.t < 24 * 36e5)).length;
  const nx = ROSTER.map(a => ({ a, t: seterusnya(a.cron) })).filter(x => x.t).sort((x, y) => x.t - y.t)[0];
  document.getElementById('t-next').textContent = nx ? nx.a.emoji + ' ' + nx.a.nama : '—';
  document.getElementById('t-next2').textContent = nx ? relatif(nx.t) : 'Giliran seterusnya';
  const feed = document.getElementById('feed'); feed.replaceChildren();
  if (ralat) feed.append(el('li', 'err', ralat));
  const rows = LOG.slice().sort((x, y) => y.t - x.t).slice(0, 12);
  if (!rows.length && !ralat) feed.append(el('li', 'muted', 'Belum ada aktiviti. Ejen pertama (💬 Sokongan Pelanggan) mula setiap hari pukul 8:05 malam.'));
  for (const r of rows) {
    const a = ROSTER.find(x => x.kod === r.kod); const li = el('li');
    li.append(el('time', null, tarikh(r.t)), document.createTextNode((a ? a.emoji + ' ' + a.nama : r.kod) + ' '), el('span', 'tag ' + r.keadaan, r.keadaan === 'MULA' ? 'mula bekerja' : r.keadaan === 'SIAP' ? 'siap' : r.keadaan === 'GAGAL' ? 'gagal' : r.keadaan));
    feed.append(li);
  }
  document.getElementById('src').textContent = 'Sumber: folder log/ dalam repo ' + REPO + ' · dikemas kini ' + tarikh(now);
  lukisButiran();
}

const DEMO = new URLSearchParams(location.search).has('demo');
function logDemo() {
  const n = Date.now(), m = 6e4;
  const f = (kod, k, ago) => ({ t: n - ago * m, kod, keadaan: k, url: '', nama: 'demo' });
  return [f('DEVELOPER', 'MULA', 5), f('DESIGNER', 'MULA', 12), f('PEMASARAN', 'MULA', 3), f('QA', 'SIAP', 40), f('QA', 'MULA', 70),
    f('SOKONGAN', 'SIAP', 90), f('SOKONGAN', 'MULA', 95), f('JUALAN', 'GAGAL', 200), f('KETUASTAF', 'MULA', 1), f('PELANCAR', 'SIAP', 30)];
}
async function muatLog() {
  if (DEMO) { LOG = logDemo(); kemasKiniKeadaan(); lukisPanel('Mod demo — data contoh, bukan status sebenar.'); return; }
  try {
    const res = await fetch(LOG_API + '?t=' + Date.now(), { headers: { Accept: 'application/vnd.github+json' } });
    if (res.status === 404) { LOG = []; kemasKiniKeadaan(); lukisPanel(); return; }
    if (!res.ok) throw new Error(res.status === 403 ? 'Had API GitHub dicapai — cuba lagi sebentar.' : 'GitHub menjawab ' + res.status);
    const files = await res.json();
    LOG = (Array.isArray(files) ? files : []).map(parseNama).filter(Boolean);
    kemasKiniKeadaan(); lukisPanel();
  } catch (e) { kemasKiniKeadaan(); lukisPanel('Log tidak dapat dimuatkan: ' + e.message); }
}

function jamHud() {
  document.getElementById('clock').textContent = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()) + ' (waktu Malaysia)';
}

saiz(); cahaya(); kemasKiniKeadaan(); lukisPanel(); jamHud();
muatLog();
setInterval(muatLog, REFRESH_MS);
setInterval(() => { jamHud(); cahaya(); }, 1000);
setInterval(() => { kemasKiniKeadaan(); lukisPanel(); }, 60000);
requestAnimationFrame(tick);

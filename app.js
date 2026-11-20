import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

// Bilik (mesti sama dengan model Blender models/office.glb)
const BILIK = {
  A: { x: -12.5, z: -7.5, n: 'PEJABAT CEO' }, B: { x: 0, z: -7.5, n: 'PRODUK & R&D' }, C: { x: 12.5, z: -7.5, n: 'STUDIO KREATIF' },
  D: { x: -12.5, z: 7.5, n: 'MAKMAL TEKNOLOGI' }, E: { x: 0, z: 7.5, n: 'JUALAN & SOKONGAN' }, F: { x: 12.5, z: 7.5, n: 'KEWANGAN & PEMATUHAN' }
};
const RW = 12, RD = 11, LANTAI = 0.3;
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
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe3f7');
scene.fog = new THREE.Fog('#bfe3f7', 70, 140);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
camera.position.set(26, 30, 36);
const controls = new OrbitControls(camera, renderer.domElement);
window.__pk = { camera, controls };
controls.target.set(0, 0.5, 1);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.44;
controls.minDistance = 10;
controls.maxDistance = 120;

const hemi = new THREE.HemisphereLight('#e8f4ff', '#8a7a5a', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2d9', 2.2);
sun.position.set(22, 38, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 110 });
scene.add(sun);
const isi = new THREE.DirectionalLight('#c9dcff', 0.5);
isi.position.set(-20, 18, -10);
scene.add(isi);

// ---------- Label sprite (tajam, tidak bergetar) ----------
function teksSprite(teks, { saiz = 34, warna = '#ffffff', latar = 'rgba(30,24,48,0.82)', tinggi = 0.42, tebal = 600 } = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `${tebal} ${saiz}px system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(teks).width) + saiz * 1.1; const h = Math.ceil(saiz * 1.6);
  c.width = w * 2; c.height = h * 2; g.scale(2, 2); g.font = font;
  if (latar) { g.fillStyle = latar; const r = h / 2; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill(); }
  g.fillStyle = warna; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(teks, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(tinggi * w / h, tinggi, 1); sp.renderOrder = 10;
  return sp;
}
function gelembung() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.62, 0.62, 1); sp.renderOrder = 11;
  sp.userData.set = (ikon) => {
    if (sp.userData.ikon === ikon) return; sp.userData.ikon = ikon;
    const g = c.getContext('2d'); g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 58, 52, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(52, 104); g.lineTo(64, 124); g.lineTo(76, 104); g.fill();
    g.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ikon, 64, 62); tex.needsUpdate = true;
  };
  return sp;
}

// ---------- Muat model Blender ----------
let AGEN = [];
const pintu = k => { const b = BILIK[k]; return b.z < 0 ? b.z + RD / 2 : b.z - RD / 2; };
async function muatModel() {
  const status = document.getElementById('memuat');
  const loader = new GLTFLoader();
  const [office, person] = await Promise.all([loader.loadAsync('./models/office.glb'), loader.loadAsync('./models/person.glb')]);
  office.scene.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      if (m && m.transparent) { o.castShadow = false; m.depthWrite = false; }
    }
  });
  scene.add(office.scene);
  // Label bilik
  for (const k in BILIK) {
    const e = office.scene.getObjectByName('Label_' + k); if (!e) continue;
    const sp = teksSprite(BILIK[k].n, { saiz: 30, latar: 'rgba(47,62,92,0.88)', tinggi: 0.55 });
    sp.position.copy(e.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.5, 0)); scene.add(sp);
  }
  const templat = person.scene.getObjectByName('Person') || person.scene;
  const SEMUA = [CEO, ...ROSTER];
  AGEN = SEMUA.map(a => {
    const seatE = office.scene.getObjectByName('Seat_' + a.kod);
    const kerusi = seatE ? seatE.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(BILIK[a.bilik].x, LANTAI, BILIK[a.bilik].z);
    kerusi.y = LANTAI;
    const skrin = office.scene.getObjectByName('Screen_' + a.kod);
    if (skrin) { skrin.material = skrin.material.clone(); skrin.material.emissive = new THREE.Color('#000'); }
    const g = templat.clone(true);
    const baju = new THREE.MeshStandardMaterial({ color: a.baju, roughness: 0.8 });
    const rambut = new THREE.MeshStandardMaterial({ color: a.rambut, roughness: 0.9 });
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      if (o.material.name === 'Baju') o.material = baju;
      else if (o.material.name === 'Rambut') o.material = rambut;
      o.userData.kod = a.kod;
    });
    const mahkota = g.getObjectByName('Crown'); if (mahkota) mahkota.visible = !!a.ceo;
    const badan = new THREE.Group(); badan.add(g); badan.position.copy(kerusi); scene.add(badan);
    const label = teksSprite(a.emoji + ' ' + a.nama, { saiz: 30, tinggi: 0.38 }); label.position.set(0, 2.55, 0); badan.add(label);
    const bub = gelembung(); bub.position.set(0, 3.15, 0); bub.visible = false; badan.add(bub);
    badan.traverse(o => { o.userData.kod = a.kod; });
    return {
      a, badan, g, skrin, kerusi, bub, label,
      kaki: [g.getObjectByName('LegL'), g.getObjectByName('LegR')],
      tangan: [g.getObjectByName('ArmL'), g.getObjectByName('ArmR')],
      kepala: g.getObjectByName('HeadPivot'),
      jalan: [], k: 'rehat', tunggu: performance.now() + 1500 + Math.random() * 6000, fasa: Math.random() * 10
    };
  });
  if (status) status.remove();
}

// ---------- Logik gerak ----------
const gerak = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x, z) => new THREE.Vector3(x, LANTAI, z);
function dalamBilik(o, p) { const b = BILIK[o.a.bilik]; return Math.abs(p.x - b.x) < RW / 2 - 0.3 && Math.abs(p.z - b.z) < RD / 2 - 0.2; }
function laluan(o, dest) {
  const b = BILIK[o.a.bilik]; const zc = pintu(o.a.bilik); const arah = b.z < 0 ? 1 : -1;
  const kini = o.badan.position; const dIn = V(b.x, zc - arah * 0.8), dOut = V(b.x, zc + arah * 0.9);
  const aisle = z => V(b.x, z);
  const a = dalamBilik(o, kini), c = dalamBilik(o, dest);
  if (a && c) return [aisle(kini.z), aisle(dest.z), dest];
  if (a && !c) return [aisle(kini.z), dIn, dOut, dest];
  if (!a && c) return [dOut, dIn, aisle(dest.z), dest];
  return [dest];
}
function pilihSasaran(o) {
  const b = BILIK[o.a.bilik]; const r = Math.random(); const arah = b.z < 0 ? 1 : -1;
  if (r < 0.35) return V(PANTRI.x + (Math.random() * 4 - 2), PANTRI.z - 0.15 + Math.random() * 0.2);
  if (r < 0.65) return o.kerusi.clone();
  return V(b.x + (Math.random() * 2.4 - 1.2), b.z + arah * (2.2 + Math.random() * 1.6));
}

function kemasKiniKeadaan() {
  for (const o of AGEN) {
    const k = keadaan(o.a.kod); const lama = o.k; o.k = k;
    if (o.skrin) { const on = k === 'kerja'; o.skrin.material.emissive.set(on ? '#6fe3ff' : '#000000'); o.skrin.material.emissiveIntensity = on ? 1.6 : 0; }
    o.bub.userData.set(IKON[k]); o.bub.visible = k !== 'rehat';
    if (k !== 'rehat' && (lama === 'rehat' || !o.jalan.length) && o.badan.position.distanceTo(o.kerusi) > 0.05) o.jalan = laluan(o, o.kerusi.clone());
  }
}

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1); const now = performance.now(); const t = now / 1000;
  for (const o of AGEN) {
    if (gerak && o.k === 'rehat' && now > o.tunggu && !o.jalan.length) { o.jalan = laluan(o, pilihSasaran(o)); o.tunggu = now + 7000 + Math.random() * 10000; }
    const p = o.badan.position; let berjalan = false;
    if (o.jalan.length) {
      const s = o.jalan[0]; const d = new THREE.Vector3(s.x - p.x, 0, s.z - p.z); const dist = d.length(); const v = 1.5 * dt;
      if (!gerak) { const last = o.jalan[o.jalan.length - 1]; p.x = last.x; p.z = last.z; o.jalan = []; }
      else if (dist > v) { d.normalize(); p.x += d.x * v; p.z += d.z * v; const sasar = Math.atan2(d.x, d.z); o.g.rotation.y += (((sasar - o.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10); berjalan = true; }
      else { p.x = s.x; p.z = s.z; o.jalan.shift(); }
    }
    const diKerusi = Math.hypot(p.x - o.kerusi.x, p.z - o.kerusi.z) < 0.05;
    const f = t * 8 + o.fasa; const [kl, kr] = o.kaki, [tl, tr] = o.tangan;
    if (berjalan) {
      o.g.position.y = Math.abs(Math.sin(f)) * 0.04;
      if (kl) { kl.rotation.x = Math.sin(f) * 0.55; kr.rotation.x = -Math.sin(f) * 0.55; }
      if (tl) { tl.rotation.x = -Math.sin(f) * 0.45; tr.rotation.x = Math.sin(f) * 0.45; }
      if (o.kepala) o.kepala.rotation.x = 0;
    } else if (diKerusi) {
      o.g.rotation.y += (0 - o.g.rotation.y) * Math.min(1, dt * 8);
      o.g.position.y = -0.24;
      if (kl) kl.rotation.x = kr.rotation.x = -1.5;
      if (o.k === 'kerja' && gerak) {
        tl.rotation.x = -1.15 + Math.sin(t * 20) * 0.1; tr.rotation.x = -1.15 + Math.cos(t * 21) * 0.1;
        if (o.kepala) o.kepala.rotation.x = 0.12 + Math.sin(t * 1.3) * 0.03;
      } else if (o.k === 'tidur') {
        tl.rotation.x = tr.rotation.x = -0.9; if (o.kepala) o.kepala.rotation.x = 0.45 + (gerak ? Math.sin(t * 1.2) * 0.05 : 0);
      } else { tl.rotation.x = tr.rotation.x = -0.5; if (o.kepala) o.kepala.rotation.x = 0; }
    } else {
      o.g.position.y = 0;
      if (kl) kl.rotation.x = kr.rotation.x = 0;
      if (tl) { tl.rotation.x = gerak ? Math.sin(t * 1.5 + o.fasa) * 0.06 : 0; tr.rotation.x = -1.0; }
      if (o.kepala) o.kepala.rotation.x = gerak ? Math.sin(t * 0.8 + o.fasa) * 0.08 : 0;
    }
    if (o.k === 'rehat') o.bub.visible = !o.jalan.length && Math.abs(p.z - PANTRI.z) < 1.2 && Math.abs(p.x - PANTRI.x) < 2.6;
    if (o.bub.visible && gerak) o.bub.position.y = 3.15 + Math.sin(t * 2 + o.fasa) * 0.05;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Siang / malam ikut waktu Malaysia
function cahaya() {
  const m = malam();
  scene.background.set(m ? '#101630' : '#bfe3f7');
  scene.fog.color.set(m ? '#101630' : '#bfe3f7');
  hemi.intensity = m ? 0.35 : 1.1;
  hemi.color.set(m ? '#7d8fd6' : '#e8f4ff');
  sun.intensity = m ? 0.45 : 2.2;
  sun.color.set(m ? '#a9b9ff' : '#fff2d9');
  isi.intensity = m ? 0.25 : 0.5;
  renderer.toneMappingExposure = m ? 1.25 : 1.05;
}

function saiz() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const asp = w / h;
  camera.position.setLength(asp >= 1.25 ? 54 : Math.min(95, 54 * 0.7 / asp));
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
  const hit = ray.intersectObjects(AGEN.map(o => o.badan), true)[0];
  if (hit && hit.object.userData.kod) { pilihan = hit.object.userData.kod; lukisButiran(); document.getElementById('side').classList.add('open'); }
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

saiz(); cahaya(); lukisPanel(); jamHud();
await muatModel();
kemasKiniKeadaan();
muatLog();
setInterval(muatLog, REFRESH_MS);
setInterval(() => { jamHud(); cahaya(); }, 1000);
setInterval(() => { kemasKiniKeadaan(); lukisPanel(); }, 60000);
requestAnimationFrame(tick);

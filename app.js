import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- Tetapan ----------
const REPO = 'ARNA-Tech20/pejabat-syarikat';
const LOG_API = `https://api.github.com/repos/${REPO}/contents/log`;
const REFRESH_MS = 300000;
const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const KL = 8 * 3600e3;

// Senarai ejen dan jadual (waktu Malaysia)
// Jadual setiap tugas berjadual (kod log -> cron, waktu Malaysia)
const JADUAL = {
  KETUASTAF: '10 21 * * 0', IDEA: '45 20 * * 6', PEMASARAN: '10 20 * * 1',
  WEBAPP: '15 20 * * 4', GAME: '20 20 * * 5', MOBILE: '35 20 * * 3', JUALAN: '25 20 * * 2', SOKONGAN: '5 20 * * 1,3,5',
  KEWANGAN: '20 20 1 * *', SENIOR: '30 21 * * 6'
};
// Pasukan & ahli (mesti sama dengan PERATURAN-SYARIKAT.md dan model Blender)
const PASUKAN = {
  A: 'Pejabat CEO', B: 'Makmal Idea', C: 'Kreatif & Pemasaran', D: 'Pasukan Web App',
  E: 'Studio Game', F: 'Pasukan Mobile App', G: 'Jualan & Sokongan', H: 'Kewangan & Pematuhan',
  I: 'Majlis Senior', J: 'Bilik Mesyuarat'
};
const m = (id, nama, peranan, emoji, bilik, kod, baju, rambut) => ({ id, nama, peranan, emoji, bilik, kod, pasukan: PASUKAN[bilik], cron: JADUAL[kod], baju, rambut });
const ROSTER = [
  m('KETUASTAF', 'Ketua Staf', 'Ketua Staf', '🧭', 'A', 'KETUASTAF', '#6b7cff', '#2b2b2b'),
  m('HANA', 'Hana', 'Pengurus Produk', '🚀', 'A', 'KETUASTAF', '#ff8a3d', '#5a3a22'),
  m('IDRIS', 'Idris', 'Ketua Makmal Idea', '💡', 'B', 'IDEA', '#f2c230', '#1d1d1d'),
  m('SITI', 'Siti', 'Pemburu Trend', '🔭', 'B', 'IDEA', '#2bb3a3', '#3b2a1a'),
  m('KUMAR', 'Kumar', 'Penganalisis Data', '📊', 'B', 'IDEA', '#5f7dd6', '#111111'),
  m('MEILING', 'Mei Ling', 'Designer', '🎨', 'C', 'PEMASARAN', '#e65ca8', '#1a1a1a'),
  m('HAFIZ', 'Hafiz', 'Ketua Pemasaran', '📣', 'C', 'PEMASARAN', '#f28a30', '#2a1d12'),
  m('AINA', 'Aina', 'Penulis Kandungan', '✍️', 'C', 'PEMASARAN', '#b07cf0', '#6b4423'),
  m('FARID', 'Farid', 'Ketua Teknikal', '🧑‍💻', 'D', 'WEBAPP', '#3d8bff', '#111111'),
  m('NADIA', 'Nadia', 'Frontend', '🖥️', 'D', 'WEBAPP', '#4fc3f7', '#3b2a1a'),
  m('RAJ', 'Raj', 'Backend', '🗄️', 'D', 'WEBAPP', '#2f5fb3', '#1a1a1a'),
  m('ZUL', 'Zul', 'QA', '🔍', 'D', 'WEBAPP', '#8e5cf0', '#4a2f1c'),
  m('AMIR', 'Amir', 'Producer', '🎬', 'E', 'GAME', '#ff4fa3', '#222222'),
  m('LINA', 'Lina', 'Game Designer', '🎲', 'E', 'GAME', '#ff7a59', '#7a3b2a'),
  m('DANIEL', 'Daniel', 'Unity Dev', '🕹️', 'E', 'GAME', '#30c0e0', '#c9a36b'),
  m('YANA', 'Yana', 'Artis', '🖌️', 'E', 'GAME', '#f2d14a', '#2b1b10'),
  m('HAKIM', 'Hakim', 'Ketua Mobile', '📱', 'F', 'MOBILE', '#7a5cff', '#111111'),
  m('SARA', 'Sara', 'Expo Dev', '⚛️', 'F', 'MOBILE', '#61dafb', '#4a2f1c'),
  m('BEN', 'Ben', 'Android & Widget', '🤖', 'F', 'MOBILE', '#3ddc84', '#262626'),
  m('IKA', 'Ika', 'QA Mobile', '🧪', 'F', 'MOBILE', '#e0607e', '#3b2a1a'),
  m('RIZAL', 'Rizal', 'Jualan B2B', '🤝', 'G', 'JUALAN', '#27a845', '#262626'),
  m('TINI', 'Tini', 'Sokongan Pelanggan', '💬', 'G', 'SOKONGAN', '#17a2d8', '#6b4423'),
  m('LIYANA', 'Liyana', 'CFO', '💰', 'H', 'KEWANGAN', '#c9a227', '#1f1f1f'),
  m('AZMAN', 'Azman', 'Pematuhan', '⚖️', 'H', 'KEWANGAN', '#a05a2c', '#333333'),
  m('FAIZAL', 'Dr. Faizal', 'CTO', '🧠', 'I', 'SENIOR', '#2b2f3a', '#9a9a9a'),
  m('ROSNAH', 'Puan Rosnah', 'COO', '🎯', 'I', 'SENIOR', '#7a1f3d', '#2a1a12'),
  m('WEIJIE', 'Wei Jie', 'CPO', '📈', 'I', 'SENIOR', '#0f5f5a', '#111111')
];
const CEO = { id: 'CEO', kod: 'CEO', nama: 'Ricky', peranan: 'CEO', pasukan: 'Pejabat CEO', emoji: '👑', bilik: 'A', baju: '#1f2a44', rambut: '#111111', ceo: true };
const SEMUA = [CEO, ...ROSTER];
const TUGAS = Object.keys(JADUAL);
const ALIAS_KOD = { PELANCAR: 'KETUASTAF', DESIGNER: 'PEMASARAN', PEMATUHAN: 'KEWANGAN', DEVELOPER: 'WEBAPP', QA: 'MOBILE', PENYELIDIK: 'IDEA' };
const ketuaTugas = kod => ROSTER.find(a => a.kod === (ALIAS_KOD[kod] || kod));

// Bilik (mesti sama dengan model Blender models/office.glb)
const BILIK = {};
for (const [k, x, z] of [['A', -22, -7.5], ['B', -11, -7.5], ['C', 0, -7.5], ['D', 11, -7.5], ['I', 22, -7.5], ['E', -22, 7.5], ['F', -11, 7.5], ['G', 0, 7.5], ['H', 11, 7.5], ['J', 22, 7.5]])
  BILIK[k] = { x, z, n: PASUKAN[k].toUpperCase() };
const RW = 11, RD = 11, LANTAI = 0.3;
const PANTRI = { x: 0, z: 0 };

// ---------- Utiliti masa & status ----------
function jam(h, m) { const s = h < 12 ? 'pg' : h < 15 ? 'tgh' : h < 19 ? 'ptg' : 'mlm'; return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + s; }
function cronTeks(c) { const [m, h, dom, , dow] = c.split(' '); const t = jam(+h, +m); if (dom === '*' && dow === '*') return 'Setiap hari, ' + t; if (dow !== '*') return 'Setiap ' + dow.split(',').map(d => HARI[+d]).join(', ') + ', ' + t; return dom.split(',').map(d => d + 'hb').join(' & ') + ' setiap bulan, ' + t; }
function seterusnya(c, now = Date.now()) {
  const [m, h, dom, , dow] = c.split(' '); const doms = dom === '*' ? null : dom.split(',').map(Number); const kl = new Date(now + KL);
  for (let i = 0; i < 70; i++) { const d = new Date(Date.UTC(kl.getUTCFullYear(), kl.getUTCMonth(), kl.getUTCDate() + i, +h, +m)); const ok = (dow === '*' || dow.split(',').map(Number).includes(d.getUTCDay())) && (!doms || doms.includes(d.getUTCDate())); const t = d.getTime() - KL; if (ok && t > now) return t; }
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
  return isNaN(t) ? null : { t, kod: ALIAS_KOD[m[5]] || m[5], keadaan: m[6], url: f.html_url || '', nama: f.name };
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
window.__pk = { camera, controls, agen: () => AGEN };
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

function balut(g, teks, lebar, maks) {
  const kata = teks.split(/\s+/); const baris = []; let kini = '';
  for (const w of kata) { const cuba = kini ? kini + ' ' + w : w; if (g.measureText(cuba).width > lebar && kini) { baris.push(kini); kini = w; } else kini = cuba; if (baris.length >= maks) break; }
  if (baris.length < maks && kini) baris.push(kini);
  if (baris.length === maks && kata.join(' ').length > baris.join(' ').length) baris[maks - 1] = baris[maks - 1].replace(/\s*\S*$/, '') + '…';
  return baris;
}
function bualSprite() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 256;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(8.1, 2.7, 1); sp.renderOrder = 12; sp.visible = false;
  sp.userData.set = (teks, papan = true) => {
    const g = c.getContext('2d'); g.clearRect(0, 0, 768, 256);
    g.font = (papan ? '600 ' : 'italic 500 ') + '34px system-ui,"Segoe UI",Roboto,sans-serif';
    const baris = balut(g, teks, 690, 3);
    const h = 36 + baris.length * 44, y0 = 214 - h;
    g.fillStyle = papan ? 'rgba(255,255,255,0.97)' : 'rgba(236,240,246,0.93)'; g.strokeStyle = papan ? '#2f6bff' : '#9aa6bb'; g.lineWidth = papan ? 6 : 3;
    g.beginPath(); g.roundRect(8, y0, 752, h, 26); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(360, y0 + h - 2); g.lineTo(384, 250); g.lineTo(408, y0 + h - 2); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(360, y0 + h); g.lineTo(384, 250); g.lineTo(408, y0 + h); g.stroke();
    g.fillStyle = '#1d2433'; g.textAlign = 'center'; g.textBaseline = 'middle';
    baris.forEach((b, i) => g.fillText(b, 384, y0 + 40 + i * 44));
    tex.needsUpdate = true;
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
  AGEN = SEMUA.map(a => {
    const seatE = office.scene.getObjectByName('Seat_' + a.id);
    const kerusi = seatE ? seatE.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(BILIK[a.bilik].x, LANTAI, BILIK[a.bilik].z);
    kerusi.y = LANTAI;
    const skrin = office.scene.getObjectByName('Screen_' + a.id);
    if (skrin) { skrin.material = skrin.material.clone(); skrin.material.emissive = new THREE.Color('#000'); }
    const g = templat.clone(true);
    const baju = new THREE.MeshStandardMaterial({ color: a.baju, roughness: 0.8 });
    const rambut = new THREE.MeshStandardMaterial({ color: a.rambut, roughness: 0.9 });
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      if (o.material.name === 'Baju') o.material = baju;
      else if (o.material.name === 'Rambut') o.material = rambut;
      o.userData.id = a.id;
    });
    const mahkota = g.getObjectByName('Crown'); if (mahkota) mahkota.visible = !!a.ceo;
    const badan = new THREE.Group(); badan.add(g); badan.position.copy(kerusi); scene.add(badan);
    const label = teksSprite(a.emoji + ' ' + a.nama, { saiz: 30, tinggi: 0.38 }); label.position.set(0, 2.55, 0); badan.add(label);
    const bub = gelembung(); bub.position.set(0, 3.15, 0); bub.visible = false; badan.add(bub);
    const bual = bualSprite(); bual.position.set(0, 4.5, 0); badan.add(bual);
    badan.traverse(o => { o.userData.id = a.id; });
    return {
      a, badan, g, skrin, kerusi, bub, bual, label,
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
function bilikDi(p) { for (const k in BILIK) { const b = BILIK[k]; if (Math.abs(p.x - b.x) < RW / 2 - 0.3 && Math.abs(p.z - b.z) < RD / 2 - 0.2) return k; } return null; }
const LORONG = z => z < 0 ? -1.65 : 1.7;
function keluarMasuk(k) { const b = BILIK[k]; const zc = pintu(k); const arah = b.z < 0 ? 1 : -1; return { dIn: V(b.x, zc - arah * 0.8), dOut: V(b.x, zc + arah * 0.9) }; }
function laluan(o, dest) {
  const kini = o.badan.position; const a = bilikDi(kini), c = bilikDi(dest);
  if (a && a === c) return [V(BILIK[a].x, kini.z), V(BILIK[a].x, dest.z), dest];
  const jalan = [];
  let z0 = kini.z, x0 = kini.x;
  if (a) { const g = keluarMasuk(a); jalan.push(a === 'J' ? V(kini.x, g.dIn.z) : V(BILIK[a].x, kini.z), g.dIn, g.dOut); z0 = g.dOut.z; x0 = g.dOut.x; }
  if (c) {
    const g = keluarMasuk(c); const la = LORONG(z0), lc = LORONG(BILIK[c].z);
    jalan.push(V(x0, la));
    if (la !== lc) {
      const xc = BILIK[c].x; let xs = 9, terbaik = 1e9;
      for (const x of [-24.5, -9, 9, 24.5]) { const d = Math.abs(x0 - x) + Math.abs(x - xc); if (d < terbaik) { terbaik = d; xs = x; } }
      jalan.push(V(xs, la), V(xs, lc));
    }
    jalan.push(V(BILIK[c].x, lc), g.dOut, g.dIn);
    jalan.push(c === 'J' ? V(dest.x, g.dIn.z) : V(BILIK[c].x, dest.z));
  }
  jalan.push(dest);
  return jalan;
}
function pilihSasaran(o) {
  if (o.mesy) return o.mesy.clone();
  const b = BILIK[o.a.bilik]; const r = Math.random(); const arah = b.z < 0 ? 1 : -1;
  if (r < 0.3) return V(PANTRI.x + (Math.random() * 4 - 2), PANTRI.z - 0.15 + Math.random() * 0.2);
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
    const diMesyAwal = o.mesy && Math.hypot(o.badan.position.x - o.mesy.x, o.badan.position.z - o.mesy.z) < 0.05;
    if (gerak && o.k === 'rehat' && now > o.tunggu && !o.jalan.length && !diMesyAwal) { o.jalan = laluan(o, pilihSasaran(o)); o.tunggu = now + 7000 + Math.random() * 10000; }
    const p = o.badan.position; let berjalan = false;
    if (o.jalan.length) {
      const s = o.jalan[0]; const d = new THREE.Vector3(s.x - p.x, 0, s.z - p.z); const dist = d.length(); const v = 2.0 * dt;
      if (!gerak) { const last = o.jalan[o.jalan.length - 1]; p.x = last.x; p.z = last.z; o.jalan = []; }
      else if (dist > v) { d.normalize(); p.x += d.x * v; p.z += d.z * v; const sasar = Math.atan2(d.x, d.z); o.g.rotation.y += (((sasar - o.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10); berjalan = true; }
      else { p.x = s.x; p.z = s.z; o.jalan.shift(); }
    }
    const diMesy = o.mesy && !o.jalan.length && Math.hypot(p.x - o.mesy.x, p.z - o.mesy.z) < 0.05;
    const diKerusi = diMesy || Math.hypot(p.x - o.kerusi.x, p.z - o.kerusi.z) < 0.05;
    const f = t * 8 + o.fasa; const [kl, kr] = o.kaki, [tl, tr] = o.tangan;
    if (berjalan) {
      o.g.position.y = Math.abs(Math.sin(f)) * 0.04;
      if (kl) { kl.rotation.x = Math.sin(f) * 0.55; kr.rotation.x = -Math.sin(f) * 0.55; }
      if (tl) { tl.rotation.x = -Math.sin(f) * 0.45; tr.rotation.x = Math.sin(f) * 0.45; }
      if (o.kepala) o.kepala.rotation.x = 0;
    } else if (diKerusi) {
      const hadap = diMesy ? o.mesyRot : 0;
      o.g.rotation.y += (hadap - o.g.rotation.y) * Math.min(1, dt * 8);
      o.g.position.y = diMesy ? -0.22 : -0.24;
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
    if (o.k === 'rehat') {
      const dengar = now < (o.dengar || 0);
      o.bub.userData.set(dengar ? '💬' : IKON.rehat);
      o.bub.visible = dengar || (!o.jalan.length && Math.abs(p.z - PANTRI.z) < 1.2 && Math.abs(p.x - PANTRI.x) < 2.6);
    }
    if (o.bual.visible) o.bub.visible = false;
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
  const len = asp >= 1.25 ? 66 : Math.min(120, 70 * 0.75 / asp);
  controls.target.set(w > 900 ? 7 : 0, 0.5, 1);
  camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(26, 30, 36).normalize(), len);
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
  if (hit && hit.object.userData.id) { pilihan = hit.object.userData.id; lukisButiran(); document.getElementById('side').classList.add('open'); }
});
document.getElementById('toggle').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));

// ---------- Panel ----------
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function lukisButiran() {
  const box = document.getElementById('det'); box.replaceChildren();
  if (!pilihan) { box.append(el('div', 'muted', 'Klik mana-mana watak dalam pejabat.')); return; }
  const row = (l, v) => { const r = el('div', 'r'); r.append(el('span', null, l), el('b', null, v)); box.append(r); };
  if (pilihan === 'CEO') {
    box.append(el('div', 'nm', '👑 Ricky — CEO'), el('div', 'muted', 'Semua pasukan melapor kepada anda. Lulus atau tolak idea dengan label lulus-ceo / ditolak-ceo pada isu di Papan Syarikat.'));
    row('Idea menunggu keputusan anda', String(IDEA.filter(i => i.label.includes('perlu-ceo') && !i.tutup).length));
    row('Syarikat', '8 pasukan · 24 ahli · 3 senior');
    return;
  }
  const a = ROSTER.find(x => x.id === pilihan); if (!a) return;
  const k = keadaan(a.kod), b = terkini(a.kod), n = seterusnya(a.cron);
  box.append(el('div', 'nm', a.emoji + ' ' + a.nama + ' — ' + a.peranan));
  row('Pasukan', a.pasukan);
  row('Keadaan', IKON[k] + ' ' + LABEL[k]);
  row('Jadual pasukan', cronTeks(a.cron));
  row('Seterusnya', tarikh(n) + ' (' + relatif(n) + ')');
  if (b) row('Status terakhir', b.keadaan + ' · ' + relatif(b.t));
  else row('Status terakhir', 'Belum pernah melapor');
  const mine = BUAL.filter(x => x.siapa === a.id);
  if (mine.length) {
    const t = mine[0]; const d = el('div', 'muted', '“' + t.mesej.slice(0, 160) + (t.mesej.length > 160 ? '…' : '') + '” — ' + relatif(t.t));
    d.style.marginTop = '6px'; box.append(d);
  }
  if (b && /^https:\/\/github\.com\//.test(b.url)) { const l = el('a', null, 'Lihat nota status di GitHub'); l.href = b.url; l.target = '_blank'; l.rel = 'noopener'; box.append(l); }
}
function lukisPanel(ralat) {
  const now = Date.now();
  const ks = TUGAS.map(k => keadaan(k));
  document.getElementById('t-kerja').textContent = ks.filter(k => k === 'kerja').length;
  document.getElementById('t-gagal').textContent = ks.filter(k => k === 'gagal').length;
  document.getElementById('t-siap').textContent = TUGAS.filter(k => LOG.some(r => r.kod === k && r.keadaan === 'SIAP' && now - r.t < 24 * 36e5)).length;
  const nx = TUGAS.map(k => ({ a: ketuaTugas(k), t: seterusnya(JADUAL[k]) })).filter(x => x.t).sort((x, y) => x.t - y.t)[0];
  document.getElementById('t-next').textContent = nx ? nx.a.emoji + ' ' + nx.a.pasukan : '—';
  document.getElementById('t-next2').textContent = nx ? relatif(nx.t) : 'Giliran seterusnya';
  const feed = document.getElementById('feed'); feed.replaceChildren();
  if (ralat) feed.append(el('li', 'err', ralat));
  const rows = LOG.slice().sort((x, y) => y.t - x.t).slice(0, 12);
  if (!rows.length && !ralat) feed.append(el('li', 'muted', 'Belum ada aktiviti. Tugas pertama (💬 Tini, Sokongan Pelanggan) mula setiap hari pukul 8:05 malam.'));
  for (const r of rows) {
    const a = ketuaTugas(r.kod); const li = el('li');
    li.append(el('time', null, tarikh(r.t)), document.createTextNode((a ? a.emoji + ' ' + (r.kod === 'PEMASARAN' || r.kod === 'DESIGNER' || r.kod === 'JUALAN' || r.kod === 'SOKONGAN' || r.kod === 'KEWANGAN' || r.kod === 'PEMATUHAN' || r.kod === 'KETUASTAF' || r.kod === 'PELANCAR' ? a.nama : a.pasukan) : r.kod) + ' '), el('span', 'tag ' + r.keadaan, r.keadaan === 'MULA' ? 'mula bekerja' : r.keadaan === 'SIAP' ? 'siap' : r.keadaan === 'GAGAL' ? 'gagal' : r.keadaan));
    feed.append(li);
  }
  document.getElementById('src').textContent = 'Sumber: log/ dan Issues dalam repo ' + REPO + ' · dikemas kini ' + tarikh(now);
  lukisPapan();
  lukisSkor();
  lukisButiran();
}

const DEMO = new URLSearchParams(location.search).has('demo');
function logDemo() {
  const n = Date.now(), m = 6e4;
  const f = (kod, k, ago) => ({ t: n - ago * m, kod, keadaan: k, url: '', nama: 'demo' });
  return [f('WEBAPP', 'MULA', 5), f('GAME', 'MULA', 12), f('PEMASARAN', 'MULA', 3), f('MOBILE', 'SIAP', 40), f('MOBILE', 'MULA', 70),
    f('SOKONGAN', 'SIAP', 90), f('SOKONGAN', 'MULA', 95), f('JUALAN', 'GAGAL', 200), f('IDEA', 'MULA', 1), f('KETUASTAF', 'SIAP', 30)];
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

// ---------- Papan Syarikat (GitHub Issues) ----------
const ISU_API = 'https://api.github.com/repos/' + REPO + '/issues';
let BUAL = [], IDEA = [];
const KEPALA = /^\s*\*\*\s*(\S+)\s+([^·*]+?)\s*·\s*([^(*]+?)\s*\(([^)]*)\)\s*:\s*\*\*\s*(.*)$/s;
const normal = t => t.normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
function cariAhli(nama, pasukan) {
  const n = normal(nama.replace(/^(dr\.?|puan|encik|cik|tuan)\s+/i, ''));
  const sama = a => normal(a.nama) === n || normal(a.nama.replace(/^(dr\.?|puan|encik|cik|tuan)\s+/i, '')) === n;
  if (n === 'ricky' || n === 'rickyceo') return CEO;
  const calon = SEMUA.filter(sama);
  return calon.find(a => normal(a.pasukan) === normal(pasukan)) || calon[0] || null;
}
function hurai(body) {
  if (!body) return null;
  const baris = body.replace(/\r/g, '').split('\n').find(l => l.trim()); if (!baris) return null;
  const x = baris.match(KEPALA); if (!x) return null;
  const a = cariAhli(x[2], x[4]); if (!a) return null;
  const sisa = body.slice(body.indexOf(baris) + baris.length).replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  const mesej = (x[5].replace(/[*_`]/g, '').trim() || sisa).trim();
  return { siapa: a.id, mesej };
}
function bualDemo() {
  const n = Date.now(), mn = 6e4;
  const b = (siapa, mesej, ago, tajuk) => ({ siapa, mesej, t: n - ago * mn, url: '', tajuk });
  BUAL = [
    b('LINA', 'Saya cadang tambah cabaran harian dalam Gabung Kuih supaya pemain datang balik setiap hari.', 4, '💡 Idea: Cabaran harian Gabung Kuih'),
    b('DANIEL', 'Boleh — kerja kecil, saiz S. Saya buat prototaip dalam branch minggu ni.', 9, '💡 Idea: Cabaran harian Gabung Kuih'),
    b('HAFIZ', 'Pemasaran sokong. Ini bahan bagus untuk post "streak 7 hari".', 14, '💡 Idea: Cabaran harian Gabung Kuih'),
    b('SITI', 'Trend minggu ni: ramai cari templat slip gaji untuk SME selepas bajet. Peluang untuk KiraSlip.', 30, '📅 Mesyuarat Mingguan'),
    b('FARID', 'Web App boleh tambah halaman templat percuma sebagai magnet SEO untuk KiraSlip.', 36, '📅 Mesyuarat Mingguan'),
    b('LIYANA', 'Setuju, kos sifar. Pastikan tiada janji harga baharu sebelum CEO lulus.', 41, '📅 Mesyuarat Mingguan'),
    b('BEN', 'Widget Batik dah siap ujian di 3 saiz skrin. Menunggu ikon baharu dari Mei Ling.', 55, '📅 Mesyuarat Mingguan'),
    b('MEILING', 'Ikon siap esok, saya hantar dua pilihan warna.', 58, '📅 Mesyuarat Mingguan'),
    b('KETUASTAF', 'Idea langganan premium Kira Gaji saya tanda perlu-ceo — ada perbelanjaan.', 80, '💡 Idea: Kira Gaji Premium'),
    b('FAIZAL', 'PR cabaran harian: logik OK, tapi tambah ujian untuk tukar hari tengah malam sebelum lulus.', 2, '💡 Idea: Cabaran harian Gabung Kuih'),
    b('WEIJIE', 'Idea ini terus bantu Sasaran 2 (app live di Play Store). Saya pilih sebagai idea minggu ini.', 6, '💡 Idea: Cabaran harian Gabung Kuih')
  ];
  BUAL.sort((a, b) => b.t - a.t);
  IDEA = [
    { tajuk: 'Cabaran harian Gabung Kuih', label: ['disokong', 'sedang-dibina'], pasukan: 'Studio Game', url: '' },
    { tajuk: 'Halaman templat slip gaji percuma', label: ['disokong'], pasukan: 'Pasukan Web App', url: '' },
    { tajuk: 'Kira Gaji Premium', label: ['perlu-ceo'], pasukan: 'Pasukan Mobile App', url: '' }
  ];
}
async function muatPapan() {
  if (DEMO) { bualDemo(); lukisPapan(); lukisSkor(); tetapMesyuarat(); return; }
  try {
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const [ri, rk] = await Promise.all([
      fetch(ISU_API + '?state=all&sort=updated&per_page=40&since=' + since, { headers: { Accept: 'application/vnd.github+json' } }),
      fetch(ISU_API + '/comments?sort=created&direction=desc&per_page=60&since=' + since, { headers: { Accept: 'application/vnd.github+json' } })
    ]);
    if (!ri.ok || !rk.ok) throw new Error('GitHub menjawab ' + (ri.ok ? rk.status : ri.status));
    const isu = (await ri.json()).filter(i => !i.pull_request), kom = await rk.json();
    const tajukIkut = {}; for (const i of isu) tajukIkut[i.url] = i.title;
    const out = [];
    for (const i of isu) { const h = hurai(i.body); if (h) out.push({ ...h, t: Date.parse(i.created_at), url: i.html_url, tajuk: i.title }); }
    for (const c of kom) { const h = hurai(c.body); if (h) out.push({ ...h, t: Date.parse(c.created_at), url: c.html_url, tajuk: tajukIkut[c.issue_url] || '' }); }
    BUAL = out.filter(x => /^https:\/\/github\.com\//.test(x.url)).sort((a, b) => b.t - a.t);
    IDEA = isu.filter(i => i.labels.some(l => l.name === 'idea')).map(i => {
      const lb = i.labels.map(l => l.name);
      const p = lb.find(n => n.startsWith('pasukan:'));
      const pk = { 'pasukan:ceo': 'Pejabat CEO', 'pasukan:idea': 'Makmal Idea', 'pasukan:kreatif': 'Kreatif & Pemasaran', 'pasukan:webapp': 'Pasukan Web App', 'pasukan:game': 'Studio Game', 'pasukan:mobile': 'Pasukan Mobile App', 'pasukan:jualan': 'Jualan & Sokongan', 'pasukan:kewangan': 'Kewangan & Pematuhan' }[p] || '';
      return { tajuk: i.title.replace(/^💡\s*Idea:\s*/i, ''), label: lb, pasukan: pk, url: i.html_url, tutup: i.state === 'closed' };
    });
    lukisPapan(); lukisSkor(); tetapMesyuarat();
  } catch (e) { lukisPapan('Papan tidak dapat dimuatkan: ' + e.message); }
}
const STATUS_IDEA = ['ditolak-ceo', 'siap', 'sedang-dibina', 'lulus-ceo', 'perlu-ceo', 'disokong'];
const TEKS_STATUS = { 'ditolak-ceo': 'ditolak CEO', siap: 'siap', 'sedang-dibina': 'sedang dibina', 'lulus-ceo': 'lulus CEO', 'perlu-ceo': 'tunggu CEO', disokong: 'disokong' };
function lukisPapan(ralat) {
  const ul = document.getElementById('papan'); if (!ul) return; ul.replaceChildren();
  if (ralat) ul.append(el('li', 'err', ralat));
  if (!BUAL.length && !ralat) ul.append(el('li', 'muted', 'Belum ada perbincangan. Pasukan akan mula berbual di GitHub Issues bila tugas mereka berjalan.'));
  for (const b of BUAL.slice(0, 10)) {
    const a = SEMUA.find(x => x.id === b.siapa); const li = el('li');
    const isi = [el('time', null, relatif(b.t)), el('span', 'who', a.emoji + ' ' + a.nama + ' '), el('span', 'muted', '(' + a.pasukan + ')'), el('div', 'msg', b.mesej.slice(0, 180) + (b.mesej.length > 180 ? '…' : ''))];
    if (b.url) { const l = el('a'); l.href = b.url; l.target = '_blank'; l.rel = 'noopener'; l.append(...isi); li.append(l); } else li.append(...isi);
    ul.append(li);
  }
  const ui = document.getElementById('idea'); if (!ui) return; ui.replaceChildren();
  if (!IDEA.length) ui.append(el('li', 'muted', 'Belum ada idea. Makmal Idea bermesyuarat setiap Sabtu 8:45 malam.'));
  for (const i of IDEA.slice(0, 8)) {
    const st = STATUS_IDEA.find(s => i.label.includes(s)) || (i.tutup ? 'siap' : null);
    const li = el('li'); const isi = [el('span', null, '💡 ' + i.tajuk + ' ')];
    if (st) isi.push(el('span', 'tag ' + st, TEKS_STATUS[st]));
    if (i.pasukan) isi.push(el('div', 'muted', i.pasukan));
    if (i.url) { const l = el('a'); l.href = i.url; l.target = '_blank'; l.rel = 'noopener'; l.append(...isi); li.append(l); } else li.append(...isi);
    ui.append(li);
  }
}
// ---------- Perbualan dalam pejabat ----------
// 1) Mesej sebenar Papan Syarikat dimainkan semula (gelembung biru).
// 2) Ahli thread terbaru duduk di Bilik Mesyuarat bila mereka tidak bekerja.
// 3) Sembang santai antara rakan sepasukan (gelembung kelabu, hiasan sahaja).
let giliran = 0, bualAktif = null;
function tetapMesyuarat() {
  for (const o of AGEN) o.mesy = null;
  const baru = BUAL.filter(b => Date.now() - b.t < 3 * 864e5);
  if (!baru.length) return;
  const tajuk = baru[0].tajuk; const siapa = [];
  for (const b of BUAL) if (b.tajuk === tajuk && !siapa.includes(b.siapa) && b.siapa !== 'CEO') siapa.push(b.siapa);
  const J = BILIK.J;
  siapa.slice(0, 8).forEach((id, i) => {
    const o = AGEN.find(x => x.a.id === id); if (!o) return;
    const kiri = i % 2 === 0, z = J.z - 2.25 + Math.floor(i / 2) * 1.5;
    o.mesy = V(J.x + (kiri ? -1.55 : 1.55), z); o.mesyRot = kiri ? Math.PI / 2 : -Math.PI / 2;
    if (o.k === 'rehat') { o.jalan = laluan(o, o.mesy.clone()); }
  });
  const t = document.getElementById('mesyTajuk'); if (t) t.textContent = '🗣️ Sedang dibincang di Bilik Mesyuarat: ' + tajuk;
}
function mainBual() {
  if (bualAktif) { bualAktif.bual.visible = false; bualAktif = null; }
  const senarai = BUAL.slice(0, 12).reverse(); if (!senarai.length || !AGEN.length) return;
  const b = senarai[giliran++ % senarai.length];
  const o = AGEN.find(x => x.a.id === b.siapa); if (!o) return;
  o.bual.userData.set(b.mesej.length > 120 ? b.mesej.slice(0, 118) + '…' : b.mesej, true);
  o.bual.visible = true; bualAktif = o;
  const i = senarai.indexOf(b);
  const balas = senarai.find((x, j) => j > i && x.tajuk === b.tajuk && x.siapa !== b.siapa);
  if (balas) { const p = AGEN.find(x => x.a.id === balas.siapa); if (p) p.dengar = performance.now() + 6500; }
}
const SEMBANG = {
  umum: ['Jom kopi dulu ☕', 'Mesyuarat Ahad nanti siapa present?', 'Dah baca PELAJARAN.md minggu ni?', 'Sasaran suku ni macam mana?', 'Senior semak PR kau dah?', 'Nak bantu? Bagitau je.', 'Esok sambung, mata dah kuyu 😅', 'Ada idea baru tak?'],
  A: ['Produk fokus minggu ni kita pilih elok-elok.', 'CEO nak ringkasan padat, 5 minit je.'],
  B: ['Trend minggu ni menarik juga…', 'Pesaing baru naik harga, peluang kita!', 'Data dah cukup untuk idea ni?'],
  C: ['Warna ni nampak jelas kat telefon?', 'Hook baris pertama kena kuat!', 'Grafik siap, tinggal kapsyen.'],
  D: ['Test dah lulus semua ✅', 'PR ni kecil je, senang semak.', 'Jangan lupa .env jangan commit!'],
  E: ['Level 3 tu susah sangat ke?', 'Cabaran harian boleh tarik pemain balik.', 'Aset ni kita lukis sendiri, selamat.'],
  F: ['Build Android ok kat skrin kecil.', 'Widget baru dah stabil.', 'Data Safety form dah lengkap?'],
  G: ['Pelanggan tanya cara reset kata laluan.', 'Draf e-mel dah sedia, tunggu CEO.'],
  H: ['Kos hosting bulan ni stabil.', 'Dasar privasi semua app dah ada?'],
  I: ['Standard kita: kecil, diuji, boleh semak.', 'Idea ni bantu sasaran suku ke?', 'Jangan gred kerja sendiri — biar orang lain semak.']
};
function sembang() {
  if (!gerak || !AGEN.length) return;
  const calon = AGEN.filter(o => o.k === 'rehat' && !o.jalan.length && !o.bual.visible && o.a.id !== 'CEO');
  if (!calon.length) return;
  const o = calon[Math.floor(Math.random() * calon.length)];
  const kawan = AGEN.find(x => x !== o && x.k === 'rehat' && !x.jalan.length && x.badan.position.distanceTo(o.badan.position) < 6);
  const pool = [...(SEMBANG[o.a.bilik] || []), ...SEMBANG.umum];
  o.bual.userData.set(pool[Math.floor(Math.random() * pool.length)], false); o.bual.visible = true;
  if (kawan) kawan.dengar = performance.now() + 3500;
  setTimeout(() => { if (bualAktif !== o) o.bual.visible = false; }, 3500);
}
// Kad skor pasukan (30 hari)
function lukisSkor() {
  const el2 = document.getElementById('skor'); if (!el2) return; el2.replaceChildren();
  const had = Date.now() - 30 * 864e5;
  const baris = Object.keys(PASUKAN).filter(k => k !== 'J').map(k => {
    const kod = [...new Set(ROSTER.filter(a => a.bilik === k).map(a => a.kod))];
    const siap = LOG.filter(r => kod.includes(r.kod) && r.keadaan === 'SIAP' && r.t > had).length;
    const gagal = LOG.filter(r => kod.includes(r.kod) && r.keadaan === 'GAGAL' && r.t > had).length;
    const ids = ROSTER.filter(a => a.bilik === k).map(a => a.id);
    const mesej = BUAL.filter(b => ids.includes(b.siapa) && b.t > had).length;
    const idea = IDEA.filter(i => i.pasukan === PASUKAN[k]).length;
    return { k, siap, gagal, mesej, idea, skor: siap * 3 + mesej + idea * 2 - gagal * 3 };
  }).sort((x, y) => y.skor - x.skor);
  const t = document.createElement('table'); t.className = 'skor';
  const h = document.createElement('tr'); for (const x of ['Pasukan', '✅', '❗', '💬', '💡']) h.append(el('th', null, x)); t.append(h);
  baris.forEach((b, i) => {
    const r = document.createElement('tr');
    r.append(el('td', null, (i === 0 && b.skor > 0 ? '🏆 ' : '') + PASUKAN[b.k]), el('td', null, String(b.siap)), el('td', b.gagal ? 'bad' : null, String(b.gagal)), el('td', null, String(b.mesej)), el('td', null, String(b.idea)));
    t.append(r);
  });
  el2.append(t, el('div', 'muted', '✅ tugas siap · ❗ gagal · 💬 mesej di Papan · 💡 idea dibuka'));
}

function jamHud() {
  document.getElementById('clock').textContent = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()) + ' (waktu Malaysia)';
}

saiz(); cahaya(); lukisPanel(); jamHud();
await muatModel();
kemasKiniKeadaan();
muatLog(); muatPapan();
setInterval(muatLog, REFRESH_MS);
setInterval(muatPapan, REFRESH_MS);
setTimeout(mainBual, 2500); setInterval(mainBual, 7000); setInterval(sembang, 4200);
setInterval(() => { jamHud(); cahaya(); }, 1000);
setInterval(() => { kemasKiniKeadaan(); lukisPanel(); }, 60000);
requestAnimationFrame(tick);

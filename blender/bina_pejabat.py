"""Bina model pejabat & watak untuk Pejabat Syarikat Ricky (Blender bpy).
Koordinat ditulis dalam paksi three.js: X kanan, Y atas, Z ke arah kamera.
Blender guna Z-atas, jadi (x, y3, z3) -> Blender (x, -z3, y3).
Output: office.glb, person.glb
"""
import bpy, math, random, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp'
random.seed(7)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

MATS = {}
def mat(name, rgb, rough=0.6, metal=0.0, alpha=1.0, emit=None, emit_str=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(rgb), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: m.blend_method = 'BLEND'
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = emit_str
    MATS[name] = m
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def bl(x, y, z):  # three -> blender
    return (x, -z, y)

def finish(o, m, bevel=0.0, parent=None, name=None, smooth=False):
    if name: o.name = name
    if m: o.data.materials.append(m)
    if bevel > 0:
        md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if parent: o.parent = parent
    return o

def box(x, y, z, w, h, d, m, bevel=0.0, parent=None, name=None, rot=0.0):
    """x,y,z = pusat bawah? -> pusat kotak (three coords). w=x, h=y, d=z"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=bl(x, y, z))
    o = bpy.context.object; o.scale = (w, d, h); o.rotation_euler[2] = rot
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, m, bevel, parent, name)

def cyl(x, y, z, r, h, m, verts=16, parent=None, name=None, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=bl(x, y, z))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=bl(x, y, z))
    return finish(bpy.context.object, m, 0, parent, name, smooth=True)

def sph(x, y, z, r, m, sx=1, sy=1, sz=1, seg=16, parent=None, name=None, ico=False):
    if ico: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=bl(x, y, z))
    else: bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=bl(x, y, z))
    o = bpy.context.object; o.scale = (sx, sz, sy)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, m, 0, parent, name, smooth=not ico)

def empty(name, x, y, z, parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(o)
    o.location = bl(x, y, z)
    if parent: o.parent = parent
    bpy.context.view_layer.update()
    return o

def text(s, x, y, z, size, m, rot_x=0):
    bpy.ops.object.text_add(location=bl(x, y, z))
    o = bpy.context.object; o.data.body = s; o.data.size = size; o.data.extrude = 0.04
    o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    o.rotation_euler = (math.radians(90 + rot_x), 0, 0)
    bpy.ops.object.convert(target='MESH')
    return finish(o, m)

def gabung():
    """Gabung mesh ikut bahan supaya ringan (kecuali Screen_* yang perlu dikawal)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.type in ('MESH', 'FONT'): o.select_set(True)
    bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
    bpy.ops.object.convert(target='MESH')  # guna modifier bevel
    kump = {}
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.name.startswith('Screen_') or not o.data.materials: continue
        kump.setdefault(o.data.materials[0].name, []).append(o)
    for nama, objs in kump.items():
        if len(objs) < 2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = 'G_' + nama

def export(path, draco=False):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, export_extras=True, export_lights=False, export_cameras=False,
                              export_draco_mesh_compression_enable=draco, export_draco_mesh_compression_level=7)

# ---------------- PEJABAT ----------------
reset()

# Bahan
M = dict(
    rumput=mat('Rumput', '#7cb860', 0.95), rumput2=mat('Rumput2', '#6aa851', 0.95),
    batu=mat('Batu', '#d8d2c4', 0.9), tapak=mat('Tapak', '#efe9dd', 0.8), tepi=mat('Tepi', '#b9ad98', 0.8),
    kayu=mat('Kayu', '#b98352', 0.55), kayuGelap=mat('KayuGelap', '#7a4e2d', 0.5), kayuCerah=mat('KayuCerah', '#e2c497', 0.6),
    putih=mat('Putih', '#f6f3ee', 0.5), dinding=mat('Dinding', '#f1ece3', 0.85), aksen=mat('Aksen', '#2f3e5c', 0.6),
    besi=mat('Besi', '#9aa3ad', 0.35, 0.8), hitam=mat('Hitam', '#1e1f24', 0.4), skrin=mat('SkrinMati', '#16202e', 0.2),
    kaca=mat('Kaca', '#bfe6ff', 0.05, 0.0, alpha=0.22), kacaTingkap=mat('KacaTingkap', '#9fd8ff', 0.05, 0.0, alpha=0.55),
    daun=mat('Daun', '#3f9b4a', 0.8), daun2=mat('Daun2', '#2f7d3b', 0.8), daun3=mat('Daun3', '#5fb85a', 0.8), batang=mat('Batang', '#6b4423', 0.9),
    pasu=mat('Pasu', '#d9774b', 0.7), pasu2=mat('Pasu2', '#f2efe9', 0.6),
    sofaMerah=mat('SofaMerah', '#c65b4e', 0.9), sofaBiru=mat('SofaBiru', '#4f7bc4', 0.9), sofaHijau=mat('SofaHijau', '#5c9b7a', 0.9), sofaKuning=mat('SofaKuning', '#e0b43c', 0.9),
    kerusi=mat('Kerusi', '#2c3e50', 0.7), air=mat('Air', '#5fb7e6', 0.1, 0, alpha=0.85),
    lampu=mat('Lampu', '#fff4d6', 0.3, emit='#ffe9b3', emit_str=3.0), lampuMerah=mat('LampuMerah', '#ff4040', 0.3, emit='#ff2020', emit_str=4),
    lampuHijau=mat('LampuHijau', '#40ff80', 0.3, emit='#20ff60', emit_str=4), emas=mat('Emas', '#e8b83c', 0.25, 0.9),
)
LANTAI = {'A': mat('LantaiA', '#c9a27a', 0.7), 'B': mat('LantaiB', '#cfd9c6', 0.85), 'C': mat('LantaiC', '#ecd3dc', 0.85),
          'D': mat('LantaiD', '#c8d3e6', 0.85), 'E': mat('LantaiE', '#e9d6c6', 0.85), 'F': mat('LantaiF', '#dcd3ea', 0.85),
          'G': mat('LantaiG', '#d4e8d6', 0.85), 'H': mat('LantaiH', '#ead9bd', 0.85),
          'I': mat('LantaiI', '#b8a38a', 0.6), 'J': mat('LantaiJ', '#d9dde3', 0.8)}
PERMAIDANI = {'A': mat('PermA', '#8e3b46', 0.95), 'B': mat('PermB', '#3e7a6b', 0.95), 'C': mat('PermC', '#6a4c93', 0.95),
              'D': mat('PermD', '#2e4a7d', 0.95), 'E': mat('PermE', '#b5542f', 0.95), 'F': mat('PermF', '#5a3f8f', 0.95),
              'G': mat('PermG', '#3f7d4c', 0.95), 'H': mat('PermH', '#8a6a2f', 0.95),
              'I': mat('PermI', '#1f2a44', 0.95), 'J': mat('PermJ', '#3a4a6b', 0.95)}

# Tanah & landskap
box(0, -0.06, 0, 104, 0.1, 68, M['rumput'])
for i in range(40):
    x, z = random.uniform(-38, 38), random.uniform(-30, 30)
    if abs(x) < 30 and abs(z) < 16: continue
    box(x, 0.0, z, random.uniform(1, 3), 0.02, random.uniform(1, 3), M['rumput2'])
# laluan masuk
box(0, 0.0, 20.5, 4, 0.04, 9, M['batu'])
for i in range(6): box(0, 0.03, 16.8 + i * 1.4, 3.6, 0.02, 0.08, M['tepi'])
# kolam
cyl(-37, 0.0, 18, 4.5, 0.06, M['air'], verts=32)
cyl(-37, -0.02, 18, 4.9, 0.08, M['batu'], verts=32)

# Bangunan: tapak
W, D = 55, 28
box(0, 0.12, 0, W + 0.8, 0.3, D + 0.8, M['tepi'], bevel=0.05)
box(0, 0.28, 0, W, 0.04, D, M['tapak'])
FLOOR = 0.3

# Bilik
BILIK = {'A': (-22, -7.5, 'PEJABAT CEO'), 'B': (-11, -7.5, 'MAKMAL IDEA'), 'C': (0, -7.5, 'KREATIF & PEMASARAN'), 'D': (11, -7.5, 'PASUKAN WEB APP'), 'I': (22, -7.5, 'MAJLIS SENIOR'),
         'E': (-22, 7.5, 'STUDIO GAME'), 'F': (-11, 7.5, 'PASUKAN MOBILE APP'), 'G': (0, 7.5, 'JUALAN & SOKONGAN'), 'H': (11, 7.5, 'KEWANGAN & PEMATUHAN'), 'J': (22, 7.5, 'BILIK MESYUARAT')}
RW, RD = 11, 11

def dinding_kaca(x1, z1, x2, z2, h=1.5):
    L = math.hypot(x2 - x1, z2 - z1); cx, cz = (x1 + x2) / 2, (z1 + z2) / 2
    ang = math.atan2(z2 - z1, x2 - x1)
    o = box(cx, FLOOR + h / 2, cz, L, h, 0.06, M['kaca']); o.rotation_euler[2] = ang
    t = box(cx, FLOOR + h, cz, L, 0.08, 0.12, M['aksen']); t.rotation_euler[2] = ang
    b = box(cx, FLOOR + 0.06, cz, L, 0.12, 0.12, M['aksen']); b.rotation_euler[2] = ang
    n = max(1, int(L / 2))
    for i in range(n + 1):
        f = i / n; px, pz = x1 + (x2 - x1) * f, z1 + (z2 - z1) * f
        box(px, FLOOR + h / 2, pz, 0.1, h, 0.1, M['aksen'])

def dinding_pejal(x1, z1, x2, z2, h=2.8, tingkap=True):
    L = math.hypot(x2 - x1, z2 - z1); cx, cz = (x1 + x2) / 2, (z1 + z2) / 2
    ang = math.atan2(z2 - z1, x2 - x1)
    o = box(cx, FLOOR + h / 2, cz, L, h, 0.25, M['dinding'], bevel=0.02); o.rotation_euler[2] = ang
    c = box(cx, FLOOR + h + 0.05, cz, L + 0.1, 0.1, 0.35, M['aksen']); c.rotation_euler[2] = ang
    if tingkap:
        n = int(L / 3.2)
        for i in range(n):
            f = (i + 0.5) / n; px, pz = x1 + (x2 - x1) * f, z1 + (z2 - z1) * f
            nx, nz = -math.sin(ang) * 0.14, math.cos(ang) * 0.14
            g = box(px + nx, FLOOR + 1.6, pz + nz, 2.0, 1.2, 0.04, M['kacaTingkap']); g.rotation_euler[2] = ang
            fr = box(px + nx * 1.1, FLOOR + 0.98, pz + nz * 1.1, 2.2, 0.08, 0.1, M['putih']); fr.rotation_euler[2] = ang

# Dinding luar: tinggi di belakang (-z) dan kiri (-x); rendah di depan/kanan supaya nampak ke dalam
dinding_pejal(-W / 2, -D / 2, W / 2, -D / 2)
dinding_pejal(-W / 2, -D / 2, -W / 2, D / 2)
for (a, b2) in [((-W / 2, D / 2), (-3, D / 2)), ((3, D / 2), (W / 2, D / 2)), ((W / 2, -D / 2), (W / 2, D / 2))]:
    L = math.hypot(b2[0] - a[0], b2[1] - a[1]); cx, cz = (a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2
    o = box(cx, FLOOR + 0.25, cz, L if a[1] == b2[1] else 0.25, 0.5, 0.25 if a[1] == b2[1] else L, M['dinding'], bevel=0.02)
# Pintu masuk utama
box(0, FLOOR + 1.4, D / 2, 6.2, 0.2, 0.35, M['aksen'])
box(-3.05, FLOOR + 0.7, D / 2, 0.2, 1.4, 0.3, M['aksen']); box(3.05, FLOOR + 0.7, D / 2, 0.2, 1.4, 0.3, M['aksen'])

for k, (cx, cz, nama) in BILIK.items():
    box(cx, FLOOR + 0.01, cz, RW - 0.3, 0.02, RD - 0.3, LANTAI[k])
    box(cx, FLOOR + 0.025, cz + (1 if cz < 0 else -1) * 0.2, 6.5, 0.015, 4.2, PERMAIDANI[k], bevel=0.01)
    x0, x1 = cx - RW / 2, cx + RW / 2
    zc = cz + RD / 2 if cz < 0 else cz - RD / 2  # sisi koridor
    # partition kaca sisi koridor dengan pintu 2.4 di tengah
    dinding_kaca(x0, zc, cx - 1.2, zc); dinding_kaca(cx + 1.2, zc, x1, zc)
    # partition antara bilik (kaca)
    if k in 'ABCDEFGH': dinding_kaca(x1, cz - RD / 2, x1, cz + RD / 2)

# Koridor & lobi tengah
box(0, FLOOR + 0.012, 0, W - 0.5, 0.02, 3.8, mat('Koridor', '#e7e1d3', 0.7))
for i in range(-8, 9): box(i * 2.2, FLOOR + 0.025, 0, 0.04, 0.01, 3.8, M['tepi'])

# ---------- Perabot ----------
def pokok_pasu(x, z, s=1.0, m_pasu=None):
    cyl(x, FLOOR + 0.25 * s, z, 0.28 * s, 0.5 * s, m_pasu or M['pasu'], verts=12, r2=0.22 * s)
    for i in range(5):
        a = i * 1.256; r = 0.18 * s
        sph(x + math.cos(a) * r, FLOOR + (0.75 + random.uniform(0, 0.35)) * s, z + math.sin(a) * r, 0.28 * s, random.choice([M['daun'], M['daun2'], M['daun3']]), ico=True)
    sph(x, FLOOR + 1.15 * s, z, 0.3 * s, M['daun3'], ico=True)

def pokok_luar(x, z, s=1.0):
    cyl(x, 0.9 * s, z, 0.18 * s, 1.8 * s, M['batang'], verts=8)
    sph(x, 2.3 * s, z, 1.1 * s, random.choice([M['daun'], M['daun2']]), ico=True)
    sph(x + 0.5 * s, 2.0 * s, z + 0.3 * s, 0.8 * s, M['daun3'], ico=True)
    sph(x - 0.4 * s, 2.7 * s, z - 0.2 * s, 0.7 * s, M['daun2'], ico=True)

def kerusi_pejabat(x, z, rot=0.0, m=None):
    m = m or M['kerusi']
    s = box(x, FLOOR + 0.5, z, 0.62, 0.1, 0.6, m, bevel=0.04)
    b = box(x, FLOOR + 0.92, z - 0.29, 0.6, 0.72, 0.1, m, bevel=0.04)
    cyl(x, FLOOR + 0.26, z, 0.04, 0.44, M['besi'], verts=8)
    for i in range(5):
        a = i * 1.2566
        box(x + math.cos(a) * 0.2, FLOOR + 0.05, z + math.sin(a) * 0.2, 0.42, 0.04, 0.05, M['hitam'], rot=a)

def meja(kod, x, z, ceo=False):
    lebar = 2.4 if ceo else 1.8
    box(x, FLOOR + 0.78, z, lebar, 0.07, 0.9, M['kayuGelap'] if ceo else M['kayu'], bevel=0.02)
    if ceo:
        box(x, FLOOR + 0.39, z + 0.4, lebar - 0.1, 0.72, 0.06, M['kayuGelap'])
        for dx in (-lebar / 2 + 0.06, lebar / 2 - 0.06): box(x + dx, FLOOR + 0.39, z, 0.08, 0.76, 0.86, M['kayuGelap'])
    else:
        for dx in (-lebar / 2 + 0.06, lebar / 2 - 0.06):
            for dz in (-0.38, 0.38): box(x + dx, FLOOR + 0.38, z + dz, 0.05, 0.76, 0.05, M['besi'])
    # monitor (menghadap pekerja: pekerja di -z, skrin menghadap -z)
    box(x, FLOOR + 1.22, z + 0.22, 0.78, 0.48, 0.05, M['hitam'], bevel=0.01)
    box(x, FLOOR + 1.22, z + 0.193, 0.7, 0.4, 0.01, M['skrin'], name='Screen_' + kod)
    box(x, FLOOR + 0.92, z + 0.25, 0.06, 0.22, 0.06, M['besi'])
    box(x, FLOOR + 0.83, z + 0.26, 0.3, 0.02, 0.18, M['besi'])
    box(x, FLOOR + 0.83, z - 0.12, 0.5, 0.025, 0.16, M['putih'], bevel=0.005)
    cyl(x + 0.55, FLOOR + 0.88, z - 0.05, 0.05, 0.11, random.choice([M['sofaMerah'], M['sofaBiru'], M['putih']]), verts=10)
    if not ceo: pokok_pasu(x - lebar / 2 + 0.2, z + 0.15, 0.35, M['pasu2']) if random.random() < 0.5 else None
    kerusi_pejabat(x, z - 0.95)
    empty('Seat_' + kod, x, FLOOR, z - 0.95)

def rak_buku(x, z, rot=0):
    box(x, FLOOR + 1.0, z, 1.6, 2.0, 0.4, M['kayuCerah'], bevel=0.02)
    for j in range(4):
        y = FLOOR + 0.25 + j * 0.48
        box(x, y, z + 0.02, 1.5, 0.03, 0.36, M['kayu'])
        bx = x - 0.65
        while bx < x + 0.65:
            w = random.uniform(0.06, 0.12); hh = random.uniform(0.26, 0.38)
            box(bx + w / 2, y + hh / 2 + 0.02, z + 0.02, w, hh, 0.28, random.choice([M['sofaMerah'], M['sofaBiru'], M['sofaHijau'], M['sofaKuning'], M['aksen']]))
            bx += w + 0.01

def sofa(x, z, lebar, m, rot=0):
    box(x, FLOOR + 0.25, z, lebar, 0.4, 0.9, m, bevel=0.08, rot=rot)
    o = box(x, FLOOR + 0.6, z - 0.38 if rot == 0 else z, lebar, 0.6, 0.22, m, bevel=0.08, rot=rot)
    for dx in (-lebar / 2 + 0.1, lebar / 2 - 0.1): box(x + dx, FLOOR + 0.45, z, 0.2, 0.5, 0.9, m, bevel=0.06)

# Meja setiap bilik (ID ahli mesti sama dengan app.js)
SUSUNAN = {'A': ['CEO', 'KETUASTAF', 'HANA'], 'B': ['IDRIS', 'SITI', 'KUMAR'], 'C': ['MEILING', 'HAFIZ', 'AINA'], 'D': ['FARID', 'NADIA', 'RAJ', 'ZUL'],
           'E': ['AMIR', 'LINA', 'DANIEL', 'YANA'], 'F': ['HAKIM', 'SARA', 'BEN', 'IKA'], 'G': ['RIZAL', 'TINI'], 'H': ['LIYANA', 'AZMAN'],
           'I': ['FAIZAL', 'ROSNAH', 'WEIJIE'], 'J': []}
SLOT4 = [(-2.4, -1.7), (2.4, -1.7), (-2.4, 2.1), (2.4, 2.1)]
SLOT2 = [(-2.4, 0.2), (2.4, 0.2)]
for k, (cx, cz, nama) in BILIK.items():
    ahli = SUSUNAN[k]; slots = SLOT2 if len(ahli) <= 2 else SLOT4
    for i, kod in enumerate(ahli):
        dx, dz = slots[i]
        meja(kod, cx + dx, cz + dz, ceo=(kod == 'CEO'))
    back = cz - RD / 2 + 0.6 if cz < 0 else cz + RD / 2 - 0.6
    zin = cz + (RD / 2 - 1.0) * (1 if cz < 0 else -1)
    pokok_pasu(cx + RW / 2 - 0.7, back, 1.0)
    pokok_pasu(cx - RW / 2 + 0.7, zin - (0.3 if cz < 0 else -0.3), 0.8)
    if cz < 0:
        box(cx, FLOOR + 2.15, back - 0.18, 4.4, 0.5, 0.06, M['aksen'], bevel=0.02)
        text(nama, cx, FLOOR + 2.15, back - 0.12, 0.26, M['putih'])
    empty('Label_' + k, cx, FLOOR + 2.9, back)

# CEO: rak buku, sofa, trofi
cx, cz = BILIK['A'][:2]
rak_buku(cx - 4.0, cz - RD / 2 + 0.55); rak_buku(cx - 2.3, cz - RD / 2 + 0.55)
sofa(cx + 3.0, cz + 4.0, 2.2, M['sofaMerah'])
cyl(cx + 0.6, FLOOR + 0.6, cz - 4.6, 0.25, 0.2, M['emas'], verts=16); box(cx + 0.6, FLOOR + 0.25, cz - 4.6, 0.6, 0.5, 0.4, M['kayuGelap'])
# Makmal Idea: papan putih penuh nota, beanbag, mentol idea
cx, cz = BILIK['B'][:2]
box(cx, FLOOR + 1.6, cz - RD / 2 + 0.2, 3.6, 1.5, 0.06, M['putih'], bevel=0.02)
for i in range(8): box(cx - 1.5 + i * 0.42, FLOOR + 1.7 + random.uniform(-0.4, 0.4), cz - RD / 2 + 0.24, 0.3, 0.3, 0.01, random.choice([M['sofaKuning'], M['sofaHijau'], M['sofaMerah'], M['sofaBiru']]))
sph(cx + 2.4, FLOOR + 0.35, cz + 3.0, 0.55, M['sofaHijau'], sy=0.7); sph(cx + 3.6, FLOOR + 0.35, cz + 3.6, 0.55, M['sofaKuning'], sy=0.7)
sph(cx + 3.0, FLOOR + 1.9, cz + 3.3, 0.28, M['lampu']); cyl(cx + 3.0, FLOOR + 1.0, cz + 3.3, 0.03, 1.5, M['besi'], verts=6)
# Kreatif: dinding warna, kanvas
cx, cz = BILIK['C'][:2]
for i, m in enumerate([M['sofaMerah'], M['sofaKuning'], M['sofaHijau'], M['sofaBiru'], mat('Ungu', '#8e5cf0', 0.8)]):
    box(cx - 3 + i * 1.5, FLOOR + 1.6, cz - RD / 2 + 0.2, 1.2, 1.6, 0.04, m)
box(cx + 3.4, FLOOR + 1.0, cz + 3.6, 0.05, 1.6, 0.05, M['kayu']); box(cx + 3.4, FLOOR + 1.3, cz + 3.65, 1.0, 1.2, 0.05, M['putih'])
box(cx + 3.2, FLOOR + 1.4, cz + 3.68, 0.4, 0.4, 0.01, M['sofaMerah']); box(cx + 3.6, FLOOR + 1.2, cz + 3.68, 0.3, 0.5, 0.01, M['sofaBiru'])
# Web App: rak server berlampu
cx, cz = BILIK['D'][:2]
for i in range(2):
    box(cx + RW / 2 - 0.6, FLOOR + 1.05, cz - 3.6 + i * 0.8, 0.7, 2.1, 0.65, M['hitam'], bevel=0.02)
    for j in range(7):
        box(cx + RW / 2 - 0.96, FLOOR + 0.35 + j * 0.25, cz - 3.6 + i * 0.8, 0.02, 0.04, 0.06, M['lampuHijau'] if (i + j) % 3 else M['lampuMerah'])
# Studio Game: mesin arked, TV besar, konsol
cx, cz = BILIK['E'][:2]
arked = mat('Arked', '#ff4fa3', 0.5)
for i in range(2):
    box(cx - RW / 2 + 0.6, FLOOR + 0.95, cz - 3.4 + i * 1.0, 0.8, 1.9, 0.8, arked, bevel=0.04)
    box(cx - RW / 2 + 1.01, FLOOR + 1.35, cz - 3.4 + i * 1.0, 0.02, 0.5, 0.6, mat('SkrinArked', '#30e0ff', 0.2, emit='#30e0ff', emit_str=2.5))
box(cx, FLOOR + 1.9, cz - RD / 2 + 0.3, 3.0, 1.6, 0.08, M['hitam'], bevel=0.02)
box(cx, FLOOR + 1.9, cz - RD / 2 + 0.35, 2.8, 1.4, 0.01, mat('SkrinTV', '#7a5cff', 0.2, emit='#7a5cff', emit_str=1.5))
sph(cx + 3.6, FLOOR + 0.35, cz - 3.6, 0.5, M['sofaMerah'], sy=0.7); sph(cx + 2.6, FLOOR + 0.35, cz - 3.9, 0.5, M['sofaBiru'], sy=0.7)
# Mobile App: dinding paparan telefon
cx, cz = BILIK['F'][:2]
box(cx, FLOOR + 1.6, cz - RD / 2 + 0.25, 4.0, 1.4, 0.06, M['putih'], bevel=0.02)
for i in range(7):
    box(cx - 1.65 + i * 0.55, FLOOR + 1.6, cz - RD / 2 + 0.3, 0.32, 0.62, 0.04, M['hitam'], bevel=0.02)
    box(cx - 1.65 + i * 0.55, FLOOR + 1.6, cz - RD / 2 + 0.33, 0.27, 0.54, 0.01, random.choice([M['sofaKuning'], M['sofaHijau'], M['sofaBiru'], M['sofaMerah']]))
# Jualan & Sokongan: meja mesyuarat bulat
cx, cz = BILIK['G'][:2]
cyl(cx, FLOOR + 0.75, cz + 3.4, 1.0, 0.06, M['kayuCerah'], verts=24); cyl(cx, FLOOR + 0.38, cz + 3.4, 0.08, 0.72, M['besi'])
for i in range(4):
    a = i * math.pi / 2 + 0.4; kerusi_pejabat(cx + math.cos(a) * 1.4, cz + 3.4 + math.sin(a) * 1.4, m=M['sofaHijau'])
# Kewangan & Pematuhan: kabinet fail, peti besi
cx, cz = BILIK['H'][:2]
for i in range(3): box(cx + 1.8 + i * 0.75, FLOOR + 0.7, cz + 4.5, 0.7, 1.4, 0.6, M['besi'], bevel=0.02)
box(cx - 4.0, FLOOR + 0.5, cz + 4.4, 1.0, 1.0, 0.9, mat('Peti', '#4a4f57', 0.4, 0.6), bevel=0.04)
cyl(cx - 4.0, FLOOR + 0.55, cz + 3.93, 0.15, 0.05, M['emas'])

# Majlis Senior: rak anugerah, papan standard kualiti, meja panjang kayu gelap
cx, cz = BILIK['I'][:2]
rak_buku(cx + 3.8, cz - RD / 2 + 0.55); rak_buku(cx + 2.1, cz - RD / 2 + 0.55)
box(cx - 2.2, FLOOR + 1.6, cz - RD / 2 + 0.2, 3.2, 1.3, 0.06, M['hitam'], bevel=0.02)
box(cx - 2.2, FLOOR + 1.6, cz - RD / 2 + 0.24, 3.0, 1.1, 0.01, mat('PapanStd', '#1f6f4a', 0.6))
text('STANDARD KUALITI', cx - 2.2, FLOOR + 1.95, cz - RD / 2 + 0.27, 0.2, M['putih'])
for i in range(3): cyl(cx - 3.2 + i * 1.0, FLOOR + 1.3, cz - RD / 2 + 0.3, 0.1, 0.25, M['emas'], verts=12)
sofa(cx + 3.0, cz + 4.0, 2.2, M['sofaBiru'])
# Bilik Mesyuarat: meja panjang, 8 kerusi, skrin besar
cx, cz = BILIK['J'][:2]
box(cx, FLOOR + 0.75, cz, 2.0, 0.08, 6.0, M['kayuGelap'], bevel=0.03)
for zz in (-2.0, 2.0): box(cx, FLOOR + 0.37, cz + zz, 0.2, 0.74, 0.2, M['besi'])
for i in range(4):
    zz = cz - 2.25 + i * 1.5
    kerusi_pejabat(cx - 1.55, zz, m=M['sofaMerah']); kerusi_pejabat(cx + 1.55, zz, m=M['sofaMerah'])
box(cx, FLOOR + 1.6, cz + RD / 2 - 0.3, 3.4, 1.8, 0.08, M['hitam'], bevel=0.02)
box(cx, FLOOR + 1.6, cz + RD / 2 - 0.35, 3.2, 1.6, 0.01, mat('SkrinMesy', '#5fa8ff', 0.2, emit='#5fa8ff', emit_str=1.2))
empty('Meeting_J', cx, FLOOR, cz)

# Lobi tengah: kaunter kopi, meja bulat, sofa
cxl = 0
box(cxl, FLOOR + 0.5, -0.9, 4.6, 1.0, 0.8, M['kayu'], bevel=0.03)
box(cxl, FLOOR + 1.02, -0.9, 4.8, 0.06, 0.95, M['putih'], bevel=0.02)
box(cxl - 1.6, FLOOR + 1.35, -1.0, 0.55, 0.6, 0.45, M['hitam'], bevel=0.03)
box(cxl - 1.6, FLOOR + 1.45, -0.76, 0.18, 0.06, 0.02, M['lampuMerah'])
for i in range(3): cyl(cxl + 0.2 + i * 0.35, FLOOR + 1.1, -0.9, 0.06, 0.12, M['putih'], verts=10)
box(cxl + 1.8, FLOOR + 1.3, -1.0, 0.6, 0.5, 0.5, M['putih'], bevel=0.03)
for x in (-1.5, 0, 1.5):
    cyl(cxl + x, FLOOR + 0.35, 0.6, 0.06, 0.7, M['besi'], verts=8); cyl(cxl + x, FLOOR + 0.72, 0.6, 0.3, 0.05, M['kayuCerah'], verts=16)
sofa(-6.0, 1.0, 3.0, M['sofaBiru']); sofa(6.0, 1.0, 3.0, M['sofaMerah'])
cyl(-6.0, FLOOR + 0.2, -0.4, 0.5, 0.06, M['kayuCerah'], verts=20); cyl(6.0, FLOOR + 0.2, -0.4, 0.5, 0.06, M['kayuCerah'], verts=20)
pokok_pasu(-3.8, 0.9, 1.3); pokok_pasu(3.8, 0.9, 1.3); pokok_pasu(-26.5, 0, 1.2); pokok_pasu(26.5, 0, 1.2)
pokok_pasu(-16.5, -0.9, 1.0); pokok_pasu(16.5, -0.9, 1.0)
empty('Pantri', 0, FLOOR, 0.0)

# Papan tanda syarikat di depan
box(0, 1.3, 17.2, 5.6, 1.2, 0.3, M['aksen'], bevel=0.05)
box(-2.3, 0.35, 17.2, 0.2, 0.7, 0.2, M['aksen']); box(2.3, 0.35, 17.2, 0.2, 0.7, 0.2, M['aksen'])
text('RICKY & CO.', 0, 1.4, 17.38, 0.55, M['emas'])
text('Syarikat Ejen AI', 0, 0.95, 17.38, 0.25, M['putih'])

# Pokok & lampu luar
for (x, z, s) in [(-35.4, -18, 1.3), (-30.5, -21, 1.0), (-37.8, -6, 1.2), (-35.4, 6, 0.9), (32.9, -19, 1.2), (37.8, -9, 1.1), (36.6, 6, 1.3),
                  (29.3, 20, 1.0), (-19.5, 21, 1.1), (-8, 23, 0.9), (10, 22, 1.2), (20.7, 24, 0.9), (0, -21, 1.3), (-17.1, -22, 1.0), (17.1, -21, 1.1), (40.3, 18, 1.0)]:
    pokok_luar(x, z, s)
for i in range(16):
    a = random.uniform(0, 6.28); r = random.uniform(31, 42)
    sph(math.cos(a) * r, 0.3, math.sin(a) * r * 0.75, 0.5, random.choice([M['daun'], M['daun3']]), sy=0.7, ico=True)
for x in (-2.6, 2.6):
    for z in (17.5, 23.5):
        cyl(x, 1.1, z, 0.06, 2.2, M['hitam'], verts=8); sph(x, 2.3, z, 0.18, M['lampu'])

# ---------- Persekitaran tambahan ----------
def kelapa(x, z, s=1.0, cond=0.0):
    """Pokok kelapa: batang melengkung (segmen) + pelepah terkulai."""
    segs = 6; tx, tz = x, z
    for i in range(segs):
        f = i / segs; y0 = 0.6 * i * s
        tx = x + math.sin(cond) * (f ** 2) * 1.2 * s; tz = z + math.cos(cond) * (f ** 2) * 1.2 * s
        cyl(tx, y0 + 0.3 * s, tz, (0.2 - 0.06 * f) * s, 0.62 * s, M['batangKelapa'], verts=8)
    top = (tx, 0.6 * segs * s, tz)
    for i in range(11):
        a = i * math.pi * 2 / 11 + random.uniform(-0.15, 0.15); t = random.uniform(0.3, 0.7); L = random.uniform(1.9, 2.4) * s
        bx = top[0] + math.cos(a) * L / 2 * math.cos(t); by = -top[2] + math.sin(a) * L / 2 * math.cos(t); bz = top[1] - L / 2 * math.sin(t)
        o = box(bx, bz, -by, L, 0.04 * s, 0.32 * s, random.choice([M['daunKelapa'], M['daun2']]))
        o.rotation_euler = (0, t, a)
    for i in range(3): sph(top[0] + math.cos(i * 2.1) * 0.18 * s, top[1] - 0.15 * s, top[2] + math.sin(i * 2.1) * 0.18 * s, 0.14 * s, M['buahKelapa'])

def kereta(x, z, m, rot=0.0):
    b = box(x, 0.45, z, 1.9, 0.55, 3.8, m, bevel=0.12, rot=rot)
    t = box(x, 0.95, z - 0.15, 1.7, 0.5, 2.0, m, bevel=0.12, rot=rot)
    box(x, 0.97, z - 0.15, 1.72, 0.38, 1.6, M['kacaKereta'], rot=rot)
    for dx in (-0.85, 0.85):
        for dz in (-1.2, 1.2):
            c = cyl(x + dx, 0.32, z + dz, 0.32, 0.25, M['hitam'], verts=12); c.rotation_euler = (0, math.pi / 2, 0)
    box(x - 0.6, 0.55, z + 1.91, 0.35, 0.12, 0.02, M['lampu']); box(x + 0.6, 0.55, z + 1.91, 0.35, 0.12, 0.02, M['lampu'])

def bangku(x, z, rot=0.0):
    box(x, 0.45, z, 1.8, 0.08, 0.5, M['kayu'], bevel=0.02, rot=rot)
    box(x, 0.75, z - 0.22, 1.8, 0.35, 0.06, M['kayu'], bevel=0.02, rot=rot)
    for dx in (-0.75, 0.75): box(x + dx, 0.22, z, 0.08, 0.44, 0.45, M['hitam'], rot=rot)

def bunga(x, z, w, d):
    box(x, 0.12, z, w, 0.24, d, M['tanahBunga'], bevel=0.03)
    for i in range(int(w * d * 3)):
        sph(x + random.uniform(-w / 2 + 0.15, w / 2 - 0.15), 0.32, z + random.uniform(-d / 2 + 0.1, d / 2 - 0.1), 0.13,
            random.choice([M['bungaMerah'], M['bungaKuning'], M['bungaPutih'], M['bungaUngu'], M['daun3']]), ico=True)

M.update(batangKelapa=mat('BatangKelapa', '#8a6a45', 0.9), daunKelapa=mat('DaunKelapa', '#4f9e3a', 0.8), buahKelapa=mat('BuahKelapa', '#6b8a2e', 0.7),
         jalan=mat('Jalan', '#4a4d54', 0.95), garis=mat('Garis', '#f4f1e8', 0.8), garisKuning=mat('GarisKuning', '#f2c230', 0.8),
         kacaKereta=mat('KacaKereta', '#2a3b52', 0.1, 0.3), keretaMerah=mat('KeretaMerah', '#c0392b', 0.35, 0.3), keretaPutih=mat('KeretaPutih', '#eef0f2', 0.35, 0.3),
         keretaBiru=mat('KeretaBiru', '#2f5fa8', 0.35, 0.3), keretaKelabu=mat('KeretaKelabu', '#7d848c', 0.35, 0.3),
         tanahBunga=mat('TanahBunga', '#6b4a32', 0.95), bungaMerah=mat('BungaMerah', '#e2485b', 0.7), bungaKuning=mat('BungaKuning', '#f5c842', 0.7),
         bungaPutih=mat('BungaPutih', '#fbf7f0', 0.7), bungaUngu=mat('BungaUngu', '#9b5de5', 0.7), pagar=mat('Pagar', '#3d7d3f', 0.9),
         benderaMerah=mat('BenderaMerah', '#cc0001', 0.8), benderaBiru=mat('BenderaBiru', '#010066', 0.8), benderaKuning=mat('BenderaKuning', '#ffcc00', 0.6),
         teratai=mat('Teratai', '#3f8f4a', 0.8), bungaTeratai=mat('BungaTeratai', '#f7a1c4', 0.7), lampuSiling=mat('LampuSiling', '#fff6dc', 0.3, emit='#ffe7a8', emit_str=2.2))

# Jalan raya di depan & tempat letak kereta
box(0, -0.0, 31, 104, 0.04, 6, M['jalan'])
for i in range(-12, 13): box(i * 4, 0.025, 31, 2.0, 0.01, 0.15, M['garis'])
box(0, 0.025, 28.1, 104, 0.01, 0.12, M['garisKuning'])
box(0, 0.0, 24.5, 5.5, 0.05, 7, M['jalan'])  # jalan masuk ke pintu pagar
px0 = -16
box(px0, 0.01, 22.5, 18, 0.04, 8, M['jalan'])
for i in range(7): box(px0 - 7.5 + i * 2.5, 0.04, 22.5, 0.1, 0.01, 4.8, M['garis'])
for i, m_ in enumerate([M['keretaMerah'], M['keretaPutih'], M['keretaBiru'], M['keretaKelabu'], M['keretaPutih']]):
    if i == 2: continue
    kereta(px0 - 6.25 + i * 2.5, 22.3, m_)
# Pagar pokok renek di sekeliling kawasan (dengan bukaan pintu)
for x in range(-46, 47, 2):
    if abs(x) < 4: continue
    box(x, 0.45, 27, 2.0, 0.9, 0.8, M['pagar'], bevel=0.15)
for z in range(-30, 27, 2):
    box(-48, 0.45, z, 0.8, 0.9, 2.0, M['pagar'], bevel=0.15); box(48, 0.45, z, 0.8, 0.9, 2.0, M['pagar'], bevel=0.15)
# Taman bunga di depan bangunan
for x in (-20, -10, 10, 20): bunga(x, 15.6, 6, 1.0)
bunga(-5.5, 19, 2.5, 2.5); bunga(5.5, 19, 2.5, 2.5)
# Bangku & tiang bendera
bangku(-8, 21.5); bangku(8, 21.5)
cyl(6.5, 3.5, 19.5, 0.07, 7.0, M['besi'], verts=8); sph(6.5, 7.05, 19.5, 0.1, M['emas'])
for i in range(7):
    box(7.55, 6.6 - i * 0.16, 19.5, 2.0, 0.08, 0.02, M['benderaMerah'] if i % 2 == 0 else M['putih'])
box(7.0, 6.37, 19.51, 1.0, 0.56, 0.02, M['benderaBiru'])
box(6.9, 6.37, 19.53, 0.3, 0.3, 0.01, M['benderaKuning']); box(7.25, 6.37, 19.53, 0.18, 0.18, 0.01, M['benderaKuning'])
# Teratai di kolam
for i in range(7):
    a = random.uniform(0, 6.28); r = random.uniform(0.6, 3.8)
    cyl(-37 + math.cos(a) * r, 0.07, 18 + math.sin(a) * r, random.uniform(0.3, 0.5), 0.02, M['teratai'], verts=10)
    if i % 2 == 0: sph(-37 + math.cos(a) * r, 0.14, 18 + math.sin(a) * r, 0.12, M['bungaTeratai'], ico=True)
# Pokok kelapa
for (x, z, s, c) in [(-42, 10, 1.0, 0.6), (-40, 25, 1.1, 1.2), (42, -2, 1.0, -0.8), (43, 22, 1.15, -1.4), (-24, 24, 0.95, 0.3), (26, 24, 1.0, -0.4), (-43, -24, 1.05, 2.5), (40, -26, 0.95, -2.2)]:
    kelapa(x, z, s, c)
# Lampu siling (berkilau waktu malam) di setiap bilik & koridor
for k, (cx, cz, nama) in BILIK.items():
    cyl(cx, FLOOR + 2.6, cz, 0.28, 0.05, M['lampuSiling'], verts=16)
    cyl(cx, FLOOR + 2.72, cz, 0.3, 0.12, M['hitam'], verts=16, r2=0.12)

gabung()
export(os.path.join(OUT, 'office.glb'), draco=True)
print('office.glb ok', len(bpy.data.objects), 'objek')

# ---------------- WATAK ----------------
reset()
MATS.clear()
kulit = mat('Kulit', '#e8b98a', 0.65); baju = mat('Baju', '#4a7bd0', 0.75); seluar = mat('Seluar', '#384058', 0.8)
rambut = mat('Rambut', '#2b2b2b', 0.85); kasut = mat('Kasut', '#1d1d1f', 0.45); mata = mat('Mata', '#18181b', 0.25); putihMata = mat('PutihMata', '#ffffff', 0.3)
pipi = mat('Pipi', '#f29a8a', 0.8); tudungM = mat('Tudung', '#6b7cff', 0.8); tag = mat('Tag', '#2f6bff', 0.5); cermin = mat('Cermin', '#222222', 0.3, 0.5)
kolar = mat('Kolar', '#f4f4f4', 0.7); tali = mat('Tali', '#2f3e5c', 0.7)
root = empty('Person', 0, 0, 0)
def anak(o, p): o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted(); return o
# kaki (pivot di pinggul)
for nm, x in (('LegL', -0.12), ('LegR', 0.12)):
    p = empty(nm, x, 0.78, 0, parent=root)
    anak(cyl(x, 0.45, 0, 0.1, 0.62, seluar, verts=12, r2=0.085), p)
    anak(box(x, 0.07, 0.05, 0.2, 0.12, 0.34, kasut, bevel=0.06), p)
# badan: bentuk bulat sedikit (kon terbalik) + pinggang
t = cyl(0, 1.08, 0, 0.28, 0.66, baju, verts=20, r2=0.31, name='Torso'); t.scale = (1, 0.68, 1); t.parent = root
anak(cyl(0, 0.76, 0, 0.27, 0.08, seluar, verts=20), root).scale = (1, 0.68, 1)
anak(cyl(0, 1.39, 0, 0.16, 0.06, kolar, verts=16), root)
anak(cyl(0, 1.45, 0, 0.09, 0.1, kulit, verts=12), root)
# kad nama syarikat (warna ikut pasukan)
anak(box(0.1, 1.0, 0.215, 0.13, 0.17, 0.02, tag, bevel=0.01, name='KadNama'), root)
anak(box(0.05, 1.22, 0.205, 0.02, 0.3, 0.01, tali), root); anak(box(0.15, 1.22, 0.205, 0.02, 0.3, 0.01, tali), root)
# kain panjang (baju kurung) — disorok kecuali ahli bertudung
kn = empty('Kain', 0, 0, 0, parent=root)
o = anak(cyl(0, 0.42, 0, 0.3, 0.72, seluar, verts=20, r2=0.24), kn); o.scale = (1, 0.8, 1)
# tangan (pivot di bahu)
for nm, x in (('ArmL', -0.37), ('ArmR', 0.37)):
    p = empty(nm, x, 1.32, 0, parent=root)
    anak(sph(x, 1.3, 0, 0.1, baju, seg=12), p)
    anak(cyl(x, 1.04, 0, 0.085, 0.5, baju, verts=12, r2=0.07), p)
    anak(sph(x, 0.75, 0, 0.085, kulit, seg=12), p)
# kepala (pivot di leher)
hp = empty('HeadPivot', 0, 1.42, 0, parent=root)
anak(sph(0, 1.74, 0, 0.3, kulit, sy=1.02, seg=24, name='Head'), hp)
for x in (-0.3, 0.3): anak(sph(x, 1.72, 0, 0.06, kulit, sx=0.6, seg=10), hp)  # telinga
for x in (-0.1, 0.1):
    anak(sph(x, 1.74, 0.265, 0.055, putihMata, sz=0.5, seg=12), hp)
    anak(sph(x, 1.74, 0.285, 0.035, mata, sz=0.5, seg=10), hp)
    anak(sph(x + 0.012, 1.755, 0.3, 0.011, putihMata, seg=6), hp)
    anak(sph(x * 1.55, 1.65, 0.255, 0.045, pipi, sz=0.3, seg=8), hp)
    anak(box(x, 1.84, 0.27, 0.11, 0.022, 0.02, rambut, rot=0.12 if x < 0 else -0.12), hp)  # kening
anak(sph(0, 1.69, 0.3, 0.035, kulit, seg=10), hp)  # hidung
for i, dx in enumerate((-0.045, 0, 0.045)):  # senyum
    anak(box(dx, 1.61 + (0.008 if i != 1 else 0), 0.285, 0.05, 0.018, 0.01, mata, rot=(0.35 if dx < 0 else -0.35 if dx > 0 else 0)), hp)
# rambut pendek
rp = empty('RambutPendek', 0, 1.42, 0, parent=hp)
anak(sph(0, 1.85, -0.03, 0.315, rambut, sy=0.72, sz=1.04, seg=24, name='Hair'), rp)
anak(sph(0, 1.7, -0.19, 0.27, rambut, sy=0.95, sz=0.62, seg=16), rp)
anak(sph(-0.15, 1.92, 0.15, 0.13, rambut, sy=0.5, seg=12), rp)
# rambut panjang
rl = empty('RambutPanjang', 0, 1.42, 0, parent=hp)
anak(sph(0, 1.86, -0.02, 0.32, rambut, sy=0.74, sz=1.05, seg=24), rl)
anak(sph(0, 1.55, -0.18, 0.3, rambut, sx=1.05, sy=1.35, sz=0.55, seg=16), rl)
for x in (-0.27, 0.27): anak(sph(x, 1.6, 0.02, 0.1, rambut, sy=2.0, sz=0.8, seg=12), rl)
# tudung
td = empty('Tudung', 0, 1.42, 0, parent=hp)
anak(sph(0, 1.76, -0.1, 0.345, tudungM, sy=1.1, sz=0.95, seg=24), td)
anak(sph(0, 1.9, 0.04, 0.31, tudungM, sy=0.62, sz=0.95, seg=20), td)
for x in (-0.29, 0.29): anak(sph(x, 1.66, 0.04, 0.09, tudungM, sx=0.8, sy=2.2, sz=1.4, seg=12), td)
anak(cyl(0, 1.33, -0.02, 0.4, 0.24, tudungM, verts=20, r2=0.24), td)
anak(sph(0, 1.33, 0.1, 0.19, tudungM, sx=1.4, sy=0.4, sz=0.7, seg=16), td)
# cermin mata
cm = empty('CerminMata', 0, 1.42, 0, parent=hp)
for x in (-0.1, 0.1):
    for (dx, dy, w, h) in ((0, 0.055, 0.12, 0.016), (0, -0.055, 0.12, 0.016), (-0.055, 0, 0.016, 0.12), (0.055, 0, 0.016, 0.12)):
        anak(box(x + dx, 1.74 + dy, 0.31, w, h, 0.012, cermin), cm)
anak(box(0, 1.75, 0.31, 0.08, 0.014, 0.012, cermin), cm)
# mahkota (untuk CEO, disorok untuk ejen lain)
cr = empty('Crown', 0, 2.06, 0, parent=hp)
c = cyl(0, 2.12, 0, 0.17, 0.12, mat('Emas', '#f2c230', 0.25, 0.9), verts=10); anak(c, cr)
for i in range(5):
    a2 = i * 1.2566; anak(sph(math.cos(a2) * 0.15, 2.22, math.sin(a2) * 0.15, 0.035, mat('Permata', '#e0405a', 0.2, 0.3)), cr)
export(os.path.join(OUT, 'person.glb'))
print('person.glb ok')

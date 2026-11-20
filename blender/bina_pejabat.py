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
          'D': mat('LantaiD', '#c8d3e6', 0.85), 'E': mat('LantaiE', '#d4e8d6', 0.85), 'F': mat('LantaiF', '#ead9bd', 0.85)}
PERMAIDANI = {'A': mat('PermA', '#8e3b46', 0.95), 'B': mat('PermB', '#3e7a6b', 0.95), 'C': mat('PermC', '#6a4c93', 0.95),
              'D': mat('PermD', '#2e4a7d', 0.95), 'E': mat('PermE', '#3f7d4c', 0.95), 'F': mat('PermF', '#8a6a2f', 0.95)}

# Tanah & landskap
box(0, -0.06, 0, 80, 0.1, 64, M['rumput'])
for i in range(40):
    x, z = random.uniform(-38, 38), random.uniform(-30, 30)
    if abs(x) < 21 and abs(z) < 16: continue
    box(x, 0.0, z, random.uniform(1, 3), 0.02, random.uniform(1, 3), M['rumput2'])
# laluan masuk
box(0, 0.0, 20.5, 4, 0.04, 9, M['batu'])
for i in range(6): box(0, 0.03, 16.8 + i * 1.4, 3.6, 0.02, 0.08, M['tepi'])
# kolam
cyl(-28, 0.0, 17, 4.5, 0.06, M['air'], verts=32)
cyl(-28, -0.02, 17, 4.9, 0.08, M['batu'], verts=32)

# Bangunan: tapak
W, D = 38, 28
box(0, 0.12, 0, W + 0.8, 0.3, D + 0.8, M['tepi'], bevel=0.05)
box(0, 0.28, 0, W, 0.04, D, M['tapak'])
FLOOR = 0.3

# Bilik
BILIK = {'A': (-12.5, -7.5, 'PEJABAT CEO'), 'B': (0, -7.5, 'PRODUK & R&D'), 'C': (12.5, -7.5, 'STUDIO KREATIF'),
         'D': (-12.5, 7.5, 'MAKMAL TEKNOLOGI'), 'E': (0, 7.5, 'JUALAN & SOKONGAN'), 'F': (12.5, 7.5, 'KEWANGAN & PEMATUHAN')}
RW, RD = 12, 11

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
    if k in 'ABDE': dinding_kaca(x1, cz - RD / 2, x1, cz + RD / 2)

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

# Meja setiap bilik (ikut susunan dalam app.js)
SUSUNAN = {'A': ['CEO', 'KETUASTAF'], 'B': ['PELANCAR', 'PENYELIDIK'], 'C': ['DESIGNER', 'PEMASARAN'],
           'D': ['DEVELOPER', 'QA'], 'E': ['JUALAN', 'SOKONGAN'], 'F': ['KEWANGAN', 'PEMATUHAN']}
for k, (cx, cz, nama) in BILIK.items():
    for i, kod in enumerate(SUSUNAN[k]):
        meja(kod, cx + (-2.6 if i == 0 else 2.6), cz + 0.2, ceo=(kod == 'CEO'))
    back = cz - RD / 2 + 0.6 if cz < 0 else cz + RD / 2 - 0.6
    zin = cz + (RD / 2 - 1.0) * (1 if cz < 0 else -1)
    pokok_pasu(cx + RW / 2 - 0.8, back, 1.1)
    pokok_pasu(cx - RW / 2 + 0.8, zin - (0.3 if cz < 0 else -0.3), 0.8)
    # papan nama bilik di dinding belakang / tepi
    if cz < 0:
        box(cx, FLOOR + 2.15, back - 0.18, 3.6, 0.5, 0.06, M['aksen'], bevel=0.02)
        text(nama, cx, FLOOR + 2.15, back - 0.12, 0.26, M['putih'])
    empty('Label_' + k, cx, FLOOR + 2.9, back)

cx, cz = BILIK['A'][:2]
rak_buku(cx - 4.6, cz - RD / 2 + 0.55); rak_buku(cx - 2.8, cz - RD / 2 + 0.55)
sofa(cx + 3.6, cz - 3.4, 2.4, M['sofaMerah'])
box(cx + 3.6, FLOOR + 0.25, cz - 2.3, 1.2, 0.08, 0.6, M['kayuGelap'], bevel=0.02)
cyl(cx + 3.6, FLOOR + 0.12, cz - 2.3, 0.05, 0.22, M['besi'])
cyl(cx - 0.2, FLOOR + 0.6, cz - 4.6, 0.25, 0.2, M['emas'], verts=16)  # trofi
box(cx - 0.2, FLOOR + 0.25, cz - 4.6, 0.6, 0.5, 0.4, M['kayuGelap'])
cx, cz = BILIK['B'][:2]
box(cx, FLOOR + 1.6, cz - RD / 2 + 0.2, 3.2, 1.5, 0.06, M['putih'], bevel=0.02)  # papan putih
for i in range(6): box(cx - 1.2 + i * 0.45, FLOOR + 1.7 + random.uniform(-0.3, 0.3), cz - RD / 2 + 0.24, 0.3, 0.3, 0.01, random.choice([M['sofaKuning'], M['sofaHijau'], M['sofaMerah'], M['sofaBiru']]))
sph(cx - 3.5, FLOOR + 0.35, cz + 3.2, 0.55, M['sofaHijau'], sy=0.7); sph(cx - 2.3, FLOOR + 0.35, cz + 3.4, 0.55, M['sofaKuning'], sy=0.7)
cx, cz = BILIK['C'][:2]
for i, m in enumerate([M['sofaMerah'], M['sofaKuning'], M['sofaHijau'], M['sofaBiru'], mat('Ungu', '#8e5cf0', 0.8)]):
    box(cx - 3 + i * 1.5, FLOOR + 1.6, cz - RD / 2 + 0.2, 1.2, 1.6, 0.04, m)
box(cx + 4.2, FLOOR + 1.0, cz - 2.5, 0.05, 1.6, 0.05, M['kayu']); box(cx + 4.2, FLOOR + 1.3, cz - 2.45, 1.0, 1.2, 0.05, M['putih'])
box(cx + 4.0, FLOOR + 1.4, cz - 2.42, 0.4, 0.4, 0.01, M['sofaMerah']); box(cx + 4.4, FLOOR + 1.2, cz - 2.42, 0.3, 0.5, 0.01, M['sofaBiru'])
cx, cz = BILIK['D'][:2]
for i in range(3):
    box(cx - 5.0 + i * 0.75, FLOOR + 1.05, cz + 4.6, 0.65, 2.1, 0.7, M['hitam'], bevel=0.02)
    for j in range(7):
        box(cx - 5.0 + i * 0.75 + 0.2, FLOOR + 0.35 + j * 0.25, cz + 4.24, 0.06, 0.04, 0.02, M['lampuHijau'] if (i + j) % 3 else M['lampuMerah'])
cx, cz = BILIK['E'][:2]
cyl(cx, FLOOR + 0.75, cz + 3.4, 1.0, 0.06, M['kayuCerah'], verts=24); cyl(cx, FLOOR + 0.38, cz + 3.4, 0.08, 0.72, M['besi'])
for i in range(4):
    a = i * math.pi / 2 + 0.4; kerusi_pejabat(cx + math.cos(a) * 1.4, cz + 3.4 + math.sin(a) * 1.4, m=M['sofaHijau'])
cx, cz = BILIK['F'][:2]
for i in range(3): box(cx + 2.5 + i * 0.75, FLOOR + 0.7, cz + 4.6, 0.7, 1.4, 0.6, M['besi'], bevel=0.02)
box(cx - 4.5, FLOOR + 0.5, cz + 4.4, 1.0, 1.0, 0.9, mat('Peti', '#4a4f57', 0.4, 0.6), bevel=0.04)
cyl(cx - 4.5, FLOOR + 0.55, cz + 3.93, 0.15, 0.05, M['emas'])

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
sofa(-7.5, 1.0, 3.0, M['sofaBiru']); sofa(7.5, 1.0, 3.0, M['sofaMerah'])
cyl(-7.5, FLOOR + 0.2, -0.4, 0.5, 0.06, M['kayuCerah'], verts=20); cyl(7.5, FLOOR + 0.2, -0.4, 0.5, 0.06, M['kayuCerah'], verts=20)
pokok_pasu(-3.8, 0.9, 1.3); pokok_pasu(3.8, 0.9, 1.3); pokok_pasu(-17.5, 0, 1.2); pokok_pasu(17.5, 0, 1.2)
empty('Pantri', 0, FLOOR, 0.0)

# Papan tanda syarikat di depan
box(0, 1.3, 17.2, 5.6, 1.2, 0.3, M['aksen'], bevel=0.05)
box(-2.3, 0.35, 17.2, 0.2, 0.7, 0.2, M['aksen']); box(2.3, 0.35, 17.2, 0.2, 0.7, 0.2, M['aksen'])
text('RICKY & CO.', 0, 1.4, 17.38, 0.55, M['emas'])
text('Syarikat Ejen AI', 0, 0.95, 17.38, 0.25, M['putih'])

# Pokok & lampu luar
for (x, z, s) in [(-26, -18, 1.3), (-22, -21, 1.0), (-29, -6, 1.2), (-27, 4, 0.9), (24, -19, 1.2), (28, -9, 1.1), (27, 6, 1.3),
                  (22, 20, 1.0), (-14, 21, 1.1), (-8, 23, 0.9), (10, 22, 1.2), (16, 24, 0.9), (0, -21, 1.3), (-12, -22, 1.0), (12, -21, 1.1), (30, 18, 1.0)]:
    pokok_luar(x, z, s)
for i in range(16):
    a = random.uniform(0, 6.28); r = random.uniform(22, 34)
    sph(math.cos(a) * r, 0.3, math.sin(a) * r * 0.75, 0.5, random.choice([M['daun'], M['daun3']]), sy=0.7, ico=True)
for x in (-2.6, 2.6):
    for z in (17.5, 23.5):
        cyl(x, 1.1, z, 0.06, 2.2, M['hitam'], verts=8); sph(x, 2.3, z, 0.18, M['lampu'])

gabung()
export(os.path.join(OUT, 'office.glb'), draco=True)
print('office.glb ok', len(bpy.data.objects), 'objek')

# ---------------- WATAK ----------------
reset()
MATS.clear()
kulit = mat('Kulit', '#f1c48f', 0.7); baju = mat('Baju', '#4a7bd0', 0.8); seluar = mat('Seluar', '#384058', 0.8)
rambut = mat('Rambut', '#2b2b2b', 0.9); kasut = mat('Kasut', '#1d1d1f', 0.5); mata = mat('Mata', '#18181b', 0.3); pipi = mat('Pipi', '#f19a8a', 0.8)
root = empty('Person', 0, 0, 0)
# kaki (pivot di pinggul)
for nm, x in (('LegL', -0.13), ('LegR', 0.13)):
    p = empty(nm, x, 0.78, 0, parent=root)
    o = box(x, 0.42, 0, 0.2, 0.62, 0.24, seluar, bevel=0.06, parent=None)
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
    s = box(x, 0.07, 0.04, 0.22, 0.12, 0.32, kasut, bevel=0.05); s.parent = p; s.matrix_parent_inverse = p.matrix_world.inverted()
# badan
t = box(0, 1.08, 0, 0.6, 0.66, 0.36, baju, bevel=0.12, name='Torso'); t.parent = root
k = box(0, 1.38, 0, 0.3, 0.08, 0.3, kulit, bevel=0.03); k.parent = root
# tangan (pivot di bahu)
for nm, x in (('ArmL', -0.4), ('ArmR', 0.4)):
    p = empty(nm, x, 1.32, 0, parent=root)
    o = box(x, 1.05, 0, 0.17, 0.52, 0.19, baju, bevel=0.07); o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
    h = sph(x, 0.74, 0, 0.1, kulit); h.parent = p; h.matrix_parent_inverse = p.matrix_world.inverted()
# kepala (pivot di leher)
hp = empty('HeadPivot', 0, 1.42, 0, parent=root)
def ke_kepala(o): o.parent = hp; o.matrix_parent_inverse = hp.matrix_world.inverted()
ke_kepala(sph(0, 1.72, 0, 0.3, kulit, sy=1.0, seg=24, name='Head'))
ke_kepala(sph(0, 1.82, -0.03, 0.315, rambut, sy=0.78, sz=1.02, seg=24, name='Hair'))
ke_kepala(sph(0, 1.66, -0.2, 0.26, rambut, sy=0.9, sz=0.6, seg=16))
for x in (-0.1, 0.1):
    ke_kepala(sph(x, 1.72, 0.275, 0.045, mata, sz=0.5, seg=10))
    ke_kepala(sph(x * 1.5, 1.63, 0.255, 0.045, pipi, sz=0.3, seg=8))
ke_kepala(box(0, 1.6, 0.29, 0.1, 0.025, 0.01, mata))
# mahkota (untuk CEO, disorok untuk ejen lain)
cr = empty('Crown', 0, 2.06, 0, parent=hp)
c = cyl(0, 2.1, 0, 0.17, 0.12, mat('Emas', '#f2c230', 0.25, 0.9), verts=10); c.parent = cr; c.matrix_parent_inverse = cr.matrix_world.inverted()
for i in range(5):
    a = i * 1.2566; g = sph(math.cos(a) * 0.15, 2.2, math.sin(a) * 0.15, 0.035, mat('Permata', '#e0405a', 0.2, 0.3)); g.parent = cr; g.matrix_parent_inverse = cr.matrix_world.inverted()
export(os.path.join(OUT, 'person.glb'))
print('person.glb ok')

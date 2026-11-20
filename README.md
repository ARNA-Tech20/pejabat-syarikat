# 🏢 Pejabat Syarikat Ricky — 3D

Pejabat 3D animasi yang menunjukkan 11 ejen AI syarikat Ricky bekerja secara langsung.

- **Lihat pejabat:** https://arna-tech20.github.io/pejabat-syarikat/
- **Mod demo (data contoh):** https://arna-tech20.github.io/pejabat-syarikat/?demo=1

## Cara ia berfungsi

1. Setiap ejen (tugas berjadual Claude) menulis satu fail kecil ke folder [`log/`](log/) bila ia **mula** dan bila ia **siap** (atau **gagal**).
2. Halaman pejabat membaca senarai fail dalam `log/` melalui GitHub API setiap 2 minit.
3. Watak ejen berubah ikut status terkini:

| Status | Dalam pejabat |
|---|---|
| ⌨️ Sedang bekerja | Duduk di meja, menaip, monitor menyala |
| ✅ Baru siap | Duduk di meja dengan tanda siap (12 jam) |
| ❗ Gagal | Tanda merah (48 jam) |
| ☕ Rehat | Berjalan ke pantri atau berlegar dalam bilik |
| 💤 Malam | Tidur di meja (12 tgh malam – 7 pagi) |

## Format fail log

```
log/2026-11-20T12-05-00Z__SOKONGAN__MULA.md
log/2026-11-20T12-18-42Z__SOKONGAN__SIAP.md
```

`<masa UTC dengan - ganti :>__<KOD>__<MULA|SIAP|GAGAL>.md` — isi fail: satu atau dua ayat ringkas.

**Kod ejen:** KETUASTAF, PELANCAR, PENYELIDIK, DESIGNER, PEMASARAN, DEVELOPER, QA, JUALAN, SOKONGAN, KEWANGAN, PEMATUHAN

> Repo ini awam. Jangan letak data pelanggan, data peribadi, kata laluan atau pautan sulit dalam fail log.

## Fail

- `index.html` — halaman dan paparan panel
- `app.js` — adegan 3D (Three.js), animasi watak, label dan bacaan log
- `models/office.glb` — bangunan, bilik, perabot dan landskap (dibina dalam **Blender**)
- `models/person.glb` — watak ejen (Blender; baju & rambut diwarnakan dalam app.js)
- `blender/bina_pejabat.py` — skrip Blender yang menjana kedua-dua model
- `log/` — fail status daripada ejen

### Bina semula model dengan Blender

```bash
pip install bpy            # atau: blender --background --python blender/bina_pejabat.py -- models
python3 blender/bina_pejabat.py -- models
```

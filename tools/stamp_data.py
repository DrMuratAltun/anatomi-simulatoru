#!/usr/bin/env python3
"""GLB'ler yeniden üretildikten sonra app.js içindeki DATA_VERSION'ı tazeler.

Tarayıcı önbelleği sürüm damgası olmadan eski modeli servis ediyor; dolaşım
sistemi 22 -> 676 yapıya çıktığı hâlde ziyaretçiler eski dosyayı görüyordu.
Kullanım:  python3 tools/stamp_data.py
"""
import glob
import hashlib
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
h = hashlib.md5()
for f in sorted(glob.glob(str(root / "systems" / "*.glb"))):
    p = pathlib.Path(f)
    h.update(p.read_bytes()[:65536])
    h.update(str(p.stat().st_size).encode())
ver = h.hexdigest()[:8]

app = root / "app.js"
s = app.read_text()
s2 = re.sub(r"const DATA_VERSION = '[a-f0-9]+';", f"const DATA_VERSION = '{ver}';", s)
app.write_text(s2)
print("DATA_VERSION =", ver, "(değişti)" if s != s2 else "(aynı)")

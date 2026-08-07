"""
Z-Anatomy Startup.blend -> sistem bazlı GLB dışa aktarımı (Blender headless).

Kullanım:
  blender -b vendor/Z-Anatomy/Startup.blend --factory-startup -noaudio \
      -P tools/export_systems.py -- [sistem_id ...]

Çıktı:
  systems/<id>.glb        her obje ayrı mesh, adları korunmuş
  data/systems.json       sistem meta verisi

İki tuzak (ölçülerek bulundu, bkz. commit notu):
  1. Objelerde SUBDIVISION modifier var. len(obj.data.polygons) ham sayıyı
     verir; gerçek üçgen sayısı 40 katına kadar çıkıyor. Decimate oranı
     depsgraph'tan DEĞERLENDİRİLMİŞ üçgen sayısıyla hesaplanır.
  2. use_selection=True, seçili objelerin BAŞKA koleksiyonlardaki
     çocuklarını da çekiyor (76 obje -> 1648 node). Bunun yerine geçici bir
     koleksiyona link'leyip use_active_collection ile dışa aktarıyoruz.
"""
import bpy
import json
import os
import sys
import time

# Depo kökü: bu betiğin bulunduğu tools/ klasörünün üstü.
# Blender __file__ vermediği için argümanlardan da okunabilir: -- --root /yol
ROOT = os.environ.get("ANATOMI_ROOT") or os.path.dirname(
    os.path.dirname(os.path.abspath(bpy.data.filepath or ".")))
if not os.path.isdir(os.path.join(ROOT, "tools")):
    ROOT = os.getcwd()
TMP_COLL = "ZEXPORT_TMP"

# id, blend koleksiyonu, Türkçe ad, hedef üçgen sayısı
SYSTEMS = [
    ("iskelet",     "1: Skeletal system",               "İskelet Sistemi",   320000),
    ("eklem",       "3: Joints",                        "Eklemler",          150000),
    ("kas",         "4: Muscular system",               "Kas Sistemi",       420000),
    ("dolasim",     "5: Cardiovascular system",         "Dolaşım Sistemi",   420000),
    ("lenf",        "6: Lymphoid organs",               "Lenf Sistemi",      130000),
    ("sinir",       "7: Nervous system & Sense organs", "Sinir Sistemi",     400000),
    ("ic-organlar", "8: Visceral systems",              "İç Organlar",       260000),
]

MIN_TRIS_TO_DECIMATE = 600

# Z-Anatomy'de damarlar ve bazı sinirler MESH değil, bevel'li BÉZIER EĞRİ
# olarak modellenmiş (5: Cardiovascular system -> 60 mesh ama 654 eğri).
# Yalnız MESH süzülürse dolaşım sisteminden arter/ven ağacının TAMAMI düşer,
# geriye sadece kalp kalır. Eğriler dışa aktarım öncesi mesh'e çevrilir.
GEOMETRI_TIPLERI = {'MESH', 'CURVE', 'SURFACE'}


def evaluated_tris(obj, depsgraph):
    """Modifier'lar (ve eğri bevel'i) uygulandıktan sonraki üçgen sayısı."""
    try:
        ev = obj.evaluated_get(depsgraph)
        me = ev.to_mesh()
    except RuntimeError:
        return 0
    if me is None:
        return 0
    n = sum(max(0, len(p.vertices) - 2) for p in me.polygons)
    ev.to_mesh_clear()
    return n


def is_label(obj):
    """Z-Anatomy'nin sahnede yüzen 3B başlık yazıları ('... .g') anatomi değil."""
    return obj.name.endswith('.g')


def collect(coll, depsgraph):
    """Koleksiyondaki, gerçekten geometrisi olan mesh objeleri + üçgen sayıları."""
    out = []
    seen = set()
    for obj in coll.all_objects:
        if obj.type not in GEOMETRI_TIPLERI or obj.name in seen or is_label(obj):
            continue
        seen.add(obj.name)
        tris = evaluated_tris(obj, depsgraph)
        if tris > 0:
            out.append((obj, tris))
    return out


def clear_tmp():
    coll = bpy.data.collections.get(TMP_COLL)
    if coll:
        for obj in list(coll.objects):
            coll.objects.unlink(obj)
        bpy.context.scene.collection.children.unlink(coll)
        bpy.data.collections.remove(coll)


def export_system(sid, coll_name, tr_name, target, depsgraph):
    coll = bpy.data.collections.get(coll_name)
    if coll is None:
        print(f"!! KOLEKSİYON YOK: {coll_name}")
        return None

    items = collect(coll, depsgraph)
    raw = sum(t for _, t in items)
    if raw == 0:
        print(f"!! {sid}: geometri yok")
        return None

    ratio = min(1.0, target / raw)
    print(f">> {sid}: {len(items)} obje, {raw:,} üçgen (değerlendirilmiş), oran={ratio:.4f}")

    clear_tmp()
    tmp = bpy.data.collections.new(TMP_COLL)
    bpy.context.scene.collection.children.link(tmp)

    added = []
    gecici = []      # (yeni_obje, kaynak_obje, eski_ad) — export sonrası temizlenir
    for obj, tris in items:
        hedef = obj

        if obj.type != 'MESH':
            # Eğri/yüzey: değerlendirilmiş mesh'ten geçici obje üret.
            # Ad çakışmasın diye kaynak geçici olarak yeniden adlandırılır,
            # yoksa yeni obje "Ad.001" olur ve glTF düğüm adı bozulur.
            try:
                ev = obj.evaluated_get(depsgraph)
                me = bpy.data.meshes.new_from_object(ev)
            except RuntimeError:
                continue
            if me is None or len(me.polygons) == 0:
                continue
            eski_ad = obj.name
            obj.name = eski_ad + "~src"
            hedef = bpy.data.objects.new(eski_ad, me)
            hedef.matrix_world = obj.matrix_world
            gecici.append((hedef, obj, eski_ad))

        for m in [m for m in hedef.modifiers if m.name == "ZExportDecimate"]:
            hedef.modifiers.remove(m)
        if ratio < 0.999 and tris >= MIN_TRIS_TO_DECIMATE:
            mod = hedef.modifiers.new(name="ZExportDecimate", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio
        try:
            tmp.objects.link(hedef)
            added.append(hedef)
        except RuntimeError:
            pass

    # Geçici koleksiyonu aktif yap
    layer_coll = bpy.context.view_layer.layer_collection.children.get(TMP_COLL)
    if layer_coll is None:
        print("!! geçici koleksiyon görünüm katmanında yok")
        return None
    bpy.context.view_layer.active_layer_collection = layer_coll

    out = f"{ROOT}/systems/{sid}.glb"
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_active_collection=True,
        use_active_collection_with_nested=False,
        use_selection=False,
        use_visible=False,
        export_apply=True,
        export_yup=True,
        export_materials='NONE',
        export_normals=True,
        export_texcoords=False,
        export_tangents=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )

    # Temizlik: decimate modifier'larını kaldır, geçici objeleri sil,
    # eğri kaynaklarının adını geri ver
    for obj in added:
        for m in [m for m in obj.modifiers if m.name == "ZExportDecimate"]:
            obj.modifiers.remove(m)
    clear_tmp()
    for yeni, kaynak, eski_ad in gecici:
        mesh_data = yeni.data
        bpy.data.objects.remove(yeni, do_unlink=True)
        if mesh_data.users == 0:
            bpy.data.meshes.remove(mesh_data)
        kaynak.name = eski_ad

    size_mb = os.path.getsize(out) / 1e6
    return {
        "id": sid,
        "ad": tr_name,
        "koleksiyon": coll_name,
        "dosya": f"systems/{sid}.glb",
        "obje": len(added),
        "egriden": len(gecici),
        "ucgen_ham": raw,
        "hedef_ucgen": target,
        "decimate_orani": round(ratio, 4),
        "boyut_mb": round(size_mb, 2),
    }


def main():
    argv = sys.argv
    wanted = argv[argv.index("--") + 1:] if "--" in argv else []
    targets = [s for s in SYSTEMS if not wanted or s[0] in wanted]

    os.makedirs(f"{ROOT}/systems", exist_ok=True)
    os.makedirs(f"{ROOT}/data", exist_ok=True)
    meta_path = f"{ROOT}/data/systems.json"
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}

    depsgraph = bpy.context.evaluated_depsgraph_get()

    for sid, coll_name, tr_name, target in targets:
        t0 = time.time()
        rec = export_system(sid, coll_name, tr_name, target, depsgraph)
        if rec:
            meta[sid] = rec
            json.dump(meta, open(meta_path, "w"), ensure_ascii=False, indent=1)
            print(f"   -> {rec['dosya']}  {rec['boyut_mb']} MB  ({time.time() - t0:.0f} sn)")

    print("BİTTİ")


main()

"""Z-Anatomy Startup.blend içeriğini raporlar (Blender headless ile çalıştırılır)."""
import bpy
import json
import os
import sys
from collections import defaultdict


def collection_path(coll, parent_map, depth=0):
    chain = [coll.name]
    cur = coll
    while cur.name in parent_map and depth < 12:
        cur = parent_map[cur.name]
        chain.append(cur.name)
        depth += 1
    return list(reversed(chain))


def main():
    scene = bpy.context.scene
    parent_map = {}
    for coll in bpy.data.collections:
        for child in coll.children:
            parent_map[child.name] = coll

    roots = [c for c in bpy.data.collections if c.name not in parent_map]

    report = {
        "toplam_obje": len(bpy.data.objects),
        "mesh_obje": sum(1 for o in bpy.data.objects if o.type == 'MESH'),
        "toplam_koleksiyon": len(bpy.data.collections),
        "kok_koleksiyonlar": [c.name for c in roots],
        "sahne_kok_cocuklari": [c.name for c in scene.collection.children],
    }

    # Üst iki seviye koleksiyon ağacı + mesh/poligon sayıları
    def summarize(coll, level):
        meshes = [o for o in coll.all_objects if o.type == 'MESH']
        tris = 0
        for o in meshes:
            me = o.data
            tris += len(me.polygons)
        return {
            "ad": coll.name,
            "seviye": level,
            "alt_koleksiyon": [c.name for c in coll.children],
            "mesh_sayisi": len(meshes),
            "poligon": tris,
        }

    tree = []
    for c in scene.collection.children:
        tree.append(summarize(c, 1))
        for c2 in c.children:
            tree.append(summarize(c2, 2))
            for c3 in c2.children:
                tree.append(summarize(c3, 3))
    report["agac"] = tree

    # Örnek obje adları
    names = [o.name for o in bpy.data.objects if o.type == 'MESH']
    report["ornek_adlar"] = names[:40]

    root = os.environ.get("ANATOMI_ROOT") or os.getcwd()
    os.makedirs(os.path.join(root, "data"), exist_ok=True)
    out = os.path.join(root, "data", "blend_report.json")
    with open(out, "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("RAPOR YAZILDI:", out)
    print("mesh obje:", report["mesh_obje"], "koleksiyon:", report["toplam_koleksiyon"])


main()

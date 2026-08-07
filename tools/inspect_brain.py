"""Z-Anatomy sinir sistemi koleksiyon ağacını beyin yapıları için raporlar."""
import bpy
import json
import os

ROOT = os.environ.get("ANATOMI_ROOT") or os.getcwd()


def walk(coll, depth, out, path):
    meshes = [o for o in coll.objects if o.type == 'MESH' and len(o.data.polygons) > 0]
    here = path + [coll.name]
    out.append({
        "yol": " / ".join(here),
        "derinlik": depth,
        "dogrudan_mesh": len(meshes),
        "toplam_mesh": len([o for o in coll.all_objects if o.type == 'MESH']),
        "ornek": [o.name for o in meshes[:6]],
        "alt": [c.name for c in coll.children],
    })
    for c in coll.children:
        walk(c, depth + 1, out, here)


def main():
    root = bpy.data.collections.get("7: Nervous system & Sense organs")
    if root is None:
        print("!! koleksiyon yok")
        return
    out = []
    walk(root, 0, out, [])

    path = os.path.join(ROOT, "data", "brain_tree.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(out, open(path, "w"), ensure_ascii=False, indent=1)

    for n in out:
        if n["derinlik"] <= 3:
            print(f"{'  ' * n['derinlik']}{n['yol'].split(' / ')[-1]:<42} "
                  f"mesh={n['toplam_mesh']:<4} dogrudan={n['dogrudan_mesh']}")
    print("RAPOR:", path, "| düğüm:", len(out))


main()

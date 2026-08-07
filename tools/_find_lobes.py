import bpy, json, os, re
ROOT = os.environ.get("ANATOMI_ROOT") or os.getcwd()
hits = []
for c in bpy.data.collections:
    if re.search(r'lobe|telencephal|cerebrum|cerebral|hemisphere|brain|cortex|encephal', c.name, re.I):
        meshes = [o.name for o in c.all_objects if o.type == 'MESH']
        hits.append({"ad": c.name, "mesh": len(meshes), "alt": [x.name for x in c.children], "ornek": meshes[:5]})
hits.sort(key=lambda h: -h["mesh"])
for h in hits[:30]:
    print(f"{h['ad']:<46} mesh={h['mesh']:<5} alt={len(h['alt'])} {h['alt'][:4]}")
json.dump(hits, open(os.path.join(ROOT,"data","lobe_colls.json"),"w"), ensure_ascii=False, indent=1)
print("toplam eşleşen koleksiyon:", len(hits))

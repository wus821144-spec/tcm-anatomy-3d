"""Headless Blender script to extract Z-Anatomy Arthrology (ligaments/capsules)
and Lymphatic system meshes into Three.js-ready binary .glb files + TA2 metadata.
"""
import csv
import json
import os
import re
import sys
import bpy
from mathutils import Vector

argv = sys.argv
args = argv[argv.index("--") + 1 :] if "--" in argv else []

OUT_MODELS_DIR = args[0] if len(args) > 0 else "/tmp/atlas-r2/public/models"
TA2_CSV_PATH = args[1] if len(args) > 1 else "/tmp/z-anatomy/TA2.csv"
OUT_DATA_DIR = args[2] if len(args) > 2 else "/tmp/atlas-r2/public/data"

os.makedirs(OUT_MODELS_DIR, exist_ok=True)
os.makedirs(OUT_DATA_DIR, exist_ok=True)

LIG_COLL_RE = re.compile(r"arthrolog|ligament|joint|capsule", re.I)
LIG_NAME_RE = re.compile(
    r"ligament|lig\.|capsule|retinaculum|meniscus|symphysis|interosseous|"
    r"aponeurosis|labrum|bursa|annular|cruciate|collateral|deltoid|inguinal|"
    r"sacrotuberous|sacrospinous|flava|nuchal|longitudinal|supraspinous",
    re.I,
)
LYMPH_COLL_RE = re.compile(r"lymph", re.I)
LYMPH_NAME_RE = re.compile(
    r"lymph|nodus|nodi|thoracic duct|cisterna chyli|thymus|spleen|tonsil|"
    r"waldeyer|jugular trunk|subclavian trunk|bronchomediastinal|lumbar trunk|"
    r"intestinal trunk|appendix|splenic",
    re.I,
)
OSTEO_COLL_RE = re.compile(r"osteolog|skelet|bone", re.I)
OSTEO_NAME_RE = re.compile(
    r"femur|humerus|tibia|fibula|radius|ulna|pelvis|hip bone|ilium|ischium|"
    r"pubis|sacrum|sternum|clavicle|scapula|vertebra|cranium|skull|rib",
    re.I,
)


def parse_ta2(csv_path: str) -> dict:
    ta2_map = {}
    if not os.path.exists(csv_path):
        return ta2_map
    with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
        sample = f.read(2048)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t") if sample else csv.excel
        reader = csv.DictReader(f, dialect=dialect)
        for row in reader:
            norm = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            en = norm.get("english") or norm.get("en") or norm.get("name") or ""
            la = norm.get("latin") or norm.get("la") or norm.get("ta2") or ""
            code = norm.get("id") or norm.get("code") or norm.get("ta2_id") or ""
            if en:
                ta2_map[en.lower()] = {"en": en, "la": la, "ta2": code}
            if la:
                ta2_map[la.lower()] = {"en": en or la, "la": la, "ta2": code}
    return ta2_map


def get_collection_paths() -> dict:
    obj_colls = {}

    def walk_coll(coll, path):
        cur_path = path + [coll.name]
        joined = " / ".join(cur_path)
        for obj in coll.objects:
            obj_colls.setdefault(obj.name, []).append(joined)
        for child in coll.children:
            walk_coll(child, cur_path)

    walk_coll(bpy.context.scene.collection, [])
    return obj_colls


def compute_bounds_yup(objs: list) -> dict:
    min_v = [1e9, 1e9, 1e9]
    max_v = [-1e9, -1e9, -1e9]
    count = 0
    for obj in objs:
        if obj.type != "MESH":
            continue
        mw = obj.matrix_world
        for corner in obj.bound_box:
            wp = mw @ Vector(corner)
            yp = [wp.x, wp.z, -wp.y]
            for i in range(3):
                if yp[i] < min_v[i]:
                    min_v[i] = yp[i]
                if yp[i] > max_v[i]:
                    max_v[i] = yp[i]
            count += 1
    if count == 0:
        return {"min": [-0.3, 0.0, -0.2], "max": [0.3, 1.7, 0.2], "center": [0, 0.85, 0], "size": [0.6, 1.7, 0.4]}
    center = [(min_v[i] + max_v[i]) * 0.5 for i in range(3)]
    size = [max(1e-4, max_v[i] - min_v[i]) for i in range(3)]
    return {
        "min": [round(x, 6) for x in min_v],
        "max": [round(x, 6) for x in max_v],
        "center": [round(x, 6) for x in center],
        "size": [round(x, 6) for x in size],
    }


def decimate_if_heavy(objs: list, max_faces: int = 12000):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        if obj.type != "MESH" or not obj.data:
            continue
        faces = len(obj.data.polygons)
        if faces > max_faces:
            ratio = max(0.35, float(max_faces) / float(faces))
            mod = obj.modifiers.new(name="R2Decimate", type="DECIMATE")
            mod.ratio = ratio


def enable_all_collections(layer_coll):
    layer_coll.exclude = False
    for child in layer_coll.children:
        enable_all_collections(child)


def export_group(objs: list, filepath: str):
    objs = [o for o in objs if o.name in bpy.context.view_layer.objects]
    if not objs:
        print(f"[extract_z_anatomy] WARNING: 0 objects for {filepath}")
        return
    for obj in objs:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
    decimate_if_heavy(objs)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        try:
            obj.select_set(True)
        except RuntimeError:
            pass
    sel = [o for o in objs if o.select_get()]
    if not sel:
        return
    bpy.context.view_layer.objects.active = sel[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_materials="NONE",
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    print(f"[extract_z_anatomy] Exported {len(sel)} meshes -> {filepath}")


def clean_struct_name(raw_name: str) -> str:
    name = re.sub(r"\.\d{3}$", "", raw_name)
    return name.replace("_", " ").strip()


def main():
    enable_all_collections(bpy.context.view_layer.layer_collection)
    ta2_map = parse_ta2(TA2_CSV_PATH)
    obj_colls = get_collection_paths()

    lig_objs = []
    lymph_objs = []
    osteo_objs = []

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        colls_str = " | ".join(obj_colls.get(obj.name, []))
        nm = obj.name

        if LYMPH_COLL_RE.search(colls_str) or LYMPH_NAME_RE.search(nm):
            lymph_objs.append(obj)
        elif LIG_COLL_RE.search(colls_str) or LIG_NAME_RE.search(nm):
            if not re.search(r"\b(muscle|musculus)\b", nm, re.I):
                lig_objs.append(obj)

        if OSTEO_COLL_RE.search(colls_str) or OSTEO_NAME_RE.search(nm):
            osteo_objs.append(obj)

    osteo_bounds = compute_bounds_yup(osteo_objs)

    export_group(lig_objs, os.path.join(OUT_MODELS_DIR, "z_ligaments.glb"))
    export_group(lymph_objs, os.path.join(OUT_MODELS_DIR, "z_lymphatic.glb"))

    meta_items = {}
    for sys_key, group in [("ligaments", lig_objs), ("lymphatic", lymph_objs)]:
        for obj in group:
            clean = clean_struct_name(obj.name)
            lookup = ta2_map.get(clean.lower()) or ta2_map.get(obj.name.lower()) or {}
            meta_items[obj.name] = {
                "system": sys_key,
                "en": lookup.get("en") or clean,
                "la": lookup.get("la") or "",
                "ta2": lookup.get("ta2") or "",
            }

    meta_out = {
        "source": "Z-Anatomy (CC BY-SA 4.0)",
        "osteoBounds": osteo_bounds,
        "counts": {"ligaments": len(lig_objs), "lymphatic": len(lymph_objs), "osteologyRef": len(osteo_objs)},
        "items": meta_items,
    }
    meta_path = os.path.join(OUT_DATA_DIR, "z_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_out, f, ensure_ascii=False)
    print(f"[extract_z_anatomy] Wrote metadata -> {meta_path} ({meta_out['counts']})")


if __name__ == "__main__":
    main()

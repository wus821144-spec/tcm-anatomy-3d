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

JUNK_NAME_RE = re.compile(
    r"^(joints|lymphoid organs|lymphatic|arthrology|osteology|myology|angiology|"
    r"neurology|splanchnology|cardiovascular|nervous|muscular|skeletal|digestive|"
    r"respiratory|urinary|reproductive|endocrine|integumentary|regions|overview|"
    r"text|label|title|legend|header|arrow|line|plane|axis|camera|light|empty|cube)",
    re.I,
)
JUNK_PART_RE = re.compile(r"\b(label|text|legend|header|title|arrow|pointer|callout)\b", re.I)

# Strictly match true lymphatic nodes, vessels, ducts, and lymphoid organs by object name
LYMPH_NAME_RE = re.compile(
    r"lymph|nodus|nodi|\bnode\b|\bnodes\b|thoracic duct|cisterna chyli|"
    r"tonsil|waldeyer|jugular trunk|subclavian trunk|bronchomediastinal|lumbar trunk|"
    r"intestinal trunk|splenic|chyle|peyer",
    re.I,
)
LYMPH_EXCLUDE_RE = re.compile(
    r"joint|ligament|lig\.|capsule|cartilage|suture|disc|skull|cranium|hand|foot|"
    r"knee|hip|rib|vertebra|spine|tendon|bursa|meniscus|fascia|aponeurosis|"
    r"retinaculum|membrane|labrum|symphysis|interosseous|sinus node|atrioventricular node|"
    r"sinoatrial node|ranvier|bone|muscle|spleen|thymus",
    re.I,
)
LIG_NAME_RE = re.compile(
    r"ligament|lig\.|capsule|retinaculum|meniscus|symphysis|interosseous|"
    r"aponeurosis|labrum|bursa|annular|cruciate|collateral|deltoid lig|inguinal|"
    r"sacrotuberous|sacrospinous|flava|nuchal|longitudinal|supraspinous|"
    r"intervertebral disc|articular disc|joint capsule|membrane of",
    re.I,
)
# Include cranial vault (parietal/frontal/occipital) & foot bones (calcaneus/talus/metatarsal/phalanx)
# so osteoBounds spans 100% of true head-to-foot height (no ~10% vertical overshoot)
CORE_BONE_RE = re.compile(
    r"\b(parietal|frontal|occipital|temporal|femur|humerus|tibia|fibula|radius|ulna|"
    r"sternum|sacrum|clavicle|scapula|hip bone|ilium|ischium|pubis|cranium|skull|"
    r"mandible|patella|talus|calcaneus|metatarsal|proximal phalanx of)\b",
    re.I,
)


def is_junk_mesh(obj) -> bool:
    if obj.type != "MESH" or not obj.data or len(obj.data.polygons) == 0:
        return True
    nm = obj.name.strip()
    alpha = re.sub(r"[^A-Za-z]", "", nm)
    if len(alpha) >= 4 and alpha.isupper():
        return True
    if JUNK_NAME_RE.search(nm) or JUNK_PART_RE.search(nm):
        return True
    return False


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


def get_leaf_collections() -> dict:
    obj_colls = {}

    def walk_coll(coll):
        for obj in coll.objects:
            obj_colls.setdefault(obj.name, []).append(coll.name)
        for child in coll.children:
            walk_coll(child)

    walk_coll(bpy.context.scene.collection)
    return obj_colls


def obj_center_yup(obj) -> list:
    mw = obj.matrix_world
    pts = [mw @ Vector(c) for c in obj.bound_box]
    cx = sum(p.x for p in pts) / len(pts)
    cy = sum(p.z for p in pts) / len(pts)
    cz = sum(-p.y for p in pts) / len(pts)
    return [cx, cy, cz]


def compute_bounds_yup(objs: list) -> dict:
    if not objs:
        return {"min": [-0.3, 0.0, -0.2], "max": [0.3, 1.7, 0.2], "center": [0, 0.85, 0], "size": [0.6, 1.7, 0.4]}
    centers = [obj_center_yup(o) for o in objs]
    xs = sorted(c[0] for c in centers)
    zs = sorted(c[2] for c in centers)
    med_x = xs[len(xs) // 2]
    med_z = zs[len(zs) // 2]

    min_v = [1e9, 1e9, 1e9]
    max_v = [-1e9, -1e9, -1e9]
    count = 0
    for obj, c in zip(objs, centers):
        if abs(c[0] - med_x) > 0.65 or abs(c[2] - med_z) > 0.45:
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


def in_body_envelope(obj, osteo_bounds: dict) -> bool:
    c = obj_center_yup(obj)
    bmin = osteo_bounds["min"]
    bmax = osteo_bounds["max"]
    bsize = osteo_bounds["size"]
    pad_x = bsize[0] * 0.18
    pad_y = bsize[1] * 0.06
    pad_z = bsize[2] * 0.35
    return (
        (bmin[0] - pad_x) <= c[0] <= (bmax[0] + pad_x)
        and (bmin[1] - pad_y) <= c[1] <= (bmax[1] + pad_y)
        and (bmin[2] - pad_z) <= c[2] <= (bmax[2] + pad_z)
    )


def decimate_if_heavy(objs: list, max_faces: int = 12000):
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


def deselect_everything():
    for o in bpy.data.objects:
        try:
            o.select_set(False)
        except RuntimeError:
            pass


def export_group(objs: list, filepath: str):
    valid = [o for o in objs if not is_junk_mesh(o)]
    if not valid:
        print(f"[extract_z_anatomy] WARNING: 0 objects for {filepath}")
        return
    temp_coll = None
    unlinked = [o for o in valid if o.name not in bpy.context.view_layer.objects]
    if unlinked:
        temp_coll = bpy.data.collections.new("R2_Temp_Export")
        bpy.context.scene.collection.children.link(temp_coll)
        for o in unlinked:
            temp_coll.objects.link(o)
    try:
        for obj in valid:
            obj.hide_set(False)
            obj.hide_viewport = False
            obj.hide_render = False
        decimate_if_heavy(valid)
        deselect_everything()
        for obj in valid:
            try:
                obj.select_set(True)
            except RuntimeError:
                pass
        sel = [o for o in valid if o.select_get()]
        if sel:
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
    finally:
        deselect_everything()
        if temp_coll is not None:
            bpy.context.scene.collection.children.unlink(temp_coll)
            bpy.data.collections.remove(temp_coll)


def clean_struct_name(raw_name: str) -> str:
    name = re.sub(r"\.\d{3}$", "", raw_name)
    return name.replace("_", " ").strip()


def main():
    enable_all_collections(bpy.context.view_layer.layer_collection)
    ta2_map = parse_ta2(TA2_CSV_PATH)
    leaf_colls = get_leaf_collections()

    osteo_objs = []
    for obj in bpy.data.objects:
        if is_junk_mesh(obj):
            continue
        nm = obj.name
        if CORE_BONE_RE.search(nm) and not LIG_NAME_RE.search(nm) and not re.search(r"\b(muscle|artery|vein|nerve|ligament|suture|cartilage)\b", nm, re.I):
            osteo_objs.append(obj)

    osteo_bounds = compute_bounds_yup(osteo_objs)
    print(f"[extract_z_anatomy] Core osteo ref: {len(osteo_objs)} meshes, bounds={osteo_bounds}")

    lig_objs = []
    lymph_objs = []

    for obj in bpy.data.objects:
        if is_junk_mesh(obj):
            continue
        if not in_body_envelope(obj, osteo_bounds):
            continue
        nm = obj.name
        leaf_str = " | ".join(leaf_colls.get(nm, []))

        # Strictly classify lymphatics by object name ONLY (never by loose collection bleed)
        if LYMPH_NAME_RE.search(nm) and not LYMPH_EXCLUDE_RE.search(nm):
            lymph_objs.append(obj)
        elif (LIG_NAME_RE.search(nm) or re.search(r"ligament|arthrolog|joint", leaf_str, re.I)) and not LYMPH_NAME_RE.search(nm) and not re.search(r"\b(muscle|musculus|bone|node|nodes)\b", nm, re.I):
            lig_objs.append(obj)

    print("[extract_z_anatomy] Sample ligaments:", [o.name for o in lig_objs[:15]])
    print("[extract_z_anatomy] Sample lymphatics:", [o.name for o in lymph_objs[:15]])

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

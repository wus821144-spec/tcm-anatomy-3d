import sys
import os
import json
import csv
import math
import bpy
from mathutils import Vector, Matrix

argv = sys.argv
out_dir = argv[argv.index("--") + 1] if "--" in argv else "www/models"
os.makedirs(out_dir, exist_ok=True)
data_dir = os.path.join(os.path.dirname(os.path.abspath(out_dir)), "data")
os.makedirs(data_dir, exist_ok=True)

ta2_map = {}
ta2_path = "/tmp/z-anatomy/TA2.csv"
if os.path.exists(ta2_path):
    try:
        with open(ta2_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 2:
                    key = row[0].strip().lower()
                    ta2_map[key] = " | ".join([c.strip() for c in row[:3] if c.strip()])
    except Exception as e:
        print("TA2.csv parse warning:", e)

SYSTEM_RULES = {
    "LigamentJoint": ["ligament", "joint", "capsule", "meniscus", "cartilage", "bursa", "disc", "symphysis", "suture", "tendon", "aponeurosis", "retinaculum"],
    "Skeleton": ["bone", "skelet", "skull", "vertebra", "rib", "sternum", "pelvis", "femur", "tibia", "fibula", "humerus", "radius", "ulna", "clavicle", "scapula", "patella", "carpal", "tarsal", "sulcus", "tubercle", "tuberosity", "process", "fossa", "foramen", "notch", "crest", "condyle", "epicondyle", "trochanter", "malleolus"],
    "Muscular": ["muscle", "muscul", "fascia", "diaphragm"],
    "Visceral": ["viscer", "organ", "pleura", "pericardium", "peritoneum", "meninges", "bronch", "alveol", "ureter", "urethra", "pharynx", "larynx", "sinus", "ventricle", "atrium", "heart", "lung", "liver", "stomach", "intestin", "kidney", "spleen", "pancreas", "bladder", "trachea", "esophagus", "brain", "digest", "respir", "urinary", "reproduc", "genital", "uterus", "ovary", "prostate", "testis", "gland", "thyroid"],
    "Neurovascular": ["nerve", "nervous", "coronary", "carotid", "jugular", "sciatic", "brachial", "femoral", "artery", "arterial", "vein", "venous", "vessel", "vascular", "lymph", "plexus", "aorta", "vena", "capillary", "trunk", "branch"],
    "Skin": ["skin", "integument", "epiderm", "derm", "cutane", "subcut", "body", "surface", "nail", "hair"]
}

FEMALE_KWS = ["female", "uterus", "ovary", "ovarian", "vagina", "vulva", "fallopian", "clitoris", "mammary"]
MALE_KWS = ["male genital", "prostate", "testis", "testicle", "epididymis", "scrotum", "penis", "seminal", "vas deferens", "spermatic"]

def classify_system_and_gender(obj):
    parts = [obj.name.lower()] + [c.name.lower() for c in obj.users_collection]
    s = " ".join(parts)
    gender_tag = "Common"
    if any(k in s for k in FEMALE_KWS):
        gender_tag = "Female"
    elif any(k in s for k in MALE_KWS):
        gender_tag = "Male"
    sys_name = "Visceral"
    for k, kws in SYSTEM_RULES.items():
        if any(kw in s for kw in kws):
            sys_name = k
            break
    return sys_name, gender_tag

def classify_region(center):
    x, y, z = center.x, center.y, center.z
    if z >= 1.42:
        return "region_head"
    if z <= 0.82 and abs(x) > 0.01:
        return "region_leg_l" if x > 0 else "region_leg_r"
    if z > 0.72 and abs(x) >= 0.20:
        return "region_arm_l" if x > 0 else "region_arm_r"
    return "region_thorax" if z >= 1.08 else "region_abdomen_pelvis"

def unexclude_layer_collections(lc):
    lc.exclude = False
    lc.hide_viewport = False
    for child in lc.children:
        unexclude_layer_collections(child)

if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

unexclude_layer_collections(bpy.context.view_layer.layer_collection)

SAFE_ANAT_WHITELIST = [
    "linea", "nuchal", "pectineal", "soleal", "temporal line", "gluteal line",
    "arcuate line", "mylohyoid", "cribriform", "epiphyseal", "tarsal plate",
    "tympanic ring", "inguinal ring", "cricoid", "tracheal ring", "fibrous ring",
    "annular", "meniscus", "orbital plate", "pterygoid plate", "nail plate"
]

BAD_NAME_KWS = [
    "_label", "text_label", "arrow", "gizmo", "widget", "bounding_box",
    "menu", "reference", "plane", "grid", "axis", "axes", "camera",
    "backdrop", "background", "floor", "stage", "cursor", "pointer",
    "cross_section", "diagram", "enlargement", "inset", "legend",
    "regions of human", "general terms", "movements", "nervous system &",
    "muscular system", "viscera", "joints", "sense organs", "ui_", "_ui"
]

def is_safe_anatomical_name(low_name, col_names):
    combined = low_name + " " + " ".join(col_names)
    return any(w in combined for w in SAFE_ANAT_WHITELIST)

def is_bad_helper_object(obj):
    if obj.type != 'MESH' or not obj.data or len(obj.data.polygons) == 0:
        return True
    low = obj.name.lower()
    col_names = [c.name.lower() for c in obj.users_collection]
    combined = low + " " + " ".join(col_names)
    if any(c in combined for c in ["ui", "menu", "labels", "reference", "planes", "annotations", "text"]):
        if not is_safe_anatomical_name(low, col_names):
            return True
    if not is_safe_anatomical_name(low, col_names):
        if any(b in combined for b in BAD_NAME_KWS):
            return True
    if "text" in obj.data.name.lower() and not is_safe_anatomical_name(low, col_names):
        return True
    return False

for obj in list(bpy.data.objects):
    if is_bad_helper_object(obj):
        bpy.data.objects.remove(obj, do_unlink=True)

if len(bpy.data.objects) == 0:
    raise RuntimeError("No mesh objects found in Z-Anatomy blend file")

for col in bpy.data.collections:
    col.hide_viewport = False
    col.hide_render = False
for obj in bpy.data.objects:
    if obj.name not in bpy.context.view_layer.objects:
        bpy.context.scene.collection.objects.link(obj)
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    if obj.animation_data:
        obj.animation_data_clear()
    if obj.data and obj.data.shape_keys:
        obj.shape_key_clear()
    obj.modifiers.clear()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.make_single_user(object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.select_all(action='DESELECT')

for obj in list(bpy.data.objects):
    verts = obj.data.vertices
    if len(verts) == 0:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    xs = [v.co.x for v in verts]
    ys = [v.co.y for v in verts]
    zs = [v.co.z for v in verts]
    dx, dy, dz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
    max_dim = max(dx, dy, dz)
    min_dim = min(dx, dy, dz)
    if max_dim > 3.5:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if len(verts) <= 128 and max_dim > 0.12 and min_dim < 0.005 * max_dim:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue

SKELETON_ANCHOR_KWS = ["femur", "tibia", "humerus", "skull", "cranium", "pelvis", "sternum", "vertebra", "rib", "clavicle", "scapula"]
anchor_objs = [
    o for o in bpy.data.objects
    if any(k in o.name.lower() for k in SKELETON_ANCHOR_KWS)
]
if len(anchor_objs) < 10:
    anchor_objs = list(bpy.data.objects)

min_co = Vector((1e9, 1e9, 1e9))
max_co = Vector((-1e9, -1e9, -1e9))
for obj in anchor_objs:
    for v in obj.data.vertices:
        if v.co.x < min_co.x: min_co.x = v.co.x
        if v.co.y < min_co.y: min_co.y = v.co.y
        if v.co.z < min_co.z: min_co.z = v.co.z
        if v.co.x > max_co.x: max_co.x = v.co.x
        if v.co.y > max_co.y: max_co.y = v.co.y
        if v.co.z > max_co.z: max_co.z = v.co.z

height = max(max_co.z - min_co.z, 0.001)
scale = 1.70 / height
cx = (min_co.x + max_co.x) / 2.0
cy = (min_co.y + max_co.y) / 2.0
min_z = min_co.z

norm_mat = Matrix.Scale(scale, 4) @ Matrix.Translation(Vector((-cx, -cy, -min_z)))

for obj in list(bpy.data.objects):
    verts = obj.data.vertices
    if not verts:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    avg = sum((norm_mat @ v.co for v in verts), Vector((0, 0, 0))) / len(verts)
    if avg.z < -0.06 or avg.z > 1.76 or abs(avg.x) > 0.95 or abs(avg.y) > 0.55:
        bpy.data.objects.remove(obj, do_unlink=True)

desc_map = {}
for txt_block in bpy.data.texts:
    try:
        content = txt_block.as_string().strip()
        if not content:
            continue
        if txt_block.name.lower().endswith(".json") or content.startswith("{"):
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                for k, v in parsed.items():
                    if isinstance(v, str) and len(v) > 10:
                        desc_map[k.strip().lower()] = v.strip()[:1200]
        elif len(content) > 20:
            desc_map[os.path.splitext(txt_block.name)[0].strip().lower()] = content[:1200]
    except Exception:
        pass

for root_dir, _, fs in os.walk("/tmp/z-anatomy-extracted"):
    for fn in fs:
        if fn.lower().endswith(".json"):
            try:
                parsed = json.loads(open(os.path.join(root_dir, fn), "r", encoding="utf-8", errors="ignore").read())
                if isinstance(parsed, dict):
                    for k, v in parsed.items():
                        if isinstance(v, str) and len(v) > 10:
                            desc_map.setdefault(k.strip().lower(), v.strip()[:1200])
            except Exception:
                pass
print(f"Extracted {len(desc_map)} internal Z-Anatomy definitions")

region_buckets = {
    "region_head": [],
    "region_thorax": [],
    "region_abdomen_pelvis": [],
    "region_arm_l": [],
    "region_arm_r": [],
    "region_leg_l": [],
    "region_leg_r": [],
    "region_skin": []
}

mesh_index = []

for obj in list(bpy.data.objects):
    obj.data.transform(norm_mat)
    obj.data.update()

    raw_name = obj.name
    sys_tag, gender_tag = classify_system_and_gender(obj)
    obj.name = f"{sys_tag}__{gender_tag}__{raw_name}"

    verts = obj.data.vertices
    bx = sum(v.co.x for v in verts) / len(verts)
    by = sum(v.co.y for v in verts) / len(verts)
    bz = sum(v.co.z for v in verts) / len(verts)
    bbox_center = Vector((bx, by, bz))
    reg = classify_region(bbox_center)
    region_buckets[reg].append(obj)

    mesh_index.append({
        "meshName": obj.name,
        "raw": raw_name,
        "sys": sys_tag,
        "gender": gender_tag,
        "region": reg,
        "pos": [
            round(bx, 4) if math.isfinite(bx) else 0.0,
            round(bz, 4) if math.isfinite(bz) else 0.0,
            round(-by, 4) if math.isfinite(by) else 0.0
        ],
        "ta2": ta2_map.get(raw_name.lower(), ""),
        "desc": desc_map.get(raw_name.lower(), desc_map.get(raw_name.split(".")[0].strip().lower(), ""))
    })

skin_objs = [o for o in bpy.data.objects if o.name.startswith("Skin__")]
if len(skin_objs) < 5 and len(bpy.data.objects) > 10:
    print("Generating smooth anatomical Skin envelope around body...")
    bpy.ops.object.select_all(action='DESELECT')
    sample_objs = [o for o in bpy.data.objects if o.name.startswith(("Muscular__", "Skeleton__"))][:400]
    if sample_objs:
        dups = []
        for o in sample_objs:
            d = o.copy()
            d.data = o.data.copy()
            bpy.context.scene.collection.objects.link(d)
            dups.append(d)
        bpy.ops.object.select_all(action='DESELECT')
        for d in dups:
            d.select_set(True)
        bpy.context.view_layer.objects.active = dups[0]
        bpy.ops.object.join()
        env = bpy.context.view_layer.objects.active
        env.name = "Skin__Common__Anatomical_Body_Surface"
        remesh = env.modifiers.new(name="SkinEnvelope", type='REMESH')
        remesh.mode = 'VOXEL'
        remesh.voxel_size = 0.0085
        bpy.ops.object.convert(target='MESH')
        smooth = env.modifiers.new(name="SkinSmooth", type='SMOOTH')
        smooth.factor = 0.5
        smooth.iterations = 3
        bpy.ops.object.convert(target='MESH')
        region_buckets["region_skin"].append(env)

index_file = os.path.join(data_dir, "mesh_index.json")
with open(index_file, "w", encoding="utf-8") as f:
    json.dump(mesh_index, f, ensure_ascii=False)
print(f"Exported mesh_index.json with {len(mesh_index)} entries")

for reg_name, objs in region_buckets.items():
    if not objs:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    selected_cnt = 0
    for o in objs:
        try:
            o.select_set(True)
            selected_cnt += 1
        except RuntimeError:
            pass
    if selected_cnt == 0:
        continue
    out_file = os.path.join(out_dir, f"{reg_name}.glb")
    try:
        bpy.ops.export_scene.gltf(
            filepath=out_file,
            use_selection=True,
            export_format='GLB',
            export_yup=True,
            export_apply=False,
            export_animations=False,
            export_materials='EXPORT',
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=3,
            export_draco_position_quantization=16,
            export_draco_normal_quantization=16,
            export_draco_texcoord_quantization=14
        )
    except Exception as e:
        print(f"Fallback material export for {reg_name}: {e}")
        bpy.ops.export_scene.gltf(
            filepath=out_file,
            use_selection=True,
            export_format='GLB',
            export_yup=True,
            export_apply=False,
            export_animations=False,
            export_materials='PLACEHOLDER',
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=3,
            export_draco_position_quantization=16,
            export_draco_normal_quantization=16,
            export_draco_texcoord_quantization=14
        )
    print(f"Exported {reg_name}: {selected_cnt} meshes -> {out_file}")

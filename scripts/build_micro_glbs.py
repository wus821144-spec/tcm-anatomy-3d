import bpy, math, os

os.makedirs('www/models', exist_ok=True)

def reset_scene():
  bpy.ops.wm.read_factory_settings(use_empty=True)

def make_mat(name, rgba, rough=0.35, clearcoat=0.4, alpha=1.0):
  m = bpy.data.materials.new(name)
  m.use_nodes = True
  bsdf = m.node_tree.nodes.get('Principled BSDF')
  if bsdf:
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in bsdf.inputs:
      bsdf.inputs['Coat Weight'].default_value = clearcoat
    if alpha < 1.0:
      bsdf.inputs['Alpha'].default_value = alpha
      m.blend_method = 'BLEND'
  return m

def add_subsurf(obj, lv=2):
  mod = obj.modifiers.new('Subsurf', 'SUBSURF')
  mod.levels = lv
  mod.render_levels = lv
  bpy.context.view_layer.objects.active = obj
  bpy.ops.object.shade_smooth()

def export_glb(path):
  bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True)
  print('Exported', path, os.path.getsize(path))

reset_scene()
sac_mat = make_mat('AlveolarSac', (0.98, 0.64, 0.69, 1.0), 0.3, 0.55, 0.88)
bron_mat = make_mat('Bronchiole', (0.55, 0.78, 0.98, 1.0), 0.4, 0.2)
cap_r = make_mat('CapillaryRed', (0.92, 0.18, 0.18, 1.0), 0.25, 0.7)
cap_b = make_mat('CapillaryBlue', (0.15, 0.39, 0.92, 1.0), 0.25, 0.7)
for i in range(18):
  phi = math.acos(1 - 2 * (i + 0.5) / 18)
  th = math.pi * (1 + math.sqrt(5)) * i
  r = 0.16
  bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, location=(r*math.sin(phi)*math.cos(th), r*math.cos(phi)-0.04, r*math.sin(phi)*math.sin(th)))
  o = bpy.context.active_object; o.data.materials.append(sac_mat); add_subsurf(o, 1)
bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.28, location=(0, 0.22, 0))
st = bpy.context.active_object; st.data.materials.append(bron_mat); add_subsurf(st, 1)
for idx, mat in enumerate([cap_r, cap_b]):
  bpy.ops.mesh.primitive_torus_add(major_radius=0.20, minor_radius=0.015, location=(0, -0.02, 0), rotation=(0.6 + idx*0.9, idx*0.7, 0))
  c = bpy.context.active_object; c.data.materials.append(mat); add_subsurf(c, 1)
export_glb('www/models/micro_alveolus.glb')

reset_scene()
bow_mat = make_mat('Bowman', (0.98, 0.90, 0.55, 1.0), 0.35, 0.4, 0.82)
glom_mat = make_mat('Glomerulus', (0.86, 0.15, 0.15, 1.0), 0.25, 0.7)
tub_mat = make_mat('Tubule', (0.96, 0.62, 0.05, 1.0), 0.4, 0.3)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.14, location=(-0.15, 0.10, 0))
bw = bpy.context.active_object; bw.data.materials.append(bow_mat); add_subsurf(bw, 2)
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.02, location=(-0.15, 0.10, 0))
gl = bpy.context.active_object; gl.data.materials.append(glom_mat); add_subsurf(gl, 2)
bpy.ops.mesh.primitive_cylinder_add(radius=0.028, depth=0.52, location=(0.25, -0.04, 0))
dc = bpy.context.active_object; dc.data.materials.append(tub_mat); add_subsurf(dc, 1)
export_glb('www/models/micro_nephron.glb')

reset_scene()
lob_mat = make_mat('Hepatocyte', (0.58, 0.12, 0.12, 1.0), 0.35, 0.45, 0.85)
cv_mat = make_mat('CentralVein', (0.15, 0.39, 0.92, 1.0), 0.3, 0.5)
bd_mat = make_mat('BileDuct', (0.06, 0.72, 0.50, 1.0), 0.3, 0.5)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.26, depth=0.28, location=(0, 0, 0))
hx = bpy.context.active_object; hx.data.materials.append(lob_mat); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.38, location=(0, 0, 0))
cv = bpy.context.active_object; cv.data.materials.append(cv_mat); add_subsurf(cv, 1)
for i in range(6):
  a = i * math.pi / 3 + math.pi / 6
  bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.34, location=(math.cos(a)*0.25, 0, math.sin(a)*0.25))
  bpy.context.active_object.data.materials.append(bd_mat)
export_glb('www/models/micro_lobule.glb')

reset_scene()
z_mat = make_mat('ZDisc', (0.22, 0.74, 0.97, 1.0), 0.3, 0.4)
myo_mat = make_mat('Myosin', (0.93, 0.26, 0.26, 1.0), 0.3, 0.5)
act_mat = make_mat('Actin', (0.98, 0.75, 0.14, 1.0), 0.35, 0.3)
for x in [-0.28, 0.28]:
  bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, 0, 0), scale=(0.02, 0.34, 0.24))
  bpy.context.active_object.data.materials.append(z_mat)
for y in [-0.10, 0.0, 0.10]:
  bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.32, location=(0, y, 0), rotation=(0, math.pi/2, 0))
  bpy.context.active_object.data.materials.append(myo_mat)
  for sx in [-0.17, 0.17]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.22, location=(sx, y+0.035, 0), rotation=(0, math.pi/2, 0))
    bpy.context.active_object.data.materials.append(act_mat)
export_glb('www/models/micro_sarcomere.glb')

reset_scene()
pre_mat = make_mat('Presynaptic', (0.98, 0.75, 0.14, 1.0), 0.35, 0.45, 0.78)
post_mat = make_mat('Postsynaptic', (0.22, 0.74, 0.97, 1.0), 0.4, 0.4)
nt_mat = make_mat('Neurotransmitter', (0.95, 0.25, 0.37, 1.0), 0.2, 0.8)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0, 0.15, 0))
pr = bpy.context.active_object; pr.data.materials.append(pre_mat); add_subsurf(pr, 2)
bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.14, location=(0, -0.15, 0))
po = bpy.context.active_object; po.data.materials.append(post_mat); add_subsurf(po, 1)
for i in range(12):
  a = i * 0.52
  bpy.ops.mesh.primitive_uv_sphere_add(radius=0.013, location=(math.cos(a)*0.07, (i%3-1)*0.025, math.sin(a)*0.07))
  bpy.context.active_object.data.materials.append(nt_mat)
export_glb('www/models/micro_synapse.glb')

reset_scene()
ring_mat = make_mat('Annulus', (0.98, 0.65, 0.65, 1.0), 0.35, 0.4)
cusp_mat = make_mat('Leaflet', (0.99, 0.94, 0.94, 1.0), 0.28, 0.5, 0.9)
bpy.ops.mesh.primitive_torus_add(major_radius=0.20, minor_radius=0.028, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
rg = bpy.context.active_object; rg.data.materials.append(ring_mat); add_subsurf(rg, 1)
for i in range(3):
  a = i * 2 * math.pi / 3
  bpy.ops.mesh.primitive_cone_add(radius1=0.11, depth=0.16, location=(math.cos(a)*0.08, -0.05, math.sin(a)*0.08))
  cp = bpy.context.active_object; cp.data.materials.append(cusp_mat); add_subsurf(cp, 1)
export_glb('www/models/micro_valve.glb')

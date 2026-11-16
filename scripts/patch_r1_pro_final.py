import os, re, json

data_path = 'www/data/anatomy_tcm_data.json'
if os.path.exists(data_path):
  d = json.load(open(data_path, encoding='utf-8'))
  z_map = {'head': 'zone_head', 'torso': 'zone_torso', 'arm_l': 'zone_arm_l', 'arm_r': 'zone_arm_r', 'leg_l': 'zone_leg_l', 'leg_r': 'zone_leg_r'}
  seen_names = set()
  dedup_pts = []
  for p in d.get('points', []):
    if p.get('zone') in z_map:
      p['zone'] = z_map[p['zone']]
    nm = p.get('name')
    if nm and nm in seen_names:
      continue
    if nm:
      seen_names.add(nm)
    dedup_pts.append(p)
  d['points'] = dedup_pts
  for a in d.get('full_acupoints_catalog', []):
    if a.get('zone') in z_map:
      a['zone'] = z_map[a['zone']]
  open(data_path, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2))

dm_path = 'src/data_manager.js'
if os.path.exists(dm_path):
  dm = open(dm_path, encoding='utf-8').read()
  m = re.search(r'(const ANAT_DICT = \[)(.*?)(\n\];)', dm, re.S)
  if m:
    seen_k = set()
    clean_entries = []
    for en, zh in re.findall(r"\['([^']+)',\s*'([^']+)'\]", m.group(2)):
      if en not in seen_k:
        seen_k.add(en)
        clean_entries.append(f"  ['{en}', '{zh}']")
    dm = dm[:m.start()] + m.group(1) + '\n' + ',\n'.join(clean_entries) + m.group(3) + dm[m.end():]
    open(dm_path, 'w', encoding='utf-8').write(dm)

e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  if 'bilateralPoints' not in src:
    src = src.replace("ghostMode: false,", "ghostMode: false,\n    bilateralPoints: false,")
    src = src.replace(
      "pointGroup.add(m);\n      state.pointMeshes.push(m);\n    });",
      """pointGroup.add(m);
      state.pointMeshes.push(m);
      if (pt.pos && Math.abs(pt.pos[0]) > 0.018 && !String(pt.id || '').includes('_R')) {
        const mr = new THREE.Mesh(geo, m.material);
        mr.position.set(-pt.pos[0], pt.pos[1], pt.pos[2]);
        const rZone = pt.zone === 'zone_arm_l' ? 'zone_arm_r' : (pt.zone === 'zone_leg_l' ? 'zone_leg_r' : pt.zone);
        mr.userData = { data: { ...pt, id: pt.id + '_R', zone: rZone, pos: [-pt.pos[0], pt.pos[1], pt.pos[2]] }, isMirrorRight: true };
        mr.visible = false;
        pointGroup.add(mr);
        state.pointMeshes.push(mr);
      }
    });"""
    )
    src = src.replace(
      "m.visible = state.visibleLayers.Points && !!state.activeZone && pt.zone === state.activeZone.id && genderOk;",
      "const mirrorOk = !m.userData.isMirrorRight || !!state.bilateralPoints;\n      m.visible = state.visibleLayers.Points && mirrorOk && !!state.activeZone && pt.zone === state.activeZone.id && genderOk;"
    )
    open(e3d_path, 'w', encoding='utf-8').write(src)

idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'id="btn-bilateral-pts"' not in h and 'id="btn-ghost"' in h:
    h = h.replace(
      '<button id="btn-ghost" class="btn glass">半隐</button>',
      '<button id="btn-ghost" class="btn glass">半隐</button><button id="btn-bilateral-pts" class="btn glass">双侧全穴</button>'
    )
  h = h.replace('特供版 R1-Pro', '特供版 R1').replace('特供版 R1', '特供版 R1-Pro')
  open(idx_path, 'w', encoding='utf-8').write(h)

app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  if 'btn-bilateral-pts' not in a:
    a += '''
;(() => {
  const biBtn = document.getElementById('btn-bilateral-pts');
  if (biBtn) biBtn.addEventListener('click', () => {
    state.bilateralPoints = !state.bilateralPoints;
    biBtn.classList.toggle('on', state.bilateralPoints);
    engine.refreshVisiblePoints();
    toastEl.innerText = state.bilateralPoints ? '已开启左右双侧对称全穴显示' : '已切换单侧精简穴位显示';
  });
})();
'''
    open(app_path, 'w', encoding='utf-8').write(a)

if os.path.exists('package.json'):
  pkg = json.load(open('package.json', encoding='utf-8'))
  pkg['version'] = '1.0.0-R1-Pro'
  open('package.json', 'w', encoding='utf-8').write(json.dumps(pkg, ensure_ascii=False, indent=2))
if os.path.exists('capacitor.config.json'):
  cap = json.load(open('capacitor.config.json', encoding='utf-8'))
  cap['appName'] = '中医解剖3D特供版 R1-Pro'
  open('capacitor.config.json', 'w', encoding='utf-8').write(json.dumps(cap, ensure_ascii=False, indent=2))

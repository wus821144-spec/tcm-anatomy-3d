import os

mer_path = 'src/tcm_meridian_engine.js'
if os.path.exists(mer_path):
  ms = open(mer_path, encoding='utf-8').read()
  SPLINE_CODE = """
const MERIDIAN_SPLINES = {
  '手太阴肺经': [[0.11,1.33,0.08],[0.16,1.35,0.05],[0.21,1.22,0.03],[0.23,1.10,0.03],[0.26,0.96,0.03],[0.28,0.86,0.03],[0.30,0.74,0.02]],
  '手阳明大肠经': [[0.30,0.75,0.01],[0.29,0.86,-0.01],[0.26,0.98,-0.02],[0.24,1.10,-0.01],[0.21,1.26,0.0],[0.19,1.38,0.01],[0.07,1.45,0.02],[0.02,1.53,0.09]],
  '足阳明胃经': [[0.03,1.56,0.09],[0.04,1.51,0.08],[0.05,1.44,0.04],[0.07,1.35,0.08],[0.07,1.22,0.10],[0.06,1.02,0.105],[0.06,0.86,0.08],[0.09,0.68,0.07],[0.10,0.49,0.06],[0.10,0.28,0.05],[0.09,0.09,0.06],[0.10,0.02,0.10]],
  '足太阴脾经': [[0.07,0.02,0.09],[0.07,0.09,0.02],[0.07,0.26,0.01],[0.07,0.46,0.02],[0.07,0.65,0.03],[0.07,0.84,0.06],[0.08,1.02,0.09],[0.10,1.22,0.09],[0.12,1.26,0.06]],
  '手少阴心经': [[0.16,1.30,0.02],[0.20,1.20,0.01],[0.22,1.10,0.01],[0.25,0.96,0.02],[0.27,0.86,0.02],[0.29,0.73,0.01]],
  '手太阳小肠经': [[0.29,0.73,-0.01],[0.28,0.86,-0.02],[0.25,0.98,-0.03],[0.23,1.10,-0.03],[0.18,1.30,-0.05],[0.12,1.33,-0.08],[0.08,1.45,-0.02],[0.06,1.55,0.02]],
  '足太阳膀胱经': [[0.015,1.57,0.09],[0.022,1.65,0.04],[0.025,1.58,-0.07],[0.032,1.40,-0.095],[0.032,1.20,-0.105],[0.032,0.95,-0.095],[0.064,1.35,-0.09],[0.064,1.10,-0.095],[0.08,0.72,-0.06],[0.10,0.49,-0.04],[0.10,0.26,-0.05],[0.11,0.08,-0.03],[0.12,0.02,0.08]],
  '足少阴肾经': [[0.09,0.01,0.04],[0.08,0.08,-0.01],[0.07,0.28,-0.02],[0.07,0.49,-0.01],[0.06,0.72,0.02],[0.02,0.86,0.085],[0.02,1.02,0.105],[0.04,1.25,0.105],[0.05,1.36,0.08]],
  '手厥阴心包经': [[0.10,1.24,0.095],[0.18,1.32,0.04],[0.22,1.18,0.03],[0.24,1.10,0.03],[0.26,0.96,0.03],[0.28,0.86,0.03],[0.30,0.72,0.02]],
  '手少阳三焦经': [[0.30,0.73,0.0],[0.29,0.86,-0.015],[0.26,0.98,-0.025],[0.24,1.10,-0.025],[0.20,1.28,-0.02],[0.16,1.39,-0.03],[0.07,1.46,-0.02],[0.055,1.56,0.03]],
  '足少阳胆经': [[0.045,1.565,0.075],[0.06,1.58,0.01],[0.045,1.49,-0.045],[0.14,1.38,-0.02],[0.13,1.16,0.02],[0.14,0.92,0.04],[0.155,0.86,-0.01],[0.135,0.68,0.01],[0.125,0.48,0.02],[0.12,0.26,0.01],[0.115,0.08,0.02],[0.11,0.02,0.09]],
  '足厥阴肝经': [[0.08,0.02,0.09],[0.08,0.09,0.04],[0.075,0.28,0.02],[0.075,0.49,0.02],[0.075,0.70,0.04],[0.06,0.86,0.07],[0.09,1.08,0.08],[0.08,1.18,0.095]],
  '督脉': [[0.0,0.85,-0.085],[0.0,0.98,-0.095],[0.0,1.18,-0.105],[0.0,1.41,-0.095],[0.0,1.52,-0.06],[0.0,1.68,0.0],[0.0,1.62,0.085],[0.0,1.515,0.090]],
  '任脉': [[0.0,0.83,0.085],[0.0,0.92,0.098],[0.0,1.00,0.108],[0.0,1.14,0.110],[0.0,1.26,0.110],[0.0,1.38,0.075],[0.0,1.45,0.065],[0.0,1.50,0.085]]
};
function sampleMeridianSpline(merName, idxInMer, totalInMer, code) {
  const pts = MERIDIAN_SPLINES[merName];
  if (!pts || pts.length < 2) return null;
  const num = parseInt(String(code || '').replace(/\\D/g, ''), 10) || (idxInMer + 1);
  let t = idxInMer / Math.max(1, totalInMer - 1);
  if (merName === '足太阳膀胱经') {
    if (num >= 11 && num <= 30) t = 0.20 + ((num - 11) / 19) * 0.25;
    else if (num >= 41 && num <= 54) t = 0.48 + ((num - 41) / 13) * 0.16;
  }
  const scaled = Math.min(pts.length - 1.0001, Math.max(0, t * (pts.length - 1)));
  const i0 = Math.floor(scaled);
  const f = scaled - i0;
  const p0 = pts[i0], p1 = pts[i0 + 1];
  return [+(p0[0]+(p1[0]-p0[0])*f).toFixed(3), +(p0[1]+(p1[1]-p0[1])*f).toFixed(3), +(p0[2]+(p1[2]-p0[2])*f).toFixed(3)];
}
"""
  if 'MERIDIAN_SPLINES' not in ms:
    ms = ms.replace('export function resolveAll361Points(dataset) {', SPLINE_CODE + '\nexport function resolveAll361Points(dataset) {')
    ms = ms.replace(
      'if (mPts.length >= 2) {',
      'const spPos = sampleMeridianSpline(a.meridian, mIdx, merTotals[a.meridian] || 1, a.code);\n    if (spPos) { pos = spPos; } else if (mPts.length >= 2) {'
    )
    open(mer_path, 'w', encoding='utf-8').write(ms)

e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  if 'snapPointsToBodySurface' not in src:
    snap_fn = """
  let _snapTimer = null;
  function snapPointsToBodySurface() {
    if (!state.pointMeshes.length) return;
    const snapTargets = [];
    anatomyGroup.traverse((c) => {
      if (!c.isMesh) return;
      const nm = (c.name || '').toLowerCase();
      if (nm.startsWith('skin__') || nm.startsWith('muscular__')) snapTargets.push(c);
    });
    if (!snapTargets.length) return;
    const sRay = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    state.pointMeshes.forEach((m) => {
      const pt = m.userData.data;
      if (!pt || pt.category === '骨性标志与沟窝' || pt.category === '脏腑中枢') return;
      const p = m.position;
      const axisX = Math.abs(p.x) > 0.19 && p.y < 1.38 ? p.x * 0.92 : (Math.abs(p.x) > 0.06 && p.y < 0.85 ? p.x * 0.85 : 0);
      dir.set(axisX - p.x, 0, -p.z);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
      dir.normalize();
      origin.copy(p).addScaledVector(dir, -0.14);
      sRay.set(origin, dir);
      sRay.near = 0.01;
      sRay.far = 0.28;
      const hits = sRay.intersectObjects(snapTargets, false);
      if (hits.length > 0) {
        m.position.copy(hits[0].point).addScaledVector(dir, -0.0045);
        pt.pos = [+m.position.x.toFixed(3), +m.position.y.toFixed(3), +m.position.z.toFixed(3)];
      }
    });
  }
  function schedulePointSnap() {
    if (_snapTimer) clearTimeout(_snapTimer);
    _snapTimer = setTimeout(snapPointsToBodySurface, 450);
  }
"""
    src = src.replace("function refreshVisiblePoints() {", snap_fn + "\n  function refreshVisiblePoints() {")
    src = src.replace("autoFitAnatomyIfNeeded();", "autoFitAnatomyIfNeeded();\n        schedulePointSnap();")
    src = src.replace("state.pointMeshes.push(m);\n    });", "state.pointMeshes.push(m);\n    });\n    schedulePointSnap();")
    open(e3d_path, 'w', encoding='utf-8').write(src)

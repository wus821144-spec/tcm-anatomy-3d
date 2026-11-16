export function installGlobalErrorGuards(toastEl) {
  window.addEventListener('error', (e) => {
    if (toastEl) toastEl.innerText = '运行提示：' + (e.message || '请刷新重试');
  });
  window.addEventListener('unhandledrejection', () => {
    if (toastEl) toastEl.innerText = '离线数据读取提示：已切换安全模式';
  });
}

export function bindWebGLContextGuards(renderer, toastEl) {
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (toastEl) toastEl.innerText = '渲染上下文暂停，正在恢复...';
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    if (toastEl) toastEl.innerText = '3D 渲染已恢复';
  });
}

export function applyEcoMode(renderer, isEco) {
  renderer.setPixelRatio(isEco ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2.5));
}

export function bindDynamicTouchResolution(controls, renderer, getIsEco) {
  let restoreTimer = null;
  controls.addEventListener('start', () => {
    if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
    renderer.setPixelRatio(1.0);
  });
  controls.addEventListener('end', () => {
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      applyEcoMode(renderer, !!getIsEco());
    }, 160);
  });
}

export function scheduleStaggeredRegionLoads(loadRegionFn) {
  ['region_skin', 'region_thorax', 'region_abdomen_pelvis', 'region_head'].forEach(loadRegionFn);
  ['region_arm_l', 'region_arm_r', 'region_leg_l', 'region_leg_r'].forEach((reg, idx) => {
    setTimeout(() => loadRegionFn(reg), 1100 + idx * 320);
  });
}

export function bindResponsiveResize(camera, renderer) {
  window.addEventListener('resize', () => {
    const h = window.innerHeight - 60;
    camera.aspect = window.innerWidth / h;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, h);
  });
}

export function bindAndroidBackHandler(getState, onCloseDrawer, onEnterOverview) {
  window.addEventListener('popstate', () => {
    const { drawerOpen, hasActiveZone } = getState();
    if (drawerOpen) onCloseDrawer();
    else if (hasActiveZone) onEnterOverview();
  });
}

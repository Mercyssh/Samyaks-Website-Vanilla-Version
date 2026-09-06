/* ============================================================
   renderer.js — shared Three.js stage helper.
   Creates a transparent WebGL renderer sized to a mount element,
   runs a rAF loop ONLY while the mount is on-screen (Intersection-
   Observer), caps DPR, and auto-resizes. Returns handles for a
   scene module to fill.
   ============================================================ */

import * as THREE from "three";

export function createStage(mount, { fov = 35, dprCap = 2 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null; // no WebGL → caller keeps its DOM fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 100);

  const resize = () => {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  let running = false;
  let tick = null;
  const animate = (t) => {
    if (!running) return;
    if (tick) tick(t);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  const play = () => { if (!running) { running = true; requestAnimationFrame(animate); } };
  const pause = () => { running = false; };

  // pause the loop entirely when the section is off-screen
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0 });
  io.observe(mount);

  return { renderer, scene, camera, resize, setTick: (f) => (tick = f), play, pause };
}

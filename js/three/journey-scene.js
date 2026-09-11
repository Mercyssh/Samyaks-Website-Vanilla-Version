/* ============================================================
   journey-scene.js — journey 3D camera travel (assets/models/journey.glb)

   The GLB (recreated from the original Spline scene) carries a BAKED
   camera animation. We SCRUB an AnimationMixer from the first keyframe
   to the last as the pinned, full-viewport section scrolls; the page's
   visual scroll is paused while the animation plays. When the animation
   finishes we HOLD on the final frame for a short scroll distance
   (holdPx) before the pin releases and the page scrolls on.

   Camera → mirrored from the GLB's animated camera every frame (position
            + rotation + FOV), so the authored travel path is reproduced
            exactly. Falls back to auto-fit framing if the GLB has none.
   Canvas → letterboxed to 16:9 by CSS (.journey-scene__stage).

   DEBUG: open with ?debug for a lil-gui (progress scrub, anim/hold length,
   OrbitControls, camera log).
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createStage } from "./renderer.js";

const MODEL_URL = "./assets/models/journey.glb";
const DEBUG = new URLSearchParams(location.search).has("debug");

export function initJourneyScene() {
  const mount = document.querySelector('.scene-mount[data-scene="journey"]');
  if (!mount) return;

  const { gsap, ScrollTrigger, prefersReduced } = window.__app || {};
  const stage = createStage(mount, { fov: 45 });
  if (!stage) return;
  const { scene, camera, renderer } = stage;

  // Fallback lighting for any lit (Standard/Physical) materials the Spline
  // export brought in. Unlit materials simply ignore these.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202024, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 6, 4);
  scene.add(key);

  // scroll layout: the camera travel plays over `animVh` viewport-heights of
  // scroll, then the final frame is HELD over a fixed `holdPx` before release.
  const cfg = { animVh: 1.5, holdPx: 100, target: new THREE.Vector3(0, 0, 0), useGlbCam: true };

  let mixer = null, clipDur = 0;
  let glbCam = null;
  let st = null;
  let orbit = null;

  const syncCamera = () => {
    if (!glbCam) return;
    glbCam.updateWorldMatrix(true, false);
    camera.position.setFromMatrixPosition(glbCam.matrixWorld);
    camera.quaternion.setFromRotationMatrix(glbCam.matrixWorld);
  };

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);

      if (DEBUG) {
        const names = [];
        root.traverse((o) => o.name && names.push(o.name));
        console.log("[journey-scene] nodes:", names, "| clips:", gltf.animations.map((a) => a.name), "| cameras:", gltf.cameras.length);
      }

      // --- baked animation → scrub via mixer (same approach as landing:
      // keep actions playing and drive time by hand with mixer.setTime) ---
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
          clipDur = Math.max(clipDur, clip.duration);
        });
      }

      // --- camera: prefer the authored (animated) GLB camera ---
      glbCam = (gltf.cameras && gltf.cameras[0]) || null;
      if (glbCam) {
        camera.fov = glbCam.fov;
        camera.updateProjectionMatrix();
        syncCamera();
      } else {
        // fallback: frame the whole scene from the front (keep orientation)
        const box = new THREE.Box3().setFromObject(root);
        const c = box.getCenter(new THREE.Vector3());
        const s = box.getSize(new THREE.Vector3());
        const radius = 0.5 * Math.max(s.x, s.y) * 1.4;
        const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        cfg.target.copy(c);
        camera.position.set(c.x, c.y, c.z + dist + s.z);
        camera.lookAt(c);
        console.warn("[journey-scene] no camera in GLB — using fallback framing. Re-export with Include ▸ Cameras.");
      }

      // per-frame: OrbitControls when on (debug), else mirror the animated cam
      stage.setTick(() => {
        if (orbit && orbit.enabled) { orbit.update(); return; }
        if (glbCam && cfg.useGlbCam) syncCamera();
      });

      apply(0);
      stage.play();
      ScrollTrigger && ScrollTrigger.refresh();
      if (DEBUG) setupGUI();
    },
    undefined,
    (err) => console.warn("[journey-scene] GLB failed to load:", err)
  );

  /* ---- apply animation progress 0→1 ---- */
  function apply(animP) {
    animP = THREE.MathUtils.clamp(animP, 0, 1);
    // clamp just under the duration so LoopRepeat never wraps back to frame 0
    if (mixer) mixer.setTime(Math.min(animP, 0.9999) * clipDur);
  }

  // pin length = anim scrub + fixed hold tail; map pinned progress → anim 0→1
  const animPx = () => Math.round(window.innerHeight * cfg.animVh);
  const endPx = () => animPx() + cfg.holdPx;
  const animSplit = () => animPx() / endPx();

  /* ---- pinned scroll scrub (+ hold tail) ---- */
  if (gsap && ScrollTrigger && !prefersReduced) {
    st = ScrollTrigger.create({
      trigger: "#journeyScene",
      start: "top top",
      end: () => "+=" + endPx(),   // function → re-evaluated on every refresh
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress / animSplit()),
    });
  }

  /* ---- DEBUG GUI ---- */
  async function setupGUI() {
    let GUI;
    try {
      ({ default: GUI } = await import("lil-gui"));
    } catch (e) {
      console.error("[journey-scene] lil-gui failed to load:", e);
      return;
    }
    const gui = new GUI({ title: "Journey scene" });
    const state = { progress: 0, scrollDriven: true };

    const anim = gui.addFolder("Animation");
    anim.add(state, "scrollDriven").name("scroll-driven").onChange((on) => { if (st) on ? st.enable() : st.disable(false); });
    anim.add(state, "progress", 0, 1, 0.001).name("scrub progress").onChange((v) => { if (!state.scrollDriven) apply(v); });
    const refreshEnd = () => ScrollTrigger.refresh(); // end is a function of cfg
    anim.add(cfg, "animVh", 0.3, 4, 0.05).name("anim length (vh)").onChange(refreshEnd);
    anim.add(cfg, "holdPx", 0, 600, 10).name("hold length (px)").onChange(refreshEnd);

    const cam = gui.addFolder("Camera");
    cam.add(cfg, "useGlbCam").name("use GLB camera").listen();
    cam.add(camera, "fov", 10, 90, 1).name("fov").onChange(() => camera.updateProjectionMatrix());
    cam.add({ log() {
      const p = camera.position;
      console.log(`camera.position.set(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}); fov ${camera.fov}`);
    } }, "log").name("▶ log camera to console");
    cam.add({ orbit: false }, "orbit").name("OrbitControls").onChange(async (on) => {
      if (on && !orbit) {
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        orbit = new OrbitControls(camera, renderer.domElement);
      }
      if (orbit) { orbit.enabled = on; orbit.target.copy(cfg.target); orbit.update(); }
    });
  }
}

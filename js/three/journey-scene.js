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
// journey GUI on bare ?debug, ?debug=journey, or ?debug=all
const _dbg = new URLSearchParams(location.search).get("debug");
const DEBUG = _dbg === "" || _dbg === "journey" || _dbg === "all";

export function initJourneyScene() {
  const mount = document.querySelector('.scene-mount[data-scene="journey"]');
  if (!mount) return;

  const { gsap, ScrollTrigger, prefersReduced } = window.__app || {};
  const stage = createStage(mount, { fov: 45 });
  if (!stage) return;
  const { scene, camera, renderer } = stage;

  // Every material is UNLIT — there are no lights in this scene. Each mesh's
  // material is swapped to MeshBasicMaterial on load (see makeUnlit below),
  // carrying over its texture/colour/opacity so nothing responds to lighting.

  // scroll layout: the camera travel plays over `animVh` viewport-heights of
  // scroll, then the final frame is HELD over a fixed `holdPx` before release.
  // fog: linear distance fog, colour defaulting to the page bg so far geometry
  // dissolves into the letterbox. near/far are in world units — reseeded from
  // the model's size on load and tunable in the ?debug GUI.
  const cfg = {
    animVh: 1.5, holdPx: 100, target: new THREE.Vector3(0, 0, 0), useGlbCam: true,
    fog: { color: "#0a0a0a", near: 9.96, far: 26.4 }, // baked from ?debug
  };
  scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);

  let mixer = null, clipDur = 0;
  let glbCam = null;
  let st = null;
  let orbit = null;
  let sceneRadius = 10; // model bounding radius → sensible fog defaults + GUI ranges

  const syncCamera = () => {
    if (!glbCam) return;
    glbCam.updateWorldMatrix(true, false);
    camera.position.setFromMatrixPosition(glbCam.matrixWorld);
    camera.quaternion.setFromRotationMatrix(glbCam.matrixWorld);
  };

  // swap every mesh's material for an UNLIT MeshBasicMaterial (no lights in
  // the scene), carrying over texture / colour / opacity / vertex colours.
  const makeUnlit = (root) => root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    o.material = new THREE.MeshBasicMaterial({
      map: src.map || null,
      color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
      transparent: !!src.transparent,
      opacity: src.opacity ?? 1,
      alphaTest: src.alphaTest || 0,
      vertexColors: src.vertexColors || false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  });

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);
      makeUnlit(root);

      // model radius → only used to scale the ?debug fog sliders' ranges;
      // the fog near/far themselves are baked constants in cfg.fog above.
      const sphere = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
      sceneRadius = sphere.radius || 10;

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

  /* ---- DEBUG GUI (fog only) ---- */
  async function setupGUI() {
    let GUI;
    try {
      ({ default: GUI } = await import("lil-gui"));
    } catch (e) {
      console.error("[journey-scene] lil-gui failed to load:", e);
      return;
    }
    const gui = new GUI({ title: "Journey scene" });

    // ranges scaled to the model so the sliders land in a usable window
    const fog = gui.addFolder("Fog");
    fog.addColor(cfg.fog, "color").name("colour").onChange((v) => scene.fog.color.set(v));
    fog.add(cfg.fog, "near", 0, sceneRadius * 3, 0.1).name("near").onChange((v) => (scene.fog.near = v));
    fog.add(cfg.fog, "far", 0, sceneRadius * 6, 0.1).name("far").onChange((v) => (scene.fog.far = v));
  }
}

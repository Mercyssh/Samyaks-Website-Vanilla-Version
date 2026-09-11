/* ============================================================
   journey-scene.mobile.js — MOBILE journey 3D camera travel
   (assets/models/journey-mobile.glb). Separate from the desktop
   scene (js/three/journey-scene.js); only one boots per load.

   Same core idea as desktop: the GLB carries a BAKED camera
   animation which we SCRUB via an AnimationMixer as the pinned
   section scrolls, then HOLD on the final frame for a short tail
   before the pin releases. Fog settings are copied from desktop.

   Mobile-only additions:
   • The canvas fills a 100svh wrapper's top (CSS fades its lower
     edge); an awards carousel occupies the reserved bottom band.
   • The carousel switches Act 1 ⇄ Act 2 with scroll. In a 60-frame
     clip: Act 1 = frames 0–20, Act 2 = frames 20+ (ACT_SPLIT below).
   • Act 2 has two slides and auto-advances while it's the active act.

   ?debug=journeym (or ?debug=all) opens a lil-gui: fog, scroll
   lengths, act scrub, OrbitControls + camera log.
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createStage } from "./renderer.js";

const MODEL_URL = "./assets/models/journey-mobile.glb";
const _dbg = new URLSearchParams(location.search).get("debug");
// on mobile only this scene boots, so accept the plain "journey" key too
const DEBUG = _dbg === "" || _dbg === "journey" || _dbg === "journeym" || _dbg === "all";

// 60-frame clip → normalized progress: Act 1 = 0–20, Act 2 = 20–40, then the
// whole awards container hides from frame 40 on (scene plays out its tail alone).
const ACT_SPLIT = 20 / 60;
const AWARDS_END = 40 / 60;
const ACT2_AUTOPLAY_MS = 3200;   // dwell per Act-2 slide

export function initJourneySceneMobile() {
  const mount = document.querySelector('.scene-mount[data-scene="journey-mobile"]');
  if (!mount) return;

  const { gsap, ScrollTrigger, prefersReduced } = window.__app || {};
  const stage = createStage(mount, { fov: 45 });
  if (!stage) return;
  const { scene, camera, renderer } = stage;

  // Every material is UNLIT — there are no lights in this scene. Each mesh's
  // material is swapped to MeshBasicMaterial on load (see makeUnlit below),
  // carrying over its texture/colour/opacity so nothing responds to lighting.

  // fog copied verbatim from the desktop scene. near/far are WORLD units, so
  // they assume journey-mobile.glb shares the desktop model's scale — see the
  // change notes for the re-tune path if the mobile model differs.
  const cfg = {
    animVh: 2.0, holdPx: 90, useGlbCam: true,
    fog: { color: "#0a0a0a", near: 10, far: 16 },
  };
  scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);

  let mixer = null, clipDur = 0;
  let glbCam = null, st = null, orbit = null;
  let sceneRadius = 10;

  // --- awards carousel wiring ---
  const awardsEl = document.getElementById("journeyMAwards");
  const carousels = [...document.querySelectorAll("#journeyMAwards .journey-m__carousel")];
  const carouselFor = (act) => carousels.find((c) => c.dataset.act === String(act));
  let currentAct = 1;
  let act2Timer = null;

  function setAct(act) {
    if (act === currentAct) return;
    currentAct = act;
    carousels.forEach((c) => c.classList.toggle("is-active", c.dataset.act === String(act)));
    act === 2 ? startAct2Autoplay() : stopAct2Autoplay();
  }

  // auto-advance Act 2's two slides while it's the active act
  function startAct2Autoplay() {
    stopAct2Autoplay();
    const track = carouselFor(2)?.querySelector(".journey-m__track");
    if (!track || prefersReduced) return;
    const slides = [...track.children];
    if (slides.length < 2) return;
    let i = Math.round(track.scrollLeft / (track.clientWidth || 1)) || 0;
    track.addEventListener("scroll", () => (i = Math.round(track.scrollLeft / (track.clientWidth || 1))), { passive: true });
    act2Timer = setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % slides.length;
      track.scrollTo({ left: i * (track.clientWidth || 1), behavior: "smooth" });
    }, ACT2_AUTOPLAY_MS);
  }
  function stopAct2Autoplay() { if (act2Timer) { clearInterval(act2Timer); act2Timer = null; } }

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

  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);
      makeUnlit(root);

      sceneRadius = new THREE.Box3().setFromObject(root)
        .getBoundingSphere(new THREE.Sphere()).radius || 10;

      if (DEBUG) {
        const names = [];
        root.traverse((o) => o.name && names.push(o.name));
        console.log("[journey-mobile] nodes:", names,
          "| clips:", gltf.animations.map((a) => a.name),
          "| cameras:", gltf.cameras.length);
      }

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
          clipDur = Math.max(clipDur, clip.duration);
        });
      }

      glbCam = (gltf.cameras && gltf.cameras[0]) || null;
      if (glbCam) {
        camera.fov = glbCam.fov;
        camera.updateProjectionMatrix();
        syncCamera();
      } else {
        // fallback framing (no camera in GLB — re-export with Include ▸ Cameras)
        const box = new THREE.Box3().setFromObject(root);
        const c = box.getCenter(new THREE.Vector3());
        const s = box.getSize(new THREE.Vector3());
        const radius = 0.5 * Math.max(s.x, s.y) * 1.4;
        const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        camera.position.set(c.x, c.y, c.z + dist + s.z);
        camera.lookAt(c);
        console.warn("[journey-mobile] no camera in GLB — using fallback framing.");
      }

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
    (err) => console.warn("[journey-mobile] GLB failed to load:", err)
  );

  /* ---- apply animation progress 0→1 (+ switch the active award act) ---- */
  function apply(animP) {
    animP = THREE.MathUtils.clamp(animP, 0, 1);
    if (mixer) mixer.setTime(Math.min(animP, 0.9999) * clipDur);
    // frame band → active act; the whole awards container hides past AWARDS_END
    const hidden = animP >= AWARDS_END;
    awardsEl && awardsEl.classList.toggle("is-hidden", hidden);
    setAct(hidden ? 0 : animP < ACT_SPLIT ? 1 : 2);
  }

  // pin length = anim scrub + fixed hold tail; map pinned progress → anim 0→1
  const animPx = () => Math.round(window.innerHeight * cfg.animVh);
  const endPx = () => animPx() + cfg.holdPx;
  const animSplit = () => animPx() / endPx();

  /* ---- pinned scroll scrub (+ hold tail) ---- */
  if (gsap && ScrollTrigger && !prefersReduced) {
    st = ScrollTrigger.create({
      trigger: "#journeyMobile",
      start: "top top",
      end: () => "+=" + endPx(),
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
    try { ({ default: GUI } = await import("lil-gui")); }
    catch (e) { console.error("[journey-mobile] lil-gui failed:", e); return; }
    const gui = new GUI({ title: "Journey (mobile)" });

    const s = gui.addFolder("Scroll");
    const refresh = () => ScrollTrigger.refresh();
    s.add(cfg, "animVh", 0.5, 4, 0.05).name("anim (vh)").onChange(refresh);
    s.add(cfg, "holdPx", 0, 400, 5).name("hold (px)").onChange(refresh);
    s.add({ p: 0 }, "p", 0, 1, 0.001).name("scrub anim").onChange(apply);

    const fog = gui.addFolder("Fog");
    fog.addColor(cfg.fog, "color").name("colour").onChange((v) => scene.fog.color.set(v));
    fog.add(cfg.fog, "near", 0, sceneRadius * 3, 0.1).name("near").onChange((v) => (scene.fog.near = v));
    fog.add(cfg.fog, "far", 0, sceneRadius * 6, 0.1).name("far").onChange((v) => (scene.fog.far = v));

    const cam = gui.addFolder("Camera");
    cam.add({ orbit: false }, "orbit").name("OrbitControls").onChange(async (on) => {
      if (on && !orbit) {
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        orbit = new OrbitControls(camera, renderer.domElement);
      }
      if (orbit) orbit.enabled = on;
    });
    cam.add({ log: () => {
      const p = camera.position, t = orbit ? orbit.target : { x: 0, y: 0, z: 0 };
      const r = (n) => +n.toFixed(3);
      console.log(`cam pos:[${r(p.x)},${r(p.y)},${r(p.z)}] target:[${r(t.x)},${r(t.y)},${r(t.z)}] fov:${camera.fov}`);
    } }, "log").name("▶ log camera");
  }
}

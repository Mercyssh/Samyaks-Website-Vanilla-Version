/* ============================================================
   landing-scene.mobile.js — MOBILE landing 3D scene
   (assets/models/landing-mobile.glb). Separate from the desktop
   scene (js/three/landing-scene.js); only one boots per load.

   Two clip groups, driven independently on ONE AnimationMixer:

   • SCROLL clips (handAction, EmptyAction, Empty.001/002Action,
     Plane/Plane.001Action) — scrubbed 0→1 by the pinned section
     scroll, exactly like the desktop scene. A short hold tail keeps
     them at the final frame while the pin is still active.

   • SHUFFLE clips ("1st/2nd/3rd card shuffle", 90 frames = 1.5s,
     keyframes at 0·30·60·90 → 0·0.5·1.0·1.5s; frame 90 == frame 0)
     — NOT scroll-driven. They unlock ONLY once the scroll clips have
     finished (progress == 1). Then each TAP on the hero advances all
     three together by one 30-frame segment (0→0.5→1.0→1.5, wrapping).
     Scrolling back up scrubs them to 0 and re-locks tapping.

   Catch: "2nd/3rd card shuffle" animate the SAME nodes as the scroll
   clips Empty.001/002Action. Both can't drive a node at once, so we
   zero those scroll actions' weight while shuffle owns the nodes, and
   restore it on scroll-up. (The scroll end-pose == shuffle frame 0, so
   the hand-off is seamless.)

   Camera + hand material come from / match the desktop scene: we mirror
   the authored GLB camera, and the hand uses the shared fresnel material
   (js/three/hand-material.js) and fades out as the scroll intro plays.
   ?debug=landingm opens a GUI (orbit, camera log, scroll lengths).
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createStage } from "./renderer.js";
import { buildHandMaterial } from "./hand-material.js";

const MODEL_URL = "./assets/models/landing-mobile.glb";
const _dbg = new URLSearchParams(location.search).get("debug");
const DEBUG = _dbg === "landingm" || _dbg === "all";

const SEG = 0.5;          // one 30-frame segment @ 60fps
const SHUFFLE_STEP_DUR = 0.55; // seconds a single tap-advance takes

export function initLandingSceneMobile() {
  const mount = document.querySelector('.scene-mount[data-scene="landing"]');
  if (!mount) return;

  const { gsap, ScrollTrigger, prefersReduced } = window.__app || {};
  const stage = createStage(mount, { fov: 40 });
  if (!stage) return;
  const { scene, camera, renderer } = stage;

  // fallback lighting (unlit materials ignore it)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202024, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(2, 4, 3);
  scene.add(key);

  // scroll layout + a baked camera (filled by the ?debug log button).
  const cfg = {
    animVh: 0.6, holdVh: 0.4,
    fit: 1.12, offsetY: 0,             // auto-fit tuning (ignored once cam is baked)
    cam: null,                         // { pos:[x,y,z], target:[x,y,z], fov } to bake
  };

  const hint = document.querySelector("#landing .landing__taphint");
  const overlayEls = [
    ...document.querySelectorAll("#landing .press"),
    document.querySelector("#landing .landing__tagline"),
    document.querySelector("#landing .landing__social"),
  ].filter(Boolean);
  let overlayHooked = false;

  let mixer = null;
  let scrollActions = [], shuffleActions = [], conflictScroll = [];
  let scrollDur = 0;
  let orbit = null, st = null;
  let hand = null, handKit = null, glbCam = null;

  // mirror the authored GLB camera (position + orientation) onto our camera
  const syncCamera = () => {
    if (!glbCam) return;
    glbCam.updateWorldMatrix(true, false);
    camera.position.setFromMatrixPosition(glbCam.matrixWorld);
    camera.quaternion.setFromRotationMatrix(glbCam.matrixWorld);
  };

  // hand fades out as the scroll intro plays (same curve as the desktop scene)
  function applyHand() {
    if (!handKit) return;
    const fade = Math.max(0, 1 - scrollP / 0.6);
    handKit.setFade(fade);
    if (hand) hand.visible = fade > 0.02;
  }

  // ---- state ----
  let scrollP = 0;          // 0→1 scroll progress
  let complete = false;     // scroll finished → tapping unlocked
  let shuffleTime = 0;      // 0→1.5 along the shuffle clips
  let seg = 0;              // segments already played (0..3)
  let stepping = false;     // a tap-advance tween is running
  let resetTween = null, stepTween = null;

  const clampT = (t, a) => Math.min(Math.max(t, 0), a.getClip().duration - 1e-4);

  /* push current scroll/shuffle times into the mixer + render one pose */
  function applyMixer() {
    if (!mixer) return;
    for (const a of scrollActions) a.time = clampT(scrollP * scrollDur, a);
    for (const a of shuffleActions) a.time = clampT(shuffleTime, a);
    mixer.update(0);
  }

  /* weight hand-off: who owns the shared Slide-Control nodes */
  function setShuffleOwns(on) {
    conflictScroll.forEach((a) => a.setEffectiveWeight(on ? 0 : 1));
    shuffleActions.forEach((a) => a.setEffectiveWeight(on ? 1 : 0));
  }

  /* ---- DOM overlay fade in lockstep with the scroll scrub (as desktop) ---- */
  function fadeOverlays() {
    if (scrollP <= 0) return;
    if (!overlayHooked) {
      overlayHooked = true;
      overlayEls.forEach((el) => (el.style.transition = "none"));
    }
    const k = Math.max(0, 1 - scrollP / 0.5);
    overlayEls.forEach((el) => (el.style.opacity = k));
  }

  /* ---- enter / leave the "cards fanned, tap to shuffle" state ---- */
  function enterComplete() {
    if (complete) return;
    complete = true;
    resetTween && resetTween.kill();
    seg = 0; shuffleTime = 0;
    setShuffleOwns(true);       // shuffle takes the shared nodes (at frame 0 == scroll end)
    applyMixer();
    if (hint) hint.classList.add("is-on");
  }
  function leaveComplete() {
    if (!complete) return;
    complete = false;
    if (hint) hint.classList.remove("is-on");
    stepTween && stepTween.kill();
    stepping = false;
    // scrub the shuffle back to zero, then hand the shared nodes back to scroll
    const done = () => { seg = 0; shuffleTime = 0; setShuffleOwns(false); applyMixer(); };
    if (gsap && shuffleTime > 0.001) {
      const p = { t: shuffleTime };
      resetTween = gsap.to(p, {
        t: 0, duration: 0.3, ease: "power2.out",
        onUpdate: () => { shuffleTime = p.t; applyMixer(); },
        onComplete: done,
      });
    } else done();
  }

  /* ---- a tap: advance all three shuffle clips one segment ---- */
  function tapAdvance() {
    if (!complete || stepping || !gsap) return;
    stepping = true;
    const from = shuffleTime;
    const to = (seg + 1) * SEG;     // 0.5 / 1.0 / 1.5
    const p = { t: from };
    stepTween = gsap.to(p, {
      t: to, duration: SHUFFLE_STEP_DUR, ease: "power2.inOut",
      onUpdate: () => { shuffleTime = p.t; applyMixer(); },
      onComplete: () => {
        seg += 1;
        if (seg >= 3) { seg = 0; shuffleTime = 0; applyMixer(); } // 90 == 0 → silent wrap
        stepping = false;
      },
    });
  }

  /* ---- fit the (camera-less) scene into the portrait viewport ---- */
  function frame(root) {
    if (cfg.cam) {                                   // baked camera wins
      camera.position.fromArray(cfg.cam.pos);
      camera.fov = cfg.cam.fov; camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3().fromArray(cfg.cam.target));
      return;
    }
    const sph = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
    const c = sph.center, r = sph.radius * cfg.fit;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = r / Math.sin(Math.min(vfov, hfov) / 2);
    camera.position.set(c.x, c.y + cfg.offsetY, c.z + dist);
    camera.lookAt(c.x, c.y + cfg.offsetY, c.z);
    cfg._target = [c.x, c.y + cfg.offsetY, c.z];
  }

  /* ---- load ---- */
  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);

      mixer = new THREE.AnimationMixer(root);
      const isShuffle = (name) => /shuffle/i.test(name);
      // node names a clip touches (from its track names "node.property")
      const nodesOf = (clip) => new Set(clip.tracks.map((t) => t.name.split(".").slice(0, -1).join(".")));
      const shuffleNodes = new Set();
      gltf.animations.forEach((c) => { if (isShuffle(c.name)) nodesOf(c).forEach((n) => shuffleNodes.add(n)); });

      gltf.animations.forEach((clip) => {
        const a = mixer.clipAction(clip);
        a.play();
        if (isShuffle(clip.name)) {
          a.setEffectiveWeight(0);      // locked until scroll completes
          shuffleActions.push(a);
        } else {
          scrollActions.push(a);
          scrollDur = Math.max(scrollDur, clip.duration);
          // conflicting if it shares any node with a shuffle clip
          if ([...nodesOf(clip)].some((n) => shuffleNodes.has(n))) conflictScroll.push(a);
        }
      });
      if (DEBUG) console.log("[landing-mobile] scroll:", scrollActions.length,
        "shuffle:", shuffleActions.length, "conflict:", conflictScroll.length);

      // hand: bespoke fresnel material stack (copied from the desktop scene)
      hand = root.getObjectByName("hand");
      if (hand) handKit = buildHandMaterial(hand);

      // camera: use the authored GLB camera (fov + transform)
      glbCam = (gltf.cameras && gltf.cameras[0]) || null;
      if (glbCam) {
        camera.fov = glbCam.fov;
        camera.updateProjectionMatrix();
        syncCamera();
        // one tick: OrbitControls when debugging, else mirror the GLB camera
        stage.setTick(() => { if (orbit && orbit.enabled) orbit.update(); else syncCamera(); });
      } else {
        frame(root);   // fallback: auto-fit (no camera in GLB)
      }

      document.querySelector("#landing .landing__center")?.style.setProperty("display", "none");
      applyMixer();
      applyHand();
      stage.play();
      ScrollTrigger && ScrollTrigger.refresh();
      if (DEBUG) setupGUI();
    },
    undefined,
    (err) => console.warn("[landing-mobile] GLB failed to load:", err)
  );

  /* ---- pinned scroll scrub (+ hold tail) ---- */
  const animSplit = () => cfg.animVh / (cfg.animVh + cfg.holdVh);
  const endPx = () => Math.round(window.innerHeight * (cfg.animVh + cfg.holdVh));

  function onProgress(p) {
    scrollP = THREE.MathUtils.clamp(p / animSplit(), 0, 1);
    applyMixer();
    applyHand();
    fadeOverlays();
    // hysteresis so jitter at the boundary doesn't flip-flop
    if (!complete && scrollP >= 0.999) enterComplete();
    else if (complete && scrollP < 0.985) leaveComplete();
  }

  if (gsap && ScrollTrigger && !prefersReduced) {
    st = ScrollTrigger.create({
      trigger: "#landing",
      start: "top top",
      end: () => "+=" + endPx(),
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      refreshPriority: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => onProgress(self.progress),
    });
  }

  /* ---- tap on the hero → advance the shuffle (only once unlocked) ---- */
  // canvas stays pointer-events:none so touch-scroll still drives the scrub;
  // we detect a tap on the section itself (short, low-movement pointer).
  const section = document.getElementById("landing");
  if (section) {
    let sx = 0, sy = 0, st0 = 0, moved = false;
    section.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; st0 = performance.now(); moved = false; }, { passive: true });
    section.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) moved = true; }, { passive: true });
    section.addEventListener("pointerup", (e) => {
      if (moved || performance.now() - st0 > 500) return;      // a drag/scroll, not a tap
      if (e.target.closest("a, button")) return;                // let links/nav work
      tapAdvance();
    });
  }

  /* ---- DEBUG GUI ---- */
  async function setupGUI() {
    let GUI; try { ({ default: GUI } = await import("lil-gui")); } catch { return; }
    const gui = new GUI({ title: "Landing (mobile)" });
    const a = gui.addFolder("Scroll");
    const refresh = () => ScrollTrigger.refresh();
    a.add(cfg, "animVh", 0.2, 3, 0.05).name("anim (vh)").onChange(refresh);
    a.add(cfg, "holdVh", 0, 2, 0.05).name("hold (vh)").onChange(refresh);
    a.add({ tap: () => tapAdvance() }, "tap").name("▶ tap (shuffle step)");
    const cam = gui.addFolder("Camera");
    cam.add(camera, "fov", 10, 90, 1).name("fov").onChange(() => camera.updateProjectionMatrix());
    cam.add({ orbit: false }, "orbit").name("OrbitControls").onChange(async (on) => {
      if (on && !orbit) {
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        orbit = new OrbitControls(camera, renderer.domElement);
        // the main tick already switches sync ↔ orbit; don't override it here
      }
      if (orbit) { orbit.enabled = on; if (cfg._target) orbit.target.fromArray(cfg._target); orbit.update(); }
    });
    cam.add({ log: () => {
      const p = camera.position, t = orbit ? orbit.target : { x: cfg._target?.[0] || 0, y: cfg._target?.[1] || 0, z: cfg._target?.[2] || 0 };
      const r = (n) => +n.toFixed(3);
      console.log(`cfg.cam = { pos:[${r(p.x)},${r(p.y)},${r(p.z)}], target:[${r(t.x)},${r(t.y)},${r(t.z)}], fov:${camera.fov} };`);
    } }, "log").name("▶ log camera (to bake)");
  }
}

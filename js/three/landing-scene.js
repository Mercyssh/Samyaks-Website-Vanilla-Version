/* ============================================================
   landing-scene.js — landing 3D device (assets/models/landing.glb)

   The GLB carries BAKED Blender animation clips (hand + the card
   "Control" empties). We drive them by SCRUBBING an AnimationMixer
   from the first keyframe to the last as the pinned section scrolls,
   then HOLD on the final frame for extra scroll before releasing.

   Mesh motion  → baked animation (Blender).
   Material     → done here in code (hand gradient/fresnel/opacity fade,
                  card opacity fix, cover backface reveal, icon fades).
   Camera       → if the GLB contains a camera, we mirror its transform
                  + FOV onto the render camera every frame (supports an
                  animated camera too). Otherwise we fall back to an
                  auto-fit framing. NOTE: the current GLB export has NO
                  camera — re-export from Blender with Include ▸ Cameras.

   DEBUG: open with ?debug for a lil-gui (progress scrub, hold length,
   OrbitControls, hand-material knobs, copy-all-values button).
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createStage } from "./renderer.js";
import { buildHandMaterial } from "./hand-material.js";

const MODEL_URL = "./assets/models/landing.glb";
const DEBUG = new URLSearchParams(location.search).has("debug");

// TODO(copy): real destinations + confirm which plane is which
const LINKS = { linkedin: "#", mail: "mailto:hello@samyakchakrabarty.com" };

export function initLandingScene() {
  const mount = document.querySelector('.scene-mount[data-scene="landing"]');
  if (!mount) return;

  const { gsap, ScrollTrigger, prefersReduced } = window.__app || {};
  const stage = createStage(mount, { fov: 32 });
  if (!stage) return;
  const { scene, camera, renderer } = stage;

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2, 3, 4);
  scene.add(key);

  // scroll layout (viewport-height multiples): animation plays over animVh,
  // then the final frame is HELD over holdVh before the pin releases.
  const cfg = { animVh: 1.1, holdVh: 0.7, target: new THREE.Vector3(0, 0, 0), useGlbCam: true };

  const cards = {};
  let hand = null, handKit = null, coverMat = null;
  let mixer = null, clipDur = 0;
  let glbCam = null;
  const icons = [];
  let iconFade = 1;
  let st = null;
  let orbit = null;

  const applyIconOpacity = () => {
    icons.forEach((ic) => { if (ic.mat) { ic.mat.opacity = (ic.hover ? 1 : 0.5) * iconFade; ic.obj.visible = iconFade > 0.02; } });
  };

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

      // --- resilient lookup by name substring (GLB names have spaces) ---
      const byName = {};
      root.traverse((o) => { if (o.name) byName[o.name.toLowerCase()] = o; });
      if (DEBUG) console.log("[landing-scene] node names:", Object.keys(byName), "| clips:", gltf.animations.map((a) => a.name));
      const find = (...subs) => {
        for (const k in byName) if (subs.some((s) => k.includes(s))) return byName[k];
        return null;
      };
      cards.cover = find("cover");
      cards.left = find("left card", "left");
      cards.middle = find("middle");
      cards.right = find("right card", "right");
      hand = find("hand");

      // --- baked animation → scrub via mixer ---
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        gltf.animations.forEach((clip) => {
          // Keep every action permanently active and scrub it by hand with
          // mixer.setTime(). Do NOT use LoopOnce/clampWhenFinished — those
          // fire "finished" at the end, pause the action (timescale→0) and
          // freeze the pose so setTime can no longer move it (breaks reverse
          // + replay). Default LoopRepeat is fine because we clamp the time
          // to just under the duration, so it never wraps to 0.
          mixer.clipAction(clip).play();
          clipDur = Math.max(clipDur, clip.duration);
        });
      }

      // All meshes share ONE "Card Material" (alphaMode BLEND + doubleSided).
      // That shared transparency makes the stacked cards sort wrong at the
      // flip extreme (back card bleeds through). → give each its own OPAQUE
      // clone so the depth buffer occludes them at any angle.
      const makeCardOpaque = (node, { front = false } = {}) => {
        node && node.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          o.material = o.material.clone();
          o.material.transparent = false;
          o.material.depthWrite = true;
          o.material.side = front ? THREE.FrontSide : THREE.DoubleSide;
        });
      };
      // cover: FrontSide → its back is culled once flipped, revealing the pillars
      makeCardOpaque(cards.cover, { front: true });
      cards.cover && cards.cover.traverse((o) => { if (o.isMesh) coverMat = o.material; });
      makeCardOpaque(cards.left);
      makeCardOpaque(cards.middle);
      makeCardOpaque(cards.right);

      // hand: bespoke material stack (gradient + fresnel + 50% opacity)
      if (hand) handKit = buildHandMaterial(hand);

      // icons (the two planes): upper = LinkedIn, lower = Mail  [TODO(copy)]
      const planes = Object.keys(byName).filter((k) => k.includes("plane")).map((k) => byName[k]);
      planes.sort((a, b) => b.position.y - a.position.y); // upper first
      const urls = [LINKS.linkedin, LINKS.mail];
      planes.forEach((obj, i) => {
        const entry = { obj, mat: null, url: urls[i] || "#", hover: false };
        obj.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; entry.mat = o.material; o.userData.icon = entry; } });
        icons.push(entry);
      });
      applyIconOpacity();

      // --- camera: use the authored GLB camera if present ---
      glbCam = (gltf.cameras && gltf.cameras[0]) || null;
      if (glbCam) {
        camera.fov = glbCam.fov;      // vertical FOV from Blender lens (e.g. 25mm)
        camera.updateProjectionMatrix();
        syncCamera();
      } else {
        // fallback: auto-fit the whole scene (no auto look-at → keep orientation)
        const full = new THREE.Box3().setFromObject(root);
        const fc = full.getCenter(new THREE.Vector3());
        const fs = full.getSize(new THREE.Vector3());
        const radius = 0.5 * Math.max(fs.x, fs.y) * 1.35;
        const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        cfg.target.copy(fc);
        camera.position.set(fc.x, fc.y, fc.z + dist);
        console.warn("[landing-scene] no camera in GLB — using fallback framing. Re-export with Include ▸ Cameras.");
      }

      // one tick: OrbitControls when on, else mirror the (maybe animated) GLB camera
      stage.setTick(() => {
        if (orbit && orbit.enabled) { orbit.update(); return; }
        if (glbCam && cfg.useGlbCam) syncCamera();
      });

      document.querySelector(".landing__center")?.style.setProperty("display", "none");
      mount.style.pointerEvents = "auto";
      apply(0);
      stage.play();
      ScrollTrigger && ScrollTrigger.refresh();
      if (DEBUG) setupGUI();
    },
    undefined,
    (err) => console.warn("[landing-scene] GLB failed to load:", err)
  );

  /* ---- apply animation progress 0→1 (clips + code-driven materials) ---- */
  function apply(animP) {
    animP = THREE.MathUtils.clamp(animP, 0, 1);
    // clamp just under the duration so LoopRepeat never wraps back to frame 0
    if (mixer) mixer.setTime(Math.min(animP, 0.9999) * clipDur);
    const fade = Math.max(0, 1 - animP / 0.6);
    if (handKit) handKit.setFade(fade);
    if (hand) hand.visible = fade > 0.02;
    iconFade = Math.max(0, 1 - animP / 0.5);
    applyIconOpacity();
  }

  // map the pinned scroll (which includes the hold tail) → animation progress
  const animSplit = () => cfg.animVh / (cfg.animVh + cfg.holdVh);
  const endPx = () => Math.round(window.innerHeight * (cfg.animVh + cfg.holdVh));

  /* ---- icon hover + click ---- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(icons.map((i) => i.obj), true);
    return hits[0] ? hits[0].object.userData.icon : null;
  };
  renderer.domElement.addEventListener("pointermove", (ev) => {
    if (orbit && orbit.enabled) return;
    const hit = iconFade > 0.1 ? pick(ev) : null;
    let changed = false;
    icons.forEach((ic) => { const h = ic === hit; if (h !== ic.hover) { ic.hover = h; changed = true; } });
    if (changed) applyIconOpacity();
    renderer.domElement.style.cursor = hit ? "pointer" : "";
  });
  renderer.domElement.addEventListener("click", (ev) => {
    if (iconFade <= 0.1 || (orbit && orbit.enabled)) return;
    const ic = pick(ev);
    if (!ic || !ic.url || ic.url === "#") return;
    if (ic.url.startsWith("mailto:")) window.location.href = ic.url;
    else window.open(ic.url, "_blank", "noopener");
  });

  /* ---- pinned scroll scrub (+ hold tail) ---- */
  if (gsap && ScrollTrigger && !prefersReduced) {
    st = ScrollTrigger.create({
      trigger: "#landing",
      start: "top top",
      end: () => "+=" + endPx(),   // function → re-evaluated on every refresh
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      refreshPriority: 1,          // topmost pin → refresh FIRST so its spacer
                                   // is restored before wibPin measures its start
                                   // (else wib pins 1458px early, over the landing)
      invalidateOnRefresh: true,   // recompute length once innerHeight is known
      onUpdate: (self) => apply(self.progress / animSplit()),
    });
  }

  /* ---- DEBUG GUI ---- */
  async function setupGUI() {
    let GUI;
    try {
      ({ default: GUI } = await import("lil-gui"));
    } catch (e) {
      console.error("[landing-scene] lil-gui failed to load — check vendor/lil-gui.esm.min.js + import map:", e);
      return;
    }
    const gui = new GUI({ title: "Landing scene" });
    const state = { progress: 0, scrollDriven: true };

    // ---- copy ALL current values to clipboard (paste back to bake) ----
    gui.add({ copy() {
      const r = (n, d = 3) => Number(n.toFixed(d));
      const hex = (c) => "#" + c.getHexString();
      const u = handKit && handKit.uniforms;
      const dump = {
        camera: {
          position: [r(camera.position.x), r(camera.position.y), r(camera.position.z)],
          fov: camera.fov,
          fromGlb: !!glbCam,
        },
        scroll: { animVh: cfg.animVh, holdVh: cfg.holdVh },
        hand: handKit ? {
          colorBottom: hex(u.uColorBottom.value),
          colorTop: hex(u.uColorTop.value),
          opacity: r(u.uOpacity.value),
          ambient: r(u.uAmbient.value),
          lightStrength: r(u.uLightStrength.value),
          fresnelColor: hex(u.uFresnelColor.value),
          fresnelPower: r(u.uFresnelPower.value),
          fresnelStrength: r(u.uFresnelStrength.value),
          fresnelAlpha: r(u.uFresnelAlpha.value),
        } : null,
      };
      const text = JSON.stringify(dump, null, 2);
      const done = () => console.log("[landing-scene] copied values:\n" + text);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => { done(); prompt("Copy failed — copy manually:", text); });
      } else { done(); prompt("Copy these values:", text); }
    } }, "copy").name("⧉ COPY ALL VALUES");

    // ---- Animation / scroll ----
    const anim = gui.addFolder("Animation");
    anim.add(state, "scrollDriven").name("scroll-driven").onChange((on) => { if (st) on ? st.enable() : st.disable(false); });
    anim.add(state, "progress", 0, 1, 0.001).name("scrub progress").onChange((v) => { if (!state.scrollDriven) apply(v); });
    const refreshEnd = () => ScrollTrigger.refresh(); // end is a function of cfg → recomputes on refresh
    anim.add(cfg, "animVh", 0.3, 3, 0.05).name("anim length (vh)").onChange(refreshEnd);
    anim.add(cfg, "holdVh", 0, 3, 0.05).name("hold length (vh)").onChange(refreshEnd);
    if (coverMat) anim.add(coverMat, "side", { Front: THREE.FrontSide, Back: THREE.BackSide, Double: THREE.DoubleSide }).name("cover side").onChange(() => (coverMat.needsUpdate = true));

    // ---- Camera ----
    const cam = gui.addFolder("Camera");
    cam.add(cfg, "useGlbCam").name("use GLB camera").listen();
    cam.add(camera.position, "x", -20, 20, 0.01).name("pos x").listen();
    cam.add(camera.position, "y", -20, 20, 0.01).name("pos y").listen();
    cam.add(camera.position, "z", -20, 20, 0.01).name("pos z").listen();
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

    // ---- Hand material stack ----
    if (handKit) {
      const { cfg: h, uniforms: u } = handKit;
      const hf = gui.addFolder("Hand material");
      hf.addColor(h, "colorTop").name("colour top").onChange((v) => u.uColorTop.value.set(v));
      hf.addColor(h, "colorBottom").name("colour bottom").onChange((v) => u.uColorBottom.value.set(v));
      hf.add(u.uOpacity, "value", 0, 1, 0.01).name("surface opacity");
      hf.add(u.uAmbient, "value", 0, 2, 0.01).name("ambient");
      hf.add(u.uLightStrength, "value", 0, 2, 0.01).name("lighting");
      const ff = hf.addFolder("Fresnel");
      ff.addColor(h, "fresnelColor").name("colour").onChange((v) => u.uFresnelColor.value.set(v));
      ff.add(u.uFresnelPower, "value", 0.1, 8, 0.1).name("power");
      ff.add(u.uFresnelStrength, "value", 0, 2, 0.01).name("rim colour");
      ff.add(u.uFresnelAlpha, "value", 0, 1, 0.01).name("rim alpha");
    }
  }
}

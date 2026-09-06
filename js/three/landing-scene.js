/* ============================================================
   landing-scene.js — landing 3D device (assets/models/landing.glb)

   PINNED scroll scrub (progress 0→1):
   - hand recedes (−Z) + fades out
   - card stack flips 180° about Y (cover card backface-culled → hidden
     once flipped; the three pillar cards come to face the camera)
   - left card fans left, right card fans right
   - icon planes (LinkedIn / Mail) hover-lit + clickable
   No pointer parallax.

   DEBUG: open the page with ?debug to get an on-screen GUI (lil-gui):
   camera position/target/fov, a progress slider (detach from scroll to
   scrub by hand), OrbitControls toggle, animation-tuning knobs, and a
   "log camera" button so chosen values can be baked in.
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

  // tunable animation params (editable via GUI)
  const cfg = { flipDeg: 180, fanSpread: 1.3, handRecede: 1.6, target: new THREE.Vector3(0, 0, 0) };

  const cards = {};
  const base = {};
  let pivot = null;
  let hand = null, handKit = null, handBaseZ = 0, coverMat = null;
  const icons = [];
  let iconFade = 1;
  let st = null;
  let orbit = null;

  const applyIconOpacity = () => {
    icons.forEach((ic) => { if (ic.mat) { ic.mat.opacity = (ic.hover ? 1 : 0.5) * iconFade; ic.obj.visible = iconFade > 0.02; } });
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
      if (DEBUG) console.log("[landing-scene] node names:", Object.keys(byName));
      const find = (...subs) => {
        for (const k in byName) if (subs.some((s) => k.includes(s))) return byName[k];
        return null;
      };
      cards.cover = find("cover");
      cards.left = find("left");
      cards.middle = find("middle");
      cards.right = find("right");
      hand = find("hand");

      // --- recentre on the cards, then build a flip pivot at world origin ---
      const cardsBox = new THREE.Box3();
      ["cover", "left", "middle", "right"].forEach((k) => cards[k] && cardsBox.expandByObject(cards[k]));
      const cc = cardsBox.getCenter(new THREE.Vector3());
      root.position.sub(cc);
      root.updateMatrixWorld(true);

      pivot = new THREE.Group();
      scene.add(pivot);
      pivot.updateMatrixWorld(true);
      ["cover", "left", "middle", "right"].forEach((k) => cards[k] && pivot.attach(cards[k]));
      ["cover", "left", "middle", "right"].forEach((k) => cards[k] && (base[k] = cards[k].position.clone()));

      // All meshes in the GLB share ONE "Card Material" (alphaMode BLEND +
      // doubleSided). That shared transparency is what makes the stacked
      // cards sort wrong at the flip extreme (back card bleeds to front).
      // → give each card its OWN opaque clone so the depth buffer occludes
      //   them correctly regardless of viewing angle.
      const makeCardOpaque = (node, { front = false } = {}) => {
        node && node.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          o.material = o.material.clone();
          o.material.transparent = false;
          o.material.depthWrite = true;
          o.material.side = front ? THREE.FrontSide : THREE.DoubleSide;
        });
      };
      // cover: FrontSide so its back is culled → reveals pillar cards once flipped
      makeCardOpaque(cards.cover, { front: true });
      cards.cover && cards.cover.traverse((o) => { if (o.isMesh) coverMat = o.material; });
      makeCardOpaque(cards.left);
      makeCardOpaque(cards.middle);
      makeCardOpaque(cards.right);

      // hand: bespoke material stack (gradient + fresnel + 50% opacity)
      if (hand) {
        handBaseZ = hand.position.z;
        handKit = buildHandMaterial(hand);
      }

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

      // --- default camera framing (fit whole scene; user tunes via GUI) ---
      const full = new THREE.Box3().setFromObject(root);
      const fc = full.getCenter(new THREE.Vector3());
      const fs = full.getSize(new THREE.Vector3());
      const radius = 0.5 * Math.max(fs.x, fs.y) * 1.35;
      const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      cfg.target.copy(fc);
      camera.position.set(fc.x, fc.y, fc.z + dist);
      // no auto look-at — camera keeps its own orientation

      document.querySelector(".landing__center")?.style.setProperty("display", "none");
      mount.style.pointerEvents = "auto";
      setProgress(0);
      stage.play();
      ScrollTrigger && ScrollTrigger.refresh();
      if (DEBUG) setupGUI();
    },
    undefined,
    (err) => console.warn("[landing-scene] GLB failed to load:", err)
  );

  /* ---- progress 0 (device) → 1 (fanned) ---- */
  function setProgress(p) {
    const flip = Math.min(1, p / 0.8);
    const fan = THREE.MathUtils.smoothstep(p, 0.25, 1);
    const spread = cfg.fanSpread * fan;
    if (pivot) pivot.rotation.y = flip * THREE.MathUtils.degToRad(cfg.flipDeg);
    if (cards.left) { cards.left.position.x = base.left.x + spread; cards.left.rotation.z = -0.06 * fan; }
    if (cards.right) { cards.right.position.x = base.right.x - spread; cards.right.rotation.z = 0.06 * fan; }
    if (cards.middle) { cards.middle.position.z = base.middle.z + 0.05 * fan; }
    if (hand) {
      hand.position.z = handBaseZ - cfg.handRecede * p;
      const fade = Math.max(0, 1 - p / 0.6);
      if (handKit) handKit.setFade(fade);
      hand.visible = fade > 0.02;
    }
    iconFade = Math.max(0, 1 - p / 0.5);
    applyIconOpacity();
  }

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

  /* ---- pinned scroll scrub ---- */
  if (gsap && ScrollTrigger && !prefersReduced) {
    st = ScrollTrigger.create({
      trigger: "#landing",
      start: "top top",
      end: "+=" + Math.round(window.innerHeight * 1.1),
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      onUpdate: (self) => setProgress(self.progress),
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

    // ---- copy ALL current values to clipboard (paste back to bake) ----
    gui.add({ copy() {
      const r = (n, d = 3) => Number(n.toFixed(d));
      const hex = (c) => "#" + c.getHexString();
      const u = handKit && handKit.uniforms;
      const dump = {
        camera: {
          position: [r(camera.position.x), r(camera.position.y), r(camera.position.z)],
          target: [r(cfg.target.x), r(cfg.target.y), r(cfg.target.z)],
          fov: camera.fov,
        },
        animation: { flipDeg: cfg.flipDeg, fanSpread: r(cfg.fanSpread), handRecede: r(cfg.handRecede) },
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

    // no auto look-at; pos/target sliders just move values (target only
    // feeds OrbitControls when it's enabled)
    const applyCam = () => {};
    const cam = gui.addFolder("Camera");
    cam.add(camera.position, "x", -20, 20, 0.01).name("pos x").onChange(applyCam).listen();
    cam.add(camera.position, "y", -20, 20, 0.01).name("pos y").onChange(applyCam).listen();
    cam.add(camera.position, "z", -20, 20, 0.01).name("pos z").onChange(applyCam).listen();
    cam.add(cfg.target, "x", -20, 20, 0.01).name("target x").onChange(applyCam).listen();
    cam.add(cfg.target, "y", -20, 20, 0.01).name("target y").onChange(applyCam).listen();
    cam.add(cfg.target, "z", -20, 20, 0.01).name("target z").onChange(applyCam).listen();
    cam.add(camera, "fov", 10, 90, 1).name("fov").onChange(() => camera.updateProjectionMatrix());
    cam.add({ log() {
      const p = camera.position, t = cfg.target;
      console.log(`camera.position.set(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}); target(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}); fov ${camera.fov}`);
    } }, "log").name("▶ log camera to console");

    // OrbitControls (free camera). Disables the icon raycast while on.
    cam.add({ orbit: false }, "orbit").name("OrbitControls").onChange(async (on) => {
      if (on && !orbit) {
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        orbit = new OrbitControls(camera, renderer.domElement);
        stage.setTick(() => orbit && orbit.enabled && orbit.update());
      }
      if (orbit) { orbit.enabled = on; orbit.target.copy(cfg.target); orbit.update(); }
    });

    const anim = gui.addFolder("Animation");
    const state = { progress: 0, scrollDriven: true };
    anim.add(state, "scrollDriven").name("scroll-driven").onChange((on) => { if (st) on ? st.enable() : st.disable(false); });
    anim.add(state, "progress", 0, 1, 0.001).name("progress").onChange((v) => { if (!state.scrollDriven) setProgress(v); });
    anim.add(cfg, "flipDeg", 0, 360, 1).name("flip °").onChange(() => setProgress(state.progress));
    anim.add(cfg, "fanSpread", 0, 4, 0.01).name("fan spread").onChange(() => setProgress(state.progress));
    anim.add(cfg, "handRecede", 0, 6, 0.01).name("hand recede").onChange(() => setProgress(state.progress));
    if (coverMat) anim.add(coverMat, "side", { Front: THREE.FrontSide, Back: THREE.BackSide, Double: THREE.DoubleSide }).name("cover side").onChange(() => (coverMat.needsUpdate = true));

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

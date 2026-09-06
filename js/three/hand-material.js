/* ============================================================
   hand-material.js — bespoke material stack for the landing hand.

   Rebuilds the Spline material stack in Three.js:
     • world-space VERTICAL gradient colour (top of palm brighter
       than the bottom) — driven by world Y between the hand's
       bounding-box min/max.
     • soft directional + ambient lighting term.
     • FRESNEL rim (colour + optional extra alpha at grazing angles).
     • overall surface transparency (base opacity ≈ 0.5).
     • a thin OUTLINE via an inverted-hull pass (BackSide, pushed
       along the normal).

   Returns handles so the scene can tune everything live (lil-gui)
   and fade the whole hand out on scroll.
   ============================================================ */

import * as THREE from "three";

const surfaceVert = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const surfaceFrag = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  uniform vec3  uColorTop;
  uniform vec3  uColorBottom;
  uniform float uMinY;
  uniform float uMaxY;

  uniform vec3  uLightDir;
  uniform float uLightStrength;   // "Lighting" layer
  uniform float uAmbient;

  uniform vec3  uFresnelColor;
  uniform float uFresnelPower;
  uniform float uFresnelStrength; // rim colour
  uniform float uFresnelAlpha;    // extra opacity at edges

  uniform float uOpacity;         // overall surface alpha
  uniform float uFade;            // scroll fade multiplier (1→0)

  void main() {
    float t = clamp((vWorldPos.y - uMinY) / max(uMaxY - uMinY, 1e-4), 0.0, 1.0);
    vec3 base = mix(uColorBottom, uColorTop, t);

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    // double-sided: face the normal toward the camera
    if (dot(N, V) < 0.0) N = -N;

    float diff = max(dot(N, normalize(uLightDir)), 0.0);
    vec3 lit = base * (uAmbient + diff * uLightStrength);

    float fres = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
    lit += uFresnelColor * fres * uFresnelStrength;

    float alpha = clamp(uOpacity + fres * uFresnelAlpha, 0.0, 1.0) * uFade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(lit, alpha);
  }
`;

const outlineVert = /* glsl */ `
  uniform float uThickness;   // object-space push along the normal
  void main() {
    vec3 p = position + normal * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const outlineFrag = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uFade;
  void main() {
    float a = uOpacity * uFade;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Replace the hand's material(s) with the custom stack and attach an outline.
 * @param {THREE.Object3D} hand  the "hand" node from the GLB
 * @returns handles for GUI + scroll fade
 */
export function buildHandMaterial(hand) {
  // world-space vertical bounds of the hand → gradient axis
  const box = new THREE.Box3().setFromObject(hand);

  const cfg = {
    colorTop: "#8f9aa0",
    colorBottom: "#2b3033",
    lightStrength: 0.6,
    ambient: 0.35,
    fresnelColor: "#a6ff3d",
    fresnelPower: 2.4,
    fresnelStrength: 0.35,
    fresnelAlpha: 0.35,
    opacity: 0.5,
    outlineColor: "#c9d3d8",
    outlineOpacity: 1.0,
    outlineThickness: 0.006,
  };

  const uniforms = {
    uColorTop: { value: new THREE.Color(cfg.colorTop) },
    uColorBottom: { value: new THREE.Color(cfg.colorBottom) },
    uMinY: { value: box.min.y },
    uMaxY: { value: box.max.y },
    uLightDir: { value: new THREE.Vector3(0.4, 1.0, 0.6).normalize() },
    uLightStrength: { value: cfg.lightStrength },
    uAmbient: { value: cfg.ambient },
    uFresnelColor: { value: new THREE.Color(cfg.fresnelColor) },
    uFresnelPower: { value: cfg.fresnelPower },
    uFresnelStrength: { value: cfg.fresnelStrength },
    uFresnelAlpha: { value: cfg.fresnelAlpha },
    uOpacity: { value: cfg.opacity },
    uFade: { value: 1 },
  };

  const outlineUniforms = {
    uThickness: { value: cfg.outlineThickness },
    uColor: { value: new THREE.Color(cfg.outlineColor) },
    uOpacity: { value: cfg.outlineOpacity },
    uFade: { value: 1 },
  };

  const surfaceMat = new THREE.ShaderMaterial({
    vertexShader: surfaceVert,
    fragmentShader: surfaceFrag,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const outlineMat = new THREE.ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    uniforms: outlineUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });

  // Collect meshes FIRST — adding the outline as a child during traverse()
  // would make traverse() re-visit it and recurse forever.
  const meshes = [];
  hand.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((o) => {
    o.material = surfaceMat;
    o.renderOrder = 2; // surface over outline
    const outline = new THREE.Mesh(o.geometry, outlineMat);
    outline.renderOrder = 1;
    o.add(outline); // child → inherits the hand's transform + scroll motion
  });

  const setFade = (k) => {
    uniforms.uFade.value = k;
    outlineUniforms.uFade.value = k;
  };

  return { surfaceMat, outlineMat, uniforms, outlineUniforms, cfg, box, setFade };
}

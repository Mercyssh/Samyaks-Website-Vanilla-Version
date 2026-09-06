/* ============================================================
   hand-material.js — bespoke material stack for the landing hand,
   ported from the Spline "Card Material" stack:

     • COLOR   — base fill #191919 @ 50% opacity (overall surface).
     • DEPTH   — world-space vertical (Y) gradient, dark→grey, smooth
                 (top of the palm brighter than the bottom).
     • FRESNEL — subtle rim at grazing angles.
     • LIGHTING— soft ambient + directional term.

   NOTE: Spline's numeric values live in its own ~±200-unit world; our
   hand is ~1 unit tall, so absolute values (near/far) don't transfer.
   Colours + ratios are matched. Tune via lil-gui.
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

  // COLOR + DEPTH gradient
  uniform vec3  uColorBottom;   // dark base (#191919)
  uniform vec3  uColorTop;      // grey ramp top
  uniform float uMinY;
  uniform float uMaxY;

  // LIGHTING
  uniform vec3  uLightDir;
  uniform float uLightStrength;
  uniform float uAmbient;

  // FRESNEL
  uniform vec3  uFresnelColor;
  uniform float uFresnelPower;
  uniform float uFresnelStrength;
  uniform float uFresnelAlpha;

  uniform float uOpacity;        // overall surface alpha (0.5)
  uniform float uFade;           // scroll fade (1→0)

  void main() {
    // DEPTH gradient (world Y, smooth)
    float t = clamp((vWorldPos.y - uMinY) / max(uMaxY - uMinY, 1e-4), 0.0, 1.0);
    t = smoothstep(0.0, 1.0, t);
    vec3 col = mix(uColorBottom, uColorTop, t);

    // LIGHTING
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    if (dot(N, V) < 0.0) N = -N;                 // double-sided
    float diff = max(dot(N, normalize(uLightDir)), 0.0);
    col *= (uAmbient + diff * uLightStrength);

    // FRESNEL rim
    float fres = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
    col += uFresnelColor * fres * uFresnelStrength;

    float alpha = clamp(uOpacity + fres * uFresnelAlpha, 0.0, 1.0) * uFade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function buildHandMaterial(hand) {
  const box = new THREE.Box3().setFromObject(hand);

  const cfg = {
    // COLOR + DEPTH
    colorBottom: "#191919",   // Spline Color 191919
    colorTop: "#6f7477",      // Depth ramp grey endpoint
    // LIGHTING
    ambient: 0.85,
    lightStrength: 0.3,
    // FRESNEL
    fresnelColor: "#c9d3d8",
    fresnelPower: 2.6,
    fresnelStrength: 0.22,
    fresnelAlpha: 0.18,
    // OVERALL
    opacity: 0.5,             // Spline Color 50%
  };

  const uniforms = {
    uColorBottom: { value: new THREE.Color(cfg.colorBottom) },
    uColorTop: { value: new THREE.Color(cfg.colorTop) },
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

  const surfaceMat = new THREE.ShaderMaterial({
    vertexShader: surfaceVert,
    fragmentShader: surfaceFrag,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  hand.traverse((o) => { if (o.isMesh) o.material = surfaceMat; });

  const setFade = (k) => { uniforms.uFade.value = k; };

  return { surfaceMat, uniforms, cfg, box, setFade };
}

/* ============================================================
   journey.js — the Journey section's DOM copy (intro lead).
   The 3D camera-travel scene itself lives in js/three/journey-scene.js.
   ============================================================ */

const LEAD =
  "Every stage taught me something the next one needed. Convening taught me scale. Scale taught me systems. Systems taught me where AI, human behaviour and storytelling actually meet, and why no single discipline can solve what matters most.";

export function initJourney() {
  const leadEl = document.getElementById("journeyLead");
  if (leadEl) leadEl.textContent = LEAD;
}

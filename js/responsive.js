/* ============================================================
   responsive.js — one source of truth for the mobile break.

   The desktop and mobile builds of a section are two entirely
   separate DOM+JS layers (see js/mobile/*). Which one boots is
   decided ONCE at load from `isMobile()`. Because tearing down a
   pinned ScrollTrigger / fanned deck / split-panel cleanly mid-life
   is fragile, we don't hot-swap: crossing the breakpoint reloads the
   page, which re-runs the correct layer from scratch. Resizing within
   one side of the breakpoint never reloads.
   ============================================================ */

/* Phone + small tablet portrait. Kept in sync with css/mobile.css. */
export const MOBILE_QUERY = "(max-width: 768px)";

const mq = window.matchMedia(MOBILE_QUERY);

export const isMobile = () => mq.matches;

/* Reload only when the phone/desktop boundary actually flips, so a
   desktop user dragging their window narrower/wider isn't reloaded on
   every pixel — only when they cross 768px. */
export function watchBreakpoint() {
  let was = mq.matches;
  const onChange = () => {
    if (mq.matches === was) return;
    was = mq.matches;
    window.location.reload();
  };
  // addEventListener('change') is supported in every browser we target;
  // the addListener fallback covers old Safari.
  if (mq.addEventListener) mq.addEventListener("change", onChange);
  else if (mq.addListener) mq.addListener(onChange);
}

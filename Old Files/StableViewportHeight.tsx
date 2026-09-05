import { useState, useEffect } from "react"
import type { ComponentType } from "react"

/**
 * Framer code overrides to give an element a STABLE viewport height that does
 * not track the mobile URL bar.
 *
 * Why: Framer's size panel only offers `vh` / `dvh`, both of which change value
 * when the mobile address bar slides in/out. On a sticky + timeline scroll
 * setup that reflow shifts `scrollY` by the bar's height in a single frame, and
 * Spline's distance-based Scroll event reads that phantom jump as real scroll,
 * snapping the camera. Locking the height to a stable value removes the reflow,
 * so scrollY stays continuous.
 *
 * Apply the override to the STICKY VIEWPORT FRAME (the frame Framer pins on
 * screen) — that's the element currently set to 100vh. Applying it only to the
 * inner Spline component is not enough; the pinning frame is what reflows.
 *
 * HOW TO USE IN FRAMER:
 *   1. Select the sticky viewport frame on the canvas.
 *   2. Right panel → Code Overrides → this file → pick a function below.
 *
 * Start with `withSvh`. If a small snap survives on iOS Safari (its bar is
 * top-anchored and the browser can still nudge scrollY), switch that same frame
 * to `withLockedViewportHeight`, which freezes the height to a pixel value
 * captured once on mount and never updates it.
 */

// --- Option A: pure CSS, 100svh (small viewport height — stable) ------------
// `svh` is computed as if the URL bar is shown, so it is the smallest and never
// changes. Content is never hidden behind the bar; when the bar hides you just
// gain a little empty space below. Preferred first choice.
export function withSvh(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    height: "100svh",
                    minHeight: "100svh",
                }}
            />
        )
    }
}

// --- Option B: JS-locked pixel height (belt-and-suspenders) ------------------
// Captures window.innerHeight once on mount and hard-sets it, ignoring every
// later resize (i.e. every URL-bar toggle). Absolutely no reflow after mount.
// Falls back to 100svh for the very first paint before the effect runs (SSR /
// Framer canvas), so there is never a 0-height flash.
export function withLockedViewportHeight(Component): ComponentType {
    return (props) => {
        const [h, setH] = useState<number | null>(null)

        useEffect(() => {
            // Lock to the height at mount. Whatever state the bar is in, that
            // value is then frozen and stable for the rest of the session.
            setH(window.innerHeight)
        }, [])

        const height = h != null ? `${h}px` : "100svh"

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    height,
                    minHeight: height,
                }}
            />
        )
    }
}

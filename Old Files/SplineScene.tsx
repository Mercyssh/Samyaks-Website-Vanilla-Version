import { useEffect } from "react"
import Spline from "@splinetool/react-spline"
import { addPropertyControls, ControlType } from "framer"

// Tell SplinePreloader (via window.__splineGate) that this scene exists and,
// later, that it has finished loading. No-ops if there's no preloader.
function registerSpline(id: string) {
    if (typeof window === "undefined" || !id) return
    const w = window as any
    const g =
        w.__splineGate ||
        (w.__splineGate = {
            done: false,
            registered: new Set<string>(),
            ready: new Set<string>(),
            bus: new EventTarget(),
        })
    g.registered.add(id)
    g.bus.dispatchEvent(new CustomEvent("spline:register", { detail: id }))
}
function markSplineReady(id: string) {
    if (typeof window === "undefined" || !id) return
    const w = window as any
    const g = w.__splineGate
    if (!g) return
    g.ready.add(id)
    g.bus.dispatchEvent(new CustomEvent("spline:ready", { detail: id }))
}
// Spline's onLoad fires BEFORE the first GPU paint (shader compile). Wait two
// animation frames so the scene has actually rendered before we report ready —
// otherwise the loading screen lifts a beat too early and the scene pops in.
function markSplineReadyAfterPaint(id: string) {
    if (typeof window === "undefined" || !id) return
    requestAnimationFrame(() =>
        requestAnimationFrame(() =>
            window.setTimeout(() => markSplineReady(id), 60)
        )
    )
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function SplineScene({ scene, style }) {
    useEffect(() => {
        registerSpline(scene)
    }, [scene])

    return (
        <div style={{ width: "100%", height: "100%", ...style }}>
            <Spline
                scene={scene}
                onLoad={() => markSplineReadyAfterPaint(scene)}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    )
}

SplineScene.defaultProps = {
    scene: "https://prod.spline.design/Touv1lscVRlCfcwB/scene.splinecode",
}

addPropertyControls(SplineScene, {
    scene: {
        type: ControlType.String,
        title: "Scene URL",
        placeholder: "https://prod.spline.design/.../scene.splinecode",
    },
})

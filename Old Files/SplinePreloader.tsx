import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * SplinePreloader
 * ---------------
 * A full-screen loading overlay whose progress bar fills 0 → 90% over a fixed
 * ramp (default 3s, so loading always takes at least that long), holds at 90%
 * until your real on-page Spline scenes have actually PAINTED, then snaps to
 * 100% for a beat and fades out — broadcasting a "loading done" signal the rest
 * of the page (e.g. ScrollNav) can wait on.
 *
 * READINESS = ACTUALLY PAINTED
 *   The wired code components (SplineScene / SplineSceneAdvanced / JourneyMobile)
 *   report ready one paint AFTER Spline's onLoad, so the scene is really on
 *   screen before we snap to 100. <spline-viewer> web components are auto-
 *   detected and their "load" event wired here. Everything talks through one
 *   shared object on window (window.__splineGate) — no cross-component imports.
 *
 * SETUP
 *   1. Drop this on the page (any small frame — it renders a fixed overlay).
 *   2. In "Wait for scenes", paste the .splinecode URL(s) that must be painted
 *      before it snaps to 100 — normally just your LANDING scene. URLs not on
 *      the page are ignored, so listing a couple is safe.
 *
 * @framerIntrinsicWidth 120
 * @framerIntrinsicHeight 120
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerDisableUnlink
 */

// --- Shared cross-component loading gate (via window, no imports needed) -----
type SplineGate = {
    done: boolean
    registered: Set<string>
    ready: Set<string>
    bus: EventTarget
}

function getGate(): SplineGate | null {
    if (typeof window === "undefined") return null
    const w = window as any
    if (!w.__splineGate) {
        w.__splineGate = {
            done: false,
            registered: new Set<string>(),
            ready: new Set<string>(),
            bus: new EventTarget(),
        }
    }
    return w.__splineGate as SplineGate
}

function registerSpline(id: string) {
    const g = getGate()
    if (!g || !id) return
    g.registered.add(id)
    g.bus.dispatchEvent(new CustomEvent("spline:register", { detail: id }))
}

function markSplineReady(id: string) {
    const g = getGate()
    if (!g || !id) return
    g.ready.add(id)
    g.bus.dispatchEvent(new CustomEvent("spline:ready", { detail: id }))
}

function idMatches(registeredId: string, wanted: string): boolean {
    return (
        registeredId === wanted ||
        registeredId.includes(wanted) ||
        wanted.includes(registeredId)
    )
}

const RAMP_EASE = "cubic-bezier(0.12, 0.7, 0.2, 1)"
const SNAP_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)"
const SNAP_MS = 320 // how fast the trickle → 100% snaps
const CREEP_CAP = 99 // the trickle asymptotes here; the snap covers the last %
const CREEP_TAU = 8000 // ms time-constant of the trickle (bigger = slower)

interface Props {
    waitForScenes: string[]
    waitCount: number
    rampDuration: number
    holdDuration: number
    maxDuration: number
    fadeDuration: number
    collectWindow: number
    label: string
    labelFont: any
    showPercent: boolean
    accent: string
    textColor: string
    trackColor: string
    bgCenter: string
    bgEdge: string
    barWidth: number
    barHeight: number
    scanlines: boolean
    halo: boolean
    logo?: string
    debug: boolean
    style?: React.CSSProperties
}

export default function SplinePreloader(props: Props) {
    const {
        waitForScenes,
        waitCount,
        rampDuration,
        holdDuration,
        maxDuration,
        fadeDuration,
        collectWindow,
        label,
        labelFont,
        showPercent,
        accent,
        textColor,
        trackColor,
        bgCenter,
        bgEdge,
        barWidth,
        barHeight,
        scanlines,
        halo,
        logo,
        debug,
        style,
    } = props

    const onCanvas = RenderTarget.current() === RenderTarget.canvas

    const [visible, setVisible] = useState(true)
    const [gone, setGone] = useState(false)
    // Bar fill 0..100. The ramp is driven per-frame (so the % counts up in
    // sync); the snap to 100 uses a short CSS transition.
    const [fill, setFill] = useState(0)
    const [fillMs, setFillMs] = useState(0)
    const [fillEase, setFillEase] = useState(RAMP_EASE)
    const startedRef = useRef(false)

    useEffect(() => {
        if (onCanvas || startedRef.current) return
        const g = getGate()
        if (!g || typeof document === "undefined") return
        startedRef.current = true

        const start = Date.now()
        const ramp = Math.max(0, rampDuration || 0)
        const collect = Math.max(0, collectWindow || 0)
        const critical = (waitForScenes || [])
            .map((s) => (s || "").trim())
            .filter(Boolean)
        let revealed = false
        const timers: number[] = []

        const readyList = () => [...g.ready]
        const registeredList = () => [...g.registered]
        const presentCritical = () =>
            critical.filter((u) => registeredList().some((r) => idMatches(r, u)))
        const log = (...a: any[]) => {
            if (debug) console.info("[SplinePreloader]", ...a)
        }

        // Drive the bar per frame so the % readout counts up in lockstep:
        //   • 0 → 90 over the ramp (eased),
        //   • then trickle 90 → CREEP_CAP asymptotically while we wait for the
        //     scene, so it keeps inching up but never reaches 100 on its own.
        // The snap to 100 (in doReveal) covers the final gap once it's loaded.
        const ease = (t: number) => 1 - Math.pow(1 - t, 2) // easeOutQuad
        let rafId = 0
        const animate = () => {
            if (revealed) return
            const elapsed = Date.now() - start
            let p: number
            if (elapsed < ramp) {
                p = ease(elapsed / Math.max(1, ramp)) * 90
            } else {
                const after = elapsed - ramp
                p = CREEP_CAP - (CREEP_CAP - 90) * Math.exp(-after / CREEP_TAU)
            }
            setFill(p)
            rafId = requestAnimationFrame(animate)
        }
        rafId = requestAnimationFrame(animate)

        // Are the scenes we care about actually painted? (No time component —
        // the ramp handles the minimum duration.)
        const scenesReady = () => {
            if (critical.length > 0) {
                const present = presentCritical()
                if (present.length === 0) return false
                return present.every((u) =>
                    readyList().some((r) => idMatches(r, u))
                )
            }
            if (waitCount > 0) {
                if (g.ready.size >= waitCount) return true
                if (
                    Date.now() - start >= collect &&
                    g.registered.size > 0 &&
                    g.ready.size >= g.registered.size
                )
                    return true
                return false
            }
            return true
        }

        const doReveal = (reason: string) => {
            if (revealed) return
            revealed = true
            const waited = Date.now() - start
            if (reason === "timeout") {
                const missing = critical.length
                    ? presentCritical().filter(
                          (u) => !readyList().some((r) => idMatches(r, u))
                      )
                    : []
                console.warn(
                    "[SplinePreloader] revealed on TIMEOUT after",
                    waited + "ms.",
                    "On page:",
                    registeredList(),
                    "| Ready:",
                    readyList(),
                    "| Still waiting on:",
                    missing.length
                        ? missing
                        : "(no matching scene ever registered — check your Wait-for-scenes URLs)"
                )
            } else {
                log("ready — snap to 100, then reveal", { waited })
            }

            // Snap 90 → 100.
            setFillEase(SNAP_EASE)
            setFillMs(SNAP_MS)
            setFill(100)

            // Hold at 100 for a beat, then fade the whole overlay out.
            timers.push(
                window.setTimeout(() => {
                    setVisible(false)
                    g.done = true
                    g.bus.dispatchEvent(new Event("spline:done"))
                    timers.push(
                        window.setTimeout(
                            () => setGone(true),
                            Math.max(0, fadeDuration || 0)
                        )
                    )
                }, Math.max(SNAP_MS, holdDuration || 0))
            )
        }

        const maybeReveal = () => {
            if (revealed) return
            if (Date.now() - start < ramp) return // enforce the minimum ramp
            if (scenesReady()) doReveal("scenes ready")
        }

        const onEvent = (e: any) => {
            log(e?.type, e?.detail, {
                onPage: registeredList(),
                ready: readyList(),
            })
            maybeReveal()
        }
        g.bus.addEventListener("spline:ready", onEvent)
        g.bus.addEventListener("spline:register", onEvent)

        // Auto-wire any <spline-viewer> web components on the page.
        const wireViewer = (el: any) => {
            const url = el.getAttribute?.("url") || "spline-viewer"
            registerSpline(url)
            if (el.__gateWired) return
            el.__gateWired = true
            const done = () => markSplineReady(url)
            el.addEventListener?.("load", done)
            el.addEventListener?.("load-complete", done)
            el.addEventListener?.("loaded", done)
        }
        const scanViewers = (root: ParentNode) => {
            root.querySelectorAll?.("spline-viewer").forEach(wireViewer)
        }
        scanViewers(document)
        const mo = new MutationObserver((muts) => {
            for (const m of muts) {
                m.addedNodes.forEach((n) => {
                    if (n.nodeType !== 1) return
                    const el = n as Element
                    if (el.tagName?.toLowerCase() === "spline-viewer")
                        wireViewer(el)
                    else scanViewers(el)
                })
            }
        })
        mo.observe(document.body, { childList: true, subtree: true })

        // Re-check right when the ramp finishes, and a hard ceiling.
        timers.push(window.setTimeout(maybeReveal, ramp + 30))
        timers.push(
            window.setTimeout(
                () => doReveal("timeout"),
                Math.max(1000, maxDuration || 15000)
            )
        )
        log("armed", { waitForScenes: critical, waitCount, ramp, maxDuration })

        return () => {
            g.bus.removeEventListener("spline:ready", onEvent)
            g.bus.removeEventListener("spline:register", onEvent)
            mo.disconnect()
            cancelAnimationFrame(rafId)
            timers.forEach((t) => window.clearTimeout(t))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onCanvas])

    // Editor canvas: show a compact static badge instead of the overlay.
    if (onCanvas) {
        const count = (waitForScenes || []).filter((s) => s && s.trim()).length
        return (
            <div
                style={{
                    ...style,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: bgEdge,
                    color: textColor,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    borderRadius: 8,
                    padding: 12,
                    textAlign: "center",
                }}
            >
                <div style={{ fontWeight: 600 }}>Spline Preloader</div>
                <div style={{ opacity: 0.6 }}>
                    ramp {Math.round((rampDuration || 0) / 100) / 10}s ·{" "}
                    {count > 0 ? `${count} scene(s)` : `${waitCount} viewer(s)`}
                </div>
            </div>
        )
    }

    if (gone) return null

    // A gentle slash on the fill's leading edge — dropped at 100% so the bar
    // reads as completely full when it snaps.
    const skew = Math.round(barHeight * 0.42)
    const gap = Math.max(4, Math.round(barHeight * 0.12))
    const scanColor = "rgba(0,0,0,0.34)"

    return (
        <div
            aria-busy={visible}
            role="status"
            style={{
                position: "fixed",
                inset: 0,
                // Above ScrollNav (2147483000) so the overlay always covers the
                // nav while loading, even before the nav's own gate kicks in.
                zIndex: 2147483600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: `radial-gradient(ellipse at 50% 50%, ${bgCenter} 0%, ${bgEdge} 100%)`,
                opacity: visible ? 1 : 0,
                transition: `opacity ${Math.max(0, fadeDuration || 0)}ms ease`,
                pointerEvents: visible ? "auto" : "none",
            }}
        >
            {logo ? (
                <img
                    src={logo}
                    alt=""
                    style={{
                        maxWidth: 160,
                        maxHeight: 80,
                        objectFit: "contain",
                        marginBottom: 26,
                    }}
                />
            ) : null}

            <div
                style={{
                    position: "relative",
                    width: `min(${barWidth}px, 82vw)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: Math.round(barHeight * 0.28),
                }}
            >
                {/* Scanline halo bleeding into the background */}
                {halo ? (
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            left: "50%",
                            bottom: 0,
                            transform: "translate(-50%, 22%)",
                            width: "150%",
                            height: barHeight * 4,
                            pointerEvents: "none",
                            backgroundImage:
                                "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 5px)",
                            WebkitMaskImage:
                                "radial-gradient(ellipse 62% 50% at 50% 50%, #000 18%, transparent 74%)",
                            maskImage:
                                "radial-gradient(ellipse 62% 50% at 50% 50%, #000 18%, transparent 74%)",
                        }}
                    />
                ) : null}

                {/* Label */}
                {label ? (
                    <div
                        style={{
                            ...(labelFont || {}),
                            color: textColor,
                            zIndex: 1,
                            textAlign: "center",
                            lineHeight: 1,
                        }}
                    >
                        {label}
                    </div>
                ) : null}

                {/* Capsule, with a faint offset echo frame behind it */}
                <div style={{ position: "relative", width: "100%", zIndex: 1 }}>
                    {/* Border-only capsule, offset left + down */}
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            inset: 0,
                            transform: "translate(-6px, 6px)",
                            borderRadius: 999,
                            border: `1.5px solid ${accent}`,
                            opacity: 0.2,
                            pointerEvents: "none",
                            boxSizing: "border-box",
                        }}
                    />
                    <div
                        style={{
                            position: "relative",
                            zIndex: 1,
                            width: "100%",
                            height: barHeight,
                            borderRadius: 999,
                            border: `1.5px solid ${accent}`,
                            background: trackColor,
                            padding: gap,
                            boxSizing: "border-box",
                            boxShadow: `0 0 22px ${accent}55, 0 0 60px ${accent}22, inset 0 0 12px ${accent}22`,
                        }}
                    >
                    {/* Inner track (clips fill + scanlines to the capsule) */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            borderRadius: 999,
                            overflow: "hidden",
                            background: trackColor,
                        }}
                    >
                        {/* Fill */}
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${fill}%`,
                                background: accent,
                                boxShadow: `0 0 18px ${accent}aa`,
                                clipPath:
                                    fill >= 99
                                        ? undefined
                                        : `polygon(0 0, 100% 0, calc(100% - ${skew}px) 100%, 0 100%)`,
                                transition: `width ${fillMs}ms ${fillEase}`,
                            }}
                        />

                        {/* Scanlines over the whole track */}
                        {scanlines ? (
                            <div
                                aria-hidden
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    backgroundImage: `repeating-linear-gradient(0deg, ${scanColor} 0px, ${scanColor} 1.5px, transparent 1.5px, transparent 4px)`,
                                }}
                            />
                        ) : null}
                        </div>
                    </div>
                </div>

                {/* % readout */}
                {showPercent ? (
                    <div
                        style={{
                            zIndex: 1,
                            color: textColor,
                            fontFamily:
                                (labelFont && (labelFont as any).fontFamily) ||
                                "Inter, sans-serif",
                            fontSize: 13,
                            letterSpacing: "0.06em",
                            fontVariantNumeric: "tabular-nums",
                            opacity: 0.85,
                        }}
                    >
                        {Math.round(fill)}%
                    </div>
                ) : null}
            </div>
        </div>
    )
}

SplinePreloader.defaultProps = {
    waitForScenes: [
        "https://prod.spline.design/fQ3-burKsRZCRp4g/scene.splinecode",
        "https://prod.spline.design/xrpRl5qPHULU6x0s/scene.splinecode",
    ],
    waitCount: 1,
    rampDuration: 3000,
    holdDuration: 450,
    maxDuration: 15000,
    fadeDuration: 500,
    collectWindow: 800,
    label: "Loading Experience",
    labelFont: { fontSize: 20, variant: "Medium" },
    showPercent: true,
    accent: "#8CC63F",
    textColor: "#8CC63F",
    trackColor: "#0c0f0a",
    bgCenter: "#1a1a1a",
    bgEdge: "#000000",
    barWidth: 440,
    barHeight: 60,
    scanlines: true,
    halo: true,
    logo: "",
    debug: false,
}

addPropertyControls(SplinePreloader, {
    waitForScenes: {
        type: ControlType.Array,
        title: "Wait for scenes",
        control: {
            type: ControlType.String,
            placeholder: "https://prod.spline.design/XXXX/scene.splinecode",
        },
        description:
            "The .splinecode URL(s) that must be painted before it snaps to 100% — usually your landing scene.",
    },
    waitCount: {
        type: ControlType.Number,
        title: "…or Wait N",
        min: 0,
        max: 8,
        step: 1,
        displayStepper: true,
        description: "Used only when the list above is empty: wait for the first N viewers.",
    },

    label: {
        type: ControlType.String,
        title: "Label",
        placeholder: "Loading…",
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultValue: { fontSize: 20, variant: "Medium" },
    },
    showPercent: {
        type: ControlType.Boolean,
        title: "Percent",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: true,
    },

    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#8CC63F",
    },
    textColor: {
        type: ControlType.Color,
        title: "Label Color",
        defaultValue: "#8CC63F",
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: "#0c0f0a",
    },
    bgCenter: {
        type: ControlType.Color,
        title: "BG Center",
        defaultValue: "#1a1a1a",
    },
    bgEdge: {
        type: ControlType.Color,
        title: "BG Edge",
        defaultValue: "#000000",
    },
    barWidth: {
        type: ControlType.Number,
        title: "Bar Width",
        min: 160,
        max: 900,
        step: 10,
        unit: "px",
    },
    barHeight: {
        type: ControlType.Number,
        title: "Bar Height",
        min: 20,
        max: 120,
        step: 2,
        unit: "px",
    },
    scanlines: {
        type: ControlType.Boolean,
        title: "Scanlines",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: true,
    },
    halo: {
        type: ControlType.Boolean,
        title: "Halo",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: true,
    },
    logo: {
        type: ControlType.Image,
        title: "Logo",
    },

    rampDuration: {
        type: ControlType.Number,
        title: "Ramp to 90%",
        min: 0,
        max: 10000,
        step: 100,
        unit: "ms",
        description: "Time to fill 0 → 90%. Also the minimum the screen stays up.",
    },
    holdDuration: {
        type: ControlType.Number,
        title: "Hold 100%",
        min: 0,
        max: 3000,
        step: 50,
        unit: "ms",
        description: "How long 100% shows before fading out.",
    },
    fadeDuration: {
        type: ControlType.Number,
        title: "Fade",
        min: 0,
        max: 2000,
        step: 50,
        unit: "ms",
    },
    maxDuration: {
        type: ControlType.Number,
        title: "Timeout",
        min: 1000,
        max: 60000,
        step: 500,
        unit: "ms",
        description: "Hard ceiling: reveal even if a scene never reports ready.",
    },
    collectWindow: {
        type: ControlType.Number,
        title: "Collect",
        min: 0,
        max: 4000,
        step: 100,
        unit: "ms",
        description: "Grace period for viewers to register (used with Wait N).",
    },
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: false,
        description: "Log gate activity to the browser console.",
    },
})

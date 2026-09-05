import { addPropertyControls, ControlType } from "framer"
import { useRef, useState, useEffect } from "react"
import { motion, useMotionValue } from "framer-motion"
import Spline from "@splinetool/react-spline"

const SPLINE_SCENE_URL =
    "https://prod.spline.design/fQ3-burKsRZCRp4g/scene.splinecode"

// Report readiness to SplinePreloader (via window.__splineGate). No-ops if
// there's no preloader on the page.
function registerSpline(id: string) {
    if (typeof window === "undefined" || !id) return
    const w = window as any
    const g =
        w.__splineGate ||
        (w.__splineGate = {
            done: false,
            registered: new Set(),
            ready: new Set(),
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
// onLoad fires BEFORE the first GPU paint; wait two frames so the scene has
// actually rendered before reporting ready to the loading screen.
function markSplineReadyAfterPaint(id: string) {
    if (typeof window === "undefined" || !id) return
    requestAnimationFrame(() =>
        requestAnimationFrame(() =>
            window.setTimeout(() => markSplineReady(id), 60)
        )
    )
}

const styles = {
    container: {
        width: "100vw",
        height: "100svh", // svh is the STABLE small-viewport unit; dvh tracks the URL bar and reflows the canvas mid-scroll, which injects a phantom scrollY jump into Spline's distance-based scroll event
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        rowGap: 15,
        paddingBottom: "110px", // Clear the carousel buttons (bottom: 45px + 50px height) so the Spline viewport doesn't overlap them
    },

    // Content panel styles
    contentPanel: {
        width: "100%",
        height: "100%", // Fills remaining height after spline panel
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "start",
        justifyContent: "start",
        borderRadius: 13,
        rowGap: 10,
        padding: "20px",
        // boxShadow: "0 0px 30px rgba(0, 0, 0, .6)",
    },

    contentPanelControls: {
        width: "100%", // Take up all available width
        height: "100%", // Height will adjust naturally to content

        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between", // Space buttons and image
        alignItems: "center", // Vertically center items

        gap: "10px",
    },

    controlsPanelGradientBorder: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",

        borderRadius: "13px",
        padding: "2px", // thickness of the border glow
        background: "linear-gradient(180deg, #9CE325, rgba(156, 227, 37, 0))",
        WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        pointerEvents: "none",
    },

    contentPanelImageContainer: {
        flex: 1, // Fill all remaining horizontal space between buttons
        height: "100%", // Stretch to parent container height
        objectFit: "cover", // Ensure the image fills while preserving ratio

        position: "relative",
    },

    contentPanelIMG: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",

        borderRadius: 13,
    },

    cameraButton: {
        width: 40,
        height: 40,
        backgroundColor: "green",
        border: "none",
        borderRadius: "50%", // Make button circular for cleaner UI
        cursor: "pointer",

        position: "relative",
    },

    contentPanelTexts: {
        width: "100%", // Take full width of parent
        height: "fit-content", // Expand based on text size
        margin: 0,
        padding: "10px",
        borderRadius: 8,

        gap: 8,

        display: "flex",
        flexDirection: "column",
    },

    contentPanelTextsH3: {
        margin: 0,

        fontFamily: "Magistral Bold, Plus Jakarta Sans, Sans Serif",
        fontSize: "18px",
        letterSpacing: "0em",
        lineHeight: "0.9em",

        textAlign: "center",
        textWrap: "balance",
        color: "#9CE325",
    },

    contentPanelTextsP: {
        margin: 0,

        fontFamily: "Plus Jakarta Sans",
        fontSize: "14px",
        lineHeight: "1.2em",
        letterSpacing: "0em",

        textWrap: "balance",
        textAlign: "center",

        color: "white",
    },

    // Spline Panel Styles
    splinePanel: {
        position: "relative",
        width: "100%",
        aspectRatio: "1130/770", // Maintains consistent ratio

        backgroundColor: "transparent",
    },

    // Accessory Styles
    borderFade: {
        WebkitMaskImage: `
            linear-gradient(to right, rgba(0,0,0,0) 0px, rgba(0,0,0,1) 20px, rgba(0,0,0,1) calc(100% - 20px), rgba(0,0,0,0) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) 20px, rgba(0,0,0,1) calc(100% - 20px), rgba(0,0,0,0) 100%)
        `,
        WebkitMaskComposite: "destination-in",
        maskComposite: "intersect",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "100% 100%",
    },

    stretchImage: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
    },
}

export default function Journey_Component_Mobile_2(props) {
    const { eventInfos, buttonImageIcon, cameraContentIndexes, buttonFont } =
        props
    const [currentEvent, setCurrentEvent] = useState(eventInfos[0])

    const lastHoveredIdRef = useRef("")
    const swapTimerRef = useRef(null)
    const rafRef = useRef(null)
    const splineWrapRef = useRef(null)
    const splineRef = useRef(null)

    // Announce this scene to the preloader on mount, so the loading screen
    // knows to wait for it before lifting.
    useEffect(() => {
        registerSpline(SPLINE_SCENE_URL)
    }, [])

    // Variables for content switching animation
    const lpo = useMotionValue(1) // by default opacity at 1
    const lpx = useMotionValue(`translate(${0}px,0px)`) // by default x offset at 0
    const lpduration = 0.2 // in ms
    const lpoffset = 100 // how much to offset in y direction

    // // LOGIC: Lag fix? Anurag?
    // useEffect(() => {
    //     const wrap = splineWrapRef.current
    //     if (wrap) {
    //         wrap.style.touchAction = "pan-y"
    //         wrap.style.overscrollBehavior = "contain"
    //     }

    //     const setCanvasProps = () => {
    //         const canvas = wrap?.querySelector("canvas")
    //         if (canvas) {
    //             canvas.style.touchAction = "pan-y"
    //             canvas.style.webkitTouchCallout = "none"
    //         }
    //     }

    //     setCanvasProps()
    //     const obs = new MutationObserver(setCanvasProps)
    //     if (wrap) obs.observe(wrap, { childList: true, subtree: true })
    //     return () => obs.disconnect()
    // }, [])

    // LOGIC : Hover / mouse event listening in spline
    function onLoadSpline(spline) {
        let pending = false

        const handleHover = (e) => {
            console.log(e)
            if (!e?.target?.id) return
            if (pending) return
            pending = true
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
                pending = false
                const hoveredId = e.target.id
                if (hoveredId === lastHoveredIdRef.current) return

                const match = eventInfos.find((ev) => ev.objectId === hoveredId)
                if (!match) return

                if (swapTimerRef.current) {
                    clearTimeout(swapTimerRef.current)
                    swapTimerRef.current = null
                }

                GlowSpecificEvent(match.objectId)
                swapTimerRef.current = setTimeout(() => {
                    lpo.set(0)
                    lpx.set(`translate(0px,${lpoffset}px)`)
                    setTimeout(() => {
                        setCurrentEvent(match)
                        lpo.set(1)
                        lpx.set(`translate(${0}px,0px)`)

                        // Fade in
                        // isActive = true
                    }, lpduration * 1000)

                    lastHoveredIdRef.current = hoveredId
                }, 80)
            })
        }

        spline.addEventListener("mouseUp", handleHover)
        splineRef.current = spline
        markSplineReadyAfterPaint(SPLINE_SCENE_URL)
    }

    // LOGIC: Camera switching
    let currentCam = 0
    const eventz = ["keyDown", "keyUp", "mouseDown"]
    function nextCamera() {
        currentCam = (currentCam + 1) % eventz.length
        splineRef.current.emitEvent(eventz[currentCam], "Camera Controller")
    }
    function previousCamera() {
        currentCam = (currentCam - 1 + eventz.length) % eventz.length
        splineRef.current.emitEvent(eventz[currentCam], "Camera Controller")
    }
    function onCameraChange(index) {
        let match = eventInfos?.[cameraContentIndexes?.[index]]
        if (match == null) {
            console.log("No event to show", match)
            return
        }

        //Make the match glow.
        GlowSpecificEvent(match.objectId)

        lpo.set(0)
        lpx.set(`translate(0px,${lpoffset}px)`)
        setTimeout(() => {
            setCurrentEvent(match)
            lpo.set(1)
            lpx.set(`translate(${0}px,0px)`)

            // Fade in
            // isActive = true
        }, lpduration * 1000)
    }

    // Causes a specific element to glow by executing a pre-setup keydown event in spline scene!, also unglows everything else at the same time.
    function GlowSpecificEvent(id) {
        // Loop over all elements in eventInfos

        for (const event of eventInfos) {
            if (event.objectId == id) {
                console.log(splineRef.current.emitEvent("keyDown", id))
            } else {
                splineRef.current.emitEvent("keyUp", event.objectId)
            }
        }
    }

    // FIX (mobile URL bar): when the address bar slides in/out it fires
    // window + visualViewport "resize". Spline's built-in Scroll event recomputes
    // its scroll geometry on that resize and snaps the camera back to the start,
    // even though scrollY hasn't moved. We can't make Spline ignore it, but these
    // listeners register on mount — before Spline attaches its own inside onLoad —
    // so at the window/visualViewport target ours run first (listeners fire in
    // registration order) and stopImmediatePropagation blocks Spline's handler.
    // Only URL-bar toggles are swallowed (width unchanged); a real resize or an
    // orientation change (width changes) passes straight through. Touch devices
    // only, so desktop window-resizing is untouched.
    useEffect(() => {
        const coarse =
            typeof window !== "undefined" &&
            window.matchMedia?.("(pointer: coarse)").matches
        if (!coarse) return

        let lastW = window.innerWidth

        const guard = (e) => {
            const w = window.innerWidth
            const widthUnchanged = w === lastW
            lastW = w
            if (widthUnchanged) e.stopImmediatePropagation()
        }

        window.addEventListener("resize", guard)
        window.visualViewport?.addEventListener("resize", guard)

        return () => {
            window.removeEventListener("resize", guard)
            window.visualViewport?.removeEventListener("resize", guard)
        }
    }, [])

    // LOGIC : Lag fix? Anurag?
    useEffect(() => {
        return () => {
            if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    // HTML STARTS HERE
    return (
        <motion.div style={styles.container}>
            <Spline
                style={{
                    // ...styles.borderFade,
                    width: "100%",
                    height: "100%",
                    // Fade the bottom edge of the viewport into transparency (works on any background)
                    WebkitMaskImage:
                        "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
                    maskImage:
                        "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                }}
                scene={SPLINE_SCENE_URL}
                onLoad={onLoadSpline}
            />
            <CameraCarousel
                buttonFont={buttonFont}
                splineRef={splineRef}
                onCameraChange={onCameraChange}
            />
        </motion.div>
    )
}

addPropertyControls(Journey_Component_Mobile_2, {
    Cameras: {
        title: "Camera Names",
        type: ControlType.Array,
        propertyControl: {
            type: ControlType.String,
        },
    },
    cameraContentIndexes: {
        title: "Content Indexes",
        type: ControlType.Array,
        propertyControl: {
            type: ControlType.Number,
        },
    },
    eventInfos: {
        title: "Event Infos",
        type: ControlType.Array,
        propertyControl: {
            type: ControlType.Object,
            controls: {
                responsiveImage: {
                    title: "Image",
                    type: ControlType.ResponsiveImage,
                },
                title: {
                    title: "Title",
                    type: ControlType.String,
                    defaultValue: "Event Title",
                },
                content: {
                    title: "Content",
                    type: ControlType.String,
                    defaultValue: "Event content goes here.",
                },
                objectId: {
                    title: "Object ID",
                    type: ControlType.String,
                    defaultValue: "",
                },
            },
        },
        defaultValue: [
            {
                responsiveImage: "https://picsum.photos/536/354",
                title: "Title but it can be a little long",
                content: "Content of this element",
                objectId: "",
            },
        ],
    },
    buttonImageIcon: {
        title: "Button Icon",
        type: ControlType.ResponsiveImage,
    },
    buttonFont: {
        title: "Button Font",
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 16,
            variant: "Medium",
        },
    },
})

// CAROUSEL COMPONENT ========================================================================

const cooldown = 0.45 // Cooldown in seconds between each camera transition, otherwise spline breaks!
function CameraCarousel({ buttonFont, splineRef, onCameraChange }) {
    const [idx, setIdx] = useState(0)
    const touch = useRef({ x: 0, active: false })
    const events = ["keyDown", "keyUp", "mouseDown"]
    const inTransition = useRef(false) // persistent flag

    const len = events.length || 1

    const go = (direction) => {
        if (inTransition.current) return

        // Clamp at the edges instead of wrapping around.
        const to =
            direction === "right"
                ? Math.min(idx + 1, len - 1)
                : Math.max(idx - 1, 0)

        if (to === idx) return // already at first/last stage
        inTransition.current = true

        setIdx(to)
        SwitchCamera(to)
    }

    function SwitchCamera(index) {
        splineRef.current.emitEvent(events[index], "Camera Controller")
        onCameraChange(index)

        setTimeout(() => {
            inTransition.current = false // reset flag
        }, cooldown * 1000)
    }

    // Keyboard navigation
    useEffect(() => {
        const h = (e) => {
            if (e.key === "ArrowLeft") go("left")
            if (e.key === "ArrowRight") go("right")
        }
        window.addEventListener("keydown", h)
        return () => window.removeEventListener("keydown", h)
    }, [idx, len])

    // Touch swipe
    const onTouchStart = (e) => {
        touch.current = { x: e.touches[0].clientX, active: true }
    }
    const onTouchEnd = (e) => {
        if (!touch.current.active) return
        const dx = e.changedTouches[0].clientX - touch.current.x
        if (dx > 40) go("left")
        else if (dx < -40) go("right")
        touch.current.active = false
    }

    return (
        <motion.div
            className="fc-wrap"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <style>{`
                /* Invisible swipe strip at the bottom where the controls used
                 * to sit. No visible UI, but still captures swipes so touch
                 * navigation keeps working. */
                .fc-wrap {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translate(-50%, 0);
                    z-index: 2;

                    width: 85%;
                    height: 90px;
                    background: transparent;
                }
            `}</style>
        </motion.div>
    )
}

import { useState, useEffect, useRef } from "react"

/**
 * On-device diagnostic overlay for the mobile scroll / URL-bar problem.
 *
 * Drop this component anywhere on the Framer page (it renders as a fixed
 * overlay, so its position on the canvas doesn't matter). Then reproduce the
 * bug on a real phone: scroll the Journey section a little and release.
 *
 * WHAT TO LOOK FOR when the camera snaps back to the start:
 *
 *   • Does `scrollY` in the top readout drop back down on its own after you
 *     lift your finger (you didn't scroll up, but the number falls)?
 *       → the BROWSER is snapping scrollY back. Fix = stop the rubber-band /
 *         decouple Spline from raw scrollY.
 *
 *   • Does a "VV-RESIZE" or "RESIZE" line appear in the log at the exact moment
 *     the camera resets, while scrollY stays put?
 *       → SPLINE is re-zeroing on the viewport-resize the URL bar fires. Fix =
 *         kill the bar toggle, or the JS height-lock override.
 *
 * The event log keeps the last 12 significant events with the scrollY value at
 * that instant, so you can read it after the gesture instead of trying to catch
 * it live. Tap the overlay to clear the log.
 */
export default function DebugViewport() {
    const [now, setNow] = useState({
        innerH: 0,
        vvH: 0,
        vvTop: 0,
        scrollY: 0,
        maxScrollY: 0,
    })
    const [log, setLog] = useState<string[]>([])
    const maxScrollRef = useRef(0)

    useEffect(() => {
        const push = (label: string) => {
            const y = Math.round(window.scrollY)
            const t = new Date().toLocaleTimeString().split(" ")[0]
            setLog((prev) =>
                [`${t}  ${label}  y=${y}`, ...prev].slice(0, 12)
            )
        }

        const sample = () => {
            const y = window.scrollY
            if (y > maxScrollRef.current) maxScrollRef.current = y
            const vv = window.visualViewport
            setNow({
                innerH: window.innerHeight,
                vvH: vv ? Math.round(vv.height) : 0,
                vvTop: vv ? Math.round(vv.offsetTop) : 0,
                scrollY: Math.round(y),
                maxScrollY: Math.round(maxScrollRef.current),
            })
        }

        const onScroll = () => sample()
        const onResize = () => {
            push("RESIZE")
            sample()
        }
        const onVVResize = () => {
            push("VV-RESIZE")
            sample()
        }
        const onVVScroll = () => {
            push("VV-SCROLL")
            sample()
        }

        sample()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)
        window.visualViewport?.addEventListener("resize", onVVResize)
        window.visualViewport?.addEventListener("scroll", onVVScroll)

        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
            window.visualViewport?.removeEventListener("resize", onVVResize)
            window.visualViewport?.removeEventListener("scroll", onVVScroll)
        }
    }, [])

    return (
        <div
            onClick={() => {
                setLog([])
                maxScrollRef.current = 0
            }}
            style={{
                position: "fixed",
                top: 8,
                left: 8,
                zIndex: 999999,
                width: 210,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.82)",
                color: "#9CE325",
                font: "600 11px/1.35 ui-monospace, Menlo, monospace",
                pointerEvents: "auto",
                userSelect: "none",
                whiteSpace: "pre",
            }}
        >
            {`innerH   ${now.innerH}
vv.H     ${now.vvH}
vv.top   ${now.vvTop}
scrollY  ${now.scrollY}
maxY     ${now.maxScrollY}
────────── (tap = clear)`}
            {log.length > 0 && "\n" + log.join("\n")}
        </div>
    )
}

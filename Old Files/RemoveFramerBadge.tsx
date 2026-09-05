import { useEffect } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * RemoveFramerBadge
 *
 * Drop this component anywhere on the page. It renders a tiny invisible
 * element, then on load finds the "Made in Framer" badge in the DOM and
 * removes it, and keeps watching in case Framer re-injects it.
 *
 * Note: only affects the DOM in preview / published sites — it cannot run
 * inside the Framer editor canvas itself.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */

// Selectors Framer has used for the badge over time. We try all of them.
const BADGE_SELECTORS = [
    "#__framer-badge-container",
    "#__framer-badge",
    ".__framer-badge",
    "a[href*='framer.com'][class*='badge']",
    "a[href*='framer.com?via']",
    "[data-framer-name='Badge']",
]

function removeBadges() {
    if (typeof document === "undefined") return

    for (const selector of BADGE_SELECTORS) {
        document.querySelectorAll(selector).forEach((el) => el.remove())
    }

    // Fallback: any anchor that links to framer.com and looks like the badge.
    document.querySelectorAll("a[href*='framer.com']").forEach((el) => {
        const text = (el.textContent || "").toLowerCase()
        if (text.includes("made in framer") || text.includes("made with framer")) {
            el.remove()
        }
    })
}

export default function RemoveFramerBadge(props) {
    useEffect(() => {
        // Run now (after load) and again shortly after, since Framer
        // sometimes injects the badge a beat after hydration.
        removeBadges()
        const timers = [
            setTimeout(removeBadges, 500),
            setTimeout(removeBadges, 1500),
            setTimeout(removeBadges, 3000),
        ]

        // Keep watching so a re-injected badge gets removed too.
        const observer = new MutationObserver(() => removeBadges())
        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            timers.forEach(clearTimeout)
            observer.disconnect()
        }
    }, [])

    // A measurable, invisible element so Framer treats this as a real,
    // insertable component (a pure `null` return often won't show up).
    return (
        <div
            style={{
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

addPropertyControls(RemoveFramerBadge, {})

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/**
 * ScrollNav — a hide-on-scroll overlay navbar for Framer (desktop + mobile)
 *
 * A floating pill navigation that sits fixed over the page as an overlay: it
 * never pushes your sections up or down. It reveals when you scroll UP and
 * tucks itself away when you scroll DOWN, so it stays out of the way while
 * reading and comes back the instant you reach for it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Scrolling to your Framer sections
 * ─────────────────────────────────────────────────────────────────────────
 * Each nav item has a "Target". The component resolves it, in order, as:
 *
 *   1. A raw CSS selector, if it starts with #, . or [  (e.g. "#pricing")
 *   2. An element id                                      (e.g. "pricing")
 *   3. A Framer layer name                                (e.g. "Pricing")
 *
 * The easiest, zero-setup path is (3): Framer emits every layer's name as a
 * `data-framer-name` attribute in the published DOM. So just NAME the section
 * you want to jump to in Framer's layers panel (say, "Work"), then type that
 * same name — "Work" — into the item's Target field. Done.
 *
 * If a name isn't unique enough (Framer can repeat names on nested layers), add
 * an explicit id to the section via a code override or an Embed, and target it
 * with "#your-id" instead.
 *
 * Note: matching only works in Preview / on the published site — the Framer
 * editor canvas doesn't render your other sections into this component's world,
 * so on the canvas the bar just sits there static so you can style it.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 900
 * @framerIntrinsicHeight 64
 * @framerDisableUnlink
 */
export default function ScrollNav(props) {
    const {
        items,
        brandText,
        brandLogo,
        brandTarget,
        // behaviour
        waitForLoader,
        loaderTimeout,
        edge,
        edgeGap,
        sideGap,
        maxWidth,
        fitContent,
        alignment,
        breakpoint,
        collapseOnMobile,
        menuAlign,
        menuLabel,
        hideThreshold,
        revealAtTop,
        scrollOffset,
        highlightActive,
        // visual
        accent,
        background,
        textColor,
        mutedColor,
        borderColor,
        blur,
        radius,
        pillRadius,
        itemFont,
        brandFont,
        fontSize,
        firstItemFilled,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Below the breakpoint we treat this as "mobile" and let each item swap in
    // its own mobile label / drop out entirely. Items flagged mobile-only are
    // filtered the other way on desktop.
    const isMobile = useIsMobile(breakpoint)
    const safeItems = (items && items.length ? items : []).filter((it) =>
        isMobile ? !it.hideOnMobile : !it.desktopHidden
    )

    // Reveal on scroll-up, hide on scroll-down. On the canvas we force it open.
    const { visible: scrollVisible, lockScroll } = useHideOnScroll({
        hideThreshold,
        revealAtTop,
        enabled: !isCanvas,
    })

    // Tuck the nav away entirely while a full-screen overlay from another
    // section is open (AbilitiesMobile / WhatIBuildMobile), so it doesn't float
    // on top of it. Those overlays lock the page by setting body overflow
    // "hidden"; we watch that flag as the "an overlay is open" signal.
    const overlayOpen = useOverlayOpen(!isCanvas)

    // Stay hidden until the SplinePreloader broadcasts "loading done" (via
    // window.__splineGate). Falls back to visible after a timeout so the nav
    // can never be trapped off-screen if no preloader is present.
    const loaderReady = useLoadingGate(
        Boolean(waitForLoader) && !isCanvas,
        loaderTimeout
    )

    const visible = scrollVisible && !overlayOpen && loaderReady

    // Scroll-spy: which target is currently in view. Feeds both the desktop
    // pill highlight and the mobile "current section" label, so it also runs
    // when collapsing on mobile even if the highlight itself is off.
    const activeIndex = useScrollSpy(
        safeItems,
        isMobile,
        scrollOffset,
        (highlightActive || collapseOnMobile) && !isCanvas
    )

    // Below the breakpoint the pills collapse behind a hamburger. `open` is the
    // dropdown's state; it closes the moment we widen back to the desktop bar.
    const collapsed = isMobile && collapseOnMobile
    const [open, setOpen] = useState(false)
    useEffect(() => {
        if (!collapsed) setOpen(false)
    }, [collapsed])

    // Wraps the whole nav (bar + dropdown) so a tap anywhere inside it — pill,
    // hamburger, or menu — counts as "inside" for the close-on-outside logic.
    const containerRef = useRef<HTMLElement>(null)

    // Tap outside the bar / dropdown closes the menu.
    useEffect(() => {
        if (!open) return
        const onDown = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("pointerdown", onDown)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("pointerdown", onDown)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    // Portal the bar to <body> so a transformed Framer ancestor can never trap
    // its position:fixed (which is what makes a fixed bar balloon / mis-place).
    // Rendered inline on the canvas so it stays editable, and only after mount
    // in the browser to avoid an SSR/hydration mismatch.
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const go = useCallback(
        (target?: string) => {
            setOpen(false)
            if (isCanvas) return
            lockScroll() // keep the bar up while the click-scroll settles
            scrollToTarget(target, scrollOffset)
        },
        [isCanvas, scrollOffset, lockScroll]
    )

    // On mobile the whole pill defaults to the top-right corner, regardless of
    // the (desktop-oriented) Align control. Desktop keeps the chosen alignment.
    const effectiveAlignment = isMobile ? "right" : alignment
    const justify =
        effectiveAlignment === "left"
            ? "flex-start"
            : effectiveAlignment === "right"
              ? "flex-end"
              : "center"

    // Menu should never linger after the bar tucks away on scroll-down.
    useEffect(() => {
        if (!visible) setOpen(false)
    }, [visible])

    const hasBrand = Boolean(brandText || brandLogo)

    // On mobile, when there's no brand, the collapsed bar shows the name of the
    // section you're currently in beside the ☰ button — so it's never an empty
    // strip, and it doubles as a "you are here" indicator. Falls back to the
    // Menu Label when nothing is in view yet (e.g. at the top of the page).
    const activeItem = activeIndex >= 0 ? safeItems[activeIndex] : null
    const activeLabel = activeItem
        ? (isMobile && activeItem.mobileLabel) || activeItem.label
        : menuLabel || "Menu"

    // Frosted-glass backdrop, shared by the bar and the dropdown. `saturate`
    // is what gives it that lively, colour-rich glass look rather than a flat
    // grey blur. The menu blurs a touch harder so it reads as solid over busy
    // content behind it.
    //
    // IMPORTANT: glass only blurs when NO ancestor has a transform/filter/
    // opacity — such an ancestor becomes the "backdrop root" and the blur ends
    // up sampling nothing. That's why the show/hide below animates `top`/`bottom`
    // (position) rather than a transform, and why the bar carries no ancestor
    // opacity animation.
    const glass = blur ? `blur(${blur}px) saturate(160%)` : "none"
    const menuGlass = blur ? `blur(${blur + 4}px) saturate(170%)` : "none"

    // Mobile dropdown anchor, relative to the full-width <nav> (so it can't run
    // off-screen). Full width = viewport minus the side gaps, i.e. centred.
    // Left/right pin a comfortably wide menu to that viewport edge.
    const menuWide = {
        minWidth: 240,
        maxWidth: `calc(100vw - ${sideGap * 2 + 8}px)`,
        boxSizing: "border-box" as const,
    }
    const menuPos =
        menuAlign === "left"
            ? { left: sideGap, ...menuWide }
            : menuAlign === "right"
              ? { right: sideGap, ...menuWide }
              : { left: sideGap, right: sideGap }

    const tokens = {
        accent,
        borderColor,
        mutedColor,
        textColor,
        pillRadius,
        itemFont,
        fontSize,
    }

    // One item renderer for both layouts: horizontal "pill" on the desktop bar,
    // full-width "row" inside the mobile dropdown.
    const renderItems = (variant: "pill" | "row") =>
        safeItems.map((item, i) => {
            const isActive = highlightActive && i === activeIndex
            const primary = firstItemFilled && i === 0
            const label =
                (isMobile && item.mobileLabel) || item.label || `Item ${i + 1}`
            return (
                <NavItem
                    key={(item.label || "item") + i}
                    variant={variant}
                    label={label}
                    isActive={isActive}
                    primary={primary}
                    tokens={tokens}
                    onClick={() => go(pickTarget(item, isMobile))}
                />
            )
        })

    const empty = !safeItems.length && (
        <span
            style={{
                color: mutedColor,
                fontSize,
                padding: "9px 12px",
                whiteSpace: "nowrap",
            }}
        >
            Add nav items in the panel →
        </span>
    )

    const bar = (
        // Outer fixed layer spans the viewport width and does the positioning.
        // It is the overlay: pointer-events are off here so the strip below it
        // is the only thing that can be clicked, and the page stays usable.
        <motion.nav
            ref={containerRef}
            initial={false}
            // Slide via `top`/`bottom` (position), NOT transform: a transform
            // here would sit above the glass and stop backdrop-filter from
            // blurring the page. No opacity animation for the same reason.
            animate={
                isCanvas
                    ? undefined
                    : edge === "bottom"
                      ? { bottom: visible ? edgeGap : -320 }
                      : { top: visible ? edgeGap : -320 }
            }
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            style={{
                ...(isCanvas ? style : null),
                position: isCanvas ? "relative" : "fixed",
                left: 0,
                right: 0,
                [edge === "bottom" ? "bottom" : "top"]: isCanvas
                    ? undefined
                    : edgeGap,
                zIndex: 2147483000,
                display: "flex",
                justifyContent: justify,
                padding: `0 ${sideGap}px`,
                pointerEvents: "none",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    position: "relative",
                    pointerEvents: "auto",
                    // Hug the content when Fit width is on (maxWidth still caps
                    // it, so an overloaded bar caps out and scrolls instead of
                    // running off-screen); otherwise fill up to maxWidth.
                    width: fitContent ? "auto" : "100%",
                    maxWidth,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        hasBrand || collapsed ? "space-between" : justify,
                    gap: 12,
                    boxSizing: "border-box",
                    padding:
                        hasBrand || collapsed
                            ? "8px 10px 8px 16px"
                            : "8px 10px",
                    borderRadius: radius,
                    border: `1px solid ${borderColor}`,
                    background,
                    backdropFilter: glass,
                    WebkitBackdropFilter: glass,
                    boxShadow:
                        "0 10px 30px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                    WebkitTapHighlightColor: "transparent",
                }}
            >
                {hasBrand && (
                    <button
                        onClick={() => go(brandTarget)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            border: "none",
                            background: "transparent",
                            padding: "4px 6px",
                            cursor: "pointer",
                            color: textColor,
                            flex: "0 0 auto",
                        }}
                    >
                        {brandLogo && (
                            <img
                                src={brandLogo}
                                alt=""
                                style={{
                                    height: 24,
                                    width: "auto",
                                    display: "block",
                                    objectFit: "contain",
                                }}
                            />
                        )}
                        {brandText && (
                            <span
                                style={{
                                    ...brandFont,
                                    fontSize: fontSize + 2,
                                    fontWeight: 700,
                                    letterSpacing: "-0.01em",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {brandText}
                            </span>
                        )}
                    </button>
                )}

                {collapsed ? (
                    // Mobile: the current section's name (only when there's no
                    // brand taking the left slot) + a hamburger that toggles the
                    // dropdown below.
                    <>
                        {!hasBrand && (
                            <span
                                aria-live="polite"
                                style={{
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                    ...itemFont,
                                    fontSize,
                                    fontWeight: 700,
                                    letterSpacing: "-0.01em",
                                    color: accent,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {activeLabel}
                            </span>
                        )}
                        <button
                            onClick={() => setOpen((o) => !o)}
                            aria-label="Menu"
                            aria-expanded={open}
                            style={{
                                flex: "0 0 auto",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 42,
                                height: 38,
                                padding: 0,
                                borderRadius: Math.min(pillRadius, 12),
                                border: `1px solid ${
                                    open ? accent : borderColor
                                }`,
                                background: open
                                    ? `color-mix(in srgb, ${accent} 14%, transparent)`
                                    : "transparent",
                                color: open ? accent : textColor,
                                cursor: "pointer",
                                transition:
                                    "background .18s ease, border-color .18s ease, color .18s ease",
                            }}
                        >
                            <HamburgerIcon open={open} />
                        </button>
                    </>
                ) : (
                    // Desktop: the pill row. Horizontally scrollable as a last
                    // resort so it can never overflow the container.
                    <div
                        className="scrollnav-rail"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            overflowX: "auto",
                            overflowY: "hidden",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                            flex: hasBrand ? "0 1 auto" : "1 1 auto",
                            justifyContent: hasBrand ? "flex-end" : justify,
                            minWidth: 0,
                        }}
                    >
                        <style>{`.scrollnav-rail::-webkit-scrollbar{display:none}`}</style>
                        {renderItems("pill")}
                        {empty}
                    </div>
                )}
            </div>

            {/* Mobile dropdown — a normal menu panel anchored under the bar, NOT
             * a full-screen overlay. It's a child of the full-width <nav> (not
             * the fit-width bar) so its left/right anchor to the viewport edges
             * and it can never spill off-screen. */}
            <AnimatePresence>
                {collapsed && open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{
                            duration: 0.2,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                            position: "absolute",
                            pointerEvents: "auto",
                            top: edge === "bottom" ? undefined : "100%",
                            bottom: edge === "bottom" ? "100%" : undefined,
                            marginTop: edge === "bottom" ? undefined : 8,
                            marginBottom: edge === "bottom" ? 8 : undefined,
                            ...menuPos,
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            padding: 8,
                            borderRadius: radius,
                            border: `1px solid ${borderColor}`,
                            background,
                            backdropFilter: menuGlass,
                            WebkitBackdropFilter: menuGlass,
                            boxShadow:
                                "0 18px 40px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
                            transformOrigin:
                                edge === "bottom" ? "bottom" : "top",
                        }}
                    >
                        {renderItems("row")}
                        {empty}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    )

    // Canvas: render inline so Framer can place & style it. Browser: portal to
    // <body> after mount so no transformed ancestor can trap the fixed bar.
    if (isCanvas) return bar
    if (!mounted || typeof document === "undefined") return null
    return createPortal(bar, document.body)
}

/* --------------------------------------------------------------- nav item */

/** A single nav entry, styled as a horizontal pill or a full-width menu row. */
function NavItem({ variant, label, isActive, primary, tokens, onClick }) {
    const { accent, borderColor, mutedColor, textColor, pillRadius, itemFont, fontSize } =
        tokens
    const lit = isActive || primary
    const row = variant === "row"

    return (
        <button
            onClick={onClick}
            aria-current={isActive ? "page" : undefined}
            style={{
                flex: row ? "0 0 auto" : "0 0 auto",
                width: row ? "100%" : undefined,
                display: row ? "flex" : "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: row ? "12px 14px" : "9px 16px",
                borderRadius: row ? Math.min(pillRadius, 12) : pillRadius,
                border: `1px solid ${
                    lit ? accent : row ? "transparent" : borderColor
                }`,
                background: primary
                    ? `color-mix(in srgb, ${accent} 22%, transparent)`
                    : isActive
                      ? `color-mix(in srgb, ${accent} 12%, transparent)`
                      : "transparent",
                color: lit ? accent : row ? textColor : mutedColor,
                ...itemFont,
                fontSize,
                fontWeight: lit ? 700 : 500,
                letterSpacing: "-0.01em",
                whiteSpace: row ? "normal" : "nowrap",
                textAlign: "center",
                cursor: "pointer",
                transition:
                    "background .18s ease, color .18s ease, border-color .18s ease",
            }}
            onMouseEnter={(e) => {
                if (lit) return
                e.currentTarget.style.color = textColor
                e.currentTarget.style.background = row
                    ? `color-mix(in srgb, ${accent} 8%, transparent)`
                    : "transparent"
                if (!row)
                    e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 45%, ${borderColor})`
            }}
            onMouseLeave={(e) => {
                if (lit) return
                e.currentTarget.style.color = row ? textColor : mutedColor
                e.currentTarget.style.background = "transparent"
                if (!row) e.currentTarget.style.borderColor = borderColor
            }}
        >
            {label}
        </button>
    )
}

/** Three lines that cross into an X when the menu is open. */
function HamburgerIcon({ open }: { open: boolean }) {
    const common = {
        height: 1.8,
        width: 18,
        borderRadius: 2,
        background: "currentColor",
        transition: "transform .22s ease, opacity .18s ease",
    } as React.CSSProperties
    return (
        <span
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                width: 18,
            }}
        >
            <span
                style={{
                    ...common,
                    transform: open ? "translateY(5.8px) rotate(45deg)" : "none",
                }}
            />
            <span style={{ ...common, opacity: open ? 0 : 1 }} />
            <span
                style={{
                    ...common,
                    transform: open
                        ? "translateY(-5.8px) rotate(-45deg)"
                        : "none",
                }}
            />
        </span>
    )
}

/* ------------------------------------------------------------------- hooks */

/**
 * True when the viewport is narrower than `breakpoint`. Drives per-item mobile
 * labels and mobile/desktop-only visibility. Reads once on mount and follows a
 * matchMedia listener after that, so it stays correct through rotations and
 * window resizes without a scroll-style poll.
 */
function useIsMobile(breakpoint: number) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
        const update = () => setIsMobile(mq.matches)
        update()
        // addEventListener is the modern API; older Safari only has addListener.
        mq.addEventListener?.("change", update)
        mq.addListener?.(update)
        return () => {
            mq.removeEventListener?.("change", update)
            mq.removeListener?.(update)
        }
    }, [breakpoint])

    return isMobile
}

/**
 * Gates the nav on the page's loading screen. While `enabled`, stays `false`
 * until SplinePreloader dispatches "spline:done" on the shared window gate —
 * then flips to `true` so the bar can slide in. A safety timeout reveals it
 * anyway if no preloader ever signals (so the nav is never trapped off-screen).
 */
function useLoadingGate(enabled: boolean, timeoutMs: number) {
    const [ready, setReady] = useState(!enabled)

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            setReady(true)
            return
        }
        const w = window as any
        const g =
            w.__splineGate ||
            (w.__splineGate = {
                done: false,
                registered: new Set(),
                ready: new Set(),
                bus: new EventTarget(),
            })
        if (g.done) {
            setReady(true)
            return
        }
        setReady(false)
        const onDone = () => setReady(true)
        g.bus.addEventListener("spline:done", onDone)
        const fallback = window.setTimeout(
            () => setReady(true),
            Math.max(1000, timeoutMs || 12000)
        )
        return () => {
            g.bus.removeEventListener("spline:done", onDone)
            window.clearTimeout(fallback)
        }
    }, [enabled, timeoutMs])

    return ready
}

/**
 * True while another mobile section has a full-screen overlay open. Those
 * overlays (AbilitiesMobile, WhatIBuildMobile) lock the page while they're up
 * by setting `document.body.style.overflow = "hidden"`; we watch that attribute
 * with a MutationObserver and treat it as the "an overlay is open" signal, so
 * the nav can tuck itself away and never float on top of an overlay.
 */
function useOverlayOpen(enabled: boolean) {
    const [overlayOpen, setOverlayOpen] = useState(false)

    useEffect(() => {
        if (!enabled || typeof document === "undefined") {
            setOverlayOpen(false)
            return
        }
        const read = () =>
            setOverlayOpen(document.body.style.overflow === "hidden")
        read()
        const obs = new MutationObserver(read)
        obs.observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
        })
        return () => obs.disconnect()
    }, [enabled])

    return overlayOpen
}

/**
 * Visible when the user scrolls UP (or sits near the top); hidden when they
 * scroll DOWN past a small threshold.
 *
 * The read is rAF-throttled and only flips state when the pointer has moved
 * more than a few pixels, so momentum jitter near the reversal point doesn't
 * make the bar flicker.
 */
function useHideOnScroll({
    hideThreshold,
    revealAtTop,
    enabled,
}: {
    hideThreshold: number
    revealAtTop: number
    enabled: boolean
}) {
    const [visible, setVisible] = useState(true)
    const lastY = useRef(0)
    const ticking = useRef(false)
    // True while a click-triggered smooth scroll is running, so the automatic
    // downward motion of jumping to a lower section doesn't hide the bar.
    const lockRef = useRef(false)
    const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            setVisible(true)
            return
        }

        lastY.current = window.scrollY || 0

        const evaluate = () => {
            ticking.current = false
            const y = window.scrollY || 0

            // Locked (click-scroll in flight): stay up, just follow the position
            // so that when the lock lifts we measure from where we landed.
            if (lockRef.current) {
                lastY.current = y
                setVisible(true)
                return
            }

            const delta = y - lastY.current

            // Always show near the very top of the page.
            if (y <= revealAtTop) {
                setVisible(true)
                lastY.current = y
                return
            }

            // Ignore tiny movements so we don't toggle on momentum wobble.
            if (Math.abs(delta) < Math.max(4, hideThreshold)) return

            setVisible(delta < 0) // up → show, down → hide
            lastY.current = y
        }

        const onScroll = () => {
            // Release the lock once the programmatic scroll has settled — no
            // scroll events for a short beat — resuming from the landing point.
            if (lockRef.current) {
                if (settleRef.current) clearTimeout(settleRef.current)
                settleRef.current = setTimeout(() => {
                    lockRef.current = false
                    lastY.current = window.scrollY || 0
                }, 160)
            }
            if (ticking.current) return
            ticking.current = true
            requestAnimationFrame(evaluate)
        }

        window.addEventListener("scroll", onScroll, { passive: true })
        return () => {
            window.removeEventListener("scroll", onScroll)
            if (settleRef.current) clearTimeout(settleRef.current)
        }
    }, [enabled, hideThreshold, revealAtTop])

    // Call right before a click-triggered smooth scroll: pins the bar open until
    // the scroll settles. The fallback timer covers the case where the target is
    // already in view and no scroll events fire at all.
    const lockScroll = useCallback(() => {
        lockRef.current = true
        setVisible(true)
        if (settleRef.current) clearTimeout(settleRef.current)
        settleRef.current = setTimeout(() => {
            lockRef.current = false
            lastY.current = window.scrollY || 0
        }, 220)
    }, [])

    return { visible, lockScroll }
}

/**
 * Reports which nav item's target section currently owns the viewport, so the
 * matching pill can be highlighted as you scroll. Purely read-only; falls back
 * to -1 (nothing lit) when highlighting is off or a target can't be found.
 */
function useScrollSpy(
    items: any[],
    isMobile: boolean,
    offset: number,
    enabled: boolean
) {
    const [active, setActive] = useState(-1)

    useEffect(() => {
        if (!enabled || typeof window === "undefined" || !items.length) {
            setActive(-1)
            return
        }

        let ticking = false

        const measure = () => {
            ticking = false
            // The line just below the bar is the "reading" line; whichever
            // target has crossed above it most recently is the active one.
            const line = offset + 8
            let best = -1
            for (let i = 0; i < items.length; i++) {
                const el = resolveTarget(pickTarget(items[i], isMobile))
                if (!el) continue
                const top = el.getBoundingClientRect().top
                if (top - line <= 0) best = i
            }
            setActive(best)
        }

        const onScroll = () => {
            if (ticking) return
            ticking = true
            requestAnimationFrame(measure)
        }

        measure()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
        }
    }, [items, isMobile, offset, enabled])

    return active
}

/* --------------------------------------------------------------- targeting */

/**
 * The layer to jump to for a given item. When the page is in its mobile layout
 * (a separate component with its own layer names), the item's Mobile Target
 * wins; otherwise it falls back to the shared Target.
 */
function pickTarget(item: any, isMobile: boolean): string | undefined {
    return (isMobile && item?.mobileTarget) || item?.target
}

/**
 * Turns a Target string into a DOM element.
 *   • starts with # . or [  → treated as a raw CSS selector
 *   • otherwise             → tried as an element id, then as a Framer layer
 *                             name via [data-framer-name="..."]
 */
function resolveTarget(target?: string): HTMLElement | null {
    if (!target || typeof document === "undefined") return null
    const t = target.trim()
    if (!t) return null

    // 1. Raw CSS selector.
    if (/^[#.\[]/.test(t)) {
        try {
            const el = document.querySelector(t)
            if (el) return el as HTMLElement
        } catch {
            /* invalid selector — fall through */
        }
    }

    // 2. Plain element id.
    const byId = document.getElementById(t)
    if (byId) return byId

    // 3. Framer layer name.
    try {
        const escaped = t.replace(/"/g, '\\"')
        const byName = document.querySelector(
            `[data-framer-name="${escaped}"]`
        )
        if (byName) return byName as HTMLElement
    } catch {
        /* ignore */
    }

    return null
}

/** Smooth-scroll the window so the target sits `offset` px below the top. */
function scrollToTarget(target?: string, offset = 0) {
    const el = resolveTarget(target)
    if (!el) return
    const top =
        el.getBoundingClientRect().top + (window.scrollY || 0) - (offset || 0)
    window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
}

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
}

/* ---------------------------------------------------------- property panel */

addPropertyControls(ScrollNav, {
    items: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.Object,
            controls: {
                label: {
                    type: ControlType.String,
                    title: "Label",
                    defaultValue: "Section",
                },
                mobileLabel: {
                    type: ControlType.String,
                    title: "Mobile Label",
                    placeholder: "Falls back to Label",
                },
                target: {
                    type: ControlType.String,
                    title: "Target",
                    placeholder: "Framer layer name, #id or .class",
                },
                mobileTarget: {
                    type: ControlType.String,
                    title: "Mobile Target",
                    placeholder: "Falls back to Target",
                    description:
                        "Use when the mobile layout is a separate component with its own layer names.",
                },
                hideOnMobile: {
                    type: ControlType.Boolean,
                    title: "Hide on Mobile",
                    defaultValue: false,
                },
                desktopHidden: {
                    type: ControlType.Boolean,
                    title: "Mobile Only",
                    defaultValue: false,
                },
            },
        },
        defaultValue: [
            { label: "Making Nonprofits AI-Native", target: "" },
            { label: "Learning Simulations", target: "" },
        ],
    },

    brandText: {
        type: ControlType.String,
        title: "Brand",
        defaultValue: "",
        placeholder: "Optional name / left slot",
    },
    brandLogo: {
        type: ControlType.Image,
        title: "Logo",
    },
    brandTarget: {
        type: ControlType.String,
        title: "Brand → ",
        placeholder: "Target when brand is tapped",
        hidden: (p) => !p.brandText && !p.brandLogo,
    },

    waitForLoader: {
        type: ControlType.Boolean,
        title: "Wait for Loader",
        enabledTitle: "Yes",
        disabledTitle: "No",
        defaultValue: false,
        description:
            "Keep the nav hidden until the SplinePreloader loading screen finishes.",
    },
    loaderTimeout: {
        type: ControlType.Number,
        title: "Loader Timeout",
        min: 1000,
        max: 30000,
        step: 500,
        defaultValue: 12000,
        unit: "ms",
        description: "Show the nav anyway if the loader never signals.",
        hidden: (p) => !p.waitForLoader,
    },

    edge: {
        type: ControlType.Enum,
        title: "Dock",
        options: ["top", "bottom"],
        optionTitles: ["Top", "Bottom"],
        defaultValue: "top",
        displaySegmentedControl: true,
    },
    edgeGap: {
        type: ControlType.Number,
        title: "Edge Gap",
        min: 0,
        max: 80,
        defaultValue: 16,
        unit: "px",
    },
    sideGap: {
        type: ControlType.Number,
        title: "Side Gap",
        min: 0,
        max: 80,
        defaultValue: 16,
        unit: "px",
    },
    fitContent: {
        type: ControlType.Boolean,
        title: "Width",
        enabledTitle: "Fit",
        disabledTitle: "Fill",
        defaultValue: true,
        description: "Hug the items, or fill up to Max Width.",
    },
    maxWidth: {
        type: ControlType.Number,
        title: "Max Width",
        min: 200,
        max: 1600,
        defaultValue: 720,
        unit: "px",
    },
    alignment: {
        type: ControlType.Enum,
        title: "Align",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "center",
        displaySegmentedControl: true,
        hidden: (p) => Boolean(p.brandText || p.brandLogo),
    },
    breakpoint: {
        type: ControlType.Number,
        title: "Mobile ≤",
        min: 320,
        max: 1200,
        defaultValue: 810,
        unit: "px",
        description:
            "At or below this width, items use their mobile label and mobile visibility.",
    },
    collapseOnMobile: {
        type: ControlType.Boolean,
        title: "Collapse",
        enabledTitle: "Menu",
        disabledTitle: "Pills",
        defaultValue: true,
        description: "Below the breakpoint, collapse items into a ☰ menu.",
    },
    menuAlign: {
        type: ControlType.Enum,
        title: "Menu",
        options: ["stretch", "left", "right"],
        optionTitles: ["Full width", "Left", "Right"],
        defaultValue: "stretch",
        displaySegmentedControl: true,
        hidden: (p) => !p.collapseOnMobile,
    },
    menuLabel: {
        type: ControlType.String,
        title: "Idle Label",
        defaultValue: "Menu",
        placeholder: "Shown before any section is in view",
        description:
            "Mobile: text shown beside ☰ until a section scrolls into view.",
        hidden: (p) => !p.collapseOnMobile,
    },

    hideThreshold: {
        type: ControlType.Number,
        title: "Sensitivity",
        min: 2,
        max: 40,
        defaultValue: 8,
        unit: "px",
        description: "How far you must scroll before it hides/shows.",
    },
    revealAtTop: {
        type: ControlType.Number,
        title: "Top Zone",
        min: 0,
        max: 400,
        defaultValue: 60,
        unit: "px",
        description: "Always shown within this distance of the top.",
    },
    scrollOffset: {
        type: ControlType.Number,
        title: "Scroll Offset",
        min: 0,
        max: 240,
        defaultValue: 90,
        unit: "px",
        description: "Gap left above a section when jumping to it.",
    },
    highlightActive: {
        type: ControlType.Boolean,
        title: "Scroll Spy",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: true,
        description: "Highlight the item whose section is in view.",
    },

    firstItemFilled: {
        type: ControlType.Boolean,
        title: "First = Primary",
        enabledTitle: "Filled",
        disabledTitle: "Outline",
        defaultValue: false,
    },

    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#A6FF3D",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(16,18,15,0.82)",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#EAF7DA",
    },
    mutedColor: {
        type: ControlType.Color,
        title: "Muted",
        defaultValue: "rgba(234,247,218,0.72)",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "rgba(166,255,61,0.28)",
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 40,
        defaultValue: 20,
        unit: "px",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 40,
        defaultValue: 18,
        unit: "px",
    },
    pillRadius: {
        type: ControlType.Number,
        title: "Pill Radius",
        min: 0,
        max: 40,
        defaultValue: 999,
        unit: "px",
    },
    fontSize: {
        type: ControlType.Number,
        title: "Font Size",
        min: 10,
        max: 22,
        defaultValue: 14,
        unit: "px",
    },
    itemFont: {
        type: ControlType.Font,
        title: "Item Font",
        controls: "extended",
        defaultValue: {
            fontSize: 14,
            variant: "Medium",
        },
    },
    brandFont: {
        type: ControlType.Font,
        title: "Brand Font",
        controls: "extended",
        defaultValue: {
            fontSize: 16,
            variant: "Bold",
        },
        hidden: (p) => !p.brandText,
    },
})

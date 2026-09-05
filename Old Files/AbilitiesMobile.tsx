import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
    animate,
} from "framer-motion"

/**
 * Abilities — Mobile
 *
 * Mobile rewrite of the desktop "fanned deck" section. The big section title
 * ("Abilities") is laid out in Framer above this component — it starts at the
 * deck.
 *
 *   • Cards are dealt in a fanned-out arc, pivoting from a point below the deck
 *   • One card sits front-and-centre (upright, on top); the rest splay out
 *   • Swipe left / right — or tap a dot — to deal a different card to the front
 *   • Tapping a splayed card brings it forward; tapping the front card opens
 *     its overlay
 *   • The overlay is a full-screen, vertically scrollable image (the card's
 *     "overlay image") — same pattern as the other mobile sections
 *
 * Each card carries its own three fields: Title, Cover (the face shown in the
 * fan) and Overlay (the tall image shown full-screen). Add as many as you like
 * in Cards.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 560
 */
export default function AbilitiesMobile(props) {
    const {
        cards,
        stageAspect,
        cardWidth,
        spreadAngle,
        spreadX,
        dropY,
        loop,
        showTitle,
        titleSize,
        titleWeight,
        showHint,
        hintText,
        accent,
        background,
        cardBackground,
        overlayBackground,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        radius,
        animateIn,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const inView = useRevealOnScroll(rootRef)

    // On the Framer canvas we skip the reveal entirely, otherwise the component
    // would sit there invisible while you edit it.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const revealed = isCanvas || !animateIn || inView

    const safeCards = cards && cards.length ? cards : []
    const count = safeCards.length
    const [overlay, setOverlay] = useState<number | null>(null)

    // `position` is the continuous, fractional cursor along the deck — the drag
    // writes to it every frame with no React render, and every card derives its
    // fan transform from it. `active` is only the *snapped* index, updated once
    // per settle, and used for the dots and for deciding which card a tap opens.
    const position = useMotionValue(0)
    const [active, setActive] = useState(0)
    const settleAnim = useRef<{ stop: () => void } | null>(null)

    // Animate the cursor to a target index and commit the snapped index. The
    // target may be fractional / out of range coming off a fling; we clamp (or
    // wrap, when looping) before springing there.
    const settleTo = useCallback(
        (target: number) => {
            if (count < 1) return
            const t = loop
                ? target
                : Math.max(0, Math.min(count - 1, target))
            const idx = loop ? ((Math.round(t) % count) + count) % count : t
            setActive(idx)
            settleAnim.current?.stop()
            settleAnim.current = animate(
                position,
                t,
                prefersReducedMotion()
                    ? { duration: 0 }
                    : {
                          type: "spring",
                          stiffness: 260,
                          damping: 32,
                          restDelta: 0.0004,
                      }
            )
        },
        [count, loop, position]
    )

    // Keep the cursor honest if cards are added / removed in the panel.
    useEffect(() => {
        if (active > count - 1) settleTo(Math.max(0, count - 1))
    }, [count, active, settleTo])

    const tokens = {
        accent,
        background,
        cardBackground,
        overlayBackground,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
    }

    const fan = {
        cardWidth,
        spreadAngle,
        spreadX,
        dropY,
    }

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                width: "100%",
                background,
                color: textColor,
                ...bodyFont,
                borderRadius: radius,
                padding: "8px 0 26px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            {/*
             * Reveal wrapper. Only opacity + translateY animate, so the laid-out
             * height is identical before, during and after — the page never
             * reflows. The overlay is deliberately kept outside this element: a
             * transformed ancestor would become the containing block for its
             * position: fixed.
             */}
            <motion.div
                variants={revealContainer}
                initial={false}
                animate={revealed ? "show" : "hidden"}
            >
                {showTitle && (
                    <motion.h2
                        variants={revealChild}
                        style={{
                            margin: "4px 0 6px",
                            textAlign: "center",
                            color: accent,
                            ...headingFont,
                            fontSize: titleSize,
                            fontWeight: titleWeight,
                            lineHeight: 1.05,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Abilities
                    </motion.h2>
                )}

                <motion.div variants={revealChild}>
                    <Deck
                        cards={safeCards}
                        position={position}
                        active={active}
                        loop={loop}
                        onSettle={settleTo}
                        onOpen={(i) => setOverlay(i)}
                        stageAspect={stageAspect}
                        fan={fan}
                        tokens={tokens}
                    />
                </motion.div>

                {count > 1 && (
                    <motion.div variants={revealChild}>
                        <Dots
                            count={count}
                            active={active}
                            onSelect={settleTo}
                            tokens={tokens}
                        />
                    </motion.div>
                )}

                {showHint && count > 1 && (
                    <motion.p
                        variants={revealChild}
                        style={{
                            margin: "14px 0 0",
                            textAlign: "center",
                            color: withAlpha(textColor, 0.5),
                            fontSize: 12.5,
                            letterSpacing: "0.04em",
                        }}
                    >
                        {hintText}
                    </motion.p>
                )}

                {!count && (
                    <div
                        style={{
                            padding: "40px 20px",
                            textAlign: "center",
                            color: mutedColor,
                            fontSize: 14,
                        }}
                    >
                        Add cards in the properties panel.
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {overlay !== null && safeCards[overlay] && (
                    <ImageOverlay
                        card={safeCards[overlay]}
                        tokens={tokens}
                        onClose={() => setOverlay(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ------------------------------------------------------------------ reveal */

const revealContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}

const revealChild = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
}

/* -------------------------------------------------------------------- deck */

/**
 * The fanned deck.
 *
 * The interaction is driven entirely by one motion value, `position` — the
 * continuous, fractional index of whatever sits front-and-centre. A pan writes
 * to it every frame (no React render), so a single long swipe travels smoothly
 * across the whole deck; on release we project the fling's momentum forward and
 * spring-snap to the nearest card. Every card reads `position` through
 * `useTransform`, so all the fan maths runs on the animation loop, off the React
 * render path — which is what keeps it at framerate.
 */
function Deck({
    cards,
    position,
    active,
    loop,
    onSettle,
    onOpen,
    stageAspect,
    fan,
    tokens,
}) {
    const count = cards.length

    // Pixels of horizontal drag that equal one card. Lower = a given swipe
    // covers more cards. Tuned so a comfortable thumb-swipe crosses ~2 cards and
    // a flick carries further via the projection below.
    const STEP = 96
    const base = useRef(0)
    // Set true as soon as a pan travels past a few px, so the tap handler on a
    // card can tell a real swipe apart from a stationary tap and not fire an
    // accidental "open" at the end of a drag.
    const panMoved = useRef(false)

    const clampPos = (p: number) =>
        loop ? p : Math.max(0, Math.min(count - 1, p))

    return (
        <motion.div
            onPanStart={() => {
                if (count < 2) return
                panMoved.current = false
                position.stop() // interrupt any in-flight snap
                base.current = position.get()
            }}
            onPan={(_, info) => {
                if (count < 2) return
                if (Math.abs(info.offset.x) > 6) panMoved.current = true
                let p = base.current - info.offset.x / STEP
                // Rubber-band past the ends instead of a hard wall, when not
                // looping — the fan can be over-pulled and eases back on release.
                if (!loop) {
                    if (p < 0) p = p * 0.35
                    else if (p > count - 1)
                        p = count - 1 + (p - (count - 1)) * 0.35
                }
                position.set(p)
            }}
            onPanEnd={(_, info) => {
                if (count < 2) return
                // Project the fling: fast flicks throw the cursor several cards
                // on; a slow release barely moves it. Then snap to the nearest.
                const projected =
                    position.get() - (info.velocity.x / STEP) * 0.16
                onSettle(Math.round(clampPos(projected)))
            }}
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: stageAspect,
                // Let vertical page scroll through; we own the horizontal axis.
                touchAction: "pan-y",
                cursor: count > 1 ? "grab" : "default",
                WebkitUserSelect: "none",
                userSelect: "none",
            }}
        >
            {cards.map((card, i) => (
                <FanCard
                    key={i}
                    card={card}
                    index={i}
                    position={position}
                    count={count}
                    loop={loop}
                    widthPct={fan.cardWidth}
                    spreadAngle={fan.spreadAngle}
                    spreadX={fan.spreadX}
                    dropY={fan.dropY}
                    tokens={tokens}
                    onActivate={() => {
                        // A tap that wasn't a drag: open the front card, or bring
                        // a splayed one forward. A swipe that ended over this card
                        // set panMoved — swallow that so it can't open anything.
                        if (panMoved.current) {
                            panMoved.current = false
                            return
                        }
                        if (i === active) onOpen(i)
                        else onSettle(i)
                    }}
                />
            ))}
        </motion.div>
    )
}

/**
 * Wrap a signed card distance into the nearest way round a looped ring, so the
 * card just before the active one fans to the left rather than splaying the
 * whole deck the long way across. A no-op when not looping.
 */
function wrapRel(rel: number, count: number, loop: boolean) {
    if (!loop || count < 2) return rel
    let r = rel % count
    if (r > count / 2) r -= count
    else if (r < -count / 2) r += count
    return r
}

/* --------------------------------------------------------------- fan card */

/**
 * A single card, whose entire transform is a live function of the shared
 * `position` motion value. Nothing here re-renders during a swipe: `useTransform`
 * recomputes rotate / x / y / scale / opacity / z on the animation loop and
 * writes them straight to the DOM node.
 */
function FanCard({
    card,
    index,
    position,
    count,
    loop,
    widthPct,
    spreadAngle,
    spreadX,
    dropY,
    tokens,
    onActivate,
}) {
    // Signed, wrapped distance of this card from the front-and-centre cursor.
    const rel = useTransform(position, (p) =>
        wrapRel(index - p, count, loop)
    )

    const rotate = useTransform(rel, (r) => r * spreadAngle)
    const x = useTransform(rel, (r) => r * spreadX)
    const y = useTransform(rel, (r) => Math.abs(r) * dropY)
    const scale = useTransform(rel, (r) => 1 - Math.min(Math.abs(r), 5) * 0.05)
    const opacity = useTransform(rel, (r) => {
        const a = Math.abs(r)
        return a > 3.4 ? 0 : 1 - a * 0.13
    })
    // Nearer cards stack on top. Rounded so it only changes as cards cross.
    const zIndex = useTransform(rel, (r) => 1000 - Math.round(Math.abs(r) * 10))
    // Far, faded cards drop out of hit-testing so they can't intercept a tap
    // meant for a card in front of them.
    const pointerEvents = useTransform(rel, (r) =>
        Math.abs(r) > 2.6 ? "none" : "auto"
    )

    return (
        <motion.article
            onTap={onActivate}
            role="button"
            aria-label={card.title || "Card"}
            style={{
                position: "absolute",
                // Top-anchored, not vertically centred: the fan splays downward
                // from here, so anchoring the top keeps the active card tucked
                // right under whatever sits above and leaves no dead space.
                top: 0,
                left: 0,
                right: 0,
                margin: "0 auto",
                width: `${widthPct}%`,
                // Pivot below the card so rotation fans the deck out from a hand-
                // held point rather than spinning each card in place.
                transformOrigin: "50% 135%",
                rotate,
                x,
                y,
                scale,
                opacity,
                zIndex,
                pointerEvents,
                cursor: "pointer",
                // Promote to its own compositor layer so the per-frame transform
                // stays on the GPU. (No drop-shadow filter: re-rasterising a
                // shadow every frame is the classic mobile-fan jank.)
                willChange: "transform",
                WebkitUserSelect: "none",
                userSelect: "none",
            }}
        >
            {card.cover ? (
                // The PNG is the card: shown at its own aspect ratio, never
                // cropped into a box, so nothing gets cut off the top or edges.
                <img
                    src={card.cover}
                    alt={card.title || ""}
                    draggable={false}
                    style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        pointerEvents: "none",
                    }}
                />
            ) : (
                <div
                    style={{
                        width: "100%",
                        aspectRatio: "3 / 4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: tokens.mutedColor,
                        fontSize: 12,
                    }}
                >
                    Add a cover image
                </div>
            )}
        </motion.article>
    )
}

/* ----------------------------------------------------------------- overlay */

/**
 * Full-screen, vertically scrollable overlay image — the card's second field.
 * Same body-scroll-lock + Android-back handling as the other mobile sections.
 */
function ImageOverlay({ card, tokens, onClose }) {
    // Lock body scroll behind the overlay.
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

    // Escape closes, for anyone driving this from a desktop preview.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    // Android hardware / gesture back button. Opening the overlay pushes a
    // throwaway history entry; the back button then pops it, firing popstate,
    // which we intercept to close the overlay instead of navigating away. Since
    // this entry only exists while the overlay is open, back falls straight
    // through to its default behaviour whenever nothing is open.
    //
    // The cleanup distinguishes the two ways the overlay can close:
    //   • closed by the back button   → our entry is already gone, leave history
    //   • closed by the ✕ / backdrop  → our entry is still on the stack, so pop
    //     it ourselves to keep history balanced.
    // The `abOverlay` marker on the state is what tells the two cases apart.
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (typeof window === "undefined" || !window.history) return

        window.history.pushState({ abOverlay: true }, "")
        const onPop = () => onClose()
        window.addEventListener("popstate", onPop)

        return () => {
            window.removeEventListener("popstate", onPop)
            if (window.history.state && window.history.state.abOverlay) {
                window.history.back()
            }
        }
        // onClose is recreated each render but only ever sets overlay → null,
        // so pinning this effect to mount/unmount is what we want.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: tokens.overlayBackground,
                display: "flex",
                flexDirection: "column",
                ...tokens.bodyFont,
            }}
        >
            <div
                style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "14px 16px",
                    borderBottom: `1px solid ${tokens.borderColor}`,
                }}
            >
                <span
                    style={{
                        color: tokens.textColor,
                        ...tokens.headingFont,
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {card.title}
                </span>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                        flex: "0 0 auto",
                        width: 34,
                        height: 34,
                        padding: 0,
                        borderRadius: 999,
                        border: `1px solid ${tokens.borderColor}`,
                        background: "transparent",
                        color: tokens.textColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    {/* An SVG rather than a "×" glyph — text crosses sit off the
                     * optical centre because of the font's side bearings. */}
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M1 1L12 12M12 1L1 12"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>

            <motion.div
                initial={{ y: 24 }}
                animate={{ y: 0 }}
                exit={{ y: 24 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                    // Slight inset left/right so the image doesn't run edge to
                    // edge; bottom room so the tail clears the scroll.
                    padding: "0 16px 32px",
                }}
            >
                {card.overlay ? (
                    <img
                        src={card.overlay}
                        alt={card.title || "Overlay"}
                        style={{
                            display: "block",
                            width: "100%",
                            height: "auto",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            padding: "60px 24px",
                            textAlign: "center",
                            color: tokens.mutedColor,
                            fontSize: 14,
                        }}
                    >
                        Add an overlay image to this card.
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}

/* -------------------------------------------------------------------- bits */

function Dots({ count, active, onSelect, tokens }) {
    return (
        <div
            style={{
                display: "flex",
                gap: 6,
                justifyContent: "center",
                marginTop: 20,
            }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(i)}
                    aria-label={`Go to card ${i + 1}`}
                    style={{
                        width: i === active ? 18 : 6,
                        height: 6,
                        padding: 0,
                        border: "none",
                        borderRadius: 999,
                        background:
                            i === active ? tokens.accent : tokens.borderColor,
                        cursor: "pointer",
                        transition: "width .2s ease, background .2s ease",
                    }}
                />
            ))}
        </div>
    )
}

/* ------------------------------------------------------------------- hooks */

/**
 * True once the element has first scrolled into view, then latched forever.
 *
 * Uses a bottom rootMargin rather than a threshold so it fires consistently
 * whether the section is shorter or taller than the viewport. Purely
 * observational: it reads layout, never writes it.
 */
function useRevealOnScroll(ref: React.RefObject<HTMLElement>) {
    const [seen, setSeen] = useState(false)

    useEffect(() => {
        if (seen) return
        const el = ref.current
        if (!el) return
        if (typeof IntersectionObserver === "undefined") {
            setSeen(true)
            return
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setSeen(true)
                    io.disconnect()
                }
            },
            { root: null, rootMargin: "0px 0px -12% 0px", threshold: 0 }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [ref, seen])

    return seen
}

function prefersReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Framer colour values arrive as hex or rgb/rgba strings; this re-alphas them
 * without needing color-mix, which some in-app webviews still render oddly.
 */
function withAlpha(color: string, alpha: number): string {
    if (!color) return `rgba(0,0,0,${alpha})`
    const c = color.trim()

    const hex = c.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const r = parseInt(h.slice(0, 2), 16)
        const g = parseInt(h.slice(2, 4), 16)
        const b = parseInt(h.slice(4, 6), 16)
        const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return `rgba(${r},${g},${b},${a * alpha})`
    }

    const rgb = c.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const parts = rgb[1].split(",").map((p) => p.trim())
        const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1
        return `rgba(${parts[0]},${parts[1]},${parts[2]},${a * alpha})`
    }

    return c
}

/* ------------------------------------------------------- property controls */

const cardControl = {
    type: ControlType.Object,
    controls: {
        title: {
            type: ControlType.String,
            title: "Title",
            displayTextArea: true,
            defaultValue: "Connecting the Dots",
        },
        cover: {
            type: ControlType.Image,
            title: "Cover",
            description: "The card face shown in the fan",
        },
        overlay: {
            type: ControlType.Image,
            title: "Overlay",
            description:
                "Tall image shown full-screen (scrollable) when the card is tapped",
        },
    },
}

addPropertyControls(AbilitiesMobile, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: cardControl,
        defaultValue: [
            { title: "Connecting the Dots" },
            { title: "Crafting Narratives" },
            { title: "Building from Zero" },
            { title: "Designing behaviour change" },
        ],
    },
    stageAspect: {
        type: ControlType.Enum,
        title: "Deck Height",
        description: "Aspect ratio of the area the fan lives in",
        options: ["5 / 4", "1 / 1", "4 / 5", "3 / 4"],
        optionTitles: ["5:4 (short)", "Square", "4:5", "3:4 (tall)"],
        defaultValue: "1 / 1",
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        description: "Front card width, % of the deck area",
        min: 40,
        max: 85,
        step: 1,
        defaultValue: 62,
    },
    spreadAngle: {
        type: ControlType.Number,
        title: "Fan Angle",
        description: "Degrees of tilt between neighbouring cards",
        min: 0,
        max: 26,
        step: 0.5,
        defaultValue: 12,
    },
    spreadX: {
        type: ControlType.Number,
        title: "Fan Spread",
        description: "Sideways gap between neighbouring cards (px)",
        min: 0,
        max: 80,
        step: 1,
        defaultValue: 26,
    },
    dropY: {
        type: ControlType.Number,
        title: "Fan Drop",
        description: "How far outer cards sink (px per step)",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 8,
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        description: "Wrap around past the first / last card",
        defaultValue: false,
    },
    showTitle: {
        type: ControlType.Boolean,
        title: "Title",
        description: "Show the built-in 'Abilities' heading",
        defaultValue: false,
    },
    titleSize: {
        type: ControlType.Number,
        title: "Title Size",
        min: 24,
        max: 72,
        step: 1,
        defaultValue: 44,
        hidden: (p) => !p.showTitle,
    },
    titleWeight: {
        type: ControlType.Enum,
        title: "Title Weight",
        options: ["400", "500", "600", "700", "800", "900"],
        optionTitles: [
            "Regular",
            "Medium",
            "Semibold",
            "Bold",
            "Extrabold",
            "Black",
        ],
        defaultValue: "800",
        hidden: (p) => !p.showTitle,
    },
    showHint: {
        type: ControlType.Boolean,
        title: "Swipe Hint",
        defaultValue: true,
    },
    hintText: {
        type: ControlType.String,
        title: "Hint Text",
        defaultValue: "Swipe to explore · tap to open",
        hidden: (p) => !p.showHint,
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#9BE83A",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    cardBackground: {
        type: ControlType.Color,
        title: "Card BG",
        defaultValue: "#0B0D0A",
    },
    overlayBackground: {
        type: ControlType.Color,
        title: "Overlay BG",
        defaultValue: "#000000",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#FFFFFF",
    },
    mutedColor: {
        type: ControlType.Color,
        title: "Muted Text",
        defaultValue: "#9A9A9A",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "rgba(255,255,255,0.12)",
    },
    headingFont: {
        type: ControlType.Font,
        title: "Heading Font",
        description: "Titles — pick Magistral",
        controls: "basic",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Magistral", fontWeight: 700 },
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        description: "Everything else — pick Plus Jakarta Sans",
        controls: "basic",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Plus Jakarta Sans", fontWeight: 400 },
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 48,
        step: 1,
        defaultValue: 0,
        displayStepper: true,
    },
    animateIn: {
        type: ControlType.Boolean,
        title: "Reveal",
        description: "Fade + rise when scrolled into view",
        defaultValue: true,
    },
})

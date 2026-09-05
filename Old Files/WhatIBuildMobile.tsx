import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence, useAnimation } from "framer-motion"

/**
 * What I Build — Mobile
 *
 * Mobile rewrite of the desktop stacked-card section. The section title and
 * intro copy are laid out in Framer above this component — it starts at the
 * card selector.
 *
 *   • Cards sit side by side in a snap-scrolling rail (swipe to change)
 *   • A "card selector" pill row above the rail switches cards on tap
 *   • The three side-by-side stats collapse to ONE stat that cycles with a
 *     text-scramble transition
 *   • Project tags are hidden by default (toggle in the panel)
 *   • Card media is a muted, controls-free autoplaying video, square by default
 *   • Each card carries its own tint colour
 *   • "Read More" opens a full-screen overlay that is a second level of the
 *     component in its own right: its own pill menu, its own cards, its own
 *     content — none of it derived from the rail card that opened it
 *
 * All content lives in the properties panel: the rail in Cards → per-card
 * fields, the overlay in Cards → Overlay Cards.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 760
 */
export default function WhatIBuildMobile(props) {
    const {
        cards,
        tapIcon,
        showTags,
        showSelector,
        selectorSize,
        titleSize,
        titleWeight,
        statSize,
        statWeight,
        statItalic,
        statGlow,
        statLayout,
        mediaAspect,
        statInterval,
        scrambleDuration,
        scrambleCharset,
        accent,
        background,
        cardBackground,
        overlayBackground,
        overlayCardBackground,
        overlayTint,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        radius,
        animateIn,
        cardFlip,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const railRef = useRef<HTMLDivElement>(null)
    const inView = useRevealOnScroll(rootRef)

    // On the Framer canvas we skip the reveal entirely, otherwise the component
    // would sit there invisible while you edit it.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const revealed = isCanvas || !animateIn || inView

    const safeCards = cards && cards.length ? cards : []
    const [active, setActive] = useState(0)
    const [overlay, setOverlay] = useState<number | null>(null)

    // The rail is the source of truth for which card is active: whatever card
    // sits nearest the horizontal centre wins. Tapping a pill only scrolls the
    // rail — the scroll handler then reports the index back. One code path for
    // both swiping and tapping, so the two can never disagree.
    useRailActiveIndex(railRef, setActive, safeCards.length)

    // Which way the rail last moved, so a card can flip in from the edge it
    // arrived from rather than always from the same side.
    const prevActive = useRef(active)
    const flipDir = useRef(1)
    if (active !== prevActive.current) {
        flipDir.current = active > prevActive.current ? 1 : -1
        prevActive.current = active
    }

    const goTo = useCallback((i: number) => {
        const rail = railRef.current
        if (!rail) return
        const el = rail.children[i] as HTMLElement
        if (!el) return
        setActive(i)
        rail.scrollTo({
            left: el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2,
            behavior: "smooth",
        })
    }, [])

    const tokens = {
        accent,
        background,
        cardBackground,
        overlayBackground,
        overlayCardBackground,
        overlayTint,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        selectorSize,
        titleSize,
        titleWeight,
        statSize,
        statWeight,
        statItalic,
        statGlow,
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
                padding: "8px 0 28px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <style>{`.wib-rail::-webkit-scrollbar{display:none}
.wib-shimmer{background-repeat:repeat;animation:wibShimmer 4.6s linear infinite}
@keyframes wibShimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@media (prefers-reduced-motion: reduce){.wib-shimmer{animation:none;background-position:50% 0}}`}</style>

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
                {showSelector && safeCards.length > 1 && (
                    <motion.div variants={revealChild}>
                        <CardSelector
                            cards={safeCards}
                            activeIndex={active}
                            onChange={goTo}
                            tokens={tokens}
                        />
                    </motion.div>
                )}

                <motion.div variants={revealChild}>
                    <div
                        ref={railRef}
                        className="wib-rail"
                        style={{
                            display: "flex",
                            alignItems: "stretch",
                            gap: 12,
                            padding: "4px 16px 6px",
                            overflowX: "auto",
                            overscrollBehaviorX: "contain",
                            scrollSnapType: "x mandatory",
                            WebkitOverflowScrolling: "touch",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}
                    >
                        {safeCards.map((card, i) => (
                            <BuildCard
                                key={(card.selectorLabel || "card") + i}
                                card={card}
                                index={i}
                                isActive={i === active}
                                flipDir={flipDir}
                                flipEnabled={cardFlip !== false}
                                showTags={showTags}
                                tapIcon={tapIcon}
                                mediaAspect={mediaAspect}
                                statLayout={statLayout}
                                statInterval={statInterval}
                                scrambleDuration={scrambleDuration}
                                scrambleCharset={scrambleCharset}
                                tokens={tokens}
                                onRead={() => setOverlay(i)}
                            />
                        ))}
                    </div>
                </motion.div>

                {safeCards.length > 1 && (
                    <motion.div variants={revealChild}>
                        <Dots
                            count={safeCards.length}
                            active={active}
                            onSelect={goTo}
                            tokens={tokens}
                        />
                    </motion.div>
                )}

                {!safeCards.length && (
                    <div
                        style={{
                            padding: "0 20px",
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
                    <ReadMoreOverlay
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

/* ----------------------------------------------------------- card selector */

function CardSelector({ cards, activeIndex, onChange, tokens }) {
    const railRef = useRef<HTMLDivElement>(null)
    useScrollActiveIntoView(railRef, activeIndex)

    return (
        <div
            ref={railRef}
            className="wib-rail"
            role="tablist"
            style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                padding: "0 16px 16px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            {cards.map((c, i) => {
                const active = i === activeIndex
                return (
                    <div
                        key={(c.selectorLabel || "") + i}
                        data-active={active ? "true" : "false"}
                        style={{ flex: "0 0 auto", position: "relative" }}
                    >
                        {/*
                         * Offset outline sitting behind the pill — the "3D"
                         * layer. It starts flush at 0,0 and slides out from
                         * under the pill on select, tucking back in on
                         * deselect.
                         */}
                        <motion.span
                            aria-hidden="true"
                            initial={false}
                            animate={{
                                x: active ? -4 : 0,
                                y: active ? 4 : 0,
                                opacity: active ? 0.55 : 0,
                            }}
                            transition={{
                                duration: 0.32,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: 999,
                                border: `1px solid ${tokens.accent}`,
                                pointerEvents: "none",
                            }}
                        />
                        <button
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(i)}
                            style={{
                                position: "relative",
                                display: "block",
                                padding: "11px 20px",
                                borderRadius: 999,
                                border: `1px solid ${active ? tokens.accent : tokens.borderColor
                                    }`,
                                background: active
                                    ? `color-mix(in srgb, ${tokens.accent} 16%, transparent)`
                                    : "transparent",
                                backdropFilter: active ? "blur(6px)" : "none",
                                WebkitBackdropFilter: active
                                    ? "blur(6px)"
                                    : "none",
                                color: active
                                    ? tokens.accent
                                    : tokens.textColor,
                                ...tokens.headingFont,
                                fontSize: tokens.selectorSize,
                                fontWeight: 700,
                                letterSpacing: "-0.01em",
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                                transition:
                                    "background .18s ease, color .18s ease, border-color .18s ease",
                            }}
                        >
                            {c.selectorLabel || `Card ${i + 1}`}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

/* ------------------------------------------------------------------- card */

function BuildCard({
    card,
    index,
    isActive,
    flipDir,
    flipEnabled,
    showTags,
    tapIcon,
    mediaAspect,
    statLayout,
    statInterval,
    scrambleDuration,
    scrambleCharset,
    tokens,
    onRead,
}) {
    const tags = splitTags(card.tags)
    const stats = (card.stats || []).filter((s) => s && (s.value || s.label))
    const hasOverlay = card.readMoreEnabled !== false
    const tint = card.tint || tokens.cardBackground

    // Flip in whenever this card becomes the selected one. Driven by controls
    // rather than a `key` change so the card is never remounted — remounting
    // would restart the video and fight the rail's scroll position.
    const flip = useAnimation()
    const wasActive = useRef(isActive)
    useEffect(() => {
        const becameActive = isActive && !wasActive.current
        wasActive.current = isActive
        if (!becameActive || !flipEnabled || prefersReducedMotion()) return
        // A full turn, so it reads as a flip rather than a tilt. 360 and 0 are
        // the same pose, which is why the direction only shows in the spin.
        flip.start({
            rotateY: [(flipDir?.current ?? 1) * 360, 0],
            opacity: [0.35, 1, 1],
            transition: {
                duration: 0.85,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: 0.85, times: [0, 0.4, 1] },
            },
        })
    }, [isActive, flip, flipDir, flipEnabled])

    return (
        // Perspective sits on the wrapper, not the rail: on the rail every card
        // would share one vanishing point and the off-centre ones would shear.
        <div
            style={{
                flex: "0 0 calc(100% - 32px)",
                scrollSnapAlign: "center",
                scrollSnapStop: "always",
                display: "flex",
                perspective: 1100,
            }}
        >
        <motion.article
            animate={flip}
            initial={false}
            // The whole card is the affordance now — the standalone button is
            // gone, replaced by the hint line above the rail. A swipe drags the
            // rail instead of firing a click, so tapping is the only thing that
            // opens the overlay.
            onClick={hasOverlay ? onRead : undefined}
            role={hasOverlay ? "button" : undefined}
            tabIndex={hasOverlay ? 0 : undefined}
            onKeyDown={
                hasOverlay
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onRead()
                          }
                      }
                    : undefined
            }
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                padding: 14,
                borderRadius: 22,
                border: `1px solid ${tokens.borderColor}`,
                transformOrigin: "50% 50%",
                cursor: hasOverlay ? "pointer" : "default",
                // Must stay visible: a 360 spin passes through the card's back
                // half, and hiding it would blank the card mid-flip.
                backfaceVisibility: "visible",
                // Each card carries its own tint, washed in from the top-left
                // over the shared card background.
                background: `linear-gradient(155deg, ${withAlpha(tint, 0.9)} 0%, ${tokens.cardBackground
                    } 58%, ${tokens.cardBackground} 100%)`,
            }}
        >
            <CardMedia
                card={card}
                aspect={mediaAspect}
                isActive={isActive}
                tokens={tokens}
            />

            {showTags && tags.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        margin: "14px 0 0",
                    }}
                >
                    {tags.map((t, i) => (
                        <span
                            key={t + i}
                            style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: withAlpha(tokens.accent, 0.12),
                                border: `1px solid ${withAlpha(tokens.accent, 0.28)}`,
                                color: tokens.accent,
                                fontSize: 10.5,
                                fontWeight: 500,
                                lineHeight: 1.2,
                            }}
                        >
                            {t}
                        </span>
                    ))}
                </div>
            )}

            <h3
                style={{
                    margin: "18px 0 0",
                    color: tokens.textColor,
                    ...tokens.headingFont,
                    // Weight comes after the font spread so it wins over
                    // whatever the Font control picked.
                    fontSize: tokens.titleSize,
                    fontWeight: tokens.titleWeight,
                    lineHeight: 1.14,
                    letterSpacing: "-0.02em",
                }}
            >
                {card.title}
            </h3>

            {/* Per-card "tap to read more" affordance — the whole card is the
             * button, this is the hint that says so. Sits between the title and
             * the stats separator. */}
            {hasOverlay && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                    }}
                >
                    {tapIcon ? (
                        <img
                            src={tapIcon}
                            alt=""
                            aria-hidden="true"
                            style={{
                                width: 14,
                                height: 14,
                                objectFit: "contain",
                                flex: "0 0 auto",
                            }}
                        />
                    ) : (
                        // Fallback: solid hand with the index finger extended —
                        // a plain fill glyph, no tap/ripple indicators.
                        <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={withAlpha(tokens.textColor, 0.7)}
                            style={{ flex: "0 0 auto" }}
                        >
                            <path d="M9 2.5a1.75 1.75 0 0 1 1.75 1.75V11a.75.75 0 0 0 1.5 0V6.75a1.75 1.75 0 0 1 3.5 0V11a.75.75 0 0 0 1.5 0V9.25a1.75 1.75 0 0 1 3.5 0V15c0 3.6-2.4 6.5-6 6.5h-1.9c-1.9 0-3.1-.7-4.3-2.2l-3.2-4c-.7-.9-.6-2.2.4-2.9.8-.6 1.9-.5 2.6.2l.8.8V4.25A1.75 1.75 0 0 1 9 2.5Z" />
                        </svg>
                    )}
                    <span
                        className="wib-shimmer"
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            letterSpacing: "0.02em",
                            // Slow left-to-right sheen sweeping through the text:
                            // a bright band riding over the muted base colour,
                            // clipped to the glyphs.
                            backgroundImage: `linear-gradient(100deg, ${withAlpha(
                                tokens.textColor,
                                0.42
                            )} 0%, ${withAlpha(
                                tokens.textColor,
                                0.42
                            )} 38%, ${withAlpha(
                                tokens.textColor,
                                0.95
                            )} 50%, ${withAlpha(
                                tokens.textColor,
                                0.42
                            )} 62%, ${withAlpha(
                                tokens.textColor,
                                0.42
                            )} 100%)`,
                            backgroundSize: "200% 100%",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Tap to read more
                    </span>
                </div>
            )}

            {/* Stats sit directly under the title in both layouts: a single
             * scrambling stat, or all of them laid out in a 2-column grid. */}
            {stats.length > 0 &&
                (statLayout === "grid" ? (
                    <StatGrid stats={stats} tokens={tokens} />
                ) : (
                    <StatRotator
                        stats={stats}
                        isActive={isActive}
                        intervalMs={statInterval}
                        scrambleMs={scrambleDuration}
                        charset={scrambleCharset}
                        tokens={tokens}
                    />
                ))}

            {card.text ? (
                <Paragraphs
                    text={card.text}
                    color={tokens.mutedColor}
                    size={13.5}
                    top={16}
                />
            ) : null}
        </motion.article>
        </div>
    )
}

/* ------------------------------------------------------------- card media */

function CardMedia({ card, aspect, isActive, tokens }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const src = card.videoFile || card.videoUrl || ""

    // Only the card you're looking at plays. Off-screen videos decoding in the
    // background is the fastest way to make a phone feel hot and janky.
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) {
            const p = v.play()
            if (p && typeof p.catch === "function") p.catch(() => { })
        } else {
            v.pause()
        }
    }, [isActive, src])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: aspect,
                borderRadius: 14,
                overflow: "hidden",
                background: "#000",
            }}
        >
            {src ? (
                <video
                    ref={videoRef}
                    src={src}
                    poster={card.poster || undefined}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                    disablePictureInPicture
                    // controls are deliberately off — this is decorative motion,
                    // not a player.
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        pointerEvents: "none",
                    }}
                />
            ) : card.poster ? (
                <img
                    src={card.poster}
                    alt={card.title || ""}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            ) : (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: tokens.mutedColor,
                        fontSize: 12,
                    }}
                >
                    Add a video or poster
                </div>
            )}
        </div>
    )
}

/* --------------------------------------------------------- overlay media */

/**
 * The graphic at the top of an overlay card. Unlike the rail card's fixed
 * ratio-and-crop box, this one follows the media itself:
 *
 *   • An image spans the full width and takes whatever height its own aspect
 *     ratio asks for — never cropped.
 *   • A video is capped at a square: a landscape clip keeps its natural ratio,
 *     but a portrait clip is held to 1:1 and cropped rather than being allowed
 *     to run taller than it is wide.
 *
 * The video's ratio isn't known until its metadata loads, so we hold the box
 * at a square until then and settle to the real ratio on `loadedmetadata`.
 */
function OverlayMedia({ card, tokens }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const src = card.videoFile || card.videoUrl || ""
    const [ratio, setRatio] = useState<number | null>(null)

    useEffect(() => {
        const v = videoRef.current
        if (!v || !src) return
        const p = v.play()
        if (p && typeof p.catch === "function") p.catch(() => {})
    }, [src])

    // Image only — full width, height follows the image's own aspect ratio.
    if (!src && card.poster) {
        return (
            <img
                src={card.poster}
                alt={card.title || ""}
                style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: 14,
                }}
            />
        )
    }

    if (!src) {
        return (
            <div
                style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 14,
                    background: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: tokens.mutedColor,
                    fontSize: 12,
                }}
            >
                Add a video or poster
            </div>
        )
    }

    // Portrait clips are capped at a square (and cropped to fill it); landscape
    // and square clips keep their own ratio. Default to square before metadata.
    const isPortrait = ratio != null && ratio < 1
    const displayRatio = ratio == null ? 1 : isPortrait ? 1 : ratio

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: displayRatio,
                borderRadius: 14,
                overflow: "hidden",
                background: "#000",
            }}
        >
            <video
                ref={videoRef}
                src={src}
                poster={card.poster || undefined}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                disablePictureInPicture
                onLoadedMetadata={(e) => {
                    const el = e.currentTarget
                    if (el.videoWidth && el.videoHeight) {
                        setRatio(el.videoWidth / el.videoHeight)
                    }
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    // A capped portrait clip crops to fill the square; a
                    // natural-ratio box needs no crop, so cover is a no-op there.
                    objectFit: "cover",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

/* ---------------------------------------------------------- stat rotator */

function StatRotator({
    stats,
    isActive,
    intervalMs,
    scrambleMs,
    charset,
    tokens,
}) {
    const [i, setI] = useState(0)

    // Reset to the first stat when the card scrolls away, so it always comes
    // back reading from the top rather than mid-cycle.
    useEffect(() => {
        if (!isActive) setI(0)
    }, [isActive])

    useEffect(() => {
        if (!isActive || stats.length < 2) return
        const id = setInterval(
            () => setI((v) => (v + 1) % stats.length),
            Math.max(800, intervalMs)
        )
        return () => clearInterval(id)
    }, [isActive, stats.length, intervalMs])

    const stat = stats[i % stats.length] || {}

    return (
        <div
            style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${tokens.borderColor}`,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
            }}
        >
            <div style={{ minWidth: 0 }}>
                <ScrambleText
                    text={stat.value || ""}
                    duration={scrambleMs}
                    charset={charset}
                    enabled={isActive}
                    style={statValueStyle(tokens)}
                />
                <ScrambleText
                    text={stat.label || ""}
                    duration={scrambleMs}
                    charset={charset}
                    enabled={isActive}
                    style={{
                        ...statLabelStyle(tokens),
                        // Two lines' worth of room reserved so a one-line label
                        // followed by a two-line one doesn't nudge the row.
                        minHeight: "2.6em",
                    }}
                />
            </div>

            {stats.length > 1 && (
                <div
                    style={{
                        flex: "0 0 auto",
                        display: "flex",
                        gap: 5,
                        paddingTop: 12,
                    }}
                >
                    {stats.map((_, n) => (
                        <span
                            key={n}
                            style={{
                                width: n === i ? 14 : 5,
                                height: 5,
                                borderRadius: 999,
                                background:
                                    n === i
                                        ? tokens.accent
                                        : tokens.borderColor,
                                transition:
                                    "width .25s ease, background .25s ease",
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------- stat grid */

/**
 * Every stat at once in a 2-column grid — the static alternative to the
 * rotator. No scramble, no cycling: all the numbers are on screen together.
 */
function StatGrid({ stats, tokens }) {
    // Two columns get crowded at the full rotator size, so the value is
    // stepped down a touch here — enough that "50,000+" stays on one line.
    const valueSize = Math.min(tokens.statSize, 28)

    return (
        <div
            style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${tokens.borderColor}`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px 14px",
            }}
        >
            {stats.map((s, i) => (
                <div key={i} style={{ minWidth: 0 }}>
                    <span
                        style={{
                            ...statValueStyle(tokens, valueSize),
                            // Tighter tracking than the rotator: two columns
                            // leave less room, and the numbers read fine at it.
                            letterSpacing: "0.02em",
                        }}
                    >
                        {s.value}
                    </span>
                    <span style={statLabelStyle(tokens)}>{s.label}</span>
                </div>
            ))}
        </div>
    )
}

/**
 * The accent-gradient stat value, shared by the rotator and the grid so the
 * two layouts render identical numbers. `size` overrides the token size for
 * the tighter grid columns.
 */
function statValueStyle(tokens, size?: number): React.CSSProperties {
    return {
        display: "block",
        // Spread first so our overrides below always win over whatever the
        // Framer font control supplies.
        ...tokens.headingFont,
        fontSize: size ?? tokens.statSize,
        fontWeight: tokens.statWeight,
        fontStyle: "normal",
        lineHeight: 1.05,
        letterSpacing: "0.1rem",
        fontVariantNumeric: "tabular-nums",
        // Fill = left-to-right accent gradient, 90% → 40%.
        // Stroke = solid accent, drawn by -webkit-text-stroke.
        backgroundImage: `linear-gradient(90deg, ${withAlpha(
            tokens.accent,
            0.9
        )} 0%, ${withAlpha(tokens.accent, 0.4)} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        WebkitTextStrokeWidth: 1,
        WebkitTextStrokeColor: tokens.accent,
        paintOrder: "stroke fill",
        // drop-shadow instead of text-shadow: with a transparent text fill a
        // text-shadow would show through the glyphs.
        filter: tokens.statGlow
            ? `drop-shadow(0 0 14px ${withAlpha(
                tokens.accent,
                0.3
            )}) drop-shadow(0 0 34px ${withAlpha(tokens.accent, 0)})`
            : "none",
    }
}

/** The muted label under a stat value, shared by the rotator and the grid. */
function statLabelStyle(tokens): React.CSSProperties {
    return {
        display: "block",
        marginTop: 6,
        color: withAlpha(tokens.textColor, 0.92),
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.3,
    }
}

/**
 * Character-by-character scramble between the old and new string.
 *
 * Each slot gets its own random start/end frame, which is what makes the
 * transition read as a wave rather than a single hard cut. Whitespace is left
 * alone so word shapes stay recognisable mid-flight.
 */
function ScrambleText({ text, duration = 700, charset, style, enabled = true }) {
    const [display, setDisplay] = useState(text)
    const prevRef = useRef(text)

    useEffect(() => {
        const from = prevRef.current || ""
        const to = text || ""
        prevRef.current = to

        if (from === to) {
            setDisplay(to)
            return
        }
        // Off-screen cards snap straight to the new string: the scramble is
        // only ever worth the frames when someone is actually looking at it.
        if (!enabled) {
            setDisplay(to)
            return
        }
        if (prefersReducedMotion()) {
            setDisplay(to)
            return
        }

        const pool =
            charset && charset.length
                ? charset
                : "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%+#@&$*"
        const total = Math.max(10, Math.round(duration / 16.7))
        const len = Math.max(from.length, to.length)
        const queue: {
            f: string
            t: string
            start: number
            end: number
            char: string
        }[] = []

        for (let n = 0; n < len; n++) {
            const start = Math.floor(Math.random() * total * 0.4)
            const end =
                start +
                Math.floor(total * 0.3) +
                Math.floor(Math.random() * total * 0.3)
            queue.push({
                f: from[n] || "",
                t: to[n] || "",
                start,
                end,
                char: "",
            })
        }

        let frame = 0
        let raf = 0

        const tick = () => {
            let out = ""
            let done = 0
            for (const q of queue) {
                if (frame >= q.end) {
                    out += q.t
                    done++
                } else if (frame >= q.start) {
                    if (q.t === " " || q.f === " ") {
                        out += " "
                    } else {
                        if (!q.char || Math.random() < 0.3) {
                            q.char = pool[Math.floor(Math.random() * pool.length)]
                        }
                        out += q.char
                    }
                } else {
                    out += q.f
                }
            }
            setDisplay(out)
            if (done === queue.length) return
            frame++
            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [text, duration, charset, enabled])

    return <span style={style}>{display}</span>
}

/* ---------------------------------------------------------------- overlay */

/*
 * Open/close choreography. Every layer animates on its own timeline rather than
 * the whole overlay cross-fading as one block, so closing reads as the pieces
 * leaving individually: pills fade out, the backdrop fades, the cross fades,
 * the card shrinks + tips away.
 *
 * AnimatePresence holds the subtree mounted until the slowest of these exits
 * finishes, which is why the root itself must NOT animate its own opacity —
 * a fading root would hide all of it behind one flat dissolve.
 */

const overlayEase = [0.22, 1, 0.36, 1]

const backdropVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.34, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.3, delay: 0.06 } },
}

const closeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, delay: 0.16, ease: overlayEase },
    },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.18 } },
}

const pillsVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
    // Reversed so the sweep runs right-to-left on the way out — the opposite
    // sweep to the one that brought them in.
    exit: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
}

/* A plain fade in both directions. */
const pillVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: 0.3, ease: overlayEase },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.24, ease: overlayEase },
    },
}

const sheetVariants = {
    hidden: { opacity: 0, scale: 0.9, rotate: -2.5, y: 26 },
    show: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        y: 0,
        transition: { duration: 0.52, ease: overlayEase, delay: 0.06 },
    },
    exit: {
        opacity: 0,
        scale: 0.88,
        rotate: 2.5,
        y: 18,
        transition: { duration: 0.34, ease: [0.4, 0, 1, 1] },
    },
}

/**
 * Full-screen "Read More" overlay — a self-contained second level of the
 * component, with its own pill menu and its own cards.
 *
 * Nothing here is derived from the rail card that opened it: the overlay's
 * cards are authored separately under Cards → Overlay Cards, each with its own
 * graphic, title, byline, stats and sections. The rail card only decides which
 * *set* of overlay cards you land in.
 */
function ReadMoreOverlay({ card, tokens, onClose }) {
    const sheets = normaliseOverlayCards(card)
    const [active, setActive] = useState(0)
    const sheet = sheets[Math.min(active, sheets.length - 1)] || {}

    const scrollRef = useRef<HTMLDivElement>(null)
    const pillRailRef = useRef<HTMLDivElement>(null)
    useScrollActiveIntoView(pillRailRef, active)

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
    // The `wibOverlay` marker on the state is what tells the two cases apart.
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (typeof window === "undefined" || !window.history) return

        window.history.pushState({ wibOverlay: true }, "")
        const onPop = () => onClose()
        window.addEventListener("popstate", onPop)

        return () => {
            window.removeEventListener("popstate", onPop)
            if (window.history.state && window.history.state.wibOverlay) {
                window.history.back()
            }
        }
        // onClose is recreated each render but only ever sets overlay → null,
        // so pinning this effect to mount/unmount is what we want.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // A new card always starts from the top of its own story.
    const select = (i: number) => {
        setActive(i)
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }

    // The tint wash is the one thing the overlay inherits from the card that
    // opened it — it keeps the two levels visually related. Off by default,
    // and the two backgrounds underneath it are both properties.
    const tint = tokens.overlayTint ? card.tint : null

    return (
        <motion.div
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                ...tokens.bodyFont,
            }}
        >
            {/* Backdrop is its own layer so it can fade independently of the
             * content sitting on top of it. */}
            <motion.div
                variants={backdropVariants}
                onClick={onClose}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: tint
                        ? `radial-gradient(120% 70% at 50% 0%, ${withAlpha(
                            tint,
                            0.85
                        )} 0%, ${tokens.overlayBackground} 62%), ${tokens.overlayBackground
                        }`
                        : tokens.overlayBackground,
                }}
            />

            {/* Close — pinned to the viewport, above the scroll region, so it
             * never travels away with the content. */}
            <motion.button
                variants={closeVariants}
                onClick={onClose}
                aria-label="Close"
                style={{
                    position: "absolute",
                    top: 14,
                    right: 12,
                    zIndex: 3,
                    width: 40,
                    height: 40,
                    padding: 0,
                    border: "none",
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
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M1 1L21 21M21 1L1 21"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                    />
                </svg>
            </motion.button>

            {/* The overlay's own pill menu — one per overlay card. */}
            {sheets.length > 1 && (
                <motion.div
                    variants={pillsVariants}
                    ref={pillRailRef}
                    className="wib-rail"
                    role="tablist"
                    style={{
                        position: "relative",
                        zIndex: 2,
                        flex: "0 0 auto",
                        display: "flex",
                        gap: 4,
                        overflowX: "auto",
                        padding: "58px 60px 14px 16px",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    {sheets.map((p, i) => {
                        const on = i === active
                        return (
                            <motion.button
                                key={(p.pillLabel || "") + i}
                                variants={pillVariants}
                                data-active={on ? "true" : "false"}
                                role="tab"
                                aria-selected={on}
                                onClick={() => select(i)}
                                style={{
                                    flex: "0 0 auto",
                                    padding: "9px 15px",
                                    borderRadius: 999,
                                    border: "none",
                                    background: on
                                        ? withAlpha(tokens.textColor, 0.13)
                                        : "transparent",
                                    color: on
                                        ? tokens.accent
                                        : withAlpha(tokens.textColor, 0.75),
                                    fontFamily: "inherit",
                                    fontSize: 13,
                                    fontWeight: on ? 700 : 500,
                                    letterSpacing: "-0.01em",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer",
                                    transition:
                                        "background .2s ease, color .2s ease",
                                }}
                            >
                                {p.pillLabel || `Card ${i + 1}`}
                            </motion.button>
                        )
                    })}
                </motion.div>
            )}

            {/* Scroll region. Clicks that land on the padding around the card
             * close the overlay; the card itself swallows them. */}
            <div
                ref={scrollRef}
                onClick={onClose}
                style={{
                    position: "relative",
                    zIndex: 1,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                    padding:
                        sheets.length > 1 ? "0 12px 28px" : "62px 12px 28px",
                }}
            >
                <motion.article
                    variants={sheetVariants}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: 12,
                        borderRadius: 22,
                        border: `1px solid ${withAlpha(tokens.accent, 0.22)}`,
                        transformOrigin: "50% 20%",
                        background: tint
                            ? `linear-gradient(160deg, ${withAlpha(
                                tint,
                                0.55
                            )} 0%, ${tokens.overlayCardBackground} 46%, ${tokens.overlayCardBackground
                            } 100%)`
                            : tokens.overlayCardBackground,
                    }}
                >
                    {/* Swapping cards is a separate, much smaller move than
                     * opening the overlay — the shell stays put, the story
                     * inside it changes. */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.24, ease: overlayEase }}
                        >
                            <OverlayCardBody sheet={sheet} tokens={tokens} />
                        </motion.div>
                    </AnimatePresence>
                </motion.article>
            </div>
        </motion.div>
    )
}

/** Media → title → byline → stats → rule → sections. */
function OverlayCardBody({ sheet, tokens }) {
    const stats = parseStats(sheet.stats)
    const sections = parseSections(sheet.sections)

    return (
        <>
            <OverlayMedia card={sheet} tokens={tokens} />

            <div style={{ padding: "0 6px" }}>
                <h3
                    style={{
                        margin: "20px 0 0",
                        color: tokens.textColor,
                        ...tokens.headingFont,
                        fontSize: 27,
                        fontWeight: tokens.titleWeight,
                        lineHeight: 1.12,
                        letterSpacing: "-0.02em",
                    }}
                >
                    {sheet.title}
                </h3>

                {sheet.byline ? (
                    <p
                        style={{
                            margin: "10px 0 0",
                            color: withAlpha(tokens.textColor, 0.62),
                            fontSize: 12.5,
                            lineHeight: 1.45,
                        }}
                    >
                        {sheet.byline}
                    </p>
                ) : null}

                {stats.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "18px 22px",
                            margin: "22px 0 0",
                        }}
                    >
                        {stats.map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    flex:
                                        stats.length === 1
                                            ? "1 1 100%"
                                            : "1 1 40%",
                                    minWidth: 110,
                                }}
                            >
                                <span
                                    style={{
                                        display: "block",
                                        ...tokens.headingFont,
                                        fontSize: 26,
                                        fontWeight: tokens.statWeight,
                                        lineHeight: 1.05,
                                        letterSpacing: "0.04em",
                                        fontVariantNumeric: "tabular-nums",
                                        color: tokens.accent,
                                    }}
                                >
                                    {s.value}
                                </span>
                                <span
                                    style={{
                                        display: "block",
                                        marginTop: 5,
                                        color: withAlpha(tokens.textColor, 0.7),
                                        fontSize: 11.5,
                                        fontWeight: 500,
                                        lineHeight: 1.35,
                                    }}
                                >
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    style={{
                        height: 1,
                        margin: "22px 0 0",
                        background: withAlpha(tokens.textColor, 0.16),
                    }}
                />

                {sections.map((s, i) => (
                    <section key={i} style={{ marginTop: i === 0 ? 22 : 26 }}>
                        {s.header ? (
                            <h4
                                style={{
                                    margin: 0,
                                    color: tokens.textColor,
                                    ...tokens.headingFont,
                                    fontSize: 18,
                                    fontWeight: 500,
                                    lineHeight: 1.2,
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                {s.header}
                            </h4>
                        ) : null}
                        {s.body ? (
                            <RichBody
                                text={s.body}
                                tokens={tokens}
                                top={s.header ? 10 : 0}
                            />
                        ) : null}
                    </section>
                ))}
            </div>
        </>
    )
}

/**
 * Section copy with just enough formatting to write a real write-up in a
 * textarea: blank lines split paragraphs, lines starting "- " become a bullet
 * list, and *stars* / **double stars** italicise and bold inline.
 */
function RichBody({ text, tokens, top = 0 }) {
    const blocks = String(text)
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter(Boolean)

    const body = {
        color: withAlpha(tokens.textColor, 0.66),
        fontSize: 12.5,
        lineHeight: 1.62,
    }

    return (
        <>
            {blocks.map((block, i) => {
                const lines = block.split("\n").map((l) => l.trim())
                const isList =
                    lines.length > 0 &&
                    lines.every((l) => /^[-•*]\s+/.test(l) && !/^\*\S/.test(l))

                if (isList) {
                    return (
                        <ul
                            key={i}
                            style={{
                                ...body,
                                margin: `${i === 0 ? top : 12}px 0 0`,
                                paddingLeft: 18,
                            }}
                        >
                            {lines.map((l, n) => (
                                <li key={n} style={{ marginTop: n ? 8 : 0 }}>
                                    {inlineMarks(l.replace(/^[-•*]\s+/, ""))}
                                </li>
                            ))}
                        </ul>
                    )
                }

                return (
                    <p
                        key={i}
                        style={{
                            ...body,
                            margin: `${i === 0 ? top : 12}px 0 0`,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {inlineMarks(block)}
                    </p>
                )
            })}
        </>
    )
}

/**
 * "50,000+ | professionals guided" → { value, label }, one per line.
 *
 * Also accepts a real array, which is what the fallback path hands over when a
 * rail card's own stats stand in for an unwritten overlay.
 */
function parseStats(value): { value: string; label: string }[] {
    if (Array.isArray(value))
        return value.filter((s) => s && (s.value || s.label))
    if (!value) return []

    return String(value)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
            const i = line.indexOf("|")
            if (i === -1) return { value: line, label: "" }
            return {
                value: line.slice(0, i).trim(),
                label: line.slice(i + 1).trim(),
            }
        })
}

/**
 * Splits a textarea into sections on "## Header" lines.
 *
 * Copy written before the first heading still renders — it just becomes a
 * headerless opening section rather than being dropped on the floor.
 */
function parseSections(value): { header: string; body: string }[] {
    if (Array.isArray(value))
        return value.filter((s) => s && (s.header || s.body))
    if (!value) return []

    const out: { header: string; body: string }[] = []
    let current: { header: string; body: string } | null = null

    for (const line of String(value).split("\n")) {
        const heading = line.match(/^\s*#{1,3}\s*(.*)$/)
        if (heading) {
            current = { header: heading[1].trim(), body: "" }
            out.push(current)
        } else {
            if (!current) {
                current = { header: "", body: "" }
                out.push(current)
            }
            current.body += (current.body ? "\n" : "") + line
        }
    }

    return out
        .map((s) => ({ header: s.header, body: s.body.trim() }))
        .filter((s) => s.header || s.body)
}

/** `**bold**` and `*italic*` → real elements. Everything else passes through. */
function inlineMarks(text: string) {
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g)
    return parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p))
            return <strong key={i}>{p.slice(2, -2)}</strong>
        if (/^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
        return <React.Fragment key={i}>{p}</React.Fragment>
    })
}

/**
 * A rail card with no overlay cards authored yet still has to open into
 * something, so its own title, media and copy stand in as a single pill-less
 * card. Purely a scaffolding fallback — once one overlay card exists, none of
 * the outer card's content is used.
 */
function normaliseOverlayCards(card) {
    const list = (card.overlayCards || []).filter(
        (p) => p && (p.pillLabel || p.title || p.sections?.length)
    )
    if (list.length) return list
    return [
        {
            pillLabel: card.selectorLabel,
            title: card.title,
            byline: "",
            videoFile: card.videoFile,
            videoUrl: card.videoUrl,
            poster: card.poster,
            stats: card.stats,
            sections: card.text ? [{ header: "", body: card.text }] : [],
        },
    ]
}

/** Splits a textarea value on blank lines so editors can write real paragraphs. */
function Paragraphs({ text, color, size, top }) {
    const parts = String(text)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)

    return (
        <>
            {parts.map((p, i) => (
                <p
                    key={i}
                    style={{
                        margin: `${i === 0 ? top : 12}px 0 0`,
                        color,
                        fontSize: size,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {p}
                </p>
            ))}
        </>
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
                marginTop: 18,
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
 * Reports whichever child of the rail is nearest the horizontal centre.
 *
 * Read-only on the DOM and rAF-throttled, so it can ride along with a native
 * momentum scroll without fighting it.
 */
function useRailActiveIndex(
    railRef: React.RefObject<HTMLDivElement>,
    onChange: (i: number) => void,
    count: number
) {
    useEffect(() => {
        const rail = railRef.current
        if (!rail || !count) return
        let raf = 0

        const measure = () => {
            raf = 0
            const centre = rail.scrollLeft + rail.clientWidth / 2
            let best = 0
            let bestDist = Infinity
            for (let i = 0; i < rail.children.length; i++) {
                const el = rail.children[i] as HTMLElement
                const c = el.offsetLeft + el.offsetWidth / 2
                const d = Math.abs(c - centre)
                if (d < bestDist) {
                    bestDist = d
                    best = i
                }
            }
            onChange(best)
        }

        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(measure)
        }

        rail.addEventListener("scroll", onScroll, { passive: true })
        return () => {
            rail.removeEventListener("scroll", onScroll)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [railRef, onChange, count])
}

/**
 * True once the element has first scrolled into view, then latched forever.
 *
 * Uses a bottom rootMargin rather than a threshold so it fires consistently
 * whether the section is shorter or taller than the viewport — a threshold of
 * 0.25 can never be met by an element two screens tall on a small phone.
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

/** Keeps the active pill scrolled into view in its horizontal rail. */
function useScrollActiveIntoView(
    railRef: React.RefObject<HTMLDivElement>,
    activeIndex: number
) {
    useEffect(() => {
        const rail = railRef.current
        if (!rail) return
        const el = rail.querySelector('[data-active="true"]') as HTMLElement
        if (!el) return
        const target = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2
        rail.scrollTo({ left: Math.max(target, 0), behavior: "smooth" })
    }, [activeIndex, railRef])
}

/** "A, B, C" → ["A", "B", "C"]. Blank entries are dropped. */
function splitTags(value?: string): string[] {
    if (!value) return []
    return String(value)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
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

const statControl = {
    type: ControlType.Object,
    controls: {
        value: {
            type: ControlType.String,
            title: "Value",
            placeholder: "50,000+",
            defaultValue: "",
        },
        label: {
            type: ControlType.String,
            title: "Label",
            displayTextArea: true,
            placeholder: "professionals guided by AI coach",
            defaultValue: "",
        },
    },
}

/**
 * One card *inside* the overlay — a completely separate content set from the
 * outer rail card that opened it. Its label is the pill; everything else is the
 * card that pill reveals, in render order: graphic → title → byline → stats →
 * rule → sections.
 */
const overlayCardControl = {
    type: ControlType.Object,
    controls: {
        pillLabel: {
            type: ControlType.String,
            title: "Pill",
            description: "Label in the overlay's pill row",
            defaultValue: "Project",
        },
        videoFile: {
            type: ControlType.File,
            title: "Video",
            allowedFileTypes: ["mp4", "webm", "mov"],
        },
        videoUrl: {
            type: ControlType.String,
            title: "Video URL",
            placeholder: "Direct .mp4 link (optional)",
            description: "Used only when no video file is uploaded",
            defaultValue: "",
        },
        poster: {
            type: ControlType.Image,
            title: "Image",
            description: "Still graphic, or the video's first frame",
        },
        title: {
            type: ControlType.String,
            title: "Title",
            displayTextArea: true,
            defaultValue: "",
        },
        byline: {
            type: ControlType.String,
            title: "Byline",
            displayTextArea: true,
            description: "One line under the title",
            defaultValue: "",
        },
        /*
         * Stats and sections are textareas rather than Array controls on
         * purpose: this object is already inside the Cards array, and Framer
         * will not render an Array nested inside an Array item — the fields
         * simply never appear in the panel. Both stay variable-length, they're
         * just delimited by hand.
         */
        stats: {
            type: ControlType.String,
            title: "Stats",
            displayTextArea: true,
            description: "One per line:  value | label",
            placeholder: "50,000+ | professionals guided by AI coach",
            defaultValue: "",
        },
        sections: {
            type: ControlType.String,
            title: "Sections",
            displayTextArea: true,
            description:
                "'## Header' starts a section; everything under it is its body. Blank line = new paragraph, '- ' = bullet, *italic*, **bold**.",
            placeholder: "## The Problem\nBody copy…\n\n## The Design\nBody copy…",
            defaultValue: "",
        },
    },
}

const cardControl = {
    type: ControlType.Object,
    controls: {
        selectorLabel: {
            type: ControlType.String,
            title: "Selector",
            description: "Short label shown in the picker above the cards",
            defaultValue: "AI-native Nonprofits",
        },
        title: {
            type: ControlType.String,
            title: "Title",
            displayTextArea: true,
            defaultValue: "AI-native Nonprofits and Public institutions",
        },
        videoFile: {
            type: ControlType.File,
            title: "Video",
            allowedFileTypes: ["mp4", "webm", "mov"],
        },
        videoUrl: {
            type: ControlType.String,
            title: "Video URL",
            placeholder: "Direct .mp4 link (optional)",
            description: "Used only when no video file is uploaded",
            defaultValue: "",
        },
        poster: {
            type: ControlType.Image,
            title: "Poster",
            description: "First frame / fallback still",
        },
        tint: {
            type: ControlType.Color,
            title: "Tint",
            description: "Wash across the top-left of this card",
            defaultValue: "#16240E",
        },
        text: {
            type: ControlType.String,
            title: "Text",
            displayTextArea: true,
            description: "Leave a blank line to start a new paragraph",
            defaultValue: "",
        },
        tags: {
            type: ControlType.String,
            title: "Tags",
            displayTextArea: true,
            description:
                "Comma separated. Hidden unless 'Show Tags' is on.",
            defaultValue: "",
        },
        stats: {
            type: ControlType.Array,
            title: "Stats",
            description:
                "Shown under the title — cycled with a scramble, or all at once in a grid (Stat Layout)",
            control: statControl,
            defaultValue: [],
        },
        readMoreEnabled: {
            type: ControlType.Boolean,
            title: "Read More",
            description: "Let this card be tapped to open its overlay",
            defaultValue: true,
        },
        overlayCards: {
            type: ControlType.Array,
            title: "Overlay Cards",
            description:
                "The pills + cards inside this card's overlay. Written separately from everything above.",
            control: overlayCardControl,
            defaultValue: [],
            hidden: (p) => !p.readMoreEnabled,
        },
    },
}

addPropertyControls(WhatIBuildMobile, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: cardControl,
        defaultValue: [
            {
                selectorLabel: "AI-native Nonprofits",
                title: "AI-native Nonprofits and Public institutions",
                tint: "#16240E",
                tags: "Neuroda (AI coach), Nimaya, Ashoka University CSBC, Yash Raj Films's Foundation",
                text: "The organisations solving the hardest problems for public good are the last to get AI's superpowers. I'm changing that.\n\nI train AI systems to augment human capability inside institutions that can't afford to get it wrong – agentic ai program managers, personalised workplace coaches for field teams and context-aware behavioural analysis tools for public health.",
                stats: [
                    {
                        value: "50,000+",
                        label: "professionals guided by AI coach",
                    },
                    { value: "90%", label: "reduction in reporting errors" },
                    {
                        value: "15,000+",
                        label: "beneficiaries impacted via AI-managed programs",
                    },
                ],
                readMoreEnabled: true,
                overlayCards: [
                    { pillLabel: "Neuroda (AI coach)", title: "Neuroda" },
                    { pillLabel: "Nimaya", title: "Nimaya" },
                    {
                        pillLabel: "Ashoka University CSBC",
                        title: "Ashoka University — Centre for Social and Behavioural Change",
                        byline: "AI for designing, testing and scaling behavioural interventions in critical cause areas. (In progress)",
                        stats: "",
                        sections:
                            "## The Problem\nAshoka University's Centre for Social and Behavioural Change designs interventions for critical cause areas — malnutrition, financial inclusion, anaemia and more. Testing whether these interventions actually work requires conducting thousands of structured interviews with beneficiaries in the field. Enumerators need to be trained, their interview quality needs to be assessed, and the resulting data needs to be analysed for patterns that reveal whether a behavioural nudge is landing. All of this is slow, expensive and hard to scale.\n\n## The Design\nI'm building an intelligent system that operates across two layers:\n\n- *Training and assessment* – AI simulates different respondent types for enumerator practice sessions. Trainees conduct interviews with AI-played beneficiaries who vary in cooperativeness, comprehension and emotional state. The AI then assesses interview quality against a rubric and returns targeted feedback.\n- *Analysis* – transcripts from the field are read for the patterns that show whether an intervention is landing, at a volume no research team could code by hand.",
                    },
                    {
                        pillLabel: "Yash Raj Films's Foundation",
                        title: "Yash Raj Films Foundation",
                    },
                ],
            },
            {
                selectorLabel: "Learning simulations",
                title: "Learning simulations",
                tint: "#0E2029",
                tags: "Workverse, Kamlaverse (SEWA), Ishara (Phoenix Hospitality)",
                text: "Learners rehearse for the hardest day at work - before the stakes are real.\n\nI design immersive simulations where learners step into realistic workplace scenarios - navigating ambiguity, making high-stakes decisions and collaborating with complex personalities. Each simulation trains the capabilities AI cannot replace: judgement, creative problem-solving and the ability to act when there is no right answer.",
                stats: [
                    { value: "50,000+", label: "graduates trained" },
                    { value: "40+", label: "universities and organisations" },
                    { value: "3 virtual", label: "simulation platforms built" },
                ],
                readMoreEnabled: true,
            },
            {
                selectorLabel: "Movements",
                title: "Building Movements and dialogue platforms",
                tint: "#231A2C",
                tags: "UN Young Changemakers Conclave, Operation Black Dot, Election Commission of India, Green Batti Project",
                text: "When Prime Ministers, Nobel Laureates, innovators and college students share the same stage, something shifts. I convene those stages.\n\nI convene unlikely combinations — world leaders alongside comedians, Bollywood icons with grassroots sarpanchs — and architect movements that turn awareness into action. I've nudged 100,000 urban youth to cast an informed vote, built dialogues that challenged philanthropists to fund impact orgs the way VCs fund startups, and partnered with the UN to make global development feel personal and aspirational.",
                stats: [
                    { value: "100,000+", label: "urban youth mobilised" },
                    { value: "40+", label: "universities and organisations" },
                    { value: "3 virtual", label: "dialogue platforms built" },
                ],
                readMoreEnabled: true,
            },
        ],
    },
    tapIcon: {
        type: ControlType.Image,
        title: "Tap Icon",
        description:
            "Icon beside the 'Tap to read more' hint. Defaults to a hand glyph.",
    },
    showSelector: {
        type: ControlType.Boolean,
        title: "Selector",
        description: "Pill row above the cards",
        defaultValue: true,
    },
    selectorSize: {
        type: ControlType.Number,
        title: "Selector Size",
        min: 10,
        max: 22,
        step: 0.5,
        defaultValue: 15,
        hidden: (p) => !p.showSelector,
    },
    titleSize: {
        type: ControlType.Number,
        title: "Title Size",
        min: 16,
        max: 44,
        step: 1,
        defaultValue: 26,
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
    },
    statSize: {
        type: ControlType.Number,
        title: "Stat Size",
        min: 20,
        max: 56,
        step: 1,
        defaultValue: 34,
    },
    statWeight: {
        type: ControlType.Enum,
        title: "Stat Weight",
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
    },
    statItalic: {
        type: ControlType.Boolean,
        title: "Stat Italic",
        defaultValue: true,
    },
    statGlow: {
        type: ControlType.Boolean,
        title: "Stat Glow",
        defaultValue: true,
    },
    statLayout: {
        type: ControlType.Enum,
        title: "Stat Layout",
        description:
            "One stat at a time with a scramble, or all of them in a 2-column grid",
        options: ["rotate", "grid"],
        optionTitles: ["Scramble", "2-Col Grid"],
        defaultValue: "rotate",
        displaySegmentedControl: true,
    },
    showTags: {
        type: ControlType.Boolean,
        title: "Show Tags",
        description: "Project tags — off on mobile by default",
        defaultValue: false,
    },
    mediaAspect: {
        type: ControlType.Enum,
        title: "Video Ratio",
        options: ["1 / 1", "4 / 3", "16 / 9", "3 / 4"],
        optionTitles: ["1:1", "4:3", "16:9", "3:4"],
        defaultValue: "1 / 1",
    },
    statInterval: {
        type: ControlType.Number,
        title: "Stat Every",
        description: "ms between stats",
        min: 1000,
        max: 8000,
        step: 100,
        defaultValue: 2800,
        hidden: (p) => p.statLayout === "grid",
    },
    scrambleDuration: {
        type: ControlType.Number,
        title: "Scramble",
        description: "ms — length of the scramble transition",
        min: 200,
        max: 2000,
        step: 50,
        defaultValue: 750,
        hidden: (p) => p.statLayout === "grid",
    },
    scrambleCharset: {
        type: ControlType.String,
        title: "Characters",
        defaultValue: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%+#@&$*",
        hidden: (p) => p.statLayout === "grid",
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
        description: "Full-screen background behind the Read More overlay",
        defaultValue: "#000000",
    },
    overlayCardBackground: {
        type: ControlType.Color,
        title: "Overlay Card BG",
        defaultValue: "#0B0D0A",
    },
    overlayTint: {
        type: ControlType.Boolean,
        title: "Overlay Tint",
        description:
            "Wash the opening card's tint over both overlay backgrounds",
        defaultValue: false,
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
        description: "Titles and stat values — pick Magistral",
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
    cardFlip: {
        type: ControlType.Boolean,
        title: "Card Flip",
        description: "Full spin when a card becomes the selected one",
        defaultValue: true,
    },
})

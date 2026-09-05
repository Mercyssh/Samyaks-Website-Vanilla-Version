import * as React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Publication, Media & Awards — Mobile
 *
 * Mobile-friendly rewrite of the desktop split-panel component:
 *   • Category (Media / Awards / Fellowships / Books) → swipeable pill row
 *   • Items inside a category                        → horizontal chip strip
 *   • Selected item                                  → stacked card (media on top)
 *   • "Read Article"                                 → full-screen scrollable image overlay
 *
 * Everything is driven from the Framer properties panel (Categories → Items).
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 620
 */
export default function MediaAwardsMobile(props) {
    const {
        categories,
        accent,
        background,
        cardBackground,
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

    const [catIndex, setCatIndex] = useState(0)
    const [itemIndex, setItemIndex] = useState(0)
    const [overlay, setOverlay] = useState<any>(null)

    const safeCats = categories && categories.length ? categories : []
    const category = safeCats[Math.min(catIndex, safeCats.length - 1)]
    const items = (category && category.items) || []
    const item = items[Math.min(itemIndex, Math.max(items.length - 1, 0))]

    // Reset the item cursor whenever the category changes.
    useEffect(() => setItemIndex(0), [catIndex])

    const goItem = useCallback(
        (dir: number) => {
            if (!items.length) return
            setItemIndex((i) => (i + dir + items.length) % items.length)
        },
        [items.length]
    )

    const tokens = {
        accent,
        background,
        cardBackground,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        radius,
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
                padding: "44px 0 24px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <style>{`.mam-rail::-webkit-scrollbar{display:none}`}</style>

            {/*
             * Reveal wrapper. Only opacity + translateY are animated, so the
             * laid-out height is identical before, during and after — the page
             * never reflows and scroll position stays put. The overlay is
             * deliberately kept outside this element: a transformed ancestor
             * would become the containing block for its position: fixed.
             */}
            <motion.div
                variants={revealContainer}
                initial={false}
                animate={revealed ? "show" : "hidden"}
            >
                <motion.div variants={revealChild}>
                    <CategoryTabs
                        categories={safeCats}
                        activeIndex={catIndex}
                        onChange={setCatIndex}
                        tokens={tokens}
                    />
                </motion.div>

                <motion.div variants={revealChild}>
                    <ItemChips
                        items={items}
                        activeIndex={itemIndex}
                        onChange={setItemIndex}
                        tokens={tokens}
                    />
                </motion.div>

                <motion.div variants={revealChild} style={{ padding: "0 16px" }}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`${catIndex}-${itemIndex}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{
                                duration: 0.25,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.18}
                            onDragEnd={(_, info) => {
                                if (
                                    info.offset.x < -60 ||
                                    info.velocity.x < -500
                                )
                                    goItem(1)
                                else if (
                                    info.offset.x > 60 ||
                                    info.velocity.x > 500
                                )
                                    goItem(-1)
                            }}
                        >
                            <ItemCard
                                item={item}
                                tokens={tokens}
                                onRead={() => setOverlay(item)}
                            />
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {items.length > 1 && (
                    <motion.div variants={revealChild}>
                        <Dots
                            count={items.length}
                            active={itemIndex}
                            onSelect={setItemIndex}
                            tokens={tokens}
                        />
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence>
                {overlay && (
                    <ArticleOverlay
                        item={overlay}
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

/* ---------------------------------------------------------------- categories */

function CategoryTabs({ categories, activeIndex, onChange, tokens }) {
    const railRef = useRef<HTMLDivElement>(null)

    useScrollActiveIntoView(railRef, activeIndex)

    return (
        <div
            ref={railRef}
            className="mam-rail"
            style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                padding: "0 16px 14px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            {categories.map((c, i) => {
                const active = i === activeIndex
                return (
                    <div
                        key={c.name + i}
                        data-active={active ? "true" : "false"}
                        style={{ flex: "0 0 auto", position: "relative" }}
                    >
                        {/*
                         * Offset outline sitting behind the pill — the "3D"
                         * layer. It slides out from under the pill on select
                         * and tucks back in on deselect.
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
                            onClick={() => onChange(i)}
                            style={{
                                position: "relative",
                                display: "block",
                                padding: "9px 16px",
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
                                fontSize: 14,
                                fontWeight: 600,
                                letterSpacing: "-0.01em",
                                cursor: "pointer",
                                transition:
                                    "background .18s ease, color .18s ease, border-color .18s ease",
                                fontFamily: "inherit",
                            }}
                        >
                            {c.name}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

/* --------------------------------------------------------------------- items */

function ItemChips({ items, activeIndex, onChange, tokens }) {
    const railRef = useRef<HTMLDivElement>(null)
    useScrollActiveIntoView(railRef, activeIndex)

    if (!items.length) return null

    // Fold the flat item list into contiguous groups, preserving the order the
    // items are authored in. Consecutive items sharing a group name collapse
    // into one segment; a blank group name means "no label". We keep the
    // original flat index on every chip so selection, the card, the dots and
    // the swipe logic upstream can all stay index-based and untouched.
    const groups: { name: string; entries: { it: any; i: number }[] }[] = []
    items.forEach((it, i) => {
        const name = ((it && it.group) || "").trim()
        const last = groups[groups.length - 1]
        if (last && last.name === name) last.entries.push({ it, i })
        else groups.push({ name, entries: [{ it, i }] })
    })

    // Only reserve the label row once at least one item actually names a group,
    // so an ungrouped category looks exactly like it did before.
    const hasLabels = groups.some((g) => g.name)

    const chip = (it: any, i: number) => {
        const active = i === activeIndex
        return (
            <button
                key={(it.label || "") + i}
                data-active={active ? "true" : "false"}
                onClick={() => onChange(i)}
                style={{
                    flex: "0 0 auto",
                    padding: "2px 0 8px",
                    border: "none",
                    background: "transparent",
                    color: active ? tokens.accent : tokens.mutedColor,
                    fontSize: 15,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    position: "relative",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    transition: "color .18s ease",
                }}
            >
                {it.label}
                {active && (
                    <motion.span
                        layoutId="mam-underline"
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: -1,
                            height: 2,
                            borderRadius: 2,
                            background: tokens.accent,
                        }}
                    />
                )}
            </button>
        )
    }

    return (
        <div
            ref={railRef}
            className="mam-rail"
            style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 30,
                overflowX: "auto",
                padding: "0 16px 16px",
                scrollbarWidth: "none",
                borderBottom: `1px solid ${tokens.borderColor}`,
                marginBottom: 18,
            }}
        >
            {groups.map((group, gi) => (
                <div
                    key={group.name + gi}
                    style={{
                        flex: "0 0 auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                    }}
                >
                    {hasLabels && (
                        <span
                            style={{
                                color: tokens.mutedColor,
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: "0.09em",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                                opacity: group.name ? 0.7 : 0,
                                // Keep chips aligned on one baseline even when a
                                // group has no name — the empty label still
                                // occupies its row.
                                minHeight: "1em",
                            }}
                        >
                            {group.name || " "}
                        </span>
                    )}
                    <div style={{ display: "flex", gap: 18 }}>
                        {group.entries.map(({ it, i }) => chip(it, i))}
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ---------------------------------------------------------------- item card */

function ItemCard({ item, tokens, onRead }) {
    if (!item) {
        return (
            <div style={{ color: tokens.mutedColor, fontSize: 14 }}>
                Add items to this category in the properties panel.
            </div>
        )
    }

    const type = item.type || "article"

    if (type === "image" || type === "video") {
        return (
            <div>
                {item.title ? (
                    <h3
                        style={{
                            margin: "0 0 14px",
                            textAlign: "center",
                            color: tokens.accent,
                            ...tokens.headingFont,
                            fontSize: 20,
                            lineHeight: 1.25,
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                        }}
                    >
                        {item.title}
                    </h3>
                ) : null}
                <MediaFrame item={item} tokens={tokens} />
            </div>
        )
    }

    // article
    return (
        <div>
            <MediaFrame item={item} tokens={tokens} />
            <h3
                style={{
                    margin: "18px 0 10px",
                    color: tokens.accent,
                    ...tokens.headingFont,
                    fontSize: 22,
                    lineHeight: 1.2,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                }}
            >
                {item.title}
            </h3>
            {item.body ? (
                <p
                    style={{
                        margin: 0,
                        color: tokens.mutedColor,
                        fontSize: 15,
                        lineHeight: 1.5,
                        // Only clamp the body when there's a Full Article image
                        // to expand into (the Read More button is visible).
                        // Without one, the button is hidden, so show the full
                        // text right here instead of truncating it.
                        ...(item.articleImage
                            ? {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                              }
                            : {}),
                    }}
                >
                    {item.body}
                </p>
            ) : null}
            {(item.articleImage || item.link) && (
                <button
                    onClick={() => {
                        if (item.articleImage) onRead()
                        else if (item.link)
                            window.open(item.link, "_blank", "noopener")
                    }}
                    style={{
                        margin: "16px auto 0",
                        display: "flex",
                        width: "fit-content",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "14px 26px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "#262626",
                        color: "#F2F2F2",
                        fontSize: 15,
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        cursor: "pointer",
                        fontFamily: "inherit",
                    }}
                >
                    {item.buttonLabel || "Read Article"}
                </button>
            )}
        </div>
    )
}

/* -------------------------------------------------------------- media frame */

function MediaFrame({ item, tokens }) {
    const [playing, setPlaying] = useState(false)
    const type = item.type || "article"
    const isVideo = type === "video"
    const embed = useMemo(
        () => toEmbedUrl(item.videoUrl),
        [item.videoUrl]
    )

    // Reset the player when the item changes.
    useEffect(() => setPlaying(false), [item.videoUrl, item.title])

    // Outer ring — sits a few px proud of the media itself.
    const frameStyle: React.CSSProperties = {
        width: "100%",
        borderRadius: 18,
        padding: 8,
        boxSizing: "border-box",
        background: tokens.cardBackground,
        border: `1px solid ${tokens.borderColor}`,
    }

    // Inner well — holds the actual image / player.
    const mediaStyle: React.CSSProperties = {
        width: "100%",
        borderRadius: 11,
        overflow: "hidden",
        background: tokens.cardBackground,
        position: "relative",
        aspectRatio: isVideo ? "16 / 9" : item.imageAspect || "4 / 3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    if (isVideo) {
        return (
            <div style={frameStyle}>
                <div style={mediaStyle}>
                    {playing && embed ? (
                        <iframe
                            src={embed}
                            title={item.title || "video"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                            }}
                        />
                    ) : playing && item.videoFile ? (
                        <video
                            src={item.videoFile}
                            controls
                            autoPlay
                            playsInline
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <button
                            onClick={() => setPlaying(true)}
                            style={{
                                all: "unset",
                                position: "absolute",
                                inset: 0,
                                cursor: "pointer",
                            }}
                            aria-label="Play video"
                        >
                            {item.image && (
                                <img
                                    src={item.image}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            )}
                            <span
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "rgba(0,0,0,.28)",
                                }}
                            >
                                <span
                                    style={{
                                        width: 62,
                                        height: 44,
                                        borderRadius: 12,
                                        background: "rgba(20,20,20,.85)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderTop: "9px solid transparent",
                                            borderBottom:
                                                "9px solid transparent",
                                            borderLeft: `15px solid ${tokens.accent}`,
                                            marginLeft: 4,
                                        }}
                                    />
                                </span>
                            </span>
                        </button>
                    )}
                </div>
            </div>
        )
    }

    if (!item.image) return null

    return (
        <div style={frameStyle}>
            <div style={mediaStyle}>
                <img
                    src={item.image}
                    alt={item.title || ""}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: item.imageFit || "cover",
                        background: item.imageBackground || "transparent",
                    }}
                />
            </div>
        </div>
    )
}

/* ----------------------------------------------------------------- overlay */

function ArticleOverlay({ item, tokens, onClose }) {
    // Lock body scroll behind the overlay.
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

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
    // The `maOverlay` marker on the state is what tells the two cases apart.
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (typeof window === "undefined" || !window.history) return

        window.history.pushState({ maOverlay: true }, "")
        const onPop = () => onClose()
        window.addEventListener("popstate", onPop)

        return () => {
            window.removeEventListener("popstate", onPop)
            if (window.history.state && window.history.state.maOverlay) {
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
                background: "rgba(0,0,0,.92)",
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
                    {item.title}
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
                    {/* An SVG rather than a "×" glyph — text crosses sit off
                     * the optical centre because of the font's side bearings. */}
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
                    WebkitOverflowScrolling: "touch",
                    padding: "0 0 32px",
                }}
            >
                {item.articleImage ? (
                    <img
                        src={item.articleImage}
                        alt={item.title || "Article"}
                        style={{
                            display: "block",
                            width: "100%",
                            height: "auto",
                        }}
                    />
                ) : null}

                {item.link ? (
                    <div style={{ padding: "20px 16px 0" }}>
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "block",
                                textAlign: "center",
                                padding: "13px 20px",
                                borderRadius: 999,
                                background: tokens.accent,
                                color: "#0A0A0A",
                                fontSize: 15,
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            Open original article
                        </a>
                    </div>
                ) : null}
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
                marginTop: 18,
            }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(i)}
                    aria-label={`Go to item ${i + 1}`}
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

/**
 * True once the element has first scrolled into view, then latched forever.
 *
 * Uses a bottom rootMargin rather than a threshold so it fires consistently
 * whether the section is shorter or taller than the viewport — a threshold of
 * 0.25 can never be met by an element two screens tall on a small phone.
 * Purely observational: it reads layout, never writes it.
 */
function useRevealOnScroll(ref: React.RefObject<HTMLElement>) {
    const [seen, setSeen] = useState(false)

    useEffect(() => {
        if (seen) return
        const el = ref.current
        if (!el) return
        // No IntersectionObserver (very old browser / SSR pass) → just show it.
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

/** Keeps the active pill/chip scrolled into view in its horizontal rail. */
function useScrollActiveIntoView(
    railRef: React.RefObject<HTMLDivElement>,
    activeIndex: number
) {
    useEffect(() => {
        const rail = railRef.current
        if (!rail) return
        const el = rail.querySelector('[data-active="true"]') as HTMLElement
        if (!el) return
        const target =
            el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2
        rail.scrollTo({ left: Math.max(target, 0), behavior: "smooth" })
    }, [activeIndex, railRef])
}

/** youtube / vimeo watch URLs → embeddable player URLs. */
function toEmbedUrl(url?: string): string | null {
    if (!url) return null
    try {
        const u = new URL(url)
        const host = u.hostname.replace(/^www\./, "")
        if (host === "youtu.be")
            return `https://www.youtube.com/embed/${u.pathname.slice(
                1
            )}?autoplay=1&playsinline=1&rel=0`
        if (host.endsWith("youtube.com")) {
            const id = u.searchParams.get("v") || u.pathname.split("/").pop()
            return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`
        }
        if (host.endsWith("vimeo.com"))
            return `https://player.vimeo.com/video/${u.pathname
                .split("/")
                .filter(Boolean)
                .pop()}?autoplay=1`
        return url
    } catch {
        return null
    }
}

/* ------------------------------------------------------- property controls */

const itemControl = {
    type: ControlType.Object,
    controls: {
        label: {
            type: ControlType.String,
            title: "Menu Label",
            defaultValue: "Press Trust of India",
        },
        group: {
            type: ControlType.String,
            title: "Group",
            placeholder: "e.g. Publications",
            description:
                "Optional sub-heading shown above this item's chip. Consecutive items sharing a group sit together under one label.",
            defaultValue: "",
        },
        type: {
            type: ControlType.Enum,
            title: "Layout",
            options: ["article", "image", "video"],
            optionTitles: ["Article", "Image only", "Video"],
            defaultValue: "article",
            displaySegmentedControl: true,
        },
        title: {
            type: ControlType.String,
            title: "Title",
            displayTextArea: true,
            defaultValue: "Headline goes here",
        },
        body: {
            type: ControlType.String,
            title: "Body",
            displayTextArea: true,
            defaultValue: "",
            hidden: (p) => p.type !== "article",
        },
        image: {
            type: ControlType.Image,
            title: (p) => (p.type === "video" ? "Thumbnail" : "Image"),
        },
        imageFit: {
            type: ControlType.Enum,
            title: "Image Fit",
            options: ["cover", "contain"],
            optionTitles: ["Cover", "Contain"],
            defaultValue: "cover",
            hidden: (p) => p.type === "video",
        },
        imageBackground: {
            type: ControlType.Color,
            title: "Image BG",
            defaultValue: "rgba(0,0,0,0)",
            hidden: (p) => p.type === "video" || p.imageFit !== "contain",
        },
        imageAspect: {
            type: ControlType.Enum,
            title: "Aspect",
            options: ["4 / 3", "16 / 9", "1 / 1", "3 / 4"],
            optionTitles: ["4:3", "16:9", "1:1", "3:4"],
            defaultValue: "4 / 3",
            hidden: (p) => p.type === "video",
        },
        videoUrl: {
            type: ControlType.String,
            title: "Video URL",
            placeholder: "YouTube / Vimeo link",
            hidden: (p) => p.type !== "video",
        },
        videoFile: {
            type: ControlType.File,
            title: "Video File",
            allowedFileTypes: ["mp4", "webm", "mov"],
            hidden: (p) => p.type !== "video" || !!p.videoUrl,
        },
        articleImage: {
            type: ControlType.Image,
            title: "Full Article",
            description: "Long screenshot shown in the read-more overlay",
            hidden: (p) => p.type !== "article",
        },
        link: {
            type: ControlType.Link,
            title: "Source Link",
            hidden: (p) => p.type !== "article",
        },
        buttonLabel: {
            type: ControlType.String,
            title: "Button",
            defaultValue: "Read Article",
            hidden: (p) => p.type !== "article",
        },
    },
}

addPropertyControls(MediaAwardsMobile, {
    categories: {
        type: ControlType.Array,
        title: "Categories",
        control: {
            type: ControlType.Object,
            controls: {
                name: {
                    type: ControlType.String,
                    title: "Name",
                    defaultValue: "Media",
                },
                items: {
                    type: ControlType.Array,
                    title: "Items",
                    control: itemControl,
                    defaultValue: [],
                },
            },
        },
        defaultValue: [
            {
                name: "Media",
                items: [
                    {
                        label: "Press Trust of India",
                        group: "Publications",
                        type: "article",
                        title: "Samyak Chakrabarty and Navya Nanda's Nimaya partners with Govt's AI mission",
                        body: "Samyak Chakrabarty and Navya Nanda's Nimaya has signed an MOU with IndiaAI, an IBD of Digital India Corporation, Ministry of Electronics & Information Technology (MeitY), to ensure women from under-served communities have an edge in leveraging AI at work.",
                        buttonLabel: "Read Article",
                        imageFit: "contain",
                        imageAspect: "4 / 3",
                    },
                    {
                        label: "BBC",
                        group: "Broadcast",
                        type: "image",
                        title: "BBC Interview",
                        imageFit: "cover",
                        imageAspect: "16 / 9",
                    },
                    {
                        label: "AIM Network",
                        group: "Broadcast",
                        type: "video",
                        title: "AI for India's Daughters",
                        videoUrl: "",
                    },
                ],
            },
            { name: "Awards", items: [] },
            { name: "Fellowships", items: [] },
            { name: "Books", items: [] },
        ],
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
        title: "Frame BG",
        defaultValue: "#0E0E0E",
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
        defaultValue: "rgba(255,255,255,0.14)",
    },
    headingFont: {
        type: ControlType.Font,
        title: "Heading Font",
        description: "Titles only — pick Magistral",
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

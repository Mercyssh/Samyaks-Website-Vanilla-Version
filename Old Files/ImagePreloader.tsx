import { useEffect } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * ImagePreloader
 * --------------
 * Drop this ONCE near the top of a page. On mount it eagerly warms the
 * browser cache for every image on the page so nothing "pops in" when you
 * scroll to its section.
 *
 * What it does:
 *  - Finds every <img> already in the DOM and preloads its src + srcset
 *  - Flips loading="lazy" -> "eager" so the browser stops deferring them
 *  - Preloads CSS background-image URLs
 *  - Warms every <video>: flips preload -> "auto", calls load(), and
 *    preloads its poster image + <source> URLs
 *  - Preloads any extra URLs you paste into the property controls
 *  - Uses a MutationObserver for a few seconds to catch sections Framer
 *    mounts late (so those get warmed before you reach them too)
 *
 * It renders nothing visible.
 */

function warm(url?: string | null) {
    if (!url) return
    // new Image() kicks off a fetch that lands in the HTTP cache; when the
    // real <img> renders later it's served from cache instantly.
    const img = new Image()
    img.decoding = "async"
    img.src = url
}

function urlsFromSrcset(srcset?: string | null): string[] {
    if (!srcset) return []
    return srcset
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean)
}

function warmImgElement(el: HTMLImageElement) {
    // Stop the browser from deferring this one.
    if (el.loading === "lazy") el.loading = "eager"
    el.setAttribute("fetchpriority", "high")
    warm(el.currentSrc || el.src || el.getAttribute("src"))
    urlsFromSrcset(el.getAttribute("srcset")).forEach(warm)
}

function warmVideoElement(el: HTMLVideoElement) {
    // Warm the poster so the first frame shows instantly.
    warm(el.getAttribute("poster"))

    // Tell the browser to fetch the media instead of deferring it.
    if (el.preload === "none" || el.preload === "metadata") {
        el.preload = "auto"
    }

    // Nudge any lazy-src <source> children into the real src attribute so
    // load() actually fetches something.
    el.querySelectorAll("source").forEach((source) => {
        const dataSrc = source.getAttribute("data-src")
        if (dataSrc && !source.getAttribute("src")) {
            source.setAttribute("src", dataSrc)
        }
    })

    // Re-read sources with the new preload hint and start buffering.
    try {
        el.load()
    } catch {
        // Some browsers throw if load() races the element's own setup; ignore.
    }
}

function warmBackground(el: Element) {
    const bg = getComputedStyle(el as HTMLElement).backgroundImage
    if (!bg || bg === "none") return
    // backgroundImage can be: url("...") , linear-gradient(...) , or both.
    const matches = bg.matchAll(/url\((['"]?)(.*?)\1\)/g)
    for (const m of matches) warm(m[2])
}

function scan(
    root: ParentNode = document,
    scanBackgrounds: boolean,
    scanVideos: boolean
) {
    root.querySelectorAll("img").forEach((el) =>
        warmImgElement(el as HTMLImageElement)
    )
    if (scanVideos) {
        root.querySelectorAll("video").forEach((el) =>
            warmVideoElement(el as HTMLVideoElement)
        )
    }
    if (scanBackgrounds) {
        root.querySelectorAll("*").forEach(warmBackground)
    }
}

interface Props {
    extraUrls: string[]
    scanBackgrounds: boolean
    scanVideos: boolean
    watchMs: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function ImagePreloader(props: Props) {
    const {
        extraUrls = [],
        scanBackgrounds = true,
        scanVideos = true,
        watchMs = 4000,
        style,
    } = props

    useEffect(() => {
        // Skip work inside the Framer canvas/editor — only run on the real site.
        if (typeof window === "undefined") return

        // 1. Any explicit URLs you pasted in.
        extraUrls.forEach(warm)

        // 2. Everything already on the page.
        scan(document, scanBackgrounds, scanVideos)

        // 3. Catch sections Framer mounts a little later.
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return
                    const el = node as Element
                    if (el.tagName === "IMG")
                        warmImgElement(el as HTMLImageElement)
                    else if (el.tagName === "VIDEO" && scanVideos)
                        warmVideoElement(el as HTMLVideoElement)
                    else scan(el, scanBackgrounds, scanVideos)
                })
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })

        // Stop watching after a few seconds — by then everything is warm.
        const stop = window.setTimeout(() => observer.disconnect(), watchMs)

        return () => {
            observer.disconnect()
            window.clearTimeout(stop)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Render a real element so Framer registers it as a placeable component,
    // but keep it visually invisible and out of layout flow.
    return (
        <div
            style={{
                width: 0,
                height: 0,
                overflow: "hidden",
                pointerEvents: "none",
                position: "absolute",
                ...style,
            }}
        />
    )
}

ImagePreloader.defaultProps = {
    width: 1,
    height: 1,
}

addPropertyControls(ImagePreloader, {
    scanBackgrounds: {
        type: ControlType.Boolean,
        title: "CSS Backgrounds",
        defaultValue: true,
        enabledTitle: "Preload",
        disabledTitle: "Skip",
    },
    scanVideos: {
        type: ControlType.Boolean,
        title: "Videos",
        defaultValue: true,
        enabledTitle: "Preload",
        disabledTitle: "Skip",
    },
    watchMs: {
        type: ControlType.Number,
        title: "Watch (ms)",
        defaultValue: 4000,
        min: 0,
        max: 15000,
        step: 500,
        description: "How long to keep catching late-mounted sections.",
    },
    extraUrls: {
        type: ControlType.Array,
        title: "Extra URLs",
        control: { type: ControlType.String, placeholder: "https://…" },
    },
})

import { useCallback, useEffect, useRef } from "react"
import Spline from "@splinetool/react-spline"
import { addPropertyControls, ControlType } from "framer"

// Report readiness to SplinePreloader (via window.__splineGate). No-ops if
// there's no preloader on the page.
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

/**
 * SplineSceneAdvanced
 * -------------------
 * A generic Spline container (React "Code Export" mode) plus a flexible,
 * string-driven event wiring system.
 *
 * You export your scene from Spline (Export → Code → React) and paste the
 * `.splinecode` URL into the `sceneUrl` property.
 *
 * The `mappings` array lets you wire interactions between objects without
 * touching code, using this format:
 *
 *     "TriggerObject(triggerEvent) = TargetObject(actionEvent)"
 *
 * Example:
 *
 *     "Button(onClick) = Cube(mouseHover)"
 *
 * → When you click the object named/id "Button" in the scene, the "mouseHover"
 *   Spline event is emitted on the object named/id "Cube".
 *
 * You can reference objects by NAME or by UUID (id) — both are matched.
 *
 * --- Trigger events (left side) — what the user does ---
 *   Aliases (case-insensitive) all resolve to Spline's real event names:
 *     onClick, click, mouseDown        -> mouseDown
 *     onMouseUp, mouseUp, release      -> mouseUp
 *     onHover, hover, mouseHover       -> mouseHover
 *     onKeyDown, keyDown               -> keyDown
 *     onKeyUp, keyUp                   -> keyUp
 *     onStart, start                   -> start
 *     onLookAt, lookAt                 -> lookAt
 *     onFollow, follow                 -> follow
 *     onScroll, scroll                 -> scroll
 *     onCollision, collision           -> collision
 *
 * --- Action events (right side) — what gets emitted ---
 *   Same alias set. By default emitEvent() is used (initial → final state).
 *   To play the event in reverse (final → initial) add `reverse` or prefix `!`:
 *     "A(onClick) = B(mouseDown, reverse)"
 *     "A(onClick) = B(!mouseDown)"
 *
 * --- Scroll-position triggers (window Y scroll) ---
 *   Use `scrollY(value)` as the trigger to fire when the page scroll reaches a
 *   Y position. Value is pixels, or a percentage of the scrollable height:
 *     "scrollY(800)   = Cube(mouseHover)"      // fires at 800px down
 *     "scrollY(50%)   = Cube(mouseDown)"       // fires at 50% scrolled
 *     "scrollY(800)   = $isOpen = true"        // set a variable at 800px
 *   Direction (optional 2nd arg): down (default), up, or any/both. A "down"
 *   trigger fires when crossing the threshold downward and re-arms when you
 *   scroll back above it; "up" fires on the upward crossing; "any" fires on
 *   both. (`scrollY`, `scroll_y`, `scroll-y` are all accepted.)
 *
 * --- Open a URL as the action ---
 *   Use `open(url)` on the right side. Opens in a new tab by default; add
 *   `same` (or `newtab`) to control where it opens:
 *     "Button(onClick) = open(https://example.com)"          // new tab
 *     "Button(onClick) = open(https://example.com, newtab)"  // new tab
 *     "Logo(onClick)   = open(https://example.com, same)"    // current tab
 *   A missing scheme is assumed https. mailto:, tel:, /paths and #anchors are
 *   left as-is. Works from any trigger (click, scroll, swipe).
 *
 * --- Swipe gestures (mobile / touch) ---
 *   Trigger an action when the user swipes over the component:
 *     "swipeUp    = Cube(mouseHover)"
 *     "swipeDown  = Cube(!mouseHover)"
 *     "swipeLeft  = $page = 2"
 *     "swipeRight = $page = 1"
 *   Also accepts function form with an optional minimum distance in px
 *   (default 50): "swipe(up, 80) = Cube(mouseDown)". Directions: up, down,
 *   left, right. The dominant axis of the gesture wins.
 *
 * --- Extra: set a Spline variable as the action ---
 *   Use `$variableName = value` on the right side instead of an object:
 *     "Button(onClick) = $isOpen = true"
 *     "Slider(onScroll) = $count = 5"
 *   Values are parsed as boolean / number / string automatically.
 *
 * You can add as many mapping strings as you like. Multiple lines can share
 * the same trigger object/event — they all fire.
 */

// --- Alias tables -----------------------------------------------------------

const EVENT_ALIASES: Record<string, string> = {
    // mouseDown
    onclick: "mouseDown",
    click: "mouseDown",
    mousedown: "mouseDown",
    onmousedown: "mouseDown",
    // mouseUp
    onmouseup: "mouseUp",
    mouseup: "mouseUp",
    release: "mouseUp",
    // mouseHover
    onhover: "mouseHover",
    hover: "mouseHover",
    mousehover: "mouseHover",
    // keyDown
    onkeydown: "keyDown",
    keydown: "keyDown",
    // keyUp
    onkeyup: "keyUp",
    keyup: "keyUp",
    // the rest (already canonical, listed for onX convenience)
    onstart: "start",
    start: "start",
    onlookat: "lookAt",
    lookat: "lookAt",
    onfollow: "follow",
    follow: "follow",
    onscroll: "scroll",
    scroll: "scroll",
    oncollision: "collision",
    collision: "collision",
    rendered: "rendered",
    onrendered: "rendered",
}

function resolveEvent(raw: string): string | null {
    const key = raw.trim().toLowerCase()
    return EVENT_ALIASES[key] ?? null
}

// --- Parsing ----------------------------------------------------------------

type VarAction = {
    kind: "variable"
    name: string
    value: number | boolean | string
}

type EmitAction = {
    kind: "emit"
    target: string
    event: string
    reverse: boolean
}

type UrlAction = {
    kind: "url"
    url: string
    target: "_blank" | "_self"
}

type Action = EmitAction | VarAction | UrlAction

// A trigger is either a Spline object event, or a window scroll position.
type SplineTrigger = {
    kind: "spline"
    target: string
    event: string
}

type ScrollTrigger = {
    kind: "scroll"
    threshold: number
    unit: "px" | "percent"
    // "down" fires when passing the threshold scrolling down (>=),
    // "up" fires when passing it scrolling up (<=), "any" fires on either.
    direction: "down" | "up" | "any"
}

// A swipe gesture over the component (touch). Optional minimum distance (px).
type SwipeTrigger = {
    kind: "swipe"
    direction: "up" | "down" | "left" | "right"
    minDistance: number
}

type Trigger = SplineTrigger | ScrollTrigger | SwipeTrigger

type Mapping = {
    trigger: Trigger
    action: Action
}

// Parses "Cube" or "Cube(mouseHover)" or "Cube(mouseHover, reverse)"
function parseObjectClause(clause: string): {
    target: string
    inner: string | null
} {
    const m = clause.match(/^\s*([^()]+?)\s*(?:\(([^)]*)\))?\s*$/)
    if (!m) return { target: clause.trim(), inner: null }
    return { target: m[1].trim(), inner: m[2] != null ? m[2].trim() : null }
}

function coerceValue(raw: string): number | boolean | string {
    const v = raw.trim()
    if (v === "true") return true
    if (v === "false") return false
    if (v !== "" && !isNaN(Number(v))) return Number(v)
    // strip surrounding quotes if present
    return v.replace(/^["']|["']$/g, "")
}

const SELF_TARGETS = ["same", "current", "self", "_self", "sametab", "same-tab"]

function normalizeUrl(raw: string): string {
    const u = raw.trim().replace(/^["']|["']$/g, "")
    // Leave explicit schemes (https:, mailto:, tel:, /path, #anchor) untouched.
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("/") || u.startsWith("#"))
        return u
    return "https://" + u
}

// Parses the whole right-hand side into an Action.
// Accepts:  "Cube(mouseHover)" | "Cube(mouseHover, reverse)" | "Cube(!mouseHover)"
//           "$varName = value"   (rightRaw is everything after the first '=')
//           "open(https://site.com)" | "open(https://site.com, newtab|same)"
function parseAction(rightRaw: string): Action | null {
    const rightTrim = rightRaw.trim()

    // URL action: open a link in a new tab (default) or the current tab.
    const openMatch = rightTrim.match(/^open\s*\((.*)\)\s*$/is)
    if (openMatch) {
        let body = openMatch[1].trim()
        let target: UrlAction["target"] = "_blank"
        // Only treat a trailing ", keyword" as the tab target — URLs may
        // themselves contain commas, so we split on the LAST comma and only
        // consume it if the tail is a recognized target keyword.
        const lastComma = body.lastIndexOf(",")
        if (lastComma !== -1) {
            const tail = body.slice(lastComma + 1).trim().toLowerCase()
            if (SELF_TARGETS.includes(tail)) {
                target = "_self"
                body = body.slice(0, lastComma)
            } else if (
                ["newtab", "new-tab", "new", "_blank", "blank", "tab"].includes(
                    tail
                )
            ) {
                target = "_blank"
                body = body.slice(0, lastComma)
            }
        }
        const url = normalizeUrl(body)
        if (!url) return null
        return { kind: "url", url, target }
    }

    // Variable action: "$name = value". The mapping's first '=' was already
    // split off, so recover the value from a second '=' here.
    if (rightTrim.startsWith("$")) {
        const varBody = rightTrim.slice(1)
        const innerEq = varBody.indexOf("=")
        if (innerEq === -1) return null
        const name = varBody.slice(0, innerEq).trim()
        const value = coerceValue(varBody.slice(innerEq + 1))
        if (!name) return null
        return { kind: "variable", name, value }
    }

    const right = parseObjectClause(rightTrim)
    if (!right.target || !right.inner) return null

    // inner may be "mouseDown" | "mouseDown, reverse" | "!mouseDown"
    let reverse = false
    let eventPart = right.inner
    const parts = eventPart.split(",")
    eventPart = parts[0].trim()
    if (parts.slice(1).some((p) => p.trim().toLowerCase() === "reverse")) {
        reverse = true
    }
    if (eventPart.startsWith("!")) {
        reverse = true
        eventPart = eventPart.slice(1).trim()
    }
    const actionEvent = resolveEvent(eventPart)
    if (!actionEvent) return null

    return { kind: "emit", target: right.target, event: actionEvent, reverse }
}

// Parses the trigger (left-hand) side.
// Spline event:  "Button(onClick)"
// Scroll pos:    "scrollY(500)"  | "scrollY(50%)"  | "scrollY(500, up)"
function parseTrigger(leftRaw: string): Trigger | null {
    const trimmed = leftRaw.trim()

    // Swipe gesture. Accepts:
    //   "swipeUp" | "swipe-up" | "swipe_down"
    //   "swipe(up)" | "swipe(up, 80)"   (80 = min distance in px)
    const swipeShort = trimmed.match(/^swipe[_-]?(up|down|left|right)$/i)
    const swipeFn = trimmed.match(/^swipe\s*\(([^)]*)\)$/i)
    if (swipeShort || swipeFn) {
        let direction: string
        let minDistance = 50
        if (swipeShort) {
            direction = swipeShort[1].toLowerCase()
        } else {
            const args = swipeFn![1].split(",").map((s) => s.trim())
            direction = (args[0] ?? "").toLowerCase()
            if (args[1] && !isNaN(Number(args[1]))) {
                minDistance = Number(args[1])
            }
        }
        if (!["up", "down", "left", "right"].includes(direction)) return null
        return {
            kind: "swipe",
            direction: direction as SwipeTrigger["direction"],
            minDistance,
        }
    }

    const left = parseObjectClause(leftRaw)
    if (!left.target || !left.inner) return null

    // Scroll-position trigger.
    if (/^scroll[_-]?y$/i.test(left.target)) {
        const segs = left.inner.split(",").map((s) => s.trim())
        const valueRaw = segs[0] ?? ""
        const isPercent = valueRaw.endsWith("%")
        const num = Number(valueRaw.replace("%", ""))
        if (isNaN(num)) return null
        let direction: ScrollTrigger["direction"] = "down"
        const dirRaw = (segs[1] ?? "").toLowerCase()
        if (dirRaw === "up") direction = "up"
        else if (dirRaw === "any" || dirRaw === "both") direction = "any"
        else if (dirRaw === "down") direction = "down"
        return {
            kind: "scroll",
            threshold: num,
            unit: isPercent ? "percent" : "px",
            direction,
        }
    }

    // Spline object event trigger.
    const event = resolveEvent(left.inner)
    if (!event) return null
    return { kind: "spline", target: left.target, event }
}

function parseMapping(line: string): Mapping | null {
    if (!line || !line.trim() || line.trim().startsWith("//")) return null

    const eqIndex = line.indexOf("=")
    if (eqIndex === -1) return null

    const trigger = parseTrigger(line.slice(0, eqIndex))
    if (!trigger) return null

    const action = parseAction(line.slice(eqIndex + 1))
    if (!action) return null

    return { trigger, action }
}

// --- Component --------------------------------------------------------------

interface Props {
    sceneUrl: string
    mappings: string[]
    style?: React.CSSProperties
}

export default function SplineSceneAdvanced(props: Props) {
    const { sceneUrl, mappings, style } = props
    const appRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const cleanupRef = useRef<(() => void) | null>(null)

    const wireUp = useCallback(
        (app: any) => {
            if (!app) return

            // Tear down any previous listeners first.
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }

            const parsed = (mappings || [])
                .map(parseMapping)
                .filter((m): m is Mapping => m !== null)

            const matches = (target: any, ref: string) => {
                if (!target) return false
                return target.name === ref || target.id === ref
            }

            const runAction = (action: Action) => {
                try {
                    if (action.kind === "url") {
                        if (typeof window !== "undefined") {
                            if (action.target === "_self") {
                                window.location.href = action.url
                            } else {
                                // Use an anchor click, not window.open with a
                                // features string. A features string opens a
                                // popup WINDOW (not a tab) and gets killed by
                                // the popup blocker when triggered from inside
                                // Spline's event dispatch. An anchor opens a
                                // real new tab and survives the indirection.
                                const a = document.createElement("a")
                                a.href = action.url
                                a.target = "_blank"
                                a.rel = "noopener noreferrer"
                                a.style.display = "none"
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                            }
                        }
                    } else if (action.kind === "variable") {
                        app.setVariable(action.name, action.value)
                    } else if (action.reverse) {
                        app.emitEventReverse(action.event, action.target)
                    } else {
                        app.emitEvent(action.event, action.target)
                    }
                } catch (err) {
                    // Bad object/event names shouldn't crash the scene.
                    console.warn("[SplineSceneAdvanced] action failed:", err)
                }
            }

            // --- 1. Spline object-event triggers -------------------------
            // Group by event type so we register one listener per event.
            const splineMaps = parsed.filter(
                (m) => m.trigger.kind === "spline"
            )
            const byEvent = new Map<string, Mapping[]>()
            for (const map of splineMaps) {
                const ev = (map.trigger as SplineTrigger).event
                const arr = byEvent.get(ev) ?? []
                arr.push(map)
                byEvent.set(ev, arr)
            }

            const registered: Array<{
                event: string
                cb: (e: any) => void
            }> = []

            byEvent.forEach((maps, eventName) => {
                const cb = (e: any) => {
                    const target = e?.target
                    for (const map of maps) {
                        const t = map.trigger as SplineTrigger
                        if (matches(target, t.target)) runAction(map.action)
                    }
                }
                app.addEventListener(eventName, cb)
                registered.push({ event: eventName, cb })
            })

            // --- 2. Window Y-scroll position triggers --------------------
            const scrollMaps = parsed.filter(
                (m) => m.trigger.kind === "scroll"
            )
            let scrollHandler: (() => void) | null = null
            if (scrollMaps.length > 0 && typeof window !== "undefined") {
                // Per-mapping "armed" state so each threshold fires once per
                // crossing and re-arms when scrolling back the other way.
                const armed = new Array(scrollMaps.length).fill(true)

                const readScroll = () => {
                    const doc = document.documentElement
                    const y = window.scrollY || doc.scrollTop || 0
                    const max = Math.max(
                        1,
                        (doc.scrollHeight || 0) - window.innerHeight
                    )
                    const pct = (y / max) * 100
                    return { y, pct }
                }

                scrollHandler = () => {
                    const { y, pct } = readScroll()
                    scrollMaps.forEach((map, i) => {
                        const t = map.trigger as ScrollTrigger
                        const current = t.unit === "percent" ? pct : y
                        const past = current >= t.threshold
                        // Determine whether we should fire on this frame.
                        if (past && armed[i]) {
                            if (t.direction !== "up") runAction(map.action)
                            armed[i] = false
                        } else if (!past && !armed[i]) {
                            if (t.direction === "up") runAction(map.action)
                            armed[i] = true
                        }
                    })
                }

                window.addEventListener("scroll", scrollHandler, {
                    passive: true,
                })
                // Fire once on wire-up in case we already loaded past a
                // threshold (but leave "up" triggers armed).
                scrollHandler()
            }

            // --- 3. Swipe gestures over the component (touch) ------------
            const swipeMaps = parsed.filter((m) => m.trigger.kind === "swipe")
            const el = containerRef.current
            let onTouchStart: ((e: TouchEvent) => void) | null = null
            let onTouchEnd: ((e: TouchEvent) => void) | null = null
            if (swipeMaps.length > 0 && el) {
                let startX = 0
                let startY = 0
                let startT = 0
                const MAX_MS = 800

                onTouchStart = (e: TouchEvent) => {
                    const t = e.changedTouches[0]
                    if (!t) return
                    startX = t.clientX
                    startY = t.clientY
                    startT = Date.now()
                }
                onTouchEnd = (e: TouchEvent) => {
                    const t = e.changedTouches[0]
                    if (!t) return
                    if (Date.now() - startT > MAX_MS) return
                    const dx = t.clientX - startX
                    const dy = t.clientY - startY
                    const absX = Math.abs(dx)
                    const absY = Math.abs(dy)
                    // Classify dominant axis, then direction.
                    let dir: SwipeTrigger["direction"] | null = null
                    let dist = 0
                    if (absY >= absX) {
                        dist = absY
                        dir = dy < 0 ? "up" : "down"
                    } else {
                        dist = absX
                        dir = dx < 0 ? "left" : "right"
                    }
                    for (const map of swipeMaps) {
                        const s = map.trigger as SwipeTrigger
                        if (s.direction === dir && dist >= s.minDistance) {
                            runAction(map.action)
                        }
                    }
                }
                el.addEventListener("touchstart", onTouchStart, {
                    passive: true,
                })
                el.addEventListener("touchend", onTouchEnd, { passive: true })
            }

            cleanupRef.current = () => {
                for (const r of registered) {
                    try {
                        app.removeEventListener(r.event, r.cb)
                    } catch {}
                }
                if (scrollHandler) {
                    window.removeEventListener("scroll", scrollHandler)
                }
                if (el && onTouchStart && onTouchEnd) {
                    el.removeEventListener("touchstart", onTouchStart)
                    el.removeEventListener("touchend", onTouchEnd)
                }
            }
        },
        [mappings]
    )

    const onLoad = useCallback(
        (app: any) => {
            appRef.current = app
            wireUp(app)
            markSplineReadyAfterPaint(sceneUrl)
        },
        [wireUp, sceneUrl]
    )

    // Announce this scene to the preloader as soon as it mounts.
    useEffect(() => {
        if (sceneUrl) registerSpline(sceneUrl)
    }, [sceneUrl])

    // Re-wire when the mappings change after load (e.g. editing in Framer).
    useEffect(() => {
        if (appRef.current) wireUp(appRef.current)
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
        }
    }, [wireUp])

    if (!sceneUrl) {
        return (
            <div
                style={{
                    ...style,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#111",
                    color: "#888",
                    fontFamily: "sans-serif",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 16,
                }}
            >
                Paste your Spline <code>.splinecode</code> export URL in the
                “Scene URL” property.
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{ ...style, overflow: "hidden", touchAction: "pan-y" }}
        >
            <Spline
                scene={sceneUrl}
                onLoad={onLoad}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    )
}

SplineSceneAdvanced.defaultProps = {
    sceneUrl: "",
    mappings: [],
}

addPropertyControls(SplineSceneAdvanced, {
    sceneUrl: {
        type: ControlType.String,
        title: "Scene URL",
        placeholder: "https://prod.spline.design/XXXX/scene.splinecode",
        defaultValue: "",
    },
    mappings: {
        type: ControlType.Array,
        title: "Event Wiring",
        control: {
            type: ControlType.String,
            placeholder: "Button(onClick) = Cube(mouseHover)",
        },
        defaultValue: [],
    },
})

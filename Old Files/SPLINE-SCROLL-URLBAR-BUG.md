# Bug report: built-in Scroll event resets to start on mobile URL-bar toggle

## Summary

A Spline scene driven by the **built-in Scroll event** snaps its animation
back to the **start** whenever the mobile browser's address (URL) bar slides
in or out. The reset happens on the `resize` event the bar toggle fires — it is
**not** caused by the user actually scrolling. `window.scrollY` does not change
at the moment of the reset.

## Environment

- Runtime: `@splinetool/react-spline` (Spline runtime), used inside a Framer
  code component.
- Scene setup: camera transition driven by the **built-in Scroll event**, with a
  fixed scroll distance of **900px**.
- Layout: the scene canvas is pinned on screen using a `position: sticky`
  viewport frame plus a transparent 900px "timeline" spacer that the user
  scrolls through (standard scroll-pin pattern). The section sits in the middle
  of a longer page.
- Reproduces on **real mobile devices** (iOS Safari and Chrome Android).
- Does **not** reproduce in Chrome DevTools device emulation — because emulation
  has no real URL bar, the viewport height never changes.

## Steps to reproduce

1. Put a Spline scene with a built-in Scroll event in a scroll-pinned section on
   a normal (scrollable) mobile web page.
2. On a real phone, scroll **down** into the section — the camera animates
   correctly with scroll.
3. Scroll **up** even slightly. This causes the mobile browser to reveal the URL
   bar, which resizes the viewport.
4. **Observed:** the camera jumps back to the animation's start position.
   **Expected:** the camera stays at the position corresponding to the current
   scroll offset.

## Root cause (as diagnosed)

The mobile URL bar showing/hiding fires `resize` on `window` and on
`window.visualViewport`. The built-in Scroll event appears to **recompute its
scroll progress from viewport geometry on every `resize`**, and that recompute
collapses progress to ~0.

Confirmed with an on-device overlay logging `window.innerHeight`,
`visualViewport.height`, `visualViewport.offsetTop`, and `window.scrollY`:

- At the moment the camera resets, `scrollY` is **unchanged**.
- A `resize` / `visualViewport resize` event fires at exactly that moment.

So the trigger is the resize event, not scroll input. Because the URL bar only
toggles in response to root-document scroll — which the scroll-pin pattern
inherently requires — the bar (and therefore the spurious resize) cannot simply
be avoided on a mid-page pinned section.

Note: switching the layout from the dynamic viewport unit (`dvh`) to the stable
one (`svh`), and locking the pinned frame's height, stopped the visible layout
reflow but did **not** fix the reset — the runtime still reacts to the raw
`resize` event regardless of whether our layout changed size.

## Workaround (client-side)

Register a `resize` listener on `window` and `visualViewport` that runs
**before** the runtime attaches its own (i.e. on component mount, before the
scene's `onLoad`), and swallow the event with `stopImmediatePropagation()` when
it is a URL-bar toggle. A URL-bar toggle changes viewport **height but not
width**, which distinguishes it from a real resize / orientation change.

```tsx
// Touch devices only; desktop window-resizing is left untouched.
useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches
    if (!coarse) return

    let lastW = window.innerWidth

    const guard = (e) => {
        const w = window.innerWidth
        const widthUnchanged = w === lastW // height-only change == URL-bar toggle
        lastW = w
        if (widthUnchanged) e.stopImmediatePropagation() // block the runtime's handler
    }

    window.addEventListener("resize", guard)
    window.visualViewport?.addEventListener("resize", guard)
    return () => {
        window.removeEventListener("resize", guard)
        window.visualViewport?.removeEventListener("resize", guard)
    }
}, [])
```

This works because DOM listeners on a given target fire in registration order,
and the runtime attaches its scroll/resize handlers in the scene's `onLoad`,
which happens after the component's mount effect. Result: the runtime never sees
the URL-bar resize, so it never re-zeroes; real resizes (width changes) still
pass through.

Caveat: this relies on the runtime attaching its resize listener during scene
load rather than at module-eval time. It held up in our testing, but it is
order-dependent.

## Suggested fix (runtime side)

When the built-in Scroll event recomputes on `resize`, it should **preserve the
current scroll progress** rather than resetting to the start. Concretely, one or
more of:

1. Ignore height-only viewport changes (URL-bar toggles) — i.e. only recompute
   geometry when the layout width changes.
2. On recompute, re-anchor progress to the existing scroll offset instead of
   restarting from 0.
3. Debounce/settle resize handling so a transient viewport change during a
   scroll gesture does not reset the timeline.

A stable Scroll event across URL-bar toggles would remove the need for any
client-side interception on mobile.
```

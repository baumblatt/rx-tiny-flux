# rx-tiny-flux — Maintainer Notes

Tiny redux-style store built on RxJS, used by the Tennis Fit Zepp OS mini-program
(`native/zepp`). We own this library. Source in `src/`, bundled to `dist/` via rollup;
consumers install the published package, so **a fix here only reaches the watch after a
rebuild + version bump + reinstall** in the app.

## Effects fail in isolation — but don't rely on it

Effects are RxJS streams subscribed in `store.js#registerEffects`. A throw anywhere inside
an effect (e.g. a serializer invoked from a `tap`) errors the stream. Historically each
effect was subscribed with **no error handler**, so one throw tore that effect down
*permanently and silently* for the rest of the session.

`registerEffects` now wraps every effect in `catchError((e, caught) => caught)`: it logs the
failure and re-subscribes the source so the effect keeps reacting to future actions. This is
a **backstop, not a license to throw** — an effect that throws on every matching action will
hot-loop re-subscribe. Keep effect bodies defensive; validate before encoding.

> Real incident (2026-06-12): the Zepp watch's `appendStrokes` propagation called a binary
> serializer that threw `Expected non-negative integer` on a `point: -1` (a game-boundary
> index from the backend). The throw killed the propagation effect on the first game boundary,
> so strokes uploaded fine through game 1 and then silently stopped for the entire match —
> while `updateMatch` (JSON-encoded, negative-safe) kept working. The catchError backstop was
> added in response. See `native/zepp/CLAUDE.md` and `native/zepp/docs/court-logs-2026-06-12-*`.

## `context` — the binding to the ZeppOS instance

`action.context` ties an action to its ZeppOS App / Page / SideService instance and carries
`.call` (cross-context messaging), `.log`, `.debug`, and `._store`. Lifecycle:

- **Attached on dispatch when absent** — `zeppos.js` dispatch wraps `action.context ? action : {...action, context: this}`.
- **Injected into effect *outputs*** — `registerEffects` adds `this._context` to any emitted
  action lacking one, so fresh actions returned from an effect `map` inherit the App context.
- **Stripped before `messaging.call`** — it holds circular refs and must not be serialized; the
  receiving context re-attaches its own on `onAction`.

Because effect outputs are re-contexted automatically, a fresh action from an effect is *not*
missing its context — verified during the 2026-06-12 investigation (the bug there was the
serializer throw above, **not** a lost context, despite the symptom looking identical).
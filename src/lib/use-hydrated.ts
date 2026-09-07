"use client";

/**
 * Whether the client has hydrated.
 *
 * For the small class of controls that genuinely cannot render correctly on the
 * server — the theme toggle is the example, because the active theme is only
 * known once next-themes has read the browser — this returns `false` during the
 * server render and the hydration pass, then `true`.
 *
 * `useSyncExternalStore` rather than a `useState` + `useEffect` mounted flag:
 * the two snapshots are what React uses to reconcile server and client markup,
 * so there is no post-mount setState and no cascading render.
 *
 * Use it sparingly. Anything gated on this is invisible in the server HTML.
 */

import { useSyncExternalStore } from "react";

/** Never fires — the value flips once, when React switches to the client. */
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

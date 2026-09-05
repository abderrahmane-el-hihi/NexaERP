import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Subscribes to the media query rather than setting state inside an effect: the server
 * snapshot is `false`, the client reads the real value on hydration, and later changes
 * arrive through the subscription.
 */
export function useIsMobile() {
  const subscribe = React.useCallback((onChange: () => void) => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
}

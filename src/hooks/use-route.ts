import { useSyncExternalStore } from 'react'

/**
 * Minimal hash router: `#/` is home, `#/p/<pageId>` opens a page.
 * Swap for react-router / TanStack Router once the app grows.
 */
export type Route = { name: 'home' } | { name: 'page'; id: string }

function parse(hash: string): Route {
  const m = hash.match(/^#\/p\/([\w-]+)/)
  return m ? { name: 'page', id: m[1] } : { name: 'home' }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parse(hash)
}

export function navigate(route: Route) {
  window.location.hash = route.name === 'home' ? '/' : `/p/${route.id}`
}

export const openPage = (id: string) => navigate({ name: 'page', id })

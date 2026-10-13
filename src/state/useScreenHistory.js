// Makes each screen (tab, scorecard, admin sign-in) a step in the browser's
// history, so the phone's back button goes back one screen instead of
// leaving the app.

import { useCallback, useEffect, useState } from 'react'

const HOME = { tab: 'Leaderboard', matchId: null, signIn: false }

const screenFrom = (state) => ({ ...HOME, ...(state?.screen ?? {}) })

export function useScreenHistory() {
  // After a page reload, carry on from the screen the browser remembers.
  const [screen, setScreen] = useState(() => screenFrom(window.history.state))

  useEffect(() => {
    if (!window.history.state?.screen) {
      window.history.replaceState({ ...window.history.state, screen: HOME }, '')
    }
    const onBack = (event) => setScreen(screenFrom(event.state))
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [])

  // Move to a new screen (adds a step to the history).
  const go = useCallback(
    (changes) => {
      const next = { ...screen, ...changes }
      window.history.pushState({ screen: next }, '')
      setScreen(next)
    },
    [screen],
  )

  // Same as pressing the phone's back button.
  const back = useCallback(() => window.history.back(), [])

  return { screen, go, back }
}

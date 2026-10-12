// Holds the tournament and saves it in this browser (localStorage).
//
// IMPORTANT: this is device-only storage. Changes made here are NOT shared
// with anyone else's phone. In Stage 6 this file will be switched to the
// online database; the screens that use it won't need to change.

import { useCallback, useEffect, useState } from 'react'
import { createDemoTournament } from '../data/demoTournament.js'

const STORAGE_KEY = 'wgm-golf-cup:tournament'
const CURRENT_VERSION = 1

function loadTournament() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.version === CURRENT_VERSION) return saved
  } catch {
    // Unreadable or blocked storage: fall back to the demo data.
  }
  return createDemoTournament()
}

export function useTournament() {
  const [tournament, setTournament] = useState(loadTournament)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament))
    } catch {
      // Storage unavailable (e.g. private browsing). The app still works for this visit.
    }
  }, [tournament])

  // Runs one of the admin functions from lib/admin.js.
  // Returns an error message if the change wasn't allowed, otherwise null.
  const apply = useCallback(
    (change, ...args) => {
      try {
        setTournament(change(tournament, ...args))
        return null
      } catch (error) {
        return error.message
      }
    },
    [tournament],
  )

  const reset = useCallback(() => setTournament(createDemoTournament()), [])

  return { tournament, apply, reset }
}

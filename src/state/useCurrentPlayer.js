// Remembers which player is using this device.
// This is a convenience, not a login: anyone can choose any name.

import { useState } from 'react'

const STORAGE_KEY = 'wgm-golf-cup:current-player'

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function useCurrentPlayer() {
  const [playerId, setPlayerIdState] = useState(read)

  const setPlayerId = (id) => {
    setPlayerIdState(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable: remembered for this visit only.
    }
  }

  return [playerId, setPlayerId]
}

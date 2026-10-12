// Player rankings: ordered by holes won across all their matches.
// Ties are split by points won for the team, then by fewer holes lost;
// players still level share the same rank (shown as e.g. "3=").

import { computeMatchState } from './scoring.js'
import { describeMatch } from './tournament.js'

export function getPlayerRankings(t) {
  const rows = new Map(
    t.players
      .filter((p) => p.teamId)
      .map((p) => [
        p.id,
        { player: p, holesWon: 0, holesLost: 0, holesHalved: 0, holesPlayed: 0, matchesPlayed: 0, points: 0 },
      ]),
  )

  for (const match of t.matches) {
    const state = computeMatchState(match.holes, t.holesPerMatch)
    if (state.holesPlayed === 0) continue
    const { points } = describeMatch(match, t.holesPerMatch)

    for (const side of ['HOME', 'CHALLENGERS']) {
      const playerId = side === 'HOME' ? match.homePlayerId : match.challengerPlayerId
      const row = rows.get(playerId)
      if (!row) continue
      const other = side === 'HOME' ? 'CHALLENGERS' : 'HOME'
      row.holesWon += state.holesWon[side]
      row.holesLost += state.holesWon[other]
      row.holesHalved += state.holesHalved
      row.holesPlayed += state.holesPlayed
      row.matchesPlayed += 1
      if (points) row.points += points[side]
    }
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.holesWon - a.holesWon ||
      b.points - a.points ||
      a.holesLost - b.holesLost ||
      a.player.name.localeCompare(b.player.name),
  )

  // Shared ranks for players level on all three measures.
  const sameStanding = (a, b) =>
    a && b && a.holesWon === b.holesWon && a.points === b.points && a.holesLost === b.holesLost

  return sorted.map((row, i) => {
    let rank = i + 1
    for (let j = i - 1; j >= 0 && sameStanding(sorted[j], row); j--) rank = j + 1
    const tied = sameStanding(sorted[i - 1], row) || sameStanding(sorted[i + 1], row)
    return { ...row, rank, tied }
  })
}

// Player rankings.
//
// Match play (Singles, Fourballs, Foursomes): ordered by holes won across
// all match-play matches. In pairs formats both partners are credited with
// the pair's holes and result. Ties are split by points won for the team,
// then by fewer holes lost; players still level share a rank ("3=").
//
// Stableford / stroke play days have their own individual table for the
// day (getDayRankings).

import { computeMatchState, STATUS } from './scoring.js'
import { describeMatch } from './tournament.js'
import { formatOf, formatForDay, sidePlayerIds } from './formats.js'
import { computePairing, dayCupPoints } from './strokeplay.js'

// Gives shared ranks to rows that are level on `same`.
function withRanks(sorted, same) {
  return sorted.map((row, i) => {
    let rank = i + 1
    for (let j = i - 1; j >= 0 && same(sorted[j], row); j--) rank = j + 1
    const tied = (i > 0 && same(sorted[i - 1], row)) || (i < sorted.length - 1 && same(sorted[i + 1], row))
    return { ...row, rank, tied }
  })
}

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
    if (formatOf(t, match).kind !== 'MATCH') continue
    const state = computeMatchState(match.holes, t.holesPerMatch)
    if (state.holesPlayed === 0) continue
    const { points } = describeMatch(match, t.holesPerMatch)

    for (const side of ['HOME', 'CHALLENGERS']) {
      const other = side === 'HOME' ? 'CHALLENGERS' : 'HOME'
      for (const playerId of sidePlayerIds(match, side)) {
        const row = rows.get(playerId)
        if (!row) continue
        row.holesWon += state.holesWon[side]
        row.holesLost += state.holesWon[other]
        row.holesHalved += state.holesHalved
        row.holesPlayed += state.holesPlayed
        row.matchesPlayed += 1
        if (points) row.points += points[side]
      }
    }
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.holesWon - a.holesWon ||
      b.points - a.points ||
      a.holesLost - b.holesLost ||
      a.player.name.localeCompare(b.player.name),
  )
  return withRanks(
    sorted,
    (a, b) => a.holesWon === b.holesWon && a.points === b.points && a.holesLost === b.holesLost,
  )
}

// Individual table for a Stableford / stroke play day: most points, or
// lowest net score to par. Players who haven't started go to the bottom.
// cupPoints: the cup points each player is earning (top 6 get one each).
export function getDayRankings(t, day) {
  const format = formatForDay(t, day)
  const { byPlayer } = dayCupPoints(t, day)
  const rows = []
  for (const match of t.matches.filter((m) => m.day === day)) {
    const pairing = computePairing(t, match)
    for (const side of ['HOME', 'CHALLENGERS']) {
      const player = t.players.find((p) => p.id === (side === 'HOME' ? match.homePlayerId : match.challengerPlayerId))
      if (!player) continue
      rows.push({
        player,
        holesPlayed: pairing.holesPlayed,
        finished: pairing.status === STATUS.COMPLETE,
        cupPoints: byPlayer.get(player.id) ?? 0,
        ...pairing.round[side],
      })
    }
  }

  const value = (r) => (format === 'STABLEFORD' ? -r.points : r.netToPar)
  const sorted = rows.sort(
    (a, b) =>
      (a.holesPlayed === 0) - (b.holesPlayed === 0) ||
      value(a) - value(b) ||
      a.player.name.localeCompare(b.player.name),
  )
  return withRanks(sorted, (a, b) => a.holesPlayed > 0 && b.holesPlayed > 0 && value(a) === value(b))
}

// Match-play scoring engine.
//
// The ONLY thing stored for a match is who won each hole:
//   match.holes = ['HOME', 'HALVED', 'CHALLENGERS', ...]  (index 0 = hole 1)
// Everything else (position, holes played, finished early, result, winner)
// is calculated from that list here, so it can never get out of step.

export const STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  LIVE: 'LIVE',
  COMPLETE: 'COMPLETE',
}

export const HOLE_RESULT = {
  HOME: 'HOME',
  CHALLENGERS: 'CHALLENGERS',
  HALVED: 'HALVED',
}

// Works out the state of a match from its hole results.
export function computeMatchState(holes = [], holesPerMatch = 18) {
  let home = 0
  let challengers = 0
  let halved = 0
  let played = 0
  let finishedEarly = false

  for (const result of holes.slice(0, holesPerMatch)) {
    if (!result) break
    played += 1
    if (result === HOLE_RESULT.HOME) home += 1
    else if (result === HOLE_RESULT.CHALLENGERS) challengers += 1
    else halved += 1

    // The match is over once a player is further ahead than holes remaining.
    if (Math.abs(home - challengers) > holesPerMatch - played) {
      finishedEarly = played < holesPerMatch
      break
    }
  }

  const difference = home - challengers
  const margin = Math.abs(difference)
  const leader = difference > 0 ? 'HOME' : difference < 0 ? 'CHALLENGERS' : null
  const remaining = holesPerMatch - played
  const complete = played === holesPerMatch || finishedEarly

  let status = STATUS.LIVE
  if (played === 0) status = STATUS.NOT_STARTED
  else if (complete) status = STATUS.COMPLETE

  // Final result wording: "3&2" when it finishes early, "1 UP" after 18,
  // or "HALVED" when level after 18.
  let result = null
  if (complete) {
    if (!leader) result = 'HALVED'
    else result = remaining > 0 ? `${margin}&${remaining}` : `${margin} UP`
  }

  return {
    status,
    holesPlayed: played,
    holesRemaining: remaining,
    holesWon: { HOME: home, CHALLENGERS: challengers },
    holesHalved: halved,
    leader,
    margin,
    winner: complete ? leader : null,
    result,
    dormie: status === STATUS.LIVE && margin > 0 && margin === remaining,
  }
}

export function getMatchStatus(match, holesPerMatch) {
  return computeMatchState(match.holes, holesPerMatch).status
}

// ---------- Who may score ----------

export function getGroupPlayerIds(t, groupId) {
  return t.matches
    .filter((m) => m.groupId === groupId)
    .flatMap((m) => [m.homePlayerId, m.challengerPlayerId])
    .filter(Boolean)
}

// The four players in a match's group, plus admins, may score it.
export function canScoreMatch(t, match, playerId) {
  if (!playerId) return false
  if (t.adminIds.includes(playerId)) return true
  return getGroupPlayerIds(t, match.groupId).includes(playerId)
}

// ---------- Changing scores ----------
// Each takes the tournament and returns an updated copy, or throws an Error
// with a plain-English message.

function getMatch(t, matchId) {
  const match = t.matches.find((m) => m.id === matchId)
  if (!match) throw new Error('That match no longer exists.')
  return match
}

function withHoles(t, matchId, holes) {
  return { ...t, matches: t.matches.map((m) => (m.id === matchId ? { ...m, holes } : m)) }
}

function checkCanScore(t, match, actorId) {
  if (!canScoreMatch(t, match, actorId)) {
    throw new Error('Only the players in this group, or an admin, can enter scores for this match.')
  }
}

// Records (or corrects) the result of one hole.
export function recordHole(t, matchId, holeNumber, result, actorId) {
  const match = getMatch(t, matchId)
  checkCanScore(t, match, actorId)
  if (!match.homePlayerId || !match.challengerPlayerId) {
    throw new Error('Both players must be chosen before scores can be entered.')
  }
  if (!Object.values(HOLE_RESULT).includes(result)) {
    throw new Error('Choose who won the hole, or halved.')
  }

  const state = computeMatchState(match.holes, t.holesPerMatch)
  const isAdmin = t.adminIds.includes(actorId)

  if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > t.holesPerMatch) {
    throw new Error('That hole number is not valid.')
  }
  if (holeNumber > state.holesPlayed + 1) {
    throw new Error(`Enter hole ${state.holesPlayed + 1} first.`)
  }
  if (holeNumber === state.holesPlayed + 1 && state.status === STATUS.COMPLETE) {
    throw new Error(`This match is finished (${state.result}). No more holes can be added.`)
  }
  if (holeNumber <= state.holesPlayed && state.status === STATUS.COMPLETE && !isAdmin) {
    throw new Error('This match is finished. Only an admin can correct it.')
  }

  const holes = match.holes.slice(0, state.holesPlayed)
  holes[holeNumber - 1] = result

  // A correction can end the match sooner; drop any holes after the new finish.
  const after = computeMatchState(holes, t.holesPerMatch)
  return withHoles(t, matchId, holes.slice(0, after.holesPlayed))
}

// Removes the most recent hole result.
export function undoLastHole(t, matchId, actorId) {
  const match = getMatch(t, matchId)
  checkCanScore(t, match, actorId)
  const state = computeMatchState(match.holes, t.holesPerMatch)
  if (state.holesPlayed === 0) throw new Error('No holes have been entered yet.')
  if (state.status === STATUS.COMPLETE && !t.adminIds.includes(actorId)) {
    throw new Error('This match is finished. Only an admin can correct it.')
  }
  return withHoles(t, matchId, match.holes.slice(0, state.holesPlayed - 1))
}

// Clears every hole in a match. Admins only.
export function resetMatch(t, matchId, actorId) {
  getMatch(t, matchId)
  if (!t.adminIds.includes(actorId)) throw new Error('Only an admin can reset a match.')
  return withHoles(t, matchId, [])
}

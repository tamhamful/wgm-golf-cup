// Match-play scoring engine.
//
// The ONLY thing stored for a match is one entry per hole:
//   match formats:  who won it – ['HOME', 'HALVED', 'CHALLENGERS', ...]
//   Stableford / stroke play: both gross scores – ['5:4', 'P:6', ...]
//   (index 0 = hole 1). Everything else is calculated from that list, so it
//   can never get out of step. Stableford / stroke play maths is in
//   strokeplay.js; a gross-score hole never ends a pairing early.

import { formatOf, matchIsReady, sidePlayerIds } from './formats.js'
import { decodeHole, isValidGross } from './strokeplay.js'

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
    else halved += 1 // (gross-score holes land here and never end a pairing early)

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

// Works for every format: gross-score holes never finish a pairing early,
// so it is complete once every hole has an entry.
export function getMatchStatus(match, holesPerMatch) {
  return computeMatchState(match.holes, holesPerMatch).status
}

// ---------- Who may score ----------

export function getGroupPlayerIds(t, groupId) {
  return t.matches
    .filter((m) => m.groupId === groupId)
    .flatMap((m) => [...sidePlayerIds(m, 'HOME'), ...sidePlayerIds(m, 'CHALLENGERS')])
    .filter(Boolean)
}

// "actor" is whoever is making the change: { playerId, isAdmin }.
// playerId is the name picked on this device; isAdmin is only true for a
// signed-in admin. The database repeats these checks (supabase/schema.sql).

// The four players in a match's group, plus admins, may score it.
export function canScoreMatch(t, match, actor) {
  if (actor.isAdmin) return true
  if (!actor.playerId) return false
  return getGroupPlayerIds(t, match.groupId).includes(actor.playerId)
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

function checkCanScore(t, match, actor) {
  if (!canScoreMatch(t, match, actor)) {
    throw new Error('Only the players in this group, or an admin, can enter scores for this match.')
  }
}

// Is this a valid hole entry for the match's format?
export function isValidHoleEntry(t, match, result) {
  if (formatOf(t, match).kind === 'MATCH') return Object.values(HOLE_RESULT).includes(result)
  if (!/^(\d{1,2}|P):(\d{1,2}|P)$/.test(String(result))) return false
  const scores = decodeHole(result)
  return isValidGross(scores.HOME) && isValidGross(scores.CHALLENGERS)
}

// Records (or corrects) one hole: who won it (match formats), or both
// players' gross scores as "5:4" (Stableford / stroke play).
export function recordHole(t, matchId, holeNumber, result, actor) {
  const match = getMatch(t, matchId)
  checkCanScore(t, match, actor)
  if (!matchIsReady(t, match)) {
    throw new Error('All the players must be chosen before scores can be entered.')
  }
  if (!isValidHoleEntry(t, match, result)) {
    throw new Error(
      formatOf(t, match).kind === 'MATCH'
        ? 'Choose who won the hole, or halved.'
        : 'Enter a score from 1 to 20 for each player, or a pick-up.',
    )
  }

  const state = computeMatchState(match.holes, t.holesPerMatch)

  if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > t.holesPerMatch) {
    throw new Error('That hole number is not valid.')
  }
  if (holeNumber > state.holesPlayed + 1) {
    throw new Error(`Enter hole ${state.holesPlayed + 1} first.`)
  }
  // A finished match can't take more holes, but any of its holes can still
  // be corrected by the group's players or an admin.
  if (holeNumber === state.holesPlayed + 1 && state.status === STATUS.COMPLETE) {
    throw new Error(`This match is finished (${state.result}). No more holes can be added.`)
  }

  const holes = match.holes.slice(0, state.holesPlayed)
  holes[holeNumber - 1] = result

  // A correction can end the match sooner; drop any holes after the new finish.
  const after = computeMatchState(holes, t.holesPerMatch)
  return withHoles(t, matchId, holes.slice(0, after.holesPlayed))
}

// Removes the most recent hole result.
export function undoLastHole(t, matchId, actor) {
  const match = getMatch(t, matchId)
  checkCanScore(t, match, actor)
  const state = computeMatchState(match.holes, t.holesPerMatch)
  if (state.holesPlayed === 0) throw new Error('No holes have been entered yet.')
  return withHoles(t, matchId, match.holes.slice(0, state.holesPlayed - 1))
}

// Clears every hole in a match. Admins only.
export function resetMatch(t, matchId, actor) {
  getMatch(t, matchId)
  if (!actor.isAdmin) throw new Error('Only an admin can reset a match.')
  return withHoles(t, matchId, [])
}

// Clears every score in the tournament (teams, players and pairings stay)
// and removes the "demonstration" label. Admins only.
export function clearAllScores(t, actor) {
  if (!actor.isAdmin) throw new Error('Only an admin can clear the scores.')
  return { ...t, isDemo: false, matches: t.matches.map((m) => ({ ...m, holes: [] })) }
}

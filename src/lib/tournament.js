// Tournament calculations. Screens read from here rather than working out
// positions or points themselves, so there is one source of truth.
// Match positions come from the scoring engine (scoring.js), which works
// them out from the hole-by-hole results.

import { computeMatchState, STATUS } from './scoring.js'
import { formatForDay, formatOf, isTeamTotalFormat } from './formats.js'
import { computePairing, dayCupPoints, formatRoundScore } from './strokeplay.js'

export { STATUS }

// Shown in place of a player who hasn't been chosen for a match yet.
export const UNASSIGNED_PLAYER = { id: null, name: 'TBC' }

// "C" for a team captain, "VC" for a vice-captain, otherwise null.
export function teamRoleOf(teams, player) {
  const team = player?.id && teams[player.teamId]
  if (!team) return null
  if (team.captainId === player.id) return 'C'
  if (team.viceCaptainId === player.id) return 'VC'
  return null
}

export const STATUS_LABEL = {
  NOT_STARTED: 'Not started',
  LIVE: 'Live',
  COMPLETE: 'Complete',
}

// Turns a match's state into what the screens display.
//   side: which team to highlight (HOME, CHALLENGERS or null)
//   position: e.g. "1 UP", "ALL SQUARE", "2&1", "HALVED" (null if not started)
//   detail: e.g. "14 HOLES", "FINAL", "NOT STARTED"
//   holesPlayed: number of holes completed
//   points: { HOME, CHALLENGERS } for completed matches, otherwise null
export function describeMatch(match, holesPerMatch = 18) {
  const state = computeMatchState(match.holes, holesPerMatch)

  if (state.status === STATUS.LIVE) {
    const holes = state.holesPlayed
    return {
      status: STATUS.LIVE,
      side: state.margin > 0 ? state.leader : null,
      position: state.margin > 0 ? `${state.margin} UP` : 'ALL SQUARE',
      detail: `${holes} ${holes === 1 ? 'HOLE' : 'HOLES'}`,
      holesPlayed: holes,
      points: null,
    }
  }

  if (state.status === STATUS.COMPLETE) {
    return {
      status: STATUS.COMPLETE,
      side: state.winner,
      position: state.result,
      detail: 'FINAL',
      holesPlayed: state.holesPlayed,
      points: {
        HOME: state.winner === 'HOME' ? 1 : state.winner ? 0 : 0.5,
        CHALLENGERS: state.winner === 'CHALLENGERS' ? 1 : state.winner ? 0 : 0.5,
      },
    }
  }

  return {
    status: STATUS.NOT_STARTED,
    side: null,
    position: null,
    detail: 'NOT STARTED',
    holesPlayed: 0,
    points: null,
  }
}

// What a leaderboard row shows, for any format.
//   Match formats: as describeMatch.
//   Stableford / stroke play: each player's score ("18 pts" or "+3"),
//   side = whoever is doing better in the pairing; no points per pairing
//   (the day's cup points go to the top 6 individual scores).
export function matchView(t, match) {
  if (formatOf(t, match).kind === 'MATCH') {
    return { kind: 'MATCH', ...describeMatch(match, t.holesPerMatch) }
  }
  const p = computePairing(t, match)
  let detail = 'NOT STARTED'
  if (p.status === STATUS.LIVE) detail = `${p.holesPlayed} ${p.holesPlayed === 1 ? 'HOLE' : 'HOLES'}`
  if (p.status === STATUS.COMPLETE) detail = 'FINAL'
  return {
    kind: 'TEAM_TOTAL',
    format: p.format,
    status: p.status,
    side: p.better,
    holesPlayed: p.holesPlayed,
    detail,
    scores: {
      HOME: formatRoundScore(p.format, p.round.HOME),
      CHALLENGERS: formatRoundScore(p.format, p.round.CHALLENGERS),
    },
    round: p.round,
    points: null,
  }
}

export const matchStatus = (t, match) => matchView(t, match).status

// Points only come from finished matches, and from Stableford / stroke play
// days (top 6 scores earn a point each) once every pairing has finished.
export function getTeamPoints(t) {
  const totals = { HOME: 0, CHALLENGERS: 0 }
  for (const day of t.days) {
    if (isTeamTotalFormat(formatForDay(t, day))) {
      const result = dayCupPoints(t, day)
      if (result.complete) {
        totals.HOME += result.points.HOME
        totals.CHALLENGERS += result.points.CHALLENGERS
      }
      continue
    }
    for (const match of t.matches.filter((m) => m.day === day)) {
      const { points } = describeMatch(match, t.holesPerMatch)
      if (points) {
        totals.HOME += points.HOME
        totals.CHALLENGERS += points.CHALLENGERS
      }
    }
  }
  return totals
}

// Projected points: finished results, plus live matches as they currently
// stand (leader gets 1, all square 0.5 each), plus Stableford / stroke play
// days in progress (the top-6 split as things stand).
// Unstarted matches add nothing. This is an indication only, never awarded.
export function getProjectedPoints(t) {
  const totals = getTeamPoints(t)
  for (const day of t.days) {
    if (isTeamTotalFormat(formatForDay(t, day))) {
      const result = dayCupPoints(t, day)
      if (result.started && !result.complete) {
        totals.HOME += result.points.HOME
        totals.CHALLENGERS += result.points.CHALLENGERS
      }
      continue
    }
    for (const match of t.matches.filter((m) => m.day === day)) {
      const view = describeMatch(match, t.holesPerMatch)
      if (view.status !== STATUS.LIVE) continue
      if (view.side) {
        totals[view.side] += 1
      } else {
        totals.HOME += 0.5
        totals.CHALLENGERS += 0.5
      }
    }
  }
  return totals
}

// Header label, based on the day the admin has set as the current day.
export function getTournamentStatus(t, currentDay) {
  const { matches, days } = t
  const dayStatus = (day) => {
    const statuses = matches.filter((m) => m.day === day).map((m) => matchStatus(t, m))
    if (statuses.every((s) => s === STATUS.COMPLETE)) return 'complete'
    if (statuses.every((s) => s === STATUS.NOT_STARTED)) return 'not-started'
    return 'in-progress'
  }

  if (days.every((day) => dayStatus(day) === 'complete')) return { label: 'Tournament complete' }

  const status = dayStatus(currentDay)
  if (status === 'complete') return { label: `Day ${currentDay} complete` }
  if (status === 'in-progress') return { label: `Day ${currentDay} in progress` }
  return { label: currentDay === days[0] ? 'Not started' : `Day ${currentDay} not started` }
}

export function formatPoints(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
